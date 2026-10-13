"""The NVIDIA relay: what it passes on, and what it must refuse to become.

No request leaves the machine: the one function that opens the upstream
connection is replaced, and what it was handed is what gets checked.
"""
import io
import json
import urllib.error

import pytest
from django.contrib.auth.models import User
from django.core.cache import cache
from rest_framework.test import APIClient

from . import ai_relay

CHAT = '/api/ai/nvidia/chat/'
MODELS = '/api/ai/nvidia/models/'
KEY = 'nvapi-test-key-0123456789'  # not a real key
BODY = {
    'model': 'nvidia/nemotron-3-super-120b-a12b',
    'messages': [{'role': 'user', 'content': 'Hello'}],
    '_apiKey': KEY,
}


class _Answer:
    def __init__(self, payload, code=200):
        self.status = code
        self._raw = payload if isinstance(payload, bytes) else json.dumps(payload).encode()

    def read(self, _limit=None):
        return self._raw

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False


@pytest.fixture
def api(db):
    client = APIClient()
    client.force_authenticate(User.objects.create_user('relay-user', password='x'))
    return client


@pytest.fixture
def upstream(monkeypatch):
    """Stand in for NVIDIA. `calls` holds every request the relay opened."""
    calls = []
    state = {'answer': _Answer({'choices': [{'message': {'content': 'Hi'}}]})}

    def fake_open(request_or_url, timeout):
        calls.append((request_or_url, timeout))
        answer = state['answer']
        if isinstance(answer, Exception):
            raise answer
        return answer

    monkeypatch.setattr(ai_relay, '_open', fake_open)
    return {'calls': calls, 'state': state}


class TestWhoMayUseIt:
    def test_signed_out_callers_are_turned_away(self, db, upstream):
        response = APIClient().post(CHAT, BODY, format='json')
        assert response.status_code in (401, 403)
        assert upstream['calls'] == []

    def test_a_request_without_a_key_goes_nowhere(self, api, upstream):
        body = {k: v for k, v in BODY.items() if k != '_apiKey'}
        assert api.post(CHAT, body, format='json').status_code == 401
        assert upstream['calls'] == []

    @pytest.mark.parametrize('key', ['short', 'has space in it', 'line\r\nX-Injected: 1', 12345])
    def test_a_key_that_could_break_out_of_its_header_is_refused(self, api, upstream, key):
        assert api.post(CHAT, {**BODY, '_apiKey': key}, format='json').status_code == 401
        assert upstream['calls'] == []


