"""A site on its owner's own domain.

Connecting a domain used to be half a feature: the address could be saved and
the DNS records were displayed, but nothing ever checked them — the status
said "waiting for DNS" forever — and a request arriving at that domain reached
nothing at all.

These pin the other half, and the three rules that keep it from handing our
session to somebody else's domain: only published pages are served there, only
verified domains are served (and only those get certificates), and a takedown
closes the custom domain with everything else.
"""
import pytest
from django.contrib.auth.models import User
from django.test import Client
from django.db import IntegrityError, transaction
from django.utils import timezone
from dns.exception import Timeout as DNSTimeout
from rest_framework.test import APIClient

from . import domains
from .models import PublishedPage, Site

HOME = '<!DOCTYPE html><html><head><title>Ada</title></head><body><h1>Ada</h1></body></html>'
ABOUT = '<!DOCTYPE html><html><head><title>About</title></head><body><h1>About</h1></body></html>'


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


@pytest.fixture
def api(owner):
    client = APIClient()
    client.force_authenticate(owner)
    return client


@pytest.fixture
def site(owner):
    site = Site.objects.create(owner=owner, title='Ada', published=True)
    PublishedPage.objects.create(site=site, path='', title='Ada', html=HOME)
    PublishedPage.objects.create(site=site, path='about', title='About', html=ABOUT)
    return site


@pytest.fixture
def connected(site):
    Site.objects.filter(pk=site.pk).update(custom_domain='ada.example', domain_status='connected', domain_verified_at=timezone.now())
    site.refresh_from_db()
    return site


@pytest.fixture
def dns(monkeypatch, settings):
    """A DNS-only fake: no outbound network and distinct record families."""
    settings.CUSTOM_DOMAIN_TARGET = 'sites.example.com'
    settings.CUSTOM_DOMAIN_IP = ''
    table = {('sites.example.com', 'A'): {'203.0.113.10'}}
    monkeypatch.setattr(domains, '_resolve_records', lambda name, kind: table.get((name, kind), set()))
    return table


def claim(api, site, dns, name='ada.example'):
    response = api.post(f'/api/sites/{site.pk}/domain/', {'domain': name}, format='json')
    assert response.status_code == 200, response.data
    site.refresh_from_db()
    dns[('_sitebuilder.' + name, 'TXT')] = {domains.verification_value(site)}
    return response


