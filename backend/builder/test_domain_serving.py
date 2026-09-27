"""A verified host serves its own documents and one anonymous inbox, no app."""
import pytest
from django.contrib.auth.models import User
from django.test import Client
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import AnonRateThrottle

from .models import FormSubmission, PublishedPage, Site
from .published import site_for_host


@pytest.fixture
def connected(db, settings):
    settings.FRONTEND_URL = 'https://app.builder.example'
    settings.ALLOWED_HOSTS = ['testserver', 'app.builder.example']
    settings.CUSTOM_DOMAIN_MEDIA_ORIGIN = 'https://uploads.builder.example'
    settings.CUSTOM_DOMAIN_TARGET = 'sites.example.com'
    owner = User.objects.create_user('domain-owner', password='secret123')
    site = Site.objects.create(owner=owner, title='Portfolio', published=True,
        custom_domain='portfolio.example', domain_status='connected', domain_verified_at=timezone.now())
    PublishedPage.objects.create(site=site, path='', title='Home', html='<html><head></head><body>Home</body></html>')
    PublishedPage.objects.create(site=site, path='about', title='About', html='<h1>About</h1>')
    return site


def get(path='/', host='portfolio.example'):
    return Client().get(path, HTTP_HOST=host)


class TestDomainDocuments:
    def test_retargets_own_links_and_canonical_without_modifying_scripts(self, connected):
        root = f'/s/{connected.slug}'
        script = f'<script>const html = `<a href="{root}/about/">keep literal</a>`;</script>'
        html = f'<html><head><link rel="canonical" href="https://app.builder.example{root}/about/">' \
               f'<meta property="og:url" content="{root}/about/"></head><body>' \
               f'<a href="{root}/about/?from=menu&amp;next=1#contact">About</a>' \
               f'<a href="https://external.example{root}/about/">External</a>{script}</body></html>'
        connected.published_pages.filter(path='').update(html=html)

        response = get()
        body = response.content.decode()

        assert response.status_code == 200
        assert 'href="/about/?from=menu&amp;next=1#contact"' in body
        assert 'href="https://portfolio.example/about/"' in body
        assert 'content="https://portfolio.example/about/"' in body
        assert f'href="https://external.example{root}/about/"' in body
        assert script in body
        assert '<meta name="pwb-form-endpoint" content="/__sitebuilder/form/">' in body
        assert 'Content-Security-Policy' not in response
        # Serving is a view adaptation; publishing data remains untouched.
        assert connected.published_pages.get(path='').html == html

    def test_root_upload_urls_work_in_images_srcsets_and_css(self, connected):
        html = '<html><head><style>.cover { background:url("/media/bg.webp") }</style></head><body>' \
               '<img src=/media/a.png srcset="/media/a.png 1x, /media/b.png 2x">' \
               '<div style="background:url(/media/bg.webp)"></div>' \
               '<img src="https://app.builder.example/media/already-absolute.png"></body></html>'
        connected.published_pages.filter(path='about').update(html=html)

        body = get('/about/').content.decode()

        assert 'src="https://uploads.builder.example/media/a.png"' in body
        assert 'https://uploads.builder.example/media/b.png 2x' in body
        assert 'url("https://uploads.builder.example/media/bg.webp")' in body
        assert 'url(https://uploads.builder.example/media/bg.webp)' in body
        assert 'src="https://app.builder.example/media/already-absolute.png"' in body

    @pytest.mark.parametrize('html', [
        '<!DOCTYPE html><html><body><img src="/media/a.png"></body></html>',
        '<!DOCTYPE html><img src="/media/a.png">',
        '<!DOCTYPE html>\n<html>\n<head>\n<link rel href="/media/a.png">\n<meta property>\n</head>\n<body>x</body></html>',
    ])
    def test_unusual_markup_keeps_its_doctype_and_does_not_crash(self, connected, html):
        connected.published_pages.filter(path='').update(html=html)
        response = get()
        assert response.status_code == 200
        assert response.content.decode().startswith('<!DOCTYPE html>')
        assert b'uploads.builder.example/media/a.png' in response.content

    def test_html_examples_inside_textarea_are_not_rewritten(self, connected):
        sample = '<textarea><img src="/media/example.png"></textarea>'
        connected.published_pages.filter(path='').update(html=sample)
        assert sample in get().content.decode()

    def test_media_defaults_to_the_single_domain_platform_origin(self, connected, settings):
        settings.CUSTOM_DOMAIN_MEDIA_ORIGIN = ''
        connected.published_pages.filter(path='').update(html='<img src="/media/a.png">')
        assert 'https://app.builder.example/media/a.png' in get().content.decode()

    def test_old_shared_path_bookmarks_redirect_with_query_without_cross_site_access(self, connected):
        response = get(f'/s/{connected.slug}/about/?campaign=launch')
        assert response.status_code == 301
        assert response['Location'] == '/about/?campaign=launch'
        assert get('/s/somebody-else/about/').status_code == 404

    def test_robots_sitemap_and_noindex_use_only_this_domain(self, connected):
        connected.published_pages.filter(path='about').update(no_index=True)
        robots = get('/robots.txt')
        sitemap = get('/sitemap.xml')
        assert robots.status_code == 200
        assert b'Sitemap: https://portfolio.example/sitemap.xml' in robots.content
        assert b'https://portfolio.example/' in sitemap.content
        assert b'/about/' not in sitemap.content
        assert get('/about/')['X-Robots-Tag'] == 'noindex'
        assert get().get('X-Robots-Tag') is None
        assert Client().head('/', HTTP_HOST='portfolio.example').content == b''

    def test_shared_origin_keeps_sandbox_and_original_document(self, connected):
        source = connected.published_pages.get(path='').html
        response = get(f'/s/{connected.slug}/', host='testserver')
        assert response.content.decode() == source
        assert 'sandbox' in response['Content-Security-Policy']
        assert 'allow-same-origin' not in response['Content-Security-Policy']

    @pytest.mark.parametrize('host', ['app.builder.example', 'testserver', 'localhost', 'sites.example.com'])
    def test_historical_platform_claim_cannot_serve_unsandboxed(self, connected, host):
        Site.objects.filter(pk=connected.pk).update(custom_domain=host)
        assert site_for_host(host) is None

    def test_status_without_verified_timestamp_does_not_serve(self, connected):
        Site.objects.filter(pk=connected.pk).update(domain_verified_at=None)
        assert site_for_host('portfolio.example') is None
        assert get().status_code in (400, 404)


