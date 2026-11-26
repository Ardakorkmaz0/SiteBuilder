"""Delta saves, lean save responses, and owner draft previews."""
import time

import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Site, SiteVersion
from .version_summary import summarize


LIVE_PAGES = [
    {'path': '', 'title': 'Live Home', 'html': '<!DOCTYPE html><html><body><h1>Live Home</h1></body></html>'},
]


def _comp(cid, text, y=20):
    return {
        'id': cid,
        'type': 'text',
        'props': {'text': text},
        'styles': {'color': '#111111'},
        'layout': {'x': 20, 'y': y, 'w': 500, 'h': 32},
        'mobileLayout': {'x': 16, 'y': y, 'w': 358, 'h': 32},
    }


def _page(pid, name, comps, html_backup=''):
    return {
        'id': pid,
        'name': name,
        'folder': '',
        'seoTitle': '',
        'seoDescription': '',
        'seoImage': '',
        'language': 'en',
        'direction': '',
        'themeColor': '',
        'smoothScroll': False,
        'canonicalUrl': '',
        'noIndex': False,
        'showScrollIndicator': True,
        'background': '#ffffff',
        'backgroundMobile': '#ffffff',
        'canvasWidth': 1000,
        'canvasFold': 0,
        'mobileWidth': 390,
        'mobileFold': 0,
        'mobileManual': False,
        'flowMode': False,
        'mode': 'empty',
        'html': '',
        'htmlBackup': html_backup,
        'fonts': [],
        'components': comps,
    }


def _as_user(user):
    api = APIClient()
    if user:
        api.force_authenticate(user)
    return api


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


@pytest.fixture
def stranger(db):
    return User.objects.create_user('bob', 'bob@example.com', 'secret123')


class TestOwnerDraftPreview:
    def test_owner_draft_query_returns_draft_even_when_live_differs(self, owner, stranger):
        api = _as_user(owner)
        initial_schema = {
            'theme': {},
            'customCss': '',
            'customJs': '',
            'pages': [_page('home', 'Home', [_comp('c1', 'Live copy')], html_backup='<p>backup</p>')],
        }
        site = Site.objects.create(owner=owner, title='Ada Site', schema=initial_schema)
        pub = api.patch(
            f'/api/sites/{site.pk}/',
            {'published': True, 'published_pages': LIVE_PAGES},
            format='json',
        )
        assert pub.status_code == 200

        draft_schema = {
            'theme': {},
            'customCss': '',
            'customJs': '',
            'pages': [_page('home', 'Home', [_comp('c1', 'New draft copy')], html_backup='<p>backup</p>')],
        }
        saved = api.patch(f'/api/sites/{site.pk}/', {'schema': draft_schema}, format='json')
        assert saved.status_code == 200

        # Unauthenticated caller asking for ?draft=1 still gets only the live site.
        anon_res = _as_user(None).get(f'/api/public/sites/{site.slug}/?draft=1')
        assert anon_res.status_code == 200
        assert anon_res.data['schema']['pages'][0]['components'][0]['props']['text'] == 'Live copy'
        assert anon_res.data['schema']['pages'][0].get('htmlBackup', '') == ''

        # Signed-in non-owner asking for ?draft=1 still gets only the live site.
        stranger_res = _as_user(stranger).get(f'/api/public/sites/{site.slug}/?draft=1')
        assert stranger_res.status_code == 200
        assert stranger_res.data['schema']['pages'][0]['components'][0]['props']['text'] == 'Live copy'

        # Owner without ?draft=1 sees the public showcase (live version).
        owner_public = api.get(f'/api/public/sites/{site.slug}/')
        assert owner_public.status_code == 200
        assert owner_public.data['schema']['pages'][0]['components'][0]['props']['text'] == 'Live copy'

        # Owner with ?draft=1 sees the saved draft, with editor-only htmlBackup omitted on the wire
        # while the database row retains htmlBackup intact.
        owner_draft = api.get(f'/api/public/sites/{site.slug}/?draft=1')
        assert owner_draft.status_code == 200
        assert owner_draft.data['schema']['pages'][0]['components'][0]['props']['text'] == 'New draft copy'
        assert owner_draft.data['schema']['pages'][0].get('htmlBackup', '') == ''

        site.refresh_from_db()
        assert site.schema['pages'][0]['htmlBackup'] == '<p>backup</p>'

    def test_unpublished_draft_preview_refuses_non_owners(self, owner, stranger):
        site = Site.objects.create(
            owner=owner,
            title='Private Draft',
            published=False,
            schema={'theme': {}, 'pages': [_page('home', 'Home', [_comp('c1', 'Secret draft')])]},
        )
        assert _as_user(None).get(f'/api/public/sites/{site.slug}/?draft=1').status_code == 404
        assert _as_user(stranger).get(f'/api/public/sites/{site.slug}/?draft=1').status_code == 404
        ok = _as_user(owner).get(f'/api/public/sites/{site.slug}/?draft=1')
        assert ok.status_code == 200
        assert ok.data['schema']['pages'][0]['components'][0]['props']['text'] == 'Secret draft'


