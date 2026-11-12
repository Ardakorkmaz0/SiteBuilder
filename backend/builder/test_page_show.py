"""Blocks a page shows only once something shows them: the keys a block is
shown by, the actions a click runs, the keys a page hides when it opens and
its parts. They are kept through a save, and nothing but well-formed keys
gets through: the keys are written into attributes of the published page."""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Site
from .validators import validate_and_clean_schema


def _page(components, **extra):
    return {'pages': [{'id': 'home', 'name': 'Home', 'components': components, **extra}]}


def _block(**props):
    return {'id': 'b1', 'type': 'text', 'props': {'text': 'Step', **props}, 'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 200, 'h': 40}}


def test_keys_actions_and_parts_are_kept():
    page = validate_and_clean_schema(_page(
        [_block(shownBy=['s1', 'p_one'], onClick=[{'do': 'next', 'keys': ['s1', 's2']}, {'do': 'toggle', 'keys': ['front']}])],
        hiddenKeys=['s1', 's2', 'p_two'],
        parts=[{'key': 'p_one', 'label': 'Başlarken'}, {'key': 'p_two', 'label': 'Hill descending'}],
    ))['pages'][0]
    assert page['components'][0]['props']['shownBy'] == ['s1', 'p_one']
    assert page['components'][0]['props']['onClick'] == [{'do': 'next', 'keys': ['s1', 's2']}, {'do': 'toggle', 'keys': ['front']}]
    assert page['hiddenKeys'] == ['s1', 's2', 'p_two']
    assert page['parts'] == [{'key': 'p_one', 'label': 'Başlarken'}, {'key': 'p_two', 'label': 'Hill descending'}]


def test_only_well_formed_keys_and_known_actions_get_through():
    page = validate_and_clean_schema(_page(
        [_block(shownBy=['ok', 'Bad', '"><script>', 'ok', 7], onClick=[{'do': 'eval', 'keys': ['ok']}, {'do': 'show', 'keys': ['x y']}, 'next'])],
        hiddenKeys=['ok', 'a b', None],
        parts=[{'key': 'p1', 'label': 'x' * 200}, {'key': 'p1', 'label': 'again'}, {'key': '<p>'}],
    ))['pages'][0]
    props = page['components'][0]['props']
    assert props['shownBy'] == ['ok']
    assert 'onClick' not in props
    assert page['hiddenKeys'] == ['ok']
    assert page['parts'] == [{'key': 'p1', 'label': 'x' * 80}]


def test_the_room_a_key_took_is_kept_on_a_block_shown_by_keys_and_nowhere_else():
    page = validate_and_clean_schema(_page([
        _block(shownBy=['s1'], rooms=[['s1', 8, 120.555], ['bad key', 1, 2], ['s1', True, 3], ['s2', 0, 0], 'x']),
        {**_block(rooms=[['s1', 1, 2]]), 'id': 'b2'},
    ]))['pages'][0]
    assert page['components'][0]['props']['rooms'] == [['s1', 8.0, 120.56], ['s2', 0.0, 0.0]]
    assert 'rooms' not in page['components'][1]['props']


def test_a_key_with_a_line_break_at_its_end_is_not_a_key():
    # Python's $ also matches before a final line break; the page's own check does not.
    page = validate_and_clean_schema(_page(
        [_block(shownBy=['x\n', 'ok'], rooms=[['x\n', 0, 1], ['ok', 0, 2]])],
        hiddenKeys=['x\n', 'ok'], parts=[{'key': 'x\n', 'label': 'X'}],
    ))['pages'][0]
    assert page['components'][0]['props']['shownBy'] == ['ok']
    assert page['components'][0]['props']['rooms'] == [['ok', 0.0, 2.0]]
    assert page['hiddenKeys'] == ['ok']
    assert 'parts' not in page


def test_a_page_that_shows_everything_stays_as_it_was():
    page = validate_and_clean_schema(_page([_block()]))['pages'][0]
    assert 'hiddenKeys' not in page
    assert 'parts' not in page
    assert 'shownBy' not in page['components'][0]['props']


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def test_a_save_keeps_them_only_for_the_owner(owner):
    site = Site.objects.create(owner=owner, title='Notes', schema=_page([_block()]))
    body = {'schema': _page([_block(shownBy=['s1'])], hiddenKeys=['s1']), 'base_revision': site.revision}

    assert _client().patch(f'/api/sites/{site.pk}/', body, format='json').status_code in (401, 403)
    stranger = User.objects.create_user('eve', 'eve@example.com', 'secret123')
    assert _client(stranger).patch(f'/api/sites/{site.pk}/', body, format='json').status_code == 404
    site.refresh_from_db()
    assert 'hiddenKeys' not in site.schema['pages'][0]

    assert _client(owner).patch(f'/api/sites/{site.pk}/', body, format='json').status_code == 200
    site.refresh_from_db()
    assert site.schema['pages'][0]['hiddenKeys'] == ['s1']
    assert site.schema['pages'][0]['components'][0]['props']['shownBy'] == ['s1']
