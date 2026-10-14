"""The superadmin's AI switches: what the editor is told it may offer, and the
providers that come through this server refusing once they are switched off.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from . import ai_relay
from .models import SiteSettings

CONFIG = '/api/public/config/'
SETTINGS = '/api/admin/settings/'
CHAT = '/api/ai/nvidia/chat/'
MODELS = '/api/ai/nvidia/models/'
BODY = {
    'model': 'nvidia/nemotron-3-super-120b-a12b',
    'messages': [{'role': 'user', 'content': 'Hello'}],
    '_apiKey': 'nvapi-test-key-0123456789',  # not a real key
}


def _configure(**fields):
    config = SiteSettings.load()
    for name, value in fields.items():
        setattr(config, name, value)
    config.save()


@pytest.fixture
def root(db):
    user = User.objects.create_superuser('root', 'root@example.com', 'secret123')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')
    return client


@pytest.fixture
def member(db):
    client = APIClient()
    client.force_authenticate(User.objects.create_user('member', password='x'))
    return client


@pytest.fixture
def upstream(monkeypatch):
    calls = []

    def fake_open(request_or_url, timeout):
        calls.append(request_or_url)
        raise AssertionError('a switched-off provider must not be called')

    monkeypatch.setattr(ai_relay, '_open', fake_open)
    return calls


@pytest.mark.django_db
class TestWhatTheEditorIsTold:
    def test_everything_is_on_by_default_except_local_on_a_public_server(self, settings):
        settings.DEBUG = False
        ai = APIClient().get(CONFIG).json()['ai']
        assert ai == {
            'enabled': True,
            'providers': ['openrouter', 'groq', 'gemini', 'nvidia'],
            'hidden_models': {},
            'default_provider': '',
            'notice': '',
        }

    def test_the_local_runtime_is_offered_where_it_can_work(self, settings):
        settings.DEBUG = True
        assert 'local' in APIClient().get(CONFIG).json()['ai']['providers']

    def test_a_switched_off_provider_leaves_the_list(self, settings):
        settings.DEBUG = True
        _configure(ai_disabled_providers=['local', 'groq'])
        assert APIClient().get(CONFIG).json()['ai']['providers'] == ['openrouter', 'gemini', 'nvidia']

    def test_the_main_switch_takes_every_provider_away(self):
        _configure(ai_enabled=False, ai_notice='Bakımda')
        ai = APIClient().get(CONFIG).json()['ai']
        assert ai['enabled'] is False
        assert ai['providers'] == []
        assert ai['notice'] == 'Bakımda'

    def test_hidden_models_and_the_start_provider_follow_the_list(self):
        _configure(
            ai_disabled_providers=['groq'],
            ai_hidden_models={'openrouter': ['qwen/qwen3-coder:free'], 'groq': ['llama-3.1-8b-instant']},
            ai_default_provider='groq',
        )
        ai = APIClient().get(CONFIG).json()['ai']
        assert ai['hidden_models'] == {'openrouter': ['qwen/qwen3-coder:free']}
        # A start provider that is switched off is no start provider.
        assert ai['default_provider'] == ''

        _configure(ai_default_provider='gemini')
        assert APIClient().get(CONFIG).json()['ai']['default_provider'] == 'gemini'


@pytest.mark.django_db
class TestTheProvidersThatComeThroughHere:
    @pytest.mark.parametrize('fields', [{'ai_enabled': False}, {'ai_disabled_providers': ['nvidia']}])
    def test_nvidia_is_refused_once_switched_off(self, member, upstream, fields):
        _configure(**fields)

        chat = member.post(CHAT, BODY, format='json')
        listing = member.get(MODELS)

        assert chat.status_code == 403
        assert chat.json()['error']['code'] == 'ai_provider_disabled'
        assert listing.status_code == 403
        assert upstream == []

    def test_the_local_runtime_is_refused_once_switched_off(self, settings):
        settings.DEBUG = True
        _configure(ai_disabled_providers=['local'])
        client = APIClient()

        status = client.get('/api/ai/local/status/')
        proxy = client.post('/api/ai/local/proxy/', {'messages': []}, format='json')

        assert status.status_code == 403
        assert proxy.status_code == 403
        assert proxy.json()['code'] == 'ai_provider_disabled'


@pytest.mark.django_db
class TestTheSettingsPage:
    def test_it_reads_and_writes_the_ai_switches(self, root, settings):
        settings.DEBUG = False
        data = root.get(SETTINGS).json()
        assert data['ai_enabled'] is True
        assert data['ai_local_available'] is False

        response = root.put(SETTINGS, {
            'ai_disabled_providers': ['nvidia', 'local', 'nvidia'],
            'ai_hidden_models': {'openrouter': ['a/b:free', 'a/b:free'], 'groq': []},
            'ai_default_provider': 'gemini',
            'ai_notice': 'Gemini yavaş',
        }, format='json')

        assert response.status_code == 200
        saved = response.json()
        # Kept in the editor's order, without repeats or empty lists.
        assert saved['ai_disabled_providers'] == ['local', 'nvidia']
        assert saved['ai_hidden_models'] == {'openrouter': ['a/b:free']}
        assert saved['ai_default_provider'] == 'gemini'
        assert APIClient().get(CONFIG).json()['ai']['notice'] == 'Gemini yavaş'

    def test_one_switch_alone_can_be_sent(self, root):
        assert root.put(SETTINGS, {'ai_enabled': False}, format='json').status_code == 200
        assert SiteSettings.load().ai_enabled is False

    @pytest.mark.parametrize('payload', [
        {'ai_disabled_providers': ['openai']},
        {'ai_disabled_providers': 'groq'},
        {'ai_hidden_models': {'openai': ['x']}},
        {'ai_hidden_models': {'groq': ['has space']}},
        {'ai_hidden_models': ['groq']},
        {'ai_default_provider': 'openai'},
        {'ai_notice': 'x' * 301},
    ])
    def test_it_refuses_what_the_editor_could_not_read(self, root, payload):
        assert root.put(SETTINGS, payload, format='json').status_code == 400

    def test_only_a_superuser_may_change_them(self, member):
        assert member.put(SETTINGS, {'ai_enabled': False}, format='json').status_code == 403
        assert SiteSettings.load().ai_enabled is True
