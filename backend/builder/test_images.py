"""Endpoint tests for /api/images/ — upload, list, delete.

These exercise the per-user scoping (token X can never see token Y's images),
the MIME / size validators, and the Pillow back-fill of width/height.
"""
import io
import pytest
from django.contrib.auth.models import User
from PIL import Image as PILImage
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import UploadedImage


def _png_bytes(width=4, height=3, color=(255, 0, 128)):
    """A real PNG so Pillow's image_size check passes."""
    img = PILImage.new('RGB', (width, height), color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


@pytest.fixture
def alice(db):
    user = User.objects.create_user(username='alice', password='secret123')
    token = Token.objects.create(user=user)
    return user, token


@pytest.fixture
def bob(db):
    user = User.objects.create_user(username='bob', password='secret123')
    token = Token.objects.create(user=user)
    return user, token


@pytest.fixture
def client():
    return APIClient()


def _auth(client, token):
    client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')


@pytest.mark.django_db
class TestImageUpload:
    def test_unauthenticated_upload_rejected(self, client):
        from django.core.files.uploadedfile import SimpleUploadedFile
        resp = client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('x.png', _png_bytes(), 'image/png')},
            format='multipart',
        )
        assert resp.status_code in (401, 403)

    def test_authenticated_upload_creates_image_and_returns_url(self, client, alice, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, token = alice
        _auth(client, token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        resp = client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('logo.png', _png_bytes(40, 20), 'image/png')},
            format='multipart',
        )
        assert resp.status_code == 201, resp.data
        body = resp.data
        assert body['url'].startswith('http')  # absolute
        assert '/media/images/' in body['url']
        assert body['width'] == 40
        assert body['height'] == 20
        assert body['size'] > 0

    def test_upload_too_large_rejected(self, client, alice, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, token = alice
        _auth(client, token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        # Build a genuinely big PNG (Pillow validates the bytes before our
        # size check runs, so junk bytes wouldn't exercise the size guard).
        # 2000x2000 RGB noise compresses badly enough to land well over 5 MB.
        import random
        big = PILImage.new('RGB', (2000, 2000))
        big.putdata([(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
                     for _ in range(2000 * 2000)])
        buf = io.BytesIO()
        big.save(buf, format='PNG')
        assert buf.tell() > 5 * 1024 * 1024, f'fixture is only {buf.tell()} bytes — too small to trigger size guard'
        resp = client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('huge.png', buf.getvalue(), 'image/png')},
            format='multipart',
        )
        assert resp.status_code == 400
        assert 'too large' in str(resp.data).lower()

    def test_upload_wrong_mime_rejected(self, client, alice, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, token = alice
        _auth(client, token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        # Lying about the body — PNG header but sent as text/html. Serializer
        # uses the declared content_type, which is the safest signal we have.
        resp = client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('x.html', _png_bytes(), 'text/html')},
            format='multipart',
        )
        assert resp.status_code == 400


# SVG was listed as allowed and said so in the error, but the model field ran
# every upload through Pillow, which cannot open SVG: a plain logo was refused
# as "not an image". It is checked as what it is instead, and anything in it
# that could run is refused rather than quietly rewritten.
LOGO_SVG = (b'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24">'
            b'<circle cx="12" cy="12" r="10" fill="#e8543f"/></svg>')


@pytest.mark.django_db
class TestSvgUploads:
    def _post(self, client, alice, settings, tmp_path, name, body, ctype='image/svg+xml'):
        settings.MEDIA_ROOT = tmp_path
        _, token = alice
        _auth(client, token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        return client.post('/api/images/', {'file': SimpleUploadedFile(name, body, ctype)}, format='multipart')

    def test_a_plain_svg_logo_uploads_with_its_size(self, client, alice, settings, tmp_path):
        resp = self._post(client, alice, settings, tmp_path, 'logo.svg', LOGO_SVG)
        assert resp.status_code == 201, resp.data
        assert resp.data['url'].endswith('.svg')
        assert (resp.data['width'], resp.data['height']) == (48, 24)

    def test_the_size_comes_from_the_view_box_when_none_is_given(self, client, alice, settings, tmp_path):
        body = b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><rect width="120" height="40"/></svg>'
        resp = self._post(client, alice, settings, tmp_path, 'mark.svg', body)
        assert resp.status_code == 201, resp.data
        assert (resp.data['width'], resp.data['height']) == (120, 40)

    @pytest.mark.parametrize('body', [
        b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        b'<svg xmlns="http://www.w3.org/2000/svg"><rect onload="alert(1)" width="1" height="1"/></svg>',
        b'<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>',
        b'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><rect width="1" height="1"/></a></svg>',
        b'<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
    ])
    def test_anything_that_could_run_is_refused(self, client, alice, settings, tmp_path, body):
        resp = self._post(client, alice, settings, tmp_path, 'bad.svg', body)
        assert resp.status_code == 400
        assert not UploadedImage.objects.exists()

    @pytest.mark.parametrize('name,body', [
        ('fake.svg', b'<html><body>not a picture</body></html>'),
        ('broken.svg', b'<svg xmlns="http://www.w3.org/2000/svg"><rect'),
        ('page.html', LOGO_SVG),
    ])
    def test_what_is_not_an_svg_file_is_refused(self, client, alice, settings, tmp_path, name, body):
        resp = self._post(client, alice, settings, tmp_path, name, body)
        assert resp.status_code == 400
        assert not UploadedImage.objects.exists()

    def test_a_png_still_has_to_have_an_image_extension(self, client, alice, settings, tmp_path):
        resp = self._post(client, alice, settings, tmp_path, 'page.html', _png_bytes(), 'image/png')
        assert resp.status_code == 400


@pytest.mark.django_db
class TestImageScoping:
    def test_list_only_returns_own_images(self, client, alice, bob, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        # Alice uploads.
        _, alice_token = alice
        _auth(client, alice_token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('a.png', _png_bytes(), 'image/png')},
            format='multipart',
        )
        # Bob uploads.
        _, bob_token = bob
        _auth(client, bob_token)
        client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('b.png', _png_bytes(), 'image/png')},
            format='multipart',
        )
        # Each should see only their own.
        _auth(client, alice_token)
        resp = client.get('/api/images/')
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert 'a' in resp.data[0]['url']

        _auth(client, bob_token)
        resp = client.get('/api/images/')
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert 'b' in resp.data[0]['url']

    def test_cannot_delete_another_users_image(self, client, alice, bob, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, alice_token = alice
        _auth(client, alice_token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('a.png', _png_bytes(), 'image/png')},
            format='multipart',
        )
        img_id = upload.data['id']
        # Bob tries to delete Alice's image.
        _, bob_token = bob
        _auth(client, bob_token)
        resp = client.delete(f'/api/images/{img_id}/')
        # ViewSet's get_queryset filters by owner → 404 from DRF.
        assert resp.status_code == 404
        # Alice's image still there.
        assert UploadedImage.objects.filter(pk=img_id).exists()

    def test_owner_can_delete_own_image(self, client, alice, settings, tmp_path):
        settings.MEDIA_ROOT = tmp_path
        _, token = alice
        _auth(client, token)
        from django.core.files.uploadedfile import SimpleUploadedFile
        upload = client.post(
            '/api/images/',
            {'file': SimpleUploadedFile('a.png', _png_bytes(), 'image/png')},
            format='multipart',
        )
        img_id = upload.data['id']
        resp = client.delete(f'/api/images/{img_id}/')
        assert resp.status_code == 204
        assert not UploadedImage.objects.filter(pk=img_id).exists()
