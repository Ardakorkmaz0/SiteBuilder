"""What a request body may be: an object, of a sane depth, without NUL.

Each of these used to end in a server error instead of an answer:

- a JSON list, string or null where a view reads `request.data.get(...)`;
- a NUL character, which PostgreSQL stores in neither text nor jsonb. One
  such character in a heading made the save of the whole site fail. SQLite,
  which these tests run on, stores it, so the tests assert what reaches the
  row, not that the database complains;
- a body nested thousands of levels deep.

`builder/parsers.py` decides all three before a view sees the body.
"""
import io
import json

import pytest
from django.contrib.auth.models import User
from django.db import DataError, OperationalError
from rest_framework.permissions import AllowAny
from rest_framework.test import APIClient, APIRequestFactory
from rest_framework.views import APIView

from .models import (
    FormSubmission, LiveSnapshot, PublishedPage, Report, SharedComponent,
    SharedComponentReport, Site, SiteVersion,
)
from .parsers import BodyRefused, ObjectJSONParser


def schema(text='Hello', page_name='Home'):
    return {'theme': {}, 'pages': [{
        'id': 'home', 'name': page_name, 'components': [{
            'id': 'h1', 'type': 'heading', 'props': {'text': text}, 'styles': {},
            'layout': {'x': 20, 'y': 20, 'w': 300, 'h': 60},
        }],
    }]}


@pytest.fixture
def world(db):
    ada = User.objects.create_user('ada', 'ada@example.com', 'secret123')
    bob = User.objects.create_user('bob', 'bob@example.com', 'secret123')
    boss = User.objects.create_user('boss', 'boss@example.com', 'secret123', is_staff=True, is_superuser=True)
    site = Site.objects.create(owner=ada, title='Ada', slug='ada', published=True, schema=schema())
    PublishedPage.objects.create(site=site, path='', title='Ada', html='<h1>Ada</h1>')
    version = SiteVersion.objects.create(site=site, schema=schema(), html='', source='manual')
    mine = SharedComponent.objects.create(author=ada, title='Mine', html='<div data-pwb-shared="s1">a</div>')
    theirs = SharedComponent.objects.create(author=bob, title='Theirs', html='<div data-pwb-shared="s2">b</div>')
    report = Report.objects.create(site=site, reporter=bob, reason='spam', status='open')
    component_report = SharedComponentReport.objects.create(component=theirs, reporter=ada, reason='spam')
    return {
        'ada': ada, 'bob': bob, 'boss': boss, 'site': site, 'version': version,
        'mine': mine, 'theirs': theirs, 'report': report, 'component_report': component_report,
    }


def client_for(user=None):
    api = APIClient()
    if user is not None:
        api.force_authenticate(user)
    return api


def send(api, method, path, raw):
    return api.generic(method, path, data=raw, content_type='application/json')


def every_row():
    return {
        model.__name__: list(model.objects.order_by('pk').values())
        for model in (
            Site, SiteVersion, PublishedPage, LiveSnapshot, FormSubmission, Report,
            SharedComponent, SharedComponentReport, User,
        )
    }


# Who calls, how, and where. Each view here reads its fields with
# `request.data.get(...)` and nothing in front of it checked the body's shape.
OBJECT_ONLY = [
    ('ada', 'POST', '/api/sites/{site}/live-undo/'),
    ('ada', 'POST', '/api/sites/{site}/page-live/'),
    ('ada', 'POST', '/api/sites/{site}/page-visibility/'),
    ('ada', 'POST', '/api/sites/{site}/versions/checkpoint/'),
    ('ada', 'PATCH', '/api/sites/{site}/versions/{version}/pin/'),
    ('ada', 'POST', '/api/components/{mine}/visibility/'),
    ('ada', 'POST', '/api/public/components/{theirs}/report/'),
    ('ada', 'POST', '/api/public/components/{theirs}/use/'),
    ('boss', 'POST', '/api/admin/accounts/{bob}/role/'),
    ('boss', 'POST', '/api/admin/users/{bob}/suspend/'),
    ('boss', 'POST', '/api/admin/reports/{report}/resolve/'),
    ('boss', 'POST', '/api/admin/sites/{site}/moderate/'),
    ('boss', 'POST', '/api/admin/sites/{site}/pin/'),
    ('boss', 'POST', '/api/admin/component-reports/{component_report}/resolve/'),
    ('boss', 'POST', '/api/admin/components/{theirs}/moderate/'),
]


@pytest.mark.parametrize('raw', ['[{"action": "delete"}]', '"delete"', 'null'])
@pytest.mark.parametrize('who,method,path', OBJECT_ONLY)
def test_a_body_that_is_not_an_object_is_refused_and_changes_nothing(world, who, method, path, raw):
    url = path.format(**{name: row.pk for name, row in world.items()})
    before = every_row()

    response = send(client_for(world[who]), method, url, raw)

    assert response.status_code == 400, response.content
    assert response.json() == {'code': 'validation_error', 'detail': 'Expected an object of fields.'}
    assert every_row() == before


