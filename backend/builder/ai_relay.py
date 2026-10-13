"""Relay for an AI provider that refuses calls from a browser.

NVIDIA's hosted API (integrate.api.nvidia.com) answers a browser's preflight
without Access-Control-Allow-Origin, so the editor cannot call it the way it
calls Gemini, Groq or OpenRouter. The request comes here instead, carrying the
user's OWN NVIDIA key in its body, and is passed on.

What this must never become:

- An open relay. Only signed-in accounts (guests included) may use it, each
  under its own rate limit.
- A way to reach anything else. The upstream address is fixed in this file,
  never taken from the request, and a redirect is refused rather than followed.
- A place the key rests. It is read from the body, put into the upstream
  Authorization header, and nothing is written: no log line, no cache entry,
  no database row, and it is never echoed back.
- A way to stall the site. gunicorn runs a few synchronous workers and every
  relayed call holds one for as long as the model takes. Only RELAY_SLOTS calls
  run at once, and one account holds one of them at a time; the next caller is
  told to try again in a moment.
"""
import json
import re
import socket
import urllib.error
import urllib.request

from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

NVIDIA_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
NVIDIA_MODELS_URL = 'https://integrate.api.nvidia.com/v1/models'

# Below gunicorn's 120s worker timeout, so a slow model ends as an answer the
# editor can show instead of a killed worker.
UPSTREAM_TIMEOUT = 100
MODELS_TIMEOUT = 8
# Three workers serve the whole site; two may be waiting on a model at once.
RELAY_SLOTS = 2
# A slot frees itself even if the worker holding it dies.
SLOT_TTL = UPSTREAM_TIMEOUT + 20
MODELS_CACHE_SECONDS = 60 * 60

# The editor's largest request is the page (up to ~30k characters of HTML) plus
# the tool declarations and a few turns of history.
MAX_REQUEST_BYTES = 600_000
MAX_RESPONSE_BYTES = 4_000_000

# A key goes into a header: letters, digits and the few punctuation marks keys
# use, nothing that could end the header line.
_KEY_RE = re.compile(r'^[A-Za-z0-9._\-]{8,300}$')
_MODEL_RE = re.compile(r'^[A-Za-z0-9._:/\-]{1,160}$')


