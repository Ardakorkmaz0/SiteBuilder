"""A page's mode is kept as its owner chose it.

The create-site wizard can start a site on an HTML page that has no code yet:
the editor then opens its HTML workspace, where the code is uploaded, pasted
or written. That only works while the server keeps 'html' on a page whose
HTML is still empty, and does not turn it back into a component canvas.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Site


def page(mode, html=''):
    return {'id': 'page_home', 'name': 'Home', 'mode': mode, 'html': html, 'components': []}


@pytest.fixture
def api(db):
    client = APIClient()
    client.force_authenticate(User.objects.create_user('ada', 'ada@example.com', 'secret123'))
    return client


def stored_modes(api, pages):
    res = api.post('/api/sites/', {'title': 'Olive', 'html': '', 'schema': {'theme': {}, 'pages': pages}}, format='json')
    assert res.status_code == 201, res.data
    return [saved['mode'] for saved in Site.objects.get(pk=res.data['id']).schema['pages']]


def test_an_html_page_with_no_code_yet_stays_an_html_page(api):
    assert stored_modes(api, [page('html')]) == ['html']


def test_a_canvas_page_stays_a_canvas_page(api):
    assert stored_modes(api, [page('empty')]) == ['empty']


def test_a_page_that_carries_html_is_an_html_page_whatever_it_says(api):
    assert stored_modes(api, [page('empty', '<h1>Hello</h1>'), page('something else')]) == ['html', 'empty']


# --- a page turned from HTML into a canvas ---------------------------------
# The editor keeps the document the page had (`htmlBackup`) so its owner can
# go back to it, and the web fonts that document loaded (`fonts`).

DOCUMENT = '<!DOCTYPE html><html><body><h1>Olive</h1></body></html>'


def converted(**extra):
    return {
        'id': 'page_home', 'name': 'Home', 'mode': 'empty', 'html': '', 'htmlBackup': DOCUMENT,
        'components': [{'id': 'heading_1', 'type': 'heading', 'props': {'text': 'Olive', 'level': 'h1'},
                        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 300, 'h': 60}}],
        **extra,
    }


def stored_page(api, page_data):
    res = api.post('/api/sites/', {'title': 'Olive', 'html': '', 'schema': {'theme': {}, 'pages': [page_data]}}, format='json')
    assert res.status_code == 201, res.data
    return res.data['id'], Site.objects.get(pk=res.data['id']).schema['pages'][0]


def test_a_converted_page_keeps_its_document_and_stays_a_canvas(api):
    _, saved = stored_page(api, converted())

    assert saved['mode'] == 'empty'
    assert saved['html'] == ''
    assert saved['htmlBackup'] == DOCUMENT
    assert [c['type'] for c in saved['components']] == ['heading']


def test_a_kept_document_that_is_not_text_is_dropped(api):
    _, saved = stored_page(api, converted(htmlBackup={'html': DOCUMENT}))

    assert saved['htmlBackup'] == ''


def test_a_page_keeps_the_web_fonts_it_names_and_nothing_else(api):
    _, saved = stored_page(api, converted(fonts=[
        'Source Sans 3:wght@400;600;700',
        'Fraunces:ital,wght@0,500;1,500',
        'Inter',
        'Inter&family=Evil',
        'https://example.com/font.css',
        'Inter:wght@400"><script>',
        42,
    ]))

    assert saved['fonts'] == ['Source Sans 3:wght@400;600;700', 'Fraunces:ital,wght@0,500;1,500', 'Inter']


def test_a_page_keeps_at_most_eight_fonts(api):
    _, saved = stored_page(api, converted(fonts=[f'Font {n}' for n in range(12)]))

    assert saved['fonts'] == [f'Font {n}' for n in range(8)]


def test_nobody_else_can_write_a_page_backup(api):
    site_id, _ = stored_page(api, converted())
    changed = {'schema': {'theme': {}, 'pages': [converted(htmlBackup='<h1>Theirs</h1>')]}}

    stranger = APIClient()
    stranger.force_authenticate(User.objects.create_user('bob', 'bob@example.com', 'secret123'))
    assert stranger.patch(f'/api/sites/{site_id}/', changed, format='json').status_code == 404
    assert APIClient().patch(f'/api/sites/{site_id}/', changed, format='json').status_code in (401, 403)

    assert Site.objects.get(pk=site_id).schema['pages'][0]['htmlBackup'] == DOCUMENT
