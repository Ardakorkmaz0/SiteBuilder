"""Two tabs (or two devices) open on one site must not silently overwrite each
other: the second save, made from what the first one replaced, used to win
without a word and take the first one's work with it."""
import pytest
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Site, SiteVersion


def _page(text):
    return {'pages': [{'id': 'home', 'name': 'Home', 'mode': 'html', 'html': f'<html><body><h1>{text}</h1></body></html>', 'components': []}]}


@pytest.fixture
def owner(db):
    user = User.objects.create_user(username='ada', password='secret123')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=user).key}')
    return user, client


def _save(client, site, text, base):
    body = {'title': site.title, 'schema': _page(text), 'html': '', 'published': False}
    if base is not None:
        body['base_revision'] = base
    return client.put(f'/api/sites/{site.pk}/', body, format='json')


@pytest.mark.django_db
class TestSiteRevision:
    def test_each_save_moves_the_revision_on(self, owner):
        user, client = owner
        site = Site.objects.create(owner=user, title='Kafe')
        first = _save(client, site, 'One', base=0)
        assert first.status_code == 200
        assert first.data['revision'] == 1
        assert _save(client, site, 'Two', base=1).data['revision'] == 2

    def test_a_save_from_an_older_revision_is_refused(self, owner):
        user, client = owner
        site = Site.objects.create(owner=user, title='Kafe')
        assert _save(client, site, 'Tab A', base=0).status_code == 200

        stale = _save(client, site, 'Tab B', base=0)

        assert stale.status_code == 409
        assert stale.data['code'] == 'site_changed'
        site.refresh_from_db()
        assert 'Tab A' in site.schema['pages'][0]['html']
        assert site.revision == 1

    def test_without_a_base_revision_the_save_goes_through(self, owner):
        # Older clients, scripts, and "save mine anyway".
        user, client = owner
        site = Site.objects.create(owner=user, title='Kafe')
        _save(client, site, 'Tab A', base=0)
        forced = _save(client, site, 'Tab B', base=None)
        assert forced.status_code == 200
        site.refresh_from_db()
        assert 'Tab B' in site.schema['pages'][0]['html']

    def test_a_restored_version_counts_as_a_change(self, owner):
        user, client = owner
        site = Site.objects.create(owner=user, title='Kafe')
        _save(client, site, 'Old', base=0)
        version = SiteVersion.objects.filter(site=site).order_by('-created_at').first()
        _save(client, site, 'New', base=1)
        restored = client.post(f'/api/sites/{site.pk}/versions/{version.pk}/restore/')
        assert restored.status_code == 200
        site.refresh_from_db()
        assert site.revision == 3
        # A tab still on revision 2 is told, not allowed to undo the restore.
        assert _save(client, site, 'Stale tab', base=2).status_code == 409

    def test_a_settings_patch_does_not_make_other_tabs_stale(self, owner):
        user, client = owner
        site = Site.objects.create(owner=user, title='Kafe')
        _save(client, site, 'One', base=0)
        seo = client.patch(f'/api/sites/{site.pk}/', {'site_options': {'seo': {'title': 'Kafe'}}}, format='json')
        assert seo.status_code == 200
        assert seo.data['revision'] == 1
        assert _save(client, site, 'Two', base=1).status_code == 200