class TestWhatItPassesOn:
    def test_the_request_goes_to_nvidia_with_the_callers_key(self, api, upstream):
        response = api.post(CHAT, {**BODY, '_localBase': 'http://169.254.169.254/'}, format='json')

        assert response.status_code == 200
        assert response.json()['choices'][0]['message']['content'] == 'Hi'
        request, timeout = upstream['calls'][0]
        # Always this address, whatever the request says.
        assert request.full_url == 'https://integrate.api.nvidia.com/v1/chat/completions'
        assert request.get_header('Authorization') == f'Bearer {KEY}'
        assert timeout < 120  # under the worker's own timeout
        sent = json.loads(request.data)
        # The key and the editor's private fields stay behind, and no stream.
        assert not [name for name in sent if name.startswith('_')]
        assert KEY not in request.data.decode()
        assert sent['stream'] is False
        assert sent['model'] == BODY['model']

    def test_the_key_never_comes_back(self, api, upstream):
        upstream['state']['answer'] = urllib.error.HTTPError(
            ai_relay.NVIDIA_CHAT_URL, 401, 'Unauthorized', {}, io.BytesIO(b'{"error":{"message":"bad key"}}'),
        )
        response = api.post(CHAT, BODY, format='json')
        assert response.status_code == 401
        assert KEY not in json.dumps(response.json())

    @pytest.mark.parametrize('code', [401, 404, 429, 500])
    def test_nvidias_own_refusal_keeps_its_status(self, api, upstream, code):
        upstream['state']['answer'] = urllib.error.HTTPError(
            ai_relay.NVIDIA_CHAT_URL, code, 'No', {}, io.BytesIO(b'{"error":{"message":"from nvidia"}}'),
        )
        response = api.post(CHAT, BODY, format='json')
        assert response.status_code == code
        assert response.json()['error']['message'] == 'from nvidia'

    def test_a_redirect_is_not_followed_or_passed_on(self, api, upstream):
        upstream['state']['answer'] = urllib.error.HTTPError(
            ai_relay.NVIDIA_CHAT_URL, 302, 'Found', {'Location': 'https://elsewhere.example/'}, io.BytesIO(b''),
        )
        assert api.post(CHAT, BODY, format='json').status_code == 502
        assert len(upstream['calls']) == 1

    def test_an_unreachable_or_slow_nvidia_is_said_plainly(self, api, upstream):
        upstream['state']['answer'] = urllib.error.URLError('no route')
        assert api.post(CHAT, BODY, format='json').status_code == 502
        upstream['state']['answer'] = TimeoutError()
        assert api.post(CHAT, BODY, format='json').status_code == 504

    @pytest.mark.parametrize('patch', [
        {'model': ''},
        {'model': 'has space'},
        {'model': ['a']},
        {'messages': []},
        {'messages': 'hello'},
    ])
    def test_a_malformed_request_is_refused_before_it_leaves(self, api, upstream, patch):
        assert api.post(CHAT, {**BODY, **patch}, format='json').status_code == 400
        assert upstream['calls'] == []

    def test_an_oversized_request_is_refused(self, api, upstream):
        big = {**BODY, 'messages': [{'role': 'user', 'content': 'x' * (ai_relay.MAX_REQUEST_BYTES + 1)}]}
        assert api.post(CHAT, big, format='json').status_code == 413
        assert upstream['calls'] == []


class TestItCannotStallTheSite:
    def test_only_so_many_calls_run_at_once(self, api, upstream):
        # Every place is taken by calls still waiting on a model.
        for index in range(ai_relay.RELAY_SLOTS):
            cache.add(f'ai_relay:nvidia:slot:{index}', 1, timeout=60)

        response = api.post(CHAT, BODY, format='json')

        assert response.status_code == 429
        assert response['Retry-After']
        assert upstream['calls'] == []

    def test_one_account_holds_one_place(self, api, upstream):
        user = User.objects.get(username='relay-user')
        cache.add(f'ai_relay:nvidia:user:{user.pk}', 1, timeout=60)
        assert api.post(CHAT, BODY, format='json').status_code == 429
        assert upstream['calls'] == []

    def test_a_finished_call_gives_its_place_back(self, api, upstream):
        for _ in range(ai_relay.RELAY_SLOTS + 2):
            assert api.post(CHAT, BODY, format='json').status_code == 200

    def test_a_failed_call_gives_its_place_back_too(self, api, upstream):
        upstream['state']['answer'] = urllib.error.URLError('down')
        for _ in range(ai_relay.RELAY_SLOTS + 2):
            assert api.post(CHAT, BODY, format='json').status_code == 502


class TestTheModelList:
    def test_it_lists_what_nvidia_offers_and_asks_once(self, api, upstream):
        upstream['state']['answer'] = _Answer({'data': [
            {'id': 'z-ai/glm-5.3'}, {'id': 'moonshotai/kimi-k3'}, {'id': 'bad id with spaces'}, {'nope': 1},
        ]})

        first = api.get(MODELS).json()
        second = api.get(MODELS).json()

        assert first == {'ok': True, 'models': ['moonshotai/kimi-k3', 'z-ai/glm-5.3']}
        assert second == first
        assert len(upstream['calls']) == 1
        assert upstream['calls'][0][0] == 'https://integrate.api.nvidia.com/v1/models'

    def test_it_is_only_a_suggestion_when_nvidia_cannot_be_reached(self, api, upstream):
        upstream['state']['answer'] = urllib.error.URLError('down')
        assert api.get(MODELS).json() == {'ok': False, 'models': []}

    def test_signed_out_callers_get_nothing(self, db, upstream):
        assert APIClient().get(MODELS).status_code in (401, 403)
        assert upstream['calls'] == []
