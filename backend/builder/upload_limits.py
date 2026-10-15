"""Reject oversized multipart uploads before they fill memory or temporary disk.

Django's FILE_UPLOAD_MAX_MEMORY_SIZE only chooses memory versus disk storage;
DATA_UPLOAD_MAX_MEMORY_SIZE excludes file bytes during multipart parsing.
This handler runs before either storage handler and checks the streamed bytes.
"""
from django.conf import settings
from django.core.exceptions import RequestDataTooBig
from django.core.files.uploadhandler import FileUploadHandler


class UploadLimitExceeded(RequestDataTooBig):
    """Django returns 400; the DRF exception handler supplies a structured 413."""


class LimitedUploadHandler(FileUploadHandler):
    def __init__(self, request=None):
        super().__init__(request)
        self.received = 0

    def _reject(self):
        # MultipartParser closes completed files after an exception, but an
        # in-progress TemporaryFileUploadHandler file is not yet in FILES.
        # Close it here so an aborted request also removes its partial bytes.
        if self.request is not None:
            for handler in self.request.upload_handlers:
                file = getattr(handler, 'file', None)
                if file is not None:
                    file.close()
        raise UploadLimitExceeded('Upload too large. Each image may be at most 5 MB; the request may be at most 6 MB.')

    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        if content_length is not None and content_length > settings.MAX_MULTIPART_BODY_BYTES:
            self._reject()

    def receive_data_chunk(self, raw_data, start):
        self.received += len(raw_data)
        if start + len(raw_data) > settings.MAX_UPLOAD_FILE_BYTES or self.received > settings.MAX_MULTIPART_BODY_BYTES:
            self._reject()
        return raw_data

    def file_complete(self, file_size):
        # Let the normal memory/temporary handlers produce UploadedFile objects.
        return None
