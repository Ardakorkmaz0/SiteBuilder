"""A history load must snapshot and replace the latest locked site revision."""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Site, SiteVersion
from .views import SiteViewSet


@pytest.fixture
def restore_case(db):
    owner = User.objects.create_user(username='restore-owner')
    outsider = User.objects.create_user(username='restore-outsider')
    site = Site.objects.create(
        owner=owner, title='Current title', revision=4, category='portfolio', tags=['current'],
        schema={'pages': [{'id': 'current-home', 'name': 'Current', 'components': []}]},
        html='<html><body>Current document</body></html>',
    )
    checkpoint = SiteVersion.objects.create(
        site=site, source='manual', pinned=True, label='Checkpoint',
        schema={'pages': [{'id': 'checkpoint-home', 'name': 'Checkpoint', 'components': []}]},
        html='<html><body>Checkpoint document</body></html>',
    )
    client = APIClient()
    client.force_authenticate(owner)
    return site, checkpoint, client, outsider


def _url(site, checkpoint):
    return f'/api/sites/{site.pk}/versions/{checkpoint.pk}/restore/'


def _content_row(site):
    return Site.objects.filter(pk=site.pk).values(
        'title', 'schema', 'html', 'revision', 'category', 'tags', 'published',
        'site_options', 'moderation_blocked', 'view_count',
    ).get()


def _interleave_save(monkeypatch):
    original = SiteViewSet.get_object
    calls = []

    def read_then_another_tab_saves(view):
        checked = original(view)
        if view.action == 'restore_version':
            calls.append(checked.pk)
            # Simulate a committed save after the permission/read boundary.
            # The endpoint's snapshots and writes still execute against the DB.
            changed = Site.objects.filter(pk=checked.pk).update(
                title='Latest title from another tab', revision=5, category='business', tags=['latest'],
                schema={'pages': [{'id': 'latest-home', 'name': 'Latest', 'components': []}]},
                html='<html><body>Latest document from another tab</body></html>',
                published=True, site_options={'seo': {'title': 'Latest SEO'}},
                moderation_blocked=True, view_count=19,
            )
            assert changed == 1
        return checked

    monkeypatch.setattr(SiteViewSet, 'get_object', read_then_another_tab_saves)
    return calls


@pytest.mark.django_db
class TestRestorePermissionsAndRecovery:
    def test_unauthenticated_restore_changes_neither_site_nor_history(self, restore_case):
        site, checkpoint, _, _ = restore_case
        before = _content_row(site)
        response = APIClient().post(_url(site, checkpoint))
        assert response.status_code == 401
        assert _content_row(site) == before
        assert SiteVersion.objects.filter(site=site).count() == 1

    def test_another_owner_cannot_restore_or_create_recovery_rows(self, restore_case):
        site, checkpoint, client, outsider = restore_case
        before = _content_row(site)
        client.force_authenticate(outsider)
        response = client.post(_url(site, checkpoint))
        assert response.status_code == 404
        assert _content_row(site) == before
        assert SiteVersion.objects.filter(site=site).count() == 1

    def test_owner_restores_content_and_snapshots_the_current_document(self, restore_case):
        site, checkpoint, client, _ = restore_case
        response = client.post(_url(site, checkpoint))
        assert response.status_code == 200
        site.refresh_from_db()
        assert site.schema['pages'][0]['id'] == 'checkpoint-home'
        assert site.html == '<html><body>Checkpoint document</body></html>'
        assert site.title == 'Current title'
        assert site.category == 'portfolio'
        assert site.tags == ['current']
        assert site.revision == 5
        assert response.data['revision'] == 5
        recovery = SiteVersion.objects.get(site=site, source='save', label='before restore')
        assert recovery.schema['pages'][0]['id'] == 'current-home'
        assert recovery.html == '<html><body>Current document</body></html>'
        assert SiteVersion.objects.filter(site=site).count() == 3


@pytest.mark.django_db
class TestRestoreReadBoundary:
    def test_recovery_snapshot_contains_the_save_committed_after_permission_check(self, restore_case, monkeypatch):
        site, checkpoint, client, _ = restore_case
        calls = _interleave_save(monkeypatch)
        response = client.post(_url(site, checkpoint))
        assert response.status_code == 200
        assert calls == [site.pk]
        recovery = SiteVersion.objects.get(site=site, source='save', label='before restore')
        assert recovery.schema['pages'][0]['id'] == 'latest-home'
        assert recovery.html == '<html><body>Latest document from another tab</body></html>'
        site.refresh_from_db()
        assert site.schema['pages'][0]['id'] == 'checkpoint-home'
        assert site.html == '<html><body>Checkpoint document</body></html>'

    def test_restore_keeps_metadata_committed_after_permission_check(self, restore_case, monkeypatch):
        site, checkpoint, client, _ = restore_case
        calls = _interleave_save(monkeypatch)
        response = client.post(_url(site, checkpoint))
        assert response.status_code == 200
        assert calls == [site.pk]
        site.refresh_from_db()
        assert site.title == 'Latest title from another tab'
        assert site.category == 'business'
        assert site.tags == ['latest']
        assert site.published is True
        assert site.site_options == {'seo': {'title': 'Latest SEO'}}
        assert site.moderation_blocked is True
        assert site.view_count == 19
        assert response.data['title'] == 'Latest title from another tab'

    def test_restore_advances_the_revision_of_the_latest_committed_save(self, restore_case, monkeypatch):
        site, checkpoint, client, _ = restore_case
        calls = _interleave_save(monkeypatch)
        response = client.post(_url(site, checkpoint))
        assert response.status_code == 200
        assert calls == [site.pk]
        site.refresh_from_db()
        assert site.revision == 6
        assert response.data['revision'] == 6