class TestDeltaSaveAndOmitContent:
    @pytest.fixture
    def multi_page_site(self, owner):
        api = _as_user(owner)
        created = api.post(
            '/api/sites/',
            {
                'title': 'Heavy Site',
                'schema': {
                    'theme': {'primaryColor': '#0071e3'},
                    'customCss': 'body { margin: 0; }',
                    'customJs': '',
                    'fontFaces': "@font-face { font-family: 'TestFont'; src: url(data:font/woff2;base64,AAAA); }",
                    'pages': [
                        _page('p_home', 'Home', [_comp('h1', 'Welcome'), _comp('h2', 'Subhead', y=60)], html_backup='<div>heavy-backup-1</div>'),
                        _page('p_about', 'About', [_comp('a1', 'About us')], html_backup='<div>heavy-backup-2</div>'),
                    ],
                },
                'html': '',
            },
            format='json',
        )
        assert created.status_code == 201
        site = Site.objects.get(pk=created.data['id'])
        SiteVersion.snapshot(site, source='manual', force=True)
        return site

    def test_unauthenticated_and_non_owner_delta_saves_are_refused(self, multi_page_site, stranger):
        before_rev = multi_page_site.revision
        before_schema = multi_page_site.schema
        patch_body = {
            'base_revision': before_rev,
            'schema_patch': {
                'pages': [
                    {'op': 'keep', 'id': 'p_home'},
                    {'op': 'keep', 'id': 'p_about'},
                ],
            },
        }
        anon = _as_user(None).patch(f'/api/sites/{multi_page_site.pk}/?omit_content=1', patch_body, format='json')
        assert anon.status_code in (401, 403)

        other = _as_user(stranger).patch(f'/api/sites/{multi_page_site.pk}/?omit_content=1', patch_body, format='json')
        assert other.status_code == 404

        multi_page_site.refresh_from_db()
        assert multi_page_site.revision == before_rev
        assert multi_page_site.schema == before_schema

    def test_delta_save_merges_unchanged_pages_and_components_and_omits_content_when_asked(self, owner, multi_page_site):
        api = _as_user(owner)
        edited_comp = _comp('h2', 'Updated subhead', y=64)
        edited_comp['styles']['backgroundImage'] = 'url(javascript:alert(1))'
        home_meta = {
            k: v for k, v in multi_page_site.schema['pages'][0].items()
            if k not in ('components', 'html', 'htmlBackup')
        }
        res = api.patch(
            f'/api/sites/{multi_page_site.pk}/?omit_content=1',
            {
                'title': 'Heavy Site',
                'base_revision': multi_page_site.revision,
                'schema_patch': {
                    'pages': [
                        {
                            'op': 'patch',
                            'id': 'p_home',
                            'meta': home_meta,
                            'components': [
                                {'keep': 'h1'},
                                {'set': edited_comp},
                            ],
                        },
                        {'op': 'keep', 'id': 'p_about'},
                    ],
                },
            },
            format='json',
        )
        assert res.status_code == 200, res.data
        assert 'schema' not in res.data
        assert 'html' not in res.data
        assert res.data['revision'] == multi_page_site.revision + 1
        assert res.data['slug'] == multi_page_site.slug

        multi_page_site.refresh_from_db()
        assert multi_page_site.revision == res.data['revision']
        assert multi_page_site.schema['fontFaces'].startswith('@font-face')
        home, about = multi_page_site.schema['pages']
        assert home['htmlBackup'] == '<div>heavy-backup-1</div>'
        assert home['components'][0]['props']['text'] == 'Welcome'
        assert home['components'][1]['props']['text'] == 'Updated subhead'
        assert 'backgroundImage' not in home['components'][1]['styles']
        assert about['htmlBackup'] == '<div>heavy-backup-2</div>'
        assert about['components'][0]['props']['text'] == 'About us'

        latest_version = SiteVersion.objects.filter(site=multi_page_site).first()
        assert latest_version is not None
        assert [p['id'] for p in latest_version.summary['pages']] == ['p_home']

    def test_without_omit_content_response_still_returns_schema_and_html(self, owner, multi_page_site):
        api = _as_user(owner)
        res = api.patch(
            f'/api/sites/{multi_page_site.pk}/',
            {
                'base_revision': multi_page_site.revision,
                'schema_patch': {
                    'pages': [
                        {'op': 'keep', 'id': 'p_home'},
                        {'op': 'keep', 'id': 'p_about'},
                    ],
                },
            },
            format='json',
        )
        assert res.status_code == 200
        assert 'schema' in res.data
        assert 'html' in res.data

        header_res = api.patch(
            f'/api/sites/{multi_page_site.pk}/',
            {
                'base_revision': res.data['revision'],
                'schema_patch': {
                    'pages': [
                        {'op': 'keep', 'id': 'p_home'},
                        {'op': 'keep', 'id': 'p_about'},
                    ],
                },
            },
            format='json',
            HTTP_X_SITE_OMIT_CONTENT='1',
        )
        assert header_res.status_code == 200
        assert 'schema' not in header_res.data
        assert 'html' not in header_res.data

        preflight = _as_user(None).options(
            f'/api/sites/{multi_page_site.pk}/',
            HTTP_ORIGIN='http://localhost:5173',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='PATCH',
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type,x-site-save-source,x-site-omit-content',
        )
        assert preflight.status_code == 200
        allowed_headers = preflight.headers.get('Access-Control-Allow-Headers', '').lower()
        assert 'x-site-omit-content' in allowed_headers

    def test_delta_save_requires_matching_base_revision_and_valid_ids(self, owner, multi_page_site):
        api = _as_user(owner)
        before_rev = multi_page_site.revision
        before_schema = multi_page_site.schema

        no_rev = api.patch(
            f'/api/sites/{multi_page_site.pk}/',
            {'schema_patch': {'pages': [{'op': 'keep', 'id': 'p_home'}]}},
            format='json',
        )
        assert no_rev.status_code == 400

        stale_rev = api.patch(
            f'/api/sites/{multi_page_site.pk}/',
            {
                'base_revision': before_rev + 9,
                'schema_patch': {'pages': [{'op': 'keep', 'id': 'p_home'}]},
            },
            format='json',
        )
        assert stale_rev.status_code == 409
        assert stale_rev.data['code'] == 'site_changed'

        bad_page = api.patch(
            f'/api/sites/{multi_page_site.pk}/',
            {
                'base_revision': before_rev,
                'schema_patch': {'pages': [{'op': 'keep', 'id': 'missing_page'}]},
            },
            format='json',
        )
        assert bad_page.status_code == 400

        multi_page_site.refresh_from_db()
        assert multi_page_site.revision == before_rev
        assert multi_page_site.schema == before_schema


def test_version_summary_skips_unchanged_heavy_pages_quickly():
    heavy_blob = 'data:image/png;base64,' + ('A' * 20000)
    unchanged_pages = [
        _page(
            f'p_{idx}',
            f'Page {idx}',
            [_comp(f'c_{idx}_{n}', heavy_blob if n % 8 == 0 else f'Line {n}', y=n * 24) for n in range(800)],
        )
        for idx in range(5)
    ]
    edited_before = _page('p_edit', 'Edited', [_comp('e1', 'Before'), _comp('e2', heavy_blob, y=60)])
    edited_after = _page('p_edit', 'Edited', [_comp('e1', 'After'), _comp('e2', heavy_blob, y=60)])
    before = {'theme': {}, 'pages': [*unchanged_pages, edited_before]}
    after = {'theme': {}, 'pages': [*unchanged_pages, edited_after]}

    t0 = time.perf_counter()
    result = summarize(before, after)
    elapsed = time.perf_counter() - t0

    assert [p['id'] for p in result['pages']] == ['p_edit']
    assert elapsed < 0.05