class TestVerifying:
    def test_account_bound_txt_and_a_record_connect_without_claiming_tls(self, api, site, dns):
        claim(api, site, dns)
        dns[('ada.example', 'A')] = {'203.0.113.10'}
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.status_code == 200
        assert response.data['status'] == 'connected'
        assert response.data['ssl_status'] == 'pending_certificate'
        site.refresh_from_db()
        assert site.domain_verified_at is not None

    def test_an_exact_cname_is_a_routing_option(self, api, site, dns):
        claim(api, site, dns, 'www.ada.example')
        dns[('www.ada.example', 'CNAME')] = {'sites.example.com'}
        assert api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json').data['checked'] == 'ok'

    def test_shared_ip_without_account_bound_txt_cannot_claim_someone_elses_domain(self, api, site, dns):
        api.post(f'/api/sites/{site.pk}/domain/', {'domain': 'ada.example'}, format='json')
        dns[('ada.example', 'A')] = {'203.0.113.10'}
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.data['status'] == 'pending'
        assert response.data['checked'] == 'ownership_missing'

    def test_another_sites_or_an_old_challenge_is_refused(self, api, site, dns):
        claim(api, site, dns)
        dns[('ada.example', 'A')] = {'203.0.113.10'}
        dns[('_sitebuilder.ada.example', 'TXT')] = {'sitebuilder-verification=another-account'}
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.data['checked'] == 'ownership_mismatch'
        assert response.data['status'] == 'pending'

    def test_different_www_name_does_not_verify_apex(self, api, site, dns):
        claim(api, site, dns)
        dns[('www.ada.example', 'CNAME')] = {'sites.example.com'}
        assert api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json').data['checked'] == 'not_resolving'

    def test_a_domain_pointing_somewhere_else_says_so(self, api, site, dns):
        claim(api, site, dns)
        dns[('ada.example', 'A')] = {'198.51.100.7'}
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.data['status'] == 'pending'
        assert response.data['checked'] == 'points_elsewhere'

    @pytest.mark.parametrize('conflict', ['A', 'AAAA'])
    def test_every_returned_address_must_be_ours(self, api, site, dns, conflict):
        claim(api, site, dns)
        dns[('ada.example', 'A')] = {'203.0.113.10'}
        dns.setdefault(('ada.example', conflict), set()).add('198.51.100.7' if conflict == 'A' else '2001:db8::bad')
        assert api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json').data['checked'] == 'points_elsewhere'

    def test_an_explicit_ip_can_route_an_apex(self, api, site, dns, settings):
        settings.CUSTOM_DOMAIN_IP = '203.0.113.99'
        claim(api, site, dns)
        dns[('ada.example', 'A')] = {'203.0.113.99'}
        assert api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json').data['status'] == 'connected'

    def test_ipv6_and_ipv4_targets_can_both_be_served(self, api, site, dns, settings):
        settings.CUSTOM_DOMAIN_IP = '203.0.113.99, 2001:db8::1'
        claim(api, site, dns)
        dns[('ada.example', 'A')] = {'203.0.113.99'}
        dns[('ada.example', 'AAAA')] = {'2001:db8::1'}
        assert api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json').data['status'] == 'connected'

    def test_verifying_needs_a_domain_first(self, api, site):
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.status_code == 400
        assert response.data['code'] == 'no_domain'

    def test_unconfigured_server_returns_actionable_state(self, api, site, dns, settings):
        settings.CUSTOM_DOMAIN_TARGET = ''
        settings.CUSTOM_DOMAIN_IP = ''
        claim(api, site, dns)
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.data['checked'] == 'target_unknown'
        assert response.data['target_configured'] is False
        assert all(row['purpose'] == 'ownership' for row in response.data['records'])

    def test_resolver_timeout_does_not_report_success_or_lose_existing_verification(self, api, connected, monkeypatch, settings):
        settings.CUSTOM_DOMAIN_TARGET = "sites.example.com"
        def timeout(*args):
            raise DNSTimeout()
        monkeypatch.setattr(domains, '_resolve_records', timeout)
        response = api.post(f'/api/sites/{connected.pk}/domain/verify/', {}, format='json')
        assert response.data['checked'] == 'dns_error'
        assert response.data['status'] == 'connected'

    def test_removing_the_proof_revokes_serving_and_certificates(self, api, connected, dns):
        response = api.post(f'/api/sites/{connected.pk}/domain/verify/', {}, format='json')
        assert response.data['status'] == 'pending'
        connected.refresh_from_db()
        assert connected.domain_verified_at is None
        assert Client().get('/api/public/domain-allowed/?host=ada.example').status_code == 404

    def test_change_while_dns_is_running_cannot_connect_the_new_domain(self, api, site, dns, monkeypatch):
        claim(api, site, dns)
        from . import views
        def old_check(domain, token):
            Site.objects.filter(pk=site.pk).update(
                custom_domain='new.example', domain_verification_token='new-token', domain_status='pending',
            )
            return True, 'ok'
        monkeypatch.setattr(views, 'check_domain', old_check)
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.status_code == 409
        assert response.data['checked'] == 'domain_changed'
        assert response.data['domain'] == 'new.example'
        assert response.data['status'] == 'pending'

    def test_disconnect_and_reclaim_same_domain_invalidates_inflight_check(self, api, site, dns, monkeypatch):
        claim(api, site, dns)
        from . import views
        def stale_check(domain, token):
            Site.objects.filter(pk=site.pk).update(domain_verification_token='rotated')
            return True, 'ok'
        monkeypatch.setattr(views, 'check_domain', stale_check)
        response = api.post(f'/api/sites/{site.pk}/domain/verify/', {}, format='json')
        assert response.status_code == 409
        site.refresh_from_db()
        assert site.domain_status == 'pending'


