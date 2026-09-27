"""The private TLS permission check must work with production HTTPS enabled."""
import pytest
from django.contrib.auth.models import User
from django.test import Client
from django.utils import timezone
from .models import PublishedPage, Site


@pytest.fixture
def verified_domain(db, settings, monkeypatch):
    settings.ALLOWED_HOSTS = ['testserver', '127.0.0.1']
    settings.CUSTOM_DOMAIN_TARGET = 'sites.example.net'
    settings.CUSTOM_DOMAIN_IP = ''
    settings.FRONTEND_URL = 'https://app.example.com'
    settings.SECURE_SSL_REDIRECT = True
    owner = User.objects.create_user('domain-deploy-owner')
    site = Site.objects.create(owner=owner, title='Domain deploy', published=True,
                               custom_domain='customer.example.org', domain_status='connected',
                               domain_verified_at=timezone.now())
    PublishedPage.objects.create(site=site, path='', title='Home', html='<h1>Customer</h1>')
    # TLS permission is a short database decision, never a DNS network wait.
    from . import domains
    def no_dns(*args, **kwargs):
        raise AssertionError('TLS permission must not query DNS')
    monkeypatch.setattr(domains, 'check_domain', no_dns)
    return site


def test_private_caddy_permission_does_not_redirect_to_https(verified_domain):
    response = Client().get('/api/public/domain-allowed/',
                            {'domain': verified_domain.custom_domain}, HTTP_HOST='127.0.0.1:8000')
    assert response.status_code == 200
    assert 'Location' not in response


def test_unknown_domain_never_receives_a_successful_permission_redirect(verified_domain):
    response = Client().get('/api/public/domain-allowed/',
                            {'domain': 'unregistered.example.org'}, HTTP_HOST='127.0.0.1:8000')
    assert response.status_code == 404
    assert 'Location' not in response


def test_ordinary_api_requests_still_redirect(verified_domain):
    response = Client().get('/api/public/config/', HTTP_HOST='127.0.0.1:8000')
    assert response.status_code == 301
    assert response['Location'].startswith('https://')


def test_private_permission_does_not_consume_the_public_visitor_budget(verified_domain, settings):
    settings.REST_FRAMEWORK = {**settings.REST_FRAMEWORK,
        'DEFAULT_THROTTLE_RATES': {**settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'], 'anon': '1/min'}}
    client = Client()
    for _ in range(3):
        assert client.get('/api/public/domain-allowed/',
                          {'domain': verified_domain.custom_domain}, HTTP_HOST='127.0.0.1:8000').status_code == 200


def test_custom_domain_preserves_https_redirect_before_security_middleware(verified_domain):
    response = Client().get('/?source=test', HTTP_HOST=verified_domain.custom_domain)
    assert response.status_code == 301
    assert response['Location'] == 'https://customer.example.org/?source=test'
