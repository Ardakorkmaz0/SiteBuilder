"""A file may be up to 100 MB: an uploaded image, a page's HTML, a published
page, a picture or the fonts kept inside the schema.

These used to stop at 2 to 6 MB. The sizes below sit above the old limits and
far under the new one, so a test fails if an old limit comes back.
"""
import io

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from .models import Profile, Site, UploadedImage
from .validators import clean_published_pages, sanitize_font_faces, sanitize_image_src

EIGHT_MB = 8 * 1024 * 1024


def _png(size):
    data = io.BytesIO()
    Image.new('RGB', (2, 2)).save(data, format='PNG')
    return data.getvalue().ljust(size, b'\0')


def _page(html):
    return {'id': 'page_home', 'name': 'Home', 'mode': 'html', 'html': html, 'components': []}


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


def _client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


@pytest.fixture
def media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / 'media'
    return settings.MEDIA_ROOT


def test_a_page_with_eight_mb_of_html_is_kept(owner):
    html = '<p>' + 'a' * (EIGHT_MB - 7) + '</p>'
    res = _client(owner).post('/api/sites/', {'title': 'Big', 'html': '', 'schema': {'theme': {}, 'pages': [_page(html)]}}, format='json')
    assert res.status_code == 201, str(res.data)[:300]
    assert len(Site.objects.get(pk=res.data['id']).schema['pages'][0]['html']) == EIGHT_MB


def test_eight_mb_of_site_html_is_saved_only_by_its_owner(owner):
    site = Site.objects.create(owner=owner, title='Big', html='<p>old</p>', schema={'theme': {}, 'pages': []})
    html = 'b' * EIGHT_MB
    body = {'html': html, 'base_revision': site.revision}

    assert _client().patch(f'/api/sites/{site.pk}/', body, format='json').status_code in (401, 403)
    stranger = User.objects.create_user('eve', 'eve@example.com', 'secret123')
    assert _client(stranger).patch(f'/api/sites/{site.pk}/', body, format='json').status_code == 404
    site.refresh_from_db()
    assert site.html == '<p>old</p>'

    res = _client(owner).patch(f'/api/sites/{site.pk}/', body, format='json')
    assert res.status_code == 200, str(res.data)[:300]
    site.refresh_from_db()
    assert len(site.html) == EIGHT_MB


def test_an_eight_mb_image_uploads(owner, media):
    res = _client(owner).post('/api/images/', {'file': SimpleUploadedFile('big.png', _png(EIGHT_MB), 'image/png')}, format='multipart')
    assert res.status_code == 201, res.data
    assert UploadedImage.objects.get(owner=owner).size == EIGHT_MB


def test_a_profile_picture_still_stops_at_five_mb(owner, media):
    avatar = SimpleUploadedFile('me.png', _png(6 * 1024 * 1024), 'image/png')
    res = _client(owner).patch('/api/profile/', {'avatar': avatar}, format='multipart')
    assert res.status_code in (400, 413)
    profile = Profile.objects.filter(user=owner).first()
    assert profile is None or not profile.avatar


def test_a_published_page_of_two_mb_is_kept():
    pages = clean_published_pages([{'path': '/', 'title': 'Home', 'html': 'c' * 2_000_000}])
    assert len(pages[0]['html']) == 2_000_000


def test_a_six_mb_picture_inside_the_page_is_kept():
    src = 'data:image/png;base64,' + 'A' * (6 * 1024 * 1024)
    assert sanitize_image_src(src) == src


def test_two_mb_of_fonts_are_kept():
    rule = '@font-face{font-family:"Big";src:url(data:font/woff2;base64,' + 'A' * 2_000_000 + ')}'
    assert sanitize_font_faces(rule) == rule