class TestDomainState:
    def test_dns_records_describe_exact_hostname_and_required_txt(self, api, site, settings):
        settings.CUSTOM_DOMAIN_TARGET = 'sites.example.com'
        settings.CUSTOM_DOMAIN_IP = '203.0.113.99'
        response = api.post(f'/api/sites/{site.pk}/domain/', {'domain': 'blog.ada.example'}, format='json')
        rows = response.data['records']
        assert {(r['type'], r['name']) for r in rows} == {
            ('TXT', '_sitebuilder.blog.ada.example'),
            ('CNAME', 'blog.ada.example'), ('A', 'blog.ada.example'),
        }
        site.refresh_from_db()
        assert next(r for r in rows if r['type'] == 'TXT')['value'] == domains.verification_value(site)

    def test_identical_save_preserves_verified_state_and_token(self, api, connected):
        before = connected.domain_verification_token
        response = api.post(f'/api/sites/{connected.pk}/domain/', {'domain': 'https://ADA.example./'}, format='json')
        connected.refresh_from_db()
        assert response.data['status'] == 'connected'
        assert connected.domain_verification_token == before
        assert connected.domain_verified_at is not None

    @pytest.mark.parametrize('new_domain', ['new.example', ''])
    def test_change_or_disconnect_rotates_challenge_and_clears_verification(self, api, connected, new_domain):
        old_token = connected.domain_verification_token
        response = api.post(f'/api/sites/{connected.pk}/domain/', {'domain': new_domain}, format='json')
        connected.refresh_from_db()
        assert connected.domain_verification_token != old_token
        assert connected.domain_verified_at is None
        assert response.data['status'] == ('pending' if new_domain else 'not_connected')
        if not new_domain:
            assert response.data['records'] == []

    def test_malformed_or_missing_payload_never_disconnects(self, api, connected):
        for payload in (123, [], 'domain', {}, {'domain': None}, {'domain': []}, {'domain': 123}):
            assert api.post(f'/api/sites/{connected.pk}/domain/', payload, format='json').status_code == 400
        connected.refresh_from_db()
        assert connected.custom_domain == 'ada.example'
        assert connected.domain_status == 'connected'

    def test_draft_does_not_claim_to_be_live(self, api, site):
        Site.objects.filter(pk=site.pk).update(published=False)
        assert api.get(f'/api/sites/{site.pk}/domain/').data['is_published'] is False

    def test_another_account_cannot_read_or_change_the_domain(self, site):
        stranger = User.objects.create_user('stranger', 'stranger@example.com', 'secret123')
        client = APIClient()
        client.force_authenticate(stranger)
        assert client.get(f'/api/sites/{site.pk}/domain/').status_code == 404
        assert client.post(f'/api/sites/{site.pk}/domain/', {'domain': 'claim.example'}).status_code == 404
        assert client.post(f'/api/sites/{site.pk}/domain/verify/').status_code == 404

    def test_same_domain_cannot_be_claimed_twice(self, api, site, owner):
        Site.objects.create(owner=owner, title='Other', custom_domain='claimed.example')
        response = api.post(f'/api/sites/{site.pk}/domain/', {'domain': 'Claimed.Example'}, format='json')
        assert response.status_code == 400
        assert response.data['code'] == 'domain_in_use'

    def test_database_rejects_case_variant_even_when_application_check_is_bypassed(self, site, owner):
        Site.objects.filter(pk=site.pk).update(custom_domain='claimed.example')
        with pytest.raises(IntegrityError), transaction.atomic():
            Site.objects.create(owner=owner, title='Other', custom_domain='CLAIMED.EXAMPLE')

    def test_many_sites_may_remain_without_a_domain(self, site, owner):
        assert Site.objects.create(owner=owner, title='Other').custom_domain == ''

    @pytest.mark.parametrize('name', ['app.sitebuilder.test', 'nested.app.sitebuilder.test', 'sites.example.com', 'login.example.com', 'evil.login.example.com', 'reserved.example.com', 'evil.reserved.example.com', 'other.localhost', 'router.internal'])
    def test_platform_and_reserved_domains_cannot_be_claimed(self, api, site, settings, name):
        settings.ALLOWED_HOSTS = ['testserver', '.app.sitebuilder.test']
        settings.FRONTEND_URL = 'https://login.example.com'
        settings.CUSTOM_DOMAIN_TARGET = 'sites.example.com'
        settings.CUSTOM_DOMAIN_RESERVED_HOSTS = ['reserved.example.com']
        response = api.post(f'/api/sites/{site.pk}/domain/', {'domain': name}, format='json')
        assert response.status_code == 400
        assert response.data['code'] == 'domain_reserved'


class TestDomainNormalization:
    @pytest.mark.parametrize('raw,expected', [
        (' ADA.Example. ', 'ada.example'), ('https://ada.example/', 'ada.example'),
        ('HTTP://ADA.Example', 'ada.example'), ('b\u00fccher.example', 'xn--bcher-kva.example'),
    ])
    def test_valid_domain_variants_share_one_identity(self, raw, expected):
        assert domains.normalize_domain(raw) == expected

    @pytest.mark.parametrize('raw', [
        'https://ada.example/about', 'ada.example/about', 'https://ada.example:443/',
        'ada.example:443', 'user@ada.example', 'https://user:pass@ada.example',
        'https://ada.example?x=1', 'https://ada.example#fragment', 'ftp://ada.example',
        '*.ada.example', 'ada..example', '-ada.example', 'ada-.example',
        'ada_example.com', '127.0.0.1', '[::1]', 'localhost',
        'ada.example\n', 'https://ada.example\t/', 'ada.example\\evil',
        '//ada.example', 'ada.example%', 'ada.example?', 'ada.example#', 'a' * 64 + '.example',
    ])
    def test_ambiguous_or_invalid_input_is_refused_without_truncation(self, raw):
        with pytest.raises(ValueError):
            domains.normalize_domain(raw)


