"""What the editor's AI assistant may offer, as the superadmin set it.

Most providers (Gemini, Groq, OpenRouter) are called from the user's browser
with the user's own key, so for them this is a statement of what the editor
shows: a provider switched off here is gone from the list, the failover and
every AI button. The two that come through this server (NVIDIA through
ai_relay.py, the local runtime through the local-AI proxy) are also refused
here, so an old tab cannot keep using them.
"""
import re

from django.conf import settings

from .models import SiteSettings

# The editor's provider ids (frontend/src/utils/aiProviders.js), in its order.
AI_PROVIDER_IDS = ('openrouter', 'groq', 'local', 'gemini', 'nvidia')

MODEL_ID_RE = re.compile(r'^[A-Za-z0-9._:/\-]{1,160}$')
MAX_HIDDEN_MODELS = 60


def local_ai_available():
    """The local runtime is reached through this server, which forwards to a
    URL the client names. On a public server that would let anyone make it
    fetch internal addresses, and it could never reach a visitor's own machine
    anyway, so it exists only when the app runs on the user's computer."""
    return bool(settings.DEBUG)


def provider_allowed(provider_id, config=None):
    """May the editor use this provider right now?"""
    config = config or SiteSettings.load()
    if not config.ai_enabled or provider_id not in AI_PROVIDER_IDS:
        return False
    if provider_id in (config.ai_disabled_providers or []):
        return False
    if provider_id == 'local' and not local_ai_available():
        return False
    return True


def public_ai_policy(config=None):
    """The part the editor reads (no secrets): which providers to show, which
    suggested models to leave out, where a new user starts, and a notice."""
    config = config or SiteSettings.load()
    providers = [p for p in AI_PROVIDER_IDS if provider_allowed(p, config)]
    default = config.ai_default_provider if config.ai_default_provider in providers else ''
    hidden = config.ai_hidden_models if isinstance(config.ai_hidden_models, dict) else {}
    return {
        'enabled': bool(config.ai_enabled),
        'providers': providers,
        'hidden_models': {p: list(hidden.get(p) or []) for p in providers if hidden.get(p)},
        'default_provider': default,
        'notice': config.ai_notice or '',
    }


def provider_refusal(provider_id):
    """The message for a call to a provider that is switched off, or None."""
    config = SiteSettings.load()
    if provider_allowed(provider_id, config):
        return None
    if not config.ai_enabled:
        return 'The AI assistant is switched off on this server.'
    return 'This AI provider is switched off on this server.'
