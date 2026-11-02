"""Draft and live are apart.

Every save of a published site, automatic saves included, used to rewrite the
pages visitors see: a half-finished edit went straight out. Now a save changes
the draft only, and the live version changes when the owner sends the draft,
or an older version, live.
"""
from importlib import import_module

import pytest
from django.apps import apps
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import PublishedPage, Site, SiteVersion

LIVE_PAGES = [{'path': '', 'title': 'Live', 'html': '<!DOCTYPE html><html><body><h1>Live</h1></body></html>'}]
NEXT_PAGES = [{'path': '', 'title': 'Next', 'html': '<!DOCTYPE html><html><body><h1>Next</h1></body></html>'}]


def schema(text):
    return {'theme': {}, 'pages': [{'id': 'home', 'name': 'Home', 'mode': 'html', 'html': f'<h1>{text}</h1>', 'components': []}]}


def says(saved):
    """Which version a stored schema is, by its home page ("<h1>Live</h1>")."""
    return saved['pages'][0]['html'] if saved else None


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


@pytest.fixture
def stranger(db):
    return User.objects.create_user('bob', 'bob@example.com', 'secret123')


def as_user(user):
    api = APIClient()
    if user:
        api.force_authenticate(user)
    return api


@pytest.fixture
def site(owner):
    """A public site whose live version says "Live"."""
    api = as_user(owner)
    made = Site.objects.create(owner=owner, title='Ada', schema=schema('Live'), html='<h1>Live</h1>')
    response = api.patch(f'/api/sites/{made.pk}/', {'published': True, 'published_pages': LIVE_PAGES}, format='json')
    assert response.status_code == 200, response.data
    made.refresh_from_db()
    return made


def save_draft(api, site, text):
    return api.patch(f'/api/sites/{site.pk}/', {'schema': schema(text), 'html': f'<h1>{text}</h1>'}, format='json')


class TestSavingADraft:
    def test_leaves_visitors_on_the_live_version(self, owner, site):
        api = as_user(owner)
        response = save_draft(api, site, 'Draft')
        assert response.status_code == 200
        assert response.data['live_differs'] is True
        site.refresh_from_db()
        assert says(site.schema) == '<h1>Draft</h1>'
        assert says(site.live_schema) == '<h1>Live</h1>'
        assert list(site.published_pages.values_list('html', flat=True)) == [LIVE_PAGES[0]['html']]
        public = as_user(None).get(f'/api/public/sites/{site.slug}/')
        assert says(public.data['schema']) == '<h1>Live</h1>'
        assert public.data['html'] == '<h1>Live</h1>'

    def test_sending_the_draft_live_updates_what_visitors_see(self, owner, site):
        api = as_user(owner)
        save_draft(api, site, 'Draft')
        response = api.patch(f'/api/sites/{site.pk}/', {'published': True, 'published_pages': NEXT_PAGES}, format='json')
        assert response.status_code == 200
        assert response.data['live_differs'] is False
        site.refresh_from_db()
        assert says(site.live_schema) == '<h1>Draft</h1>'
        assert list(site.published_pages.values_list('title', flat=True)) == ['Next']
        assert says(SiteVersion.objects.filter(site=site, source='publish').first().schema) == '<h1>Draft</h1>'
        assert says(as_user(None).get(f'/api/public/sites/{site.slug}/').data['schema']) == '<h1>Draft</h1>'


class TestSendingAVersionLive:
    def test_sends_that_version_live_and_leaves_the_draft(self, owner, site):
        api = as_user(owner)
        old = SiteVersion.objects.filter(site=site, source='publish').first()
        save_draft(api, site, 'Draft')
        api.patch(f'/api/sites/{site.pk}/', {'published': True, 'published_pages': NEXT_PAGES}, format='json')
        save_draft(api, site, 'Draft 2')

        response = api.patch(f'/api/sites/{site.pk}/', {
            'published': True, 'published_pages': LIVE_PAGES, 'live_from_version': old.pk,
        }, format='json')

        assert response.status_code == 200
        site.refresh_from_db()
        assert says(site.live_schema) == '<h1>Live</h1>'
        assert says(site.schema) == '<h1>Draft 2</h1>'
        assert list(site.published_pages.values_list('title', flat=True)) == ['Live']

    def test_refuses_a_version_of_another_site(self, owner, stranger, site):
        other = Site.objects.create(owner=stranger, title='Bob', schema=schema('Bob'))
        foreign = SiteVersion.objects.create(site=other, schema=schema('Bob'), html='', source='manual')
        response = as_user(owner).patch(f'/api/sites/{site.pk}/', {
            'published': True, 'published_pages': NEXT_PAGES, 'live_from_version': foreign.pk,
        }, format='json')
        assert response.status_code == 400
        site.refresh_from_db()
        assert says(site.live_schema) == '<h1>Live</h1>'
        assert list(site.published_pages.values_list('title', flat=True)) == ['Live']


