"""An inbox budget follows the verified visitor and site across every URL."""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle

from .models import FormSubmission, PublishedPage, Site
from .throttles import ScopedIPRateThrottle


pytestmark = pytest.mark.django_db
PAYLOAD = {'data': {'name': 'Visitor'}, 'page': '/contact/'}
IP = '192.0.2.20'


@pytest.fixture
def inboxes(settings, monkeypatch):
    settings.FRONTEND_URL = 'https://app.forms.example'
    settings.ALLOWED_HOSTS = ['testserver', 'app.forms.example']
    settings.CUSTOM_DOMAIN_TARGET = 'sites.example.com'
    monkeypatch.setattr(ScopedIPRateThrottle, 'THROTTLE_RATES', {
        **ScopedIPRateThrottle.THROTTLE_RATES, 'public_form': '2/min',
    })
    owner = User.objects.create_user('form-owner')
    other = User.objects.create_user('form-visitor')
    first = Site.objects.create(
        owner=owner, title='First inbox', slug='first-inbox', published=True,
        custom_domain='forms.example', domain_status='connected',
        domain_verified_at=timezone.now(),
    )
    second = Site.objects.create(owner=owner, title='Second inbox', slug='second-inbox', published=True)
    PublishedPage.objects.create(site=first, path='', title='Home', html='<h1>First</h1>')
    return first, second, owner, other


def client_for(user=None):
    client = APIClient()
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client


def address(site, alias):
    if alias == 'api':
        return f'/api/public/sites/{site.slug}/submit/', 'app.forms.example'
    if alias == 'shared':
        return f'/s/{site.slug}/__sitebuilder/form/', 'app.forms.example'
    return '/__sitebuilder/form/', site.custom_domain


def post(client, site, alias='api', *, ip=IP, body=None, **headers):
    path, host = address(site, alias)
    return client.post(
        path, PAYLOAD if body is None else body, format='json',
        HTTP_HOST=host, REMOTE_ADDR=ip, **headers,
    )


def assert_limited(response):
    assert response.status_code == 429
    assert response.data['code'] == 'throttled'
    assert 1 <= int(response['Retry-After']) <= 60


@pytest.mark.parametrize('alias', ['api', 'shared', 'domain'])
@pytest.mark.parametrize('identity', ['anonymous', 'owner', 'other'])
def test_inbox_budget_applies_to_every_identity_and_entry_point(inboxes, alias, identity):
    site, _, owner, other = inboxes
    user = {'anonymous': None, 'owner': owner, 'other': other}[identity]
    client = client_for(user)
    before = (site.schema, site.revision)

    for _ in range(2):
        assert post(client, site, alias).status_code == 201
    assert_limited(post(client, site, alias))

    assert list(FormSubmission.objects.filter(site=site).values_list('data', 'page')) == [
        ({'name': 'Visitor'}, '/contact/'), ({'name': 'Visitor'}, '/contact/'),
    ]
    site.refresh_from_db()
    assert (site.schema, site.revision) == before


@pytest.mark.parametrize('aliases', [
    ['api', 'shared', 'domain'], ['domain', 'api', 'shared'], ['shared', 'domain', 'api'],
])
def test_url_and_host_rotation_share_one_budget(inboxes, aliases):
    site = inboxes[0]
    client = client_for()
    assert post(client, site, aliases[0]).status_code == 201
    assert post(client, site, aliases[1]).status_code == 201
    assert_limited(post(client, site, aliases[2]))
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_switching_from_anonymous_to_different_tokens_does_not_reset_the_budget(inboxes):
    site, _, owner, other = inboxes
    assert post(client_for(), site).status_code == 201
    assert post(client_for(owner), site).status_code == 201
    assert_limited(post(client_for(other), site))
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_a_replacement_token_does_not_reset_the_budget(inboxes):
    site, _, owner, _ = inboxes
    client = client_for(owner)
    for _ in range(2):
        assert post(client, site).status_code == 201
    Token.objects.filter(user=owner).delete()
    assert_limited(post(client_for(owner), site))
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_another_site_has_an_independent_budget(inboxes):
    site, other_site, _, _ = inboxes
    client = client_for()
    for _ in range(2):
        assert post(client, site).status_code == 201
    assert_limited(post(client, site))
    assert post(client, other_site).status_code == 201
    assert FormSubmission.objects.filter(site=site).count() == 2
    assert FormSubmission.objects.filter(site=other_site).count() == 1


def test_another_verified_ip_has_an_independent_budget(inboxes):
    site = inboxes[0]
    client = client_for()
    for _ in range(2):
        assert post(client, site).status_code == 201
    assert_limited(post(client, site))
    assert post(client, site, ip='192.0.2.21').status_code == 201
    assert FormSubmission.objects.filter(site=site).count() == 3


