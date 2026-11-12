"""Formatting inside a text or heading block, kept as runs beside its text.

A run is a piece of text with a few marks, or an inline picture (a formula
drawn as an image). Each value is checked for what it is; nothing in a run is
ever markup or code.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Site
from .validators import sanitize_props, sanitize_rich

PNG = 'data:image/png;base64,iVBORw0KGgo='


def test_text_runs_keep_their_marks_and_nothing_else():
    runs = sanitize_rich([
        {'t': 'Fresh ', 'b': '700', 'i': 'italic', 'u': 'underline', 'c': 'rgb(1, 2, 3)', 'bg': '#fff', 'f': "'Fira Sans', serif", 'z': '18.5px', 'v': 'super', 'href': '#menu', 'evil': 'x'},
        {'t': 'bread', 'b': 'heavy', 'i': 'oblique', 'u': 'blink', 'z': '18em', 'v': 'middle'},
    ])['rich']

    assert runs == [
        {'href': '#menu', 't': 'Fresh ', 'b': '700', 'i': 'italic', 'u': 'underline', 'c': 'rgb(1, 2, 3)', 'bg': '#fff', 'f': "'Fira Sans', serif", 'z': '18.5px', 'v': 'super'},
        {'t': 'bread'},
    ]


def test_a_mark_that_could_carry_code_is_dropped():
    runs = sanitize_rich([
        {'t': 'a', 'c': 'red;background:url(https://evil.example/x)'},
        {'t': 'b', 'f': 'x</style><script>'},
        {'t': 'c', 'bg': 'expression(alert(1))'},
        {'t': 'd', 'href': 'javascript:alert(1)'},
    ])['rich']

    assert runs == [{'t': 'a'}, {'t': 'b'}, {'t': 'c'}, {'t': 'd'}]


def test_an_inline_picture_keeps_its_size_and_place_to_the_hundredth():
    runs = sanitize_rich([{'img': PNG, 'w': 13.004, 'h': 24, 'va': -8.33331, 'ml': -1.256, 'mr': 0.5, 'alt': 'y_i', 'href': '#x'}])['rich']

    assert runs == [{'href': '#x', 'img': PNG, 'w': 13.0, 'h': 24.0, 'va': -8.33, 'ml': -1.26, 'mr': 0.5, 'alt': 'y_i'}]


def test_a_picture_from_anywhere_but_an_image_is_dropped():
    assert sanitize_rich([{'img': 'javascript:alert(1)', 'w': 10, 'h': 10}]) == {}
    assert sanitize_rich([{'img': 'data:text/html;base64,PHNjcmlwdD4=', 'w': 10, 'h': 10}]) == {}


def test_no_runs_is_no_key_and_too_many_is_none():
    assert sanitize_rich(None) == {}
    assert sanitize_rich('<b>x</b>') == {}
    assert sanitize_rich([{'t': 'x'}] * 401) == {}
    assert sanitize_props('text', {'text': 'Plain'}) == {'text': 'Plain', 'href': ''}


def test_text_and_heading_blocks_carry_runs():
    assert sanitize_props('heading', {'text': 'Hi', 'level': 'h1', 'rich': [{'t': 'Hi', 'b': '700'}]})['rich'] == [{'t': 'Hi', 'b': '700'}]
    assert sanitize_props('text', {'text': 'Hi', 'rich': [{'t': 'Hi'}]})['rich'] == [{'t': 'Hi'}]


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


def as_user(user):
    api = APIClient()
    if user:
        api.force_authenticate(user)
    return api


def schema(runs, faces=''):
    block = {'id': 'text_1', 'type': 'text', 'props': {'text': 'Hi', 'rich': runs}, 'styles': {'fontVariantNumeric': 'tabular-nums'}, 'layout': {'x': 0, 'y': 0, 'w': 100, 'h': 30}}
    return {'theme': {}, 'fontFaces': faces, 'pages': [{'id': 'home', 'name': 'Home', 'mode': 'empty', 'components': [block]}]}


FACE = '@font-face{font-family:"Okul";src:url(data:font/woff2;base64,d09GMk9UVE8=) format("woff2")}'


def test_a_site_keeps_runs_digits_and_its_own_fonts_and_nothing_else_of_the_css(owner):
    faces = FACE + '@font-face{font-family:"Bad";src:url(https://evil.example/f.woff2)}body{color:red}@import url(x.css);'
    res = as_user(owner).post('/api/sites/', {'title': 'Olive', 'schema': schema([{'t': 'Hi', 'b': '700'}], faces)}, format='json')

    assert res.status_code == 201, res.data
    saved = Site.objects.get(pk=res.data['id']).schema
    assert saved['fontFaces'] == FACE
    block = saved['pages'][0]['components'][0]
    assert block['props']['rich'] == [{'t': 'Hi', 'b': '700'}]
    assert block['styles'] == {'fontVariantNumeric': 'tabular-nums'}


def test_a_site_without_its_own_fonts_has_no_key(owner):
    res = as_user(owner).post('/api/sites/', {'title': 'Olive', 'schema': schema([])}, format='json')

    assert 'fontFaces' not in Site.objects.get(pk=res.data['id']).schema


def test_nobody_else_can_write_runs_or_fonts(owner):
    res = as_user(owner).post('/api/sites/', {'title': 'Olive', 'schema': schema([{'t': 'Hi'}], FACE)}, format='json')
    site_id = res.data['id']
    changed = {'schema': schema([{'t': 'Hi', 'b': '700'}], '')}

    stranger = User.objects.create_user('bob', 'bob@example.com', 'secret123')
    assert as_user(stranger).patch(f'/api/sites/{site_id}/', changed, format='json').status_code == 404
    assert as_user(None).patch(f'/api/sites/{site_id}/', changed, format='json').status_code in (401, 403)

    saved = Site.objects.get(pk=site_id).schema
    assert saved['fontFaces'] == FACE
    assert saved['pages'][0]['components'][0]['props']['rich'] == [{'t': 'Hi'}]