def test_the_same_endpoints_still_take_an_object(world):
    # The other half of the gate: an object passes through to the view, which
    # answers for itself.
    api = client_for(world['ada'])
    site = world['site']

    response = api.post(f'/api/sites/{site.pk}/versions/checkpoint/', {'label': 'Before launch'}, format='json')

    assert response.status_code == 201, response.content
    assert SiteVersion.objects.filter(site=site, label='Before launch').count() == 1


def test_sign_in_refuses_a_list_like_every_other_endpoint(world):
    # DRF's token view names its own parsers, so the default alone missed it.
    response = send(client_for(), 'POST', '/api/auth/login/', '["ada", "secret123"]')

    assert response.status_code == 400
    assert response.json() == {'code': 'validation_error', 'detail': 'Expected an object of fields.'}


def test_a_nul_character_in_a_block_does_not_stop_the_site_from_saving(world):
    api = client_for(world['ada'])
    site = world['site']

    response = api.patch(
        f'/api/sites/{site.pk}/',
        {'title': 'A\x00da', 'schema': schema(text='Hel\x00lo', page_name='Ho\x00me')},
        format='json',
    )

    assert response.status_code == 200, response.content
    site.refresh_from_db()
    assert site.title == 'Ada'
    page = site.schema['pages'][0]
    assert page['name'] == 'Home'
    assert page['components'][0]['props']['text'] == 'Hello'
    assert '\\u0000' not in json.dumps(site.schema)


def test_a_nul_character_in_a_visitor_message_is_dropped_from_name_and_value(world):
    response = client_for().post(
        '/api/public/sites/ada/submit/',
        {'data': {'na\x00me': 'Gra\x00ce', 'message': 'Hi'}, 'page': ''},
        format='json',
    )

    assert response.status_code == 201, response.content
    assert FormSubmission.objects.get().data == {'name': 'Grace', 'message': 'Hi'}


def parse(raw):
    return ObjectJSONParser().parse(io.BytesIO(raw.encode()))


def nested(levels, opening='{"a":', closing='}', innermost='{}'):
    """An object whose innermost container sits `levels` deep; the body is level 1."""
    return opening * (levels - 1) + innermost + closing * (levels - 1)


def test_the_parser_drops_nul_wherever_a_string_or_a_key_holds_it():
    body = parse('{"a\\u0000b": ["x\\u0000y", {"k": "\\u0000", "n": 1}], "plain": "text", "t": true}')

    assert body == {'ab': ['xy', {'k': '', 'n': 1}], 'plain': 'text', 't': True}


def test_the_parser_leaves_a_written_out_escape_alone():
    # Six characters somebody typed (a backslash, u, four zeros) are text, not
    # the character.
    assert parse('{"text": "\\\\u0000"}') == {'text': '\\u0000'}


def test_the_parser_follows_a_hundred_levels_and_no_more():
    assert parse(nested(100)) is not None
    with pytest.raises(BodyRefused) as refused:
        parse(nested(101))
    assert str(refused.value.detail) == 'The request body is nested too deeply.'

    # Lists count as levels too.
    assert parse('{"a":' + nested(99, '[', ']', '[]') + '}') is not None
    with pytest.raises(BodyRefused):
        parse('{"a":' + nested(100, '[', ']', '[]') + '}')


@pytest.mark.parametrize('raw', [
    nested(100_000),
    nested(100_000, '[', ']', '[]'),
    '{"schema":' + nested(100_000, '[', ']', '1') + '}',
])
def test_a_body_nested_past_what_python_can_follow_is_refused_before_sign_in_reads_it(db, raw):
    response = send(client_for(), 'POST', '/api/auth/login/', raw)

    assert response.status_code == 400
    assert response.json() == {'code': 'validation_error', 'detail': 'The request body is nested too deeply.'}


def test_a_deep_body_does_not_reach_the_site(world):
    site = world['site']
    before = every_row()

    response = send(
        client_for(world['ada']), 'PATCH', f'/api/sites/{site.pk}/',
        '{"title": "Changed", "site_options":' + nested(3000) + '}',
    )

    assert response.status_code == 400
    assert every_row() == before


class _Refused(APIView):
    """A view whose query the database refuses, as PostgreSQL does for a NUL in
    a search word. SQLite cannot be made to say it."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []
    error = None

    def get(self, request):
        raise self.error


def test_a_value_the_database_refuses_is_a_refusal_not_a_server_error():
    view = _Refused.as_view(error=DataError('PostgreSQL text fields cannot contain NUL (0x00) bytes'))

    response = view(APIRequestFactory().get('/api/explore/'))

    assert response.status_code == 400
    assert response.data == {'code': 'validation_error', 'detail': 'A value in the request cannot be stored.'}


def test_any_other_database_error_is_still_a_server_error():
    # A database that is down is not the caller's doing.
    view = _Refused.as_view(error=OperationalError('server closed the connection unexpectedly'))

    with pytest.raises(OperationalError):
        view(APIRequestFactory().get('/api/explore/'))