class _NoRedirects(urllib.request.HTTPRedirectHandler):
    """A redirect would carry the user's key to wherever it points."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ARG002
        return None


_OPENER = urllib.request.build_opener(_NoRedirects)


def _open(request_or_url, timeout):
    return _OPENER.open(request_or_url, timeout=timeout)


def _error(message, http_status, **extra):
    """The shape the editor already reads from every provider."""
    return Response({'error': {'message': message, **extra}}, status=http_status)


def _take_slot(user_id):
    """Reserve a place for this call. Returns the cache keys to release, or
    None when the relay is full or this account already has a call running."""
    mine = f'ai_relay:nvidia:user:{user_id}'
    if not cache.add(mine, 1, timeout=SLOT_TTL):
        return None
    for index in range(RELAY_SLOTS):
        slot = f'ai_relay:nvidia:slot:{index}'
        if cache.add(slot, 1, timeout=SLOT_TTL):
            return (mine, slot)
    cache.delete(mine)
    return None


def _release(keys):
    for key in keys or ():
        cache.delete(key)


class NvidiaChatRelayView(APIView):
    """Pass one chat-completions request on to NVIDIA with the caller's key."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_relay'

    def post(self, request):
        body = request.data.copy() if isinstance(request.data, dict) else None
        if body is None:
            return _error('The request must be a JSON object.', status.HTTP_400_BAD_REQUEST)

        api_key = body.pop('_apiKey', '')
        if not isinstance(api_key, str) or not _KEY_RE.match(api_key):
            return _error(
                'Add your NVIDIA API key in the AI settings.', status.HTTP_401_UNAUTHORIZED,
            )
        model = body.get('model')
        if not isinstance(model, str) or not _MODEL_RE.match(model):
            return _error('Choose a model in the AI settings.', status.HTTP_400_BAD_REQUEST)
        if not isinstance(body.get('messages'), list) or not body['messages']:
            return _error('The request has no messages.', status.HTTP_400_BAD_REQUEST)
        # Private fields of the editor never travel on, and the answer is
        # passed back whole: a stream would hold the worker open-ended.
        for name in [key for key in body if key.startswith('_')]:
            body.pop(name)
        body['stream'] = False

        payload = json.dumps(body).encode('utf-8')
        if len(payload) > MAX_REQUEST_BYTES:
            return _error(
                'The request is too large to send.', status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        held = _take_slot(request.user.pk)
        if held is None:
            response = _error(
                'The AI relay is busy. Try again in a moment.',
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
            response['Retry-After'] = '5'
            return response
        try:
            return self._forward(payload, api_key)
        finally:
            _release(held)

    def _forward(self, payload, api_key):
        upstream = urllib.request.Request(
            NVIDIA_CHAT_URL,
            data=payload,
            method='POST',
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
        )
        try:
            with _open(upstream, timeout=UPSTREAM_TIMEOUT) as resp:
                return _passed_back(resp.status, resp.read(MAX_RESPONSE_BYTES + 1))
        except urllib.error.HTTPError as exc:
            if 300 <= exc.code < 400:
                return _error(
                    'NVIDIA answered with a redirect, which is not followed.',
                    status.HTTP_502_BAD_GATEWAY,
                )
            # NVIDIA's own answer (a rejected key, a quota, a retired model):
            # the editor knows how to explain each of these by its status.
            try:
                raw = exc.read(MAX_RESPONSE_BYTES + 1)
            except Exception:  # noqa: BLE001 - a body that cannot be read is no body
                raw = b''
            return _passed_back(exc.code, raw, fallback=str(exc.reason or ''))
        except (socket.timeout, TimeoutError):
            return _error('NVIDIA took too long to answer.', status.HTTP_504_GATEWAY_TIMEOUT)
        except urllib.error.URLError as exc:
            if isinstance(exc.reason, (socket.timeout, TimeoutError)):
                return _error('NVIDIA took too long to answer.', status.HTTP_504_GATEWAY_TIMEOUT)
            return _error('Could not reach NVIDIA.', status.HTTP_502_BAD_GATEWAY)


def _passed_back(code, raw, fallback=''):
    if len(raw) > MAX_RESPONSE_BYTES:
        return _error('The answer was too large to pass back.', status.HTTP_502_BAD_GATEWAY)
    text = raw.decode('utf-8', errors='replace')
    try:
        parsed = json.loads(text)
    except ValueError:
        parsed = None
    if isinstance(parsed, dict):
        return Response(parsed, status=code)
    if 200 <= code < 300:
        return _error('NVIDIA sent an answer that is not JSON.', status.HTTP_502_BAD_GATEWAY)
    return _error((text or fallback or 'NVIDIA refused the request.')[:500], code)


class NvidiaModelsRelayView(APIView):
    """The models NVIDIA offers right now, for the model field's suggestions.

    The list is public (no key) but, like the rest of that API, closed to
    browsers. It changes often, so it is asked for at most once an hour and
    shared by everyone.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai_relay'

    def get(self, request):  # noqa: ARG002
        cached = cache.get('ai_relay:nvidia:models')
        if cached is not None:
            return Response({'ok': True, 'models': cached})
        try:
            with _open(NVIDIA_MODELS_URL, timeout=MODELS_TIMEOUT) as resp:
                listing = json.loads(resp.read(MAX_RESPONSE_BYTES).decode('utf-8'))
        except Exception:  # noqa: BLE001 - the suggestions are optional
            return Response({'ok': False, 'models': []})
        rows = listing.get('data') if isinstance(listing, dict) else None
        models = sorted({
            row['id'] for row in rows or []
            if isinstance(row, dict) and isinstance(row.get('id'), str) and _MODEL_RE.match(row['id'])
        })
        cache.set('ai_relay:nvidia:models', models, MODELS_CACHE_SECONDS)
        return Response({'ok': True, 'models': models})