class TestDomainInbox:
    def post(self, payload, path='/__sitebuilder/form/', **extra):
        return APIClient().post(path, payload, format='json', HTTP_HOST='portfolio.example', **extra)

    def test_accepts_only_bound_site_and_reuses_sensitive_field_filter(self, connected):
        other = Site.objects.create(owner=connected.owner, title='Other', published=True)
        response = self.post({'data': {'name': 'Ada', 'password': 'secret'}, 'page': '/about/', 'site': other.pk},
                             HTTP_AUTHORIZATION='Token invalid-platform-token')
        assert response.status_code == 201
        assert response['Cache-Control'] == 'no-store'
        assert response.get('Set-Cookie') is None
        submission = FormSubmission.objects.get()
        assert submission.site == connected
        assert submission.page == '/about/'
        assert submission.data == {'name': 'Ada'}

    def test_honeypot_does_not_fill_the_inbox(self, connected):
        response = self.post({'data': {'name': 'Spam'}, 'website': 'bot filled this'})
        assert response.status_code == 204
        assert not FormSubmission.objects.exists()

    def test_validation_and_anonymous_rate_limit_are_preserved(self, connected, monkeypatch):
        monkeypatch.setattr(AnonRateThrottle, 'THROTTLE_RATES', {'anon': '1/min'})
        assert self.post({'data': {}}).status_code == 400
        assert self.post({'data': {'name': 'Ada'}}).status_code == 429
        assert not FormSubmission.objects.exists()

    @pytest.mark.parametrize('path', ['/api/sites/', '/api/public/sites/other/submit/', '/admin/', '/django-admin/'])
    def test_form_support_does_not_expose_any_platform_routes(self, connected, path):
        assert self.post({'data': {'name': 'Ada'}}, path=path).status_code == 404
        assert get(path).status_code == 404

    @pytest.mark.parametrize('field,value', [('published', False), ('moderation_blocked', True), ('domain_status', 'pending')])
    def test_a_closed_site_accepts_no_inbox_messages(self, connected, field, value):
        Site.objects.filter(pk=connected.pk).update(**{field: value})
        assert self.post({'data': {'name': 'Ada'}}).status_code in (400, 404)
        assert not FormSubmission.objects.exists()