class TestResolver:
    def test_dns_queries_are_absolute_and_have_a_deadline(self, monkeypatch, settings):
        settings.CUSTOM_DOMAIN_DNS_TIMEOUT = 1.25
        calls = []
        class Resolver:
            def resolve(self, name, kind, **kwargs):
                calls.append((name, kind, kwargs, self.timeout, self.lifetime))
                return []
        monkeypatch.setattr(domains.dns.resolver, 'Resolver', Resolver)
        assert domains._resolve_records('ada.example', 'TXT') == set()
        assert calls == [('ada.example.', 'TXT', {'lifetime': 1.25, 'search': False}, 1.25, 1.25)]

    def test_split_txt_strings_are_joined(self, monkeypatch):
        class TXT:
            strings = (b'sitebuilder-', b'verification=challenge')
        class Resolver:
            def resolve(self, *args, **kwargs):
                return [TXT()]
        monkeypatch.setattr(domains.dns.resolver, 'Resolver', Resolver)
        assert domains._resolve_records('_sitebuilder.ada.example', 'TXT') == {'sitebuilder-verification=challenge'}


class TestServingTheDomain:
    def test_the_home_page_answers_at_the_root(self, connected):
        response = Client().get('/', HTTP_HOST='ada.example')

        assert response.status_code == 200
        assert b'<h1>Ada</h1>' in response.content

    def test_a_sub_page_answers_at_its_own_path(self, connected):
        assert Client().get('/about/', HTTP_HOST='ada.example').status_code == 200

    def test_the_sitemap_uses_the_sites_own_address(self, connected):
        body = Client().get('/sitemap.xml', HTTP_HOST='ada.example').content.decode()

        assert 'https://ada.example/' in body
        assert '/s/' not in body

    # The sandbox is there because /s/<slug>/ shares OUR origin. On the
    # owner's domain it would only break their own site.
    def test_the_owners_domain_is_not_sandboxed(self, connected):
        response = Client().get('/', HTTP_HOST='ada.example')

        assert 'Content-Security-Policy' not in response
        assert response['X-Content-Type-Options'] == 'nosniff'

    def test_the_shared_path_is_still_sandboxed(self, connected):
        response = Client().get(f'/s/{connected.slug}/', HTTP_HOST='testserver')

        assert 'sandbox' in response['Content-Security-Policy']
        assert 'allow-same-origin' not in response['Content-Security-Policy']

    @pytest.mark.parametrize('path', ['/api/sites/', '/admin/', '/api/auth/me/', '/static/x.js'])
    def test_nothing_but_pages_lives_on_a_customer_domain(self, connected, path):
        # Our login form on a domain somebody else controls would hand them the
        # session of anyone who used it.
        assert Client().get(path, HTTP_HOST='ada.example').status_code == 404

    def test_posting_to_a_customer_domain_is_refused(self, connected):
        assert Client().post('/', {}, HTTP_HOST='ada.example').status_code == 404

    def test_an_unverified_domain_serves_nothing(self, site):
        Site.objects.filter(pk=site.pk).update(custom_domain='ada.example', domain_status='pending')

        # Falls through to the ordinary URLs, where this host is not allowed.
        assert Client().get('/', HTTP_HOST='ada.example').status_code in (400, 404)

    @pytest.mark.parametrize('close', [
        lambda site: Site.objects.filter(pk=site.pk).update(published=False),
        lambda site: Site.objects.filter(pk=site.pk).update(moderation_blocked=True),
        lambda site: User.objects.filter(pk=site.owner_id).update(is_active=False),
    ])
    def test_every_door_that_closes_a_site_closes_its_domain(self, connected, close):
        close(connected)
        assert Client().get('/', HTTP_HOST='ada.example').status_code in (400, 404)


class TestCertificates:
    def test_a_verified_domain_may_have_one(self, connected):
        assert Client().get('/api/public/domain-allowed/?host=ada.example').status_code == 200

    def test_anything_else_may_not(self, connected, site):
        # Otherwise a stranger could point any name here and have us ask a
        # certificate authority for it.
        assert Client().get('/api/public/domain-allowed/?host=attacker.example').status_code == 404
        assert Client().get('/api/public/domain-allowed/').status_code == 404

    def test_a_taken_down_site_loses_its_certificate_too(self, connected):
        Site.objects.filter(pk=connected.pk).update(moderation_blocked=True)
        assert Client().get('/api/public/domain-allowed/?host=ada.example').status_code == 404


