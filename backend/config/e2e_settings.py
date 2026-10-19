"""Playwright-only mail delivery: local files, never SMTP or console tokens."""

from .settings import *  # noqa: F403
from .settings import BASE_DIR

EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_HOST = ''
EMAIL_CONFIGURED = False
EMAIL_FILE_PATH = str(BASE_DIR.parent / 'frontend' / 'e2e' / '.mail')
FRONTEND_URL = 'http://localhost:5173'
