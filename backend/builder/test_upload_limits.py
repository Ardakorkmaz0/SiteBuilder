"""Multipart size checks run while receiving bytes, before image validation."""
import io
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory
from PIL import Image
from rest_framework.test import APIClient

from .upload_limits import LimitedUploadHandler, UploadLimitExceeded


def _png(size):
    data = io.BytesIO()
    Image.new('RGB', (2, 2)).save(data, format='PNG')
    return data.getvalue().ljust(size, b'\0')


@pytest.fixture
def uploader(db, django_user_model, settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / 'media'
    temporary = tmp_path / 'temporary'
    temporary.mkdir()
    settings.FILE_UPLOAD_TEMP_DIR = temporary
    # Exercise cleanup on disk too, even though ordinary small files use RAM.
    settings.FILE_UPLOAD_MAX_MEMORY_SIZE = 1
    client = APIClient()
    client.force_authenticate(django_user_model.objects.create_user('limited-uploader'))
    return client


@pytest.mark.parametrize('debug', [True, False])
@pytest.mark.parametrize('path,field,method', [
    ('/api/images/', 'file', 'post'),
    ('/api/profile/', 'avatar', 'patch'),
])
def test_oversized_file_is_rejected_before_validation_and_cleans_partial_files(
    uploader, settings, debug, path, field, method,
):
    settings.DEBUG = debug
    upload = SimpleUploadedFile('oversized.png', _png(settings.MAX_UPLOAD_FILE_BYTES + 1), 'image/png')
    with patch('PIL.Image.open', side_effect=AssertionError('Oversized bytes reached Pillow')):
        response = getattr(uploader, method)(path, {field: upload}, format='multipart')
    assert response.status_code == 413
    assert response.data['code'] == 'upload_too_large'
    assert not list(settings.FILE_UPLOAD_TEMP_DIR.iterdir())
    assert not settings.MEDIA_ROOT.exists()


@pytest.mark.parametrize('debug', [True, False])
def test_multipart_body_limit_precedes_storage(uploader, settings, debug):
    settings.DEBUG = debug
    upload = SimpleUploadedFile('too-large.png', b'x' * settings.MAX_MULTIPART_BODY_BYTES, 'image/png')
    with patch('django.core.files.uploadhandler.TemporaryFileUploadHandler.new_file',
               side_effect=AssertionError('Oversized request reached storage')):
        response = uploader.post('/api/images/', {'file': upload}, format='multipart')
    assert response.status_code == 413
    assert response.data['code'] == 'upload_too_large'
    assert not list(settings.FILE_UPLOAD_TEMP_DIR.iterdir())


@pytest.mark.parametrize('debug', [True, False])
def test_image_at_the_five_mb_limit_still_uploads(uploader, settings, debug):
    settings.DEBUG = debug
    upload = SimpleUploadedFile('limit.png', _png(settings.MAX_UPLOAD_FILE_BYTES), 'image/png')
    response = uploader.post('/api/images/', {'file': upload}, format='multipart')
    assert response.status_code == 201, response.data
    assert response.data['size'] == settings.MAX_UPLOAD_FILE_BYTES
    assert not list(settings.FILE_UPLOAD_TEMP_DIR.iterdir())


def test_streamed_bytes_are_checked_even_without_a_declared_size(settings):
    request = RequestFactory().post('/api/images/')
    handler = LimitedUploadHandler(request)
    handler.handle_raw_input(None, {}, None, b'boundary')
    handler.receive_data_chunk(b'x' * settings.MAX_UPLOAD_FILE_BYTES, 0)
    with pytest.raises(UploadLimitExceeded):
        handler.receive_data_chunk(b'x', settings.MAX_UPLOAD_FILE_BYTES)
