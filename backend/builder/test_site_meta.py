"""The sharing image, title and icon set in the Control centre reach the page.

They were stored in site_options and never written anywhere a scraper reads,
so a shared link previewed without an image however often one was set.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import PublishedPage, Site
from .site_meta import public_url, share_image, with_site_meta

PLAIN = '<!DOCTYPE html><html lang="en"><head><title>Ada</title></head><body><h1>Ada</h1></body></html>'
OWN_IMAGE = ('<!DOCTYPE html><html><head><meta property="og:image" content="https://cdn.example/own.png">'
             '</head><body></body></html>')


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


def published_site(owner, html=PLAIN, seo=None, schema=None):
    site = Site.objects.create(
        owner=owner, title='Ada', published=True,
        site_options={'seo': seo} if seo is not None else {},
        schema=schema or {'pages': []},
    )
    PublishedPage.objects.create(site=site, path='', title='Ada', html=html)
    return site


def served(site):
    response = APIClient().get(f'/s/{site.slug}/')
    assert response.status_code == 200
    return response.content.decode()


class TestTheServedPage:
    def test_the_site_wide_image_becomes_the_link_preview(self, owner):
        site = published_site(owner, seo={'socialImage': 'https://cdn.example/card.png'})

        html = served(site)

        assert '<meta property="og:image" content="https://cdn.example/card.png">' in html
        assert '<meta name="twitter:card" content="summary_large_image">' in html
        # Inside the head, which is where scrapers look.
        assert html.index('og:image') < html.index('</head>')

    def test_an_uploaded_image_path_is_made_absolute(self, owner):
        site = published_site(owner, seo={'socialImage': '/media/uploads/card.png'})

        assert 'content="http://testserver/media/uploads/card.png"' in served(site)

    def test_the_pages_own_image_wins(self, owner):
        site = published_site(owner, html=OWN_IMAGE, seo={'socialImage': 'https://cdn.example/card.png'})

        html = served(site)

        assert html.count('og:image') == 1
        assert 'own.png' in html

    def test_title_description_and_icon_fill_the_gaps(self, owner):
        site = published_site(owner, seo={
            'title': 'Ada Studio', 'description': 'Selected work.', 'favicon': 'https://cdn.example/i.png',
        })

        html = served(site)

        assert '<meta property="og:title" content="Ada Studio">' in html
        assert '<meta name="description" content="Selected work.">' in html
        assert '<link rel="icon" href="https://cdn.example/i.png">' in html
        assert '<link rel="apple-touch-icon" href="https://cdn.example/i.png">' in html
        # The page keeps its own <title>.
        assert '<title>Ada</title>' in html

    def test_nothing_set_leaves_the_document_byte_for_byte(self, owner):
        site = published_site(owner)
        endpoint = f'<meta name="pwb-form-endpoint" content="/s/{site.slug}/__sitebuilder/form/">'
        # Only the inbox tag is added (test_published_forms.py), nothing for sharing.
        assert served(site).replace(endpoint, '') == PLAIN

    def test_values_are_escaped_and_unsafe_addresses_dropped(self, owner):
        site = published_site(owner, seo={
            'title': '"><script>alert(1)</script>', 'socialImage': 'javascript:alert(1)',
            'favicon': 'https://x.example/"onload="alert(1)',
        })

        html = served(site)

        assert '<script>alert(1)</script>' not in html
        assert 'javascript:' not in html
        assert 'onload' not in html


class TestWhereTheTagsGo:
    class _Site:
        def __init__(self, seo):
            self.site_options = {'seo': seo}

    def test_a_document_without_a_head_keeps_its_doctype_first(self):
        html = '<!doctype html><p>Hi</p>'

        out = with_site_meta(html, self._Site({'title': 'Hi'}), 'https://sitebuilt.app')

        assert out.startswith('<!doctype html><meta property="og:title"')

    def test_a_head_that_mentions_body_in_a_script_is_still_found(self):
        html = '<html><head><script>const s = "</head>"</script></head><body></body></html>'

        out = with_site_meta(html, self._Site({'title': 'Hi'}), 'https://sitebuilt.app')

        assert 'og:title' in out
        assert out.index('og:title') < out.index('<body>')


class TestTheCardImage:
    def test_the_site_wide_image_comes_first(self, owner):
        site = published_site(owner, seo={'socialImage': 'https://cdn.example/card.png'},
                              schema={'pages': [{'seoImage': 'https://cdn.example/home.png'}]})

        assert share_image(site) == 'https://cdn.example/card.png'

    def test_otherwise_the_home_pages_sharing_image(self, owner):
        site = published_site(owner, schema={'pages': [{'seoImage': 'https://cdn.example/home.png'}]})

        assert share_image(site) == 'https://cdn.example/home.png'

    def test_inline_images_are_not_sent_to_every_card(self, owner):
        site = published_site(owner, seo={'socialImage': 'data:image/png;base64,AAAA'})

        assert share_image(site) == ''

    def test_the_dashboard_list_carries_it(self, owner):
        published_site(owner, seo={'socialImage': 'https://cdn.example/card.png'})
        api = APIClient()
        api.force_authenticate(owner)

        rows = api.get('/api/sites/').data
        rows = rows['results'] if isinstance(rows, dict) else rows

        assert rows[0]['share_image'] == 'https://cdn.example/card.png'


def test_public_url_rejects_protocol_relative_and_spaces():
    assert public_url('//evil.example/x.png', 'https://sitebuilt.app') == ''
    assert public_url('https://a.example/x y.png') == ''
    assert public_url('/media/a.png', 'https://sitebuilt.app/') == 'https://sitebuilt.app/media/a.png'