class TestCopyingLiveToTheDraft:
    def test_the_owner_gets_the_live_version_back_and_keeps_the_draft_in_history(self, owner, site):
        api = as_user(owner)
        save_draft(api, site, 'Draft')
        revision = Site.objects.get(pk=site.pk).revision
        response = api.post(f'/api/sites/{site.pk}/live-to-draft/')
        assert response.status_code == 200
        site.refresh_from_db()
        assert says(site.schema) == '<h1>Live</h1>'
        assert site.revision == revision + 1
        assert response.data['live_differs'] is False
        assert says(SiteVersion.objects.get(site=site, label='before copying live').schema) == '<h1>Draft</h1>'

    def test_nobody_else_can(self, stranger, site):
        save_draft(as_user(site.owner), site, 'Draft')
        assert as_user(stranger).post(f'/api/sites/{site.pk}/live-to-draft/').status_code == 404
        assert as_user(None).post(f'/api/sites/{site.pk}/live-to-draft/').status_code in (401, 403)
        site.refresh_from_db()
        assert says(site.schema) == '<h1>Draft</h1>'

    def test_a_site_never_sent_live_has_nothing_to_copy(self, owner):
        made = Site.objects.create(owner=owner, title='New', schema=schema('New'))
        response = as_user(owner).post(f'/api/sites/{made.pk}/live-to-draft/')
        assert response.status_code == 400
        assert response.data['code'] == 'no_live_version'
        made.refresh_from_db()
        assert says(made.schema) == '<h1>New</h1>'


class TestWhatOthersSee:
    def test_a_review_link_shows_the_draft(self, owner, site):
        save_draft(as_user(owner), site, 'Draft')
        Site.objects.filter(pk=site.pk).update(share_mode='link')
        response = as_user(None).get(f'/api/public/reviews/{site.review_token}/')
        assert response.status_code == 200
        assert says(response.data['site']['schema']) == '<h1>Draft</h1>'

    def test_using_someone_else_site_copies_the_live_version(self, owner, stranger, site):
        save_draft(as_user(owner), site, 'Draft')
        theirs = as_user(stranger).post(f'/api/sites/clone/{site.slug}/', {}, format='json')
        assert theirs.status_code == 201
        assert says(Site.objects.get(pk=theirs.data['id']).schema) == '<h1>Live</h1>'
        mine = as_user(owner).post(f'/api/sites/clone/{site.slug}/', {}, format='json')
        assert says(Site.objects.get(pk=mine.data['id']).schema) == '<h1>Draft</h1>'


def test_a_site_public_before_the_split_keeps_its_content_live(owner):
    old = Site.objects.create(owner=owner, title='Old', schema=schema('Public'), html='<h1>Public</h1>', published=True)
    Site.objects.filter(pk=old.pk).update(live_schema=None, live_html='', live_at=None)
    import_module('builder.migrations.0028_site_live_version').live_is_what_is_public(apps, None)
    old.refresh_from_db()
    assert says(old.live_schema) == '<h1>Public</h1>'
    assert old.live_html == '<h1>Public</h1>'
    assert old.live_at is not None


class TestReadingAVersion:
    def test_only_the_owner_reads_a_version_content(self, owner, stranger, site):
        version = SiteVersion.objects.filter(site=site).first()
        url = f'/api/sites/{site.pk}/versions/{version.pk}/content/'
        mine = as_user(owner).get(url)
        assert mine.status_code == 200
        assert says(mine.data['schema']) == '<h1>Live</h1>'
        assert as_user(stranger).get(url).status_code == 404
        assert as_user(None).get(url).status_code in (401, 403)


# History has a tab of live versions, so a run of saves must not empty it.
@pytest.mark.django_db
class TestLiveVersionsInHistory:
    def site(self):
        owner = User.objects.create_user('keeper', 'keeper@example.com', 'secret123')
        return Site.objects.create(owner=owner, title='Kept', published=True)

    def test_many_manual_saves_leave_the_live_versions_alone(self):
        site = self.site()
        site.schema = schema('Draft')
        site.save(update_fields=['schema'])
        live = SiteVersion.objects.create(site=site, schema=schema('Live'), source='publish', label='Sent live')
        for number in range(52):
            SiteVersion.snapshot(site, source='manual', label=f'save {number}', force=True)

        assert SiteVersion.objects.filter(pk=live.pk).exists()
        assert SiteVersion.objects.filter(site=site, source='manual').count() == 50

    def test_live_versions_have_their_own_cap_and_the_newest_stay(self):
        site = self.site()
        for number in range(32):
            SiteVersion.objects.create(site=site, schema=schema('Live'), source='publish', label=f'Sent live {number}')
        SiteVersion._prune(site)

        kept = set(SiteVersion.objects.filter(site=site, source='publish').values_list('label', flat=True))
        assert len(kept) == 30
        assert 'Sent live 31' in kept
        assert 'Sent live 0' not in kept