class TestCounting:
    """The address people actually share was the one whose visits nobody
    counted: the showcase page counts from the browser, and a served document
    has no app JavaScript to do that."""

    BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141 Safari/537.36'

    def test_a_visit_to_the_served_page_counts(self, connected):
        Client().get('/', HTTP_HOST='ada.example', HTTP_USER_AGENT=self.BROWSER)

        connected.refresh_from_db()
        assert connected.view_count == 1
        assert connected.visits.count() == 1

    def test_the_shared_path_counts_too(self, site):
        Client().get(f'/s/{site.slug}/', HTTP_USER_AGENT=self.BROWSER)

        site.refresh_from_db()
        assert site.view_count == 1

    def test_which_page_was_seen_is_recorded(self, connected):
        Client().get('/about/', HTTP_HOST='ada.example', HTTP_USER_AGENT=self.BROWSER)

        assert connected.visits.get().path == 'about'

    @pytest.mark.parametrize('agent', [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'facebookexternalhit/1.1',
        'Slackbot-LinkExpanding 1.0',
        'curl/8.4.0',
        '',
    ])
    def test_machines_do_not_count_as_visitors(self, connected, agent):
        # A link preview is not a reader. The ones that say what they are get
        # filtered; a count nobody can verify is better honest than inflated.
        Client().get('/', HTTP_HOST='ada.example', HTTP_USER_AGENT=agent)

        connected.refresh_from_db()
        assert connected.view_count == 0

    def test_counting_never_takes_the_page_down(self, connected, monkeypatch):
        from . import visits

        monkeypatch.setattr(visits.SiteVisit.objects, 'create', lambda **kw: 1 / 0)

        response = Client().get('/', HTTP_HOST='ada.example', HTTP_USER_AGENT=self.BROWSER)

        assert response.status_code == 200


@pytest.mark.django_db
class TestDomainMigration:
    def test_legacy_ip_only_verification_is_reset_without_removing_domain(self, connected):
        import importlib
        from django.apps import apps
        migration = importlib.import_module('builder.migrations.0022_verified_unique_custom_domains')
        old_token = connected.domain_verification_token
        migration.require_ownership(apps, None)
        connected.refresh_from_db()
        assert connected.custom_domain == 'ada.example'
        assert connected.domain_status == 'pending'
        assert connected.domain_verified_at is None
        assert connected.domain_verification_token != old_token

    def test_duplicate_legacy_claims_fail_before_any_record_is_changed(self, connected, owner):
        import importlib
        from django.apps import apps
        migration = importlib.import_module('builder.migrations.0022_verified_unique_custom_domains')
        duplicate = Site.objects.create(owner=owner, title='Duplicate', custom_domain=' ADA.EXAMPLE. ')
        old_token = connected.domain_verification_token
        with pytest.raises(RuntimeError, match='Duplicate custom domain'):
            migration.require_ownership(apps, None)
        connected.refresh_from_db()
        duplicate.refresh_from_db()
        assert connected.domain_status == 'connected'
        assert connected.domain_verification_token == old_token
        assert duplicate.custom_domain == ' ADA.EXAMPLE. '


def test_dns_verification_has_a_separate_per_account_throttle(api, site, monkeypatch):
    monkeypatch.setattr(domains.DomainVerificationThrottle, 'THROTTLE_RATES', {'domain_verify': '2/min'})
    url = f'/api/sites/{site.pk}/domain/verify/'
    assert api.post(url).status_code == 400
    assert api.post(url).status_code == 400
    response = api.post(url)
    assert response.status_code == 429
    assert 'Retry-After' in response


@pytest.mark.django_db
@pytest.mark.parametrize('allowed,host', [
    (['testserver', '*'], 'unknown.example'),
    (['testserver', '.example.com'], 'untrusted.example.com'),
])
@pytest.mark.parametrize('path', ['/api/auth/me/', '/api/sites/', '/admin/', '/api/public/config/'])
def test_unknown_hosts_never_reach_platform_routes_even_with_permissive_allowed_hosts(settings, allowed, host, path):
    settings.ALLOWED_HOSTS = allowed
    response = Client().get(path, HTTP_HOST=host)
    assert response.status_code == 404


@pytest.mark.django_db
def test_exact_application_host_still_passes_through_with_a_port(settings):
    settings.ALLOWED_HOSTS = ['testserver']
    assert Client().get('/api/public/config/', HTTP_HOST='testserver:8000').status_code == 200