def test_renaming_the_site_does_not_reset_its_inbox_budget(inboxes):
    site = inboxes[0]
    client = client_for()
    for _ in range(2):
        assert post(client, site).status_code == 201
    Site.objects.filter(pk=site.pk).update(slug='renamed-inbox')
    site.refresh_from_db()
    assert_limited(post(client, site))
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_the_budget_opens_after_its_window_expires(inboxes, monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(SimpleRateThrottle, 'timer', staticmethod(lambda: clock[0]))
    site = inboxes[0]
    client = client_for()
    for _ in range(2):
        assert post(client, site).status_code == 201
    assert_limited(post(client, site))
    clock[0] += 61
    assert post(client, site).status_code == 201
    assert FormSubmission.objects.filter(site=site).count() == 3


@pytest.mark.parametrize('chain', ['198.51.100.{number}', '198.51.100.{number}, 203.0.113.8'])
def test_untrusted_forwarding_headers_cannot_buy_a_new_budget(inboxes, chain):
    site = inboxes[0]
    client = client_for()
    responses = [post(client, site, HTTP_X_FORWARDED_FOR=chain.format(number=number)) for number in range(3)]
    assert [response.status_code for response in responses] == [201, 201, 429]
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_a_trusted_proxy_uses_only_its_recorded_client(inboxes, settings):
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK, 'NUM_PROXIES': 1}
    site = inboxes[0]
    client = client_for()
    for number in range(2):
        assert post(client, site, HTTP_X_FORWARDED_FOR=f'198.51.100.{number}, 203.0.113.8').status_code == 201
    assert_limited(post(client, site, HTTP_X_FORWARDED_FOR='198.51.100.99, 203.0.113.8'))
    assert post(client, site, HTTP_X_FORWARDED_FOR='198.51.100.99, 203.0.113.9').status_code == 201
    assert FormSubmission.objects.filter(site=site).count() == 3


@pytest.mark.parametrize('authenticated', [False, True])
def test_the_existing_general_request_budget_is_preserved(inboxes, monkeypatch, authenticated):
    site, _, owner, _ = inboxes
    throttle = UserRateThrottle if authenticated else AnonRateThrottle
    scope = 'user' if authenticated else 'anon'
    monkeypatch.setattr(throttle, 'THROTTLE_RATES', {**throttle.THROTTLE_RATES, scope: '1/min'})
    client = client_for(owner if authenticated else None)
    path = '/api/auth/me/' if authenticated else '/api/public/config/'
    assert client.get(path, HTTP_HOST='app.forms.example', REMOTE_ADDR=IP).status_code == 200
    assert_limited(post(client, site))
    assert not FormSubmission.objects.exists()


def test_a_shared_site_throttle_error_keeps_opaque_origin_cors(inboxes):
    site = inboxes[0]
    client = client_for()
    for _ in range(2):
        assert post(client, site, 'shared', HTTP_ORIGIN='null').status_code == 201
    response = post(client, site, 'shared', HTTP_ORIGIN='null')
    assert_limited(response)
    assert response['Access-Control-Allow-Origin'] == '*'
    assert 'Access-Control-Allow-Credentials' not in response
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_the_app_api_throttle_error_keeps_the_existing_origin_policy(inboxes):
    site = inboxes[0]
    client = client_for()
    for _ in range(2):
        assert post(client, site, HTTP_ORIGIN='http://localhost:5173').status_code == 201
    response = post(client, site, HTTP_ORIGIN='http://localhost:5173')
    assert_limited(response)
    assert response['Access-Control-Allow-Origin'] == 'http://localhost:5173'
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_a_custom_domain_still_ignores_platform_credentials(inboxes):
    site = inboxes[0]
    client = client_for()
    client.credentials(HTTP_AUTHORIZATION='Token invalid-platform-session')
    for _ in range(2):
        assert post(client, site, 'domain').status_code == 201
    response = post(client, site, 'domain')
    assert_limited(response)
    assert response['Cache-Control'] == 'no-store'
    assert response.get('Set-Cookie') is None
    assert FormSubmission.objects.filter(site=site).count() == 2


@pytest.mark.parametrize('body,status_code', [({'data': {}}, 400), ({'data': {'name': 'Bot'}, 'website': 'bot'}, 204)])
def test_invalid_and_honeypot_posts_cannot_bypass_the_request_budget(inboxes, body, status_code):
    site = inboxes[0]
    client = client_for()
    for _ in range(2):
        assert post(client, site, body=body).status_code == status_code
    assert_limited(post(client, site))
    assert not FormSubmission.objects.exists()


def test_preflights_do_not_spend_the_inbox_post_budget(inboxes):
    site = inboxes[0]
    client = client_for()
    path, host = address(site, 'api')
    for _ in range(3):
        assert client.options(path, HTTP_HOST=host, REMOTE_ADDR=IP).status_code == 200
    for _ in range(2):
        assert post(client, site).status_code == 201
    assert_limited(post(client, site))
    assert FormSubmission.objects.filter(site=site).count() == 2


def test_an_unpublished_site_never_accepts_a_message(inboxes):
    site = inboxes[0]
    Site.objects.filter(pk=site.pk).update(published=False)
    response = post(client_for(), site)
    assert response.status_code == 404
    assert not FormSubmission.objects.exists()
