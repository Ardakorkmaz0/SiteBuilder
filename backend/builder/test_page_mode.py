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
