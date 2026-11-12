"""A published site has to BE a web page.

Before these, publishing stored a schema and the address returned the single
page app's shell: one fixed title, no description, no OG tags, and sub-pages
behind a `#fragment` the server never sees. Every shared link previewed as the
builder's own name, and only the first page could ever be indexed.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import PublishedPage, Site

HOME = '<!DOCTYPE html><html lang="en"><head><title>Ada — Portfolio</title>' \
       '<meta name="description" content="Selected work."><meta property="og:image" content="https://x/y.png">' \
       '</head><body><h1>Ada</h1></body></html>'
ABOUT = '<!DOCTYPE html><html lang="en"><head><title>About Ada</title></head><body><h1>About</h1></body></html>'


def pages(**overrides):
    payload = [
        {'path': '', 'title': 'Ada — Portfolio', 'html': HOME},
        {'path': 'about', 'title': 'About Ada', 'html': ABOUT},
    ]
    payload[0].update(overrides)
    return payload


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


@pytest.fixture
def client(owner):
    api = APIClient()
    api.force_authenticate(owner)
    return api


@pytest.fixture
def site(owner):
    return Site.objects.create(owner=owner, title='Ada', published=True)


def publish(client, site, payload=None, published=True):
    return client.patch(f'/api/sites/{site.pk}/', {
        'published': published,
        'published_pages': pages() if payload is None else payload,
    }, format='json')


class TestPublishing:
    def test_a_publish_stores_one_document_per_page(self, client, site):
        assert publish(client, site).status_code == 200

        stored = list(site.published_pages.order_by('position'))
        assert [page.path for page in stored] == ['', 'about']
        assert stored[0].html == HOME
        assert stored[0].title == 'Ada — Portfolio'

    def test_republishing_replaces_the_set_so_a_deleted_page_stops_answering(self, client, site):
        publish(client, site)
        publish(client, site, payload=[{'path': '', 'title': 'Ada', 'html': HOME}])

        assert [page.path for page in site.published_pages.all()] == ['']

    def test_unpublishing_takes_the_documents_down(self, client, site):
        publish(client, site)
        assert publish(client, site, published=False).status_code == 200
        assert site.published_pages.count() == 0

    def test_two_pages_cannot_claim_the_same_address(self, client, site):
        publish(client, site, payload=[
            {'path': 'work', 'title': 'A', 'html': HOME},
            {'path': 'work', 'title': 'B', 'html': ABOUT},
        ])
        assert sorted(page.path for page in site.published_pages.all()) == ['work', 'work-2']

    @pytest.mark.parametrize('sent,stored', [
        ('About Us', 'about-us'),
        ('/contact/', 'contact'),
        ('Ünlü Sayfa!', 'nl-sayfa'),
        (None, ''),
    ])
    def test_a_page_address_is_a_url_segment(self, client, site, sent, stored):
        publish(client, site, payload=[{'path': sent, 'title': 'x', 'html': HOME}])
        assert site.published_pages.get().path == stored

    def test_an_oversized_publish_is_refused_whole(self, client, site, monkeypatch):
        # The real limit is 100 MB; a smaller one keeps the request small.
        monkeypatch.setattr('builder.validators.MAX_PUBLISHED_PAGE_BYTES', 1000)
        response = publish(client, site, payload=[
            {'path': '', 'title': 'x', 'html': 'a' * 1001},
        ])
        assert response.status_code == 400
        assert site.published_pages.count() == 0


class TestServing:
    def test_the_page_itself_is_served_head_and_all(self, client, site):
        publish(client, site)

        response = APIClient().get(f'/s/{site.slug}/')

        assert response.status_code == 200
        assert response['Content-Type'].startswith('text/html')
        body = response.content.decode()
        # What a scraper reads without running a line of JavaScript.
        assert '<title>Ada — Portfolio</title>' in body
        assert 'Selected work.' in body
        assert 'og:image' in body

    def test_a_sub_page_has_its_own_address(self, client, site):
        publish(client, site)

        response = APIClient().get(f'/s/{site.slug}/about/')

        assert response.status_code == 200
        assert '<title>About Ada</title>' in response.content.decode()

    def test_an_unknown_page_is_a_404(self, client, site):
        publish(client, site)
        assert APIClient().get(f'/s/{site.slug}/nope/').status_code == 404

    # The document is the owner's own HTML and may carry their scripts. Served
    # from this origin without a sandbox it would sit next to the admin session
    # and the visitor's token.
    def test_the_document_is_sandboxed_away_from_this_origin(self, client, site):
        publish(client, site)

        response = APIClient().get(f'/s/{site.slug}/')

        csp = response['Content-Security-Policy']
        assert 'sandbox' in csp
        assert 'allow-same-origin' not in csp
        assert 'allow-scripts' in csp
        assert response['X-Content-Type-Options'] == 'nosniff'

    # The editor's "Live" view frames the page. Only the app may, and the
    # page keeps its sandbox there.
    def test_only_the_app_may_frame_the_document(self, client, site, settings):
        settings.FRONTEND_URL = 'http://localhost:5173/'
        publish(client, site)

        response = APIClient().get(f'/s/{site.slug}/')

        csp = response['Content-Security-Policy']
        assert "frame-ancestors 'self' http://localhost:5173" in csp
        assert csp.startswith('sandbox ')
        assert 'X-Frame-Options' not in response

    def test_noindex_applies_even_when_the_authored_html_has_no_robots_tag(self, client, site):
        publish(client, site, payload=[
            {'path': '', 'title': 'Ada', 'html': HOME},
            {'path': 'draft', 'title': 'Draft', 'html': ABOUT, 'noIndex': True},
        ])
        public = APIClient()
        assert public.get(f'/s/{site.slug}/draft/')['X-Robots-Tag'] == 'noindex'
        assert public.head(f'/s/{site.slug}/draft/')['X-Robots-Tag'] == 'noindex'
        assert public.get(f'/s/{site.slug}/').get('X-Robots-Tag') is None

    @pytest.mark.parametrize('close', [
        lambda site: Site.objects.filter(pk=site.pk).update(published=False),
        lambda site: Site.objects.filter(pk=site.pk).update(moderation_blocked=True),
        lambda site: User.objects.filter(pk=site.owner_id).update(is_active=False),
    ])
    def test_every_door_that_closes_a_site_closes_its_pages(self, client, site, close):
        publish(client, site)
        # Rows survive (unpublishing through the API deletes them; this is the
        # moderator path), so the gate has to be the one answering.
        PublishedPage.objects.filter(site=site).update(html=HOME)
        close(site)

        assert APIClient().get(f'/s/{site.slug}/').status_code == 404
        assert APIClient().get(f'/s/{site.slug}/about/').status_code == 404
        assert APIClient().get(f'/s/{site.slug}/sitemap.xml').status_code == 404


class TestRememberingAVisitorsPalette:
    """The sandbox gives the page no storage, so the server keeps the choice."""
    TWO_PALETTES = '<!DOCTYPE html><html><head><script data-pwb-color-mode>x()</script></head><body>Hi</body></html>'

    @pytest.fixture
    def page(self, site):
        return PublishedPage.objects.create(site=site, path='', title='Ada', html=self.TWO_PALETTES)

    def visit(self, site, query='', cookie=None):
        visitor = APIClient()
        if cookie is not None:
            visitor.cookies['pwb-theme'] = cookie
        return visitor.get(f'/s/{site.slug}/{query}')

    def test_a_choice_in_the_address_becomes_a_cookie_for_this_site_only(self, site, page):
        response = self.visit(site, '?pwb-theme=dark')

        cookie = response.cookies['pwb-theme']
        assert cookie.value == 'dark'
        assert cookie['path'] == f'/s/{site.slug}/'
        assert cookie['samesite'] == 'Lax'
        assert cookie['httponly'] is True
        assert cookie['max-age'] == 31536000
        assert cookie['secure'] == ''

    def test_the_cookie_is_secure_on_https(self, site, page):
        visitor = APIClient()
        response = visitor.get(f'/s/{site.slug}/?pwb-theme=dark', secure=True)

        assert response.cookies['pwb-theme']['secure'] is True

    def test_choosing_the_device_is_a_choice_too(self, site, page):
        assert self.visit(site, '?pwb-theme=system', cookie='dark').cookies['pwb-theme'].value == 'system'
        assert 'data-pwb-chosen="system"' in self.visit(site, cookie='system').content.decode()

    def test_going_back_to_light_is_remembered_too(self, site, page):
        assert self.visit(site, '?pwb-theme=light', cookie='dark').cookies['pwb-theme'].value == 'light'

    def test_anything_else_in_the_address_is_not_a_choice(self, site, page):
        for value in ('blue', 'SYSTEM', '', '<script>'):
            response = self.visit(site, f'?pwb-theme={value}')
            assert 'pwb-theme' not in response.cookies
            assert 'data-pwb-chosen' not in response.content.decode()

    def test_the_address_is_read_as_the_page_reads_it(self, site, page):
        # Decoded, and the first value: the page's head script does the same, so
        # what is kept is what the visitor saw.
        assert self.visit(site, '?pwb-theme=%64ark').cookies['pwb-theme'].value == 'dark'
        assert self.visit(site, '?pwb-theme=dark&pwb-theme=light').cookies['pwb-theme'].value == 'dark'
        assert self.visit(site, '?pwb-theme=light&pwb-theme=dark').cookies['pwb-theme'].value == 'light'

    def test_a_first_value_that_is_no_palette_leaves_the_cookie_in_charge(self, site, page):
        response = self.visit(site, '?pwb-theme=blue&pwb-theme=light', cookie='dark')

        assert 'pwb-theme' not in response.cookies
        assert 'data-pwb-chosen="dark"' in response.content.decode()

    def test_a_later_visit_is_told_what_the_cookie_holds(self, site, page):
        response = self.visit(site, cookie='dark')

        assert '<script data-pwb-color-mode data-pwb-chosen="dark">x()</script>' in response.content.decode()
        assert 'pwb-theme' not in response.cookies

    def test_a_cookie_that_is_no_palette_never_reaches_the_page(self, site, page):
        response = self.visit(site, cookie='"><script>alert(1)</script>')

        assert 'data-pwb-chosen' not in response.content.decode()
        assert 'alert(1)' not in response.content.decode()

    def test_the_address_outranks_the_cookie_on_the_page(self, site, page):
        response = self.visit(site, '?pwb-theme=light', cookie='dark')

        assert 'data-pwb-chosen' not in response.content.decode()

    def test_a_remembered_page_is_kept_out_of_shared_caches(self, site, page):
        for response in (self.visit(site, '?pwb-theme=dark'), self.visit(site, cookie='dark')):
            assert response['Cache-Control'] == 'private, max-age=60'
            assert response['Vary'] == 'Cookie'

    def test_a_first_visit_may_be_cached_but_only_for_those_without_a_cookie(self, site, page):
        response = self.visit(site)

        assert response['Cache-Control'] == 'public, max-age=60'
        assert response['Vary'] == 'Cookie'
        assert 'pwb-theme' not in response.cookies

    def test_the_sandbox_stays_on_a_page_with_a_cookie(self, site, page):
        policy = self.visit(site, '?pwb-theme=dark')['Content-Security-Policy']

        assert 'sandbox allow-scripts' in policy
        assert 'allow-same-origin' not in policy

    def test_a_site_with_one_palette_is_served_as_before(self, site):
        PublishedPage.objects.create(site=site, path='', title='Ada', html=HOME)

        response = self.visit(site, '?pwb-theme=dark', cookie='dark')

        assert response.content.decode().endswith('<h1>Ada</h1></body></html>')
        assert 'data-pwb-chosen' not in response.content.decode()
        assert 'pwb-theme' not in response.cookies
        assert response['Cache-Control'] == 'public, max-age=60'
        assert 'Vary' not in response


class TestSitemap:
    def test_it_lists_every_page_that_may_be_found(self, client, site):
        publish(client, site)

        body = APIClient().get(f'/s/{site.slug}/sitemap.xml').content.decode()

        assert f'/s/{site.slug}/' in body
        assert f'/s/{site.slug}/about/' in body
        assert body.count('<url>') == 2

    def test_a_page_hidden_from_search_stays_out_of_it(self, client, site):
        publish(client, site, payload=[
            {'path': '', 'title': 'Ada', 'html': HOME},
            {'path': 'draft', 'title': 'Draft', 'html': ABOUT, 'noIndex': True},
        ])

        body = APIClient().get(f'/s/{site.slug}/sitemap.xml').content.decode()

        assert '/draft/' not in body
        assert body.count('<url>') == 1
