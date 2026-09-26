"""The admin console: what it shows, who may see it, and the trail it leaves."""
import json

import pytest
from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Favorite, Profile, Report, SiteSettings, Site, SiteVisit, UploadedImage


def _user(username, **flags):
    user = User.objects.create_user(username=username, password='secret123', **flags)
    return user, Token.objects.create(user=user)


def _client(token=None):
    client = APIClient()
    if token:
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client


@pytest.fixture
def world(db):
    """A small platform: a superuser, a staff moderator, two members, a guest."""
    root, root_token = _user('root', is_staff=True, is_superuser=True)
    mod, mod_token = _user('mod', is_staff=True)
    ada, ada_token = _user('ada')
    bob, _ = _user('bob')
    guest, _ = _user('guest-1')
    Profile.objects.update_or_create(user=guest, defaults={'is_guest': True})
    Profile.objects.update_or_create(user=ada, defaults={'display_name': 'Ada Lovelace'})

    public = Site.objects.create(owner=ada, title='Ada Bakery', published=True, category='business', view_count=40)
    draft = Site.objects.create(owner=ada, title='Ada Draft', published=False)
    html = Site.objects.create(owner=bob, title='Bob Html', published=True, html='<h1>Hi</h1>', view_count=5)
    SiteVisit.objects.create(site=public, path='', referrer='google.com', device='mobile')
    SiteVisit.objects.create(site=public, path='menu', referrer='', device='desktop')
    SiteVisit.objects.create(site=html, path='', referrer='google.com', device='desktop')
    Favorite.objects.create(user=bob, site=public)
    Report.objects.create(site=html, reporter=ada, reason='spam', detail='ads everywhere')
    return {
        'root': (root, root_token), 'mod': (mod, mod_token), 'ada': (ada, ada_token),
        'bob': bob, 'guest': guest, 'public': public, 'draft': draft, 'html': html,
    }


CONSOLE_URLS = [
    '/api/admin/overview/',
    '/api/admin/accounts/',
    '/api/admin/sites/',
    '/api/admin/components/',
    '/api/admin/audit/',
    '/api/admin/system/',
]


@pytest.mark.django_db
class TestAccess:
    @pytest.mark.parametrize('url', CONSOLE_URLS)
    def test_members_and_strangers_are_turned_away(self, world, url):
        assert _client().get(url).status_code == 401
        assert _client(world['ada'][1]).get(url).status_code == 403

    @pytest.mark.parametrize('url', CONSOLE_URLS)
    def test_a_moderator_can_read_every_section(self, world, url):
        assert _client(world['mod'][1]).get(url).status_code == 200

    def test_details_are_admin_only(self, world):
        ada, token = world['ada']
        assert _client(token).get(f'/api/admin/accounts/{ada.id}/').status_code == 403
        assert _client(token).get(f"/api/admin/sites/{world['public'].id}/").status_code == 403


@pytest.mark.django_db
class TestOverview:
    def test_counts_come_from_the_records(self, world):
        data = _client(world['mod'][1]).get('/api/admin/overview/').data
        assert data['accounts']['total'] == 5
        assert data['accounts']['guests'] == 1
        assert data['accounts']['registered'] == 4
        assert data['accounts']['admins'] == 2
        assert data['sites']['total'] == 3
        assert data['sites']['public'] == 2
        assert data['sites']['drafts'] == 1
        assert data['sites']['html'] == 1
        assert data['traffic']['visits_in_range'] == 3
        assert data['traffic']['views_all_time'] == 45
        assert data['traffic']['devices'] == {'desktop': 2, 'mobile': 1, 'tablet': 0}
        assert data['traffic']['referrers'][0] == {'referrer': 'google.com', 'count': 2}
        assert data['traffic']['top_sites'][0]['title'] == 'Ada Bakery'
        assert data['waiting']['site_reports'] == 1
        assert data['engagement']['favorites'] == 1

    @pytest.mark.parametrize('days', [7, 30, 90])
    def test_every_day_of_the_range_is_present(self, world, days):
        data = _client(world['mod'][1]).get('/api/admin/overview/', {'days': days}).data
        assert data['range_days'] == days
        for series in data['series'].values():
            assert len(series) == days
        today = data['series']['visits'][-1]
        assert today['date'] == timezone.localdate().isoformat()
        assert today['count'] == 3

    def test_an_unknown_range_falls_back_to_thirty_days(self, world):
        assert _client(world['mod'][1]).get('/api/admin/overview/', {'days': 5}).data['range_days'] == 30


@pytest.mark.django_db
class TestAccounts:
    def _list(self, world, **params):
        return _client(world['mod'][1]).get('/api/admin/accounts/', params).data

    def test_filters(self, world):
        assert [u['username'] for u in self._list(world, status='guests')['results']] == ['guest-1']
        assert {u['username'] for u in self._list(world, status='admins')['results']} == {'root', 'mod'}
        world['bob'].is_active = False
        world['bob'].save()
        assert [u['username'] for u in self._list(world, status='suspended')['results']] == ['bob']

    def test_search_reaches_the_display_name(self, world):
        assert [u['username'] for u in self._list(world, q='lovelace')['results']] == ['ada']

    def test_sorting_by_sites_and_views(self, world):
        assert self._list(world, sort='sites')['results'][0]['username'] == 'ada'
        top = self._list(world, sort='views')['results'][0]
        assert top['username'] == 'ada' and top['views'] == 40 and top['public_sites'] == 1

    def test_detail_counts_everything_the_account_owns(self, world):
        ada = world['ada'][0]
        data = _client(world['mod'][1]).get(f'/api/admin/accounts/{ada.id}/').data
        assert data['display_name'] == 'Ada Lovelace'
        assert data['counts']['sites'] == 2
        assert data['counts']['public_sites'] == 1
        assert data['counts']['favorites_received'] == 1
        assert data['counts']['reports_filed'] == 1
        assert data['signed_in'] is True
        bakery = next(s for s in data['sites'] if s['title'] == 'Ada Bakery')
        assert bakery['visits_30d'] == 2 and bakery['favorites'] == 1

    def test_unknown_account_is_a_404(self, world):
        assert _client(world['mod'][1]).get('/api/admin/accounts/999999/').status_code == 404


@pytest.mark.django_db
class TestRoles:
    def test_a_superuser_grants_and_removes_admin_rights(self, world):
        bob = world['bob']
        root_client = _client(world['root'][1])
        assert root_client.post(f'/api/admin/accounts/{bob.id}/role/', {'staff': True}, format='json').status_code == 200
        bob.refresh_from_db()
        assert bob.is_staff
        root_client.post(f'/api/admin/accounts/{bob.id}/role/', {'staff': False}, format='json')
        bob.refresh_from_db()
        assert not bob.is_staff

    def test_a_moderator_cannot_hand_out_rights(self, world):
        response = _client(world['mod'][1]).post(f"/api/admin/accounts/{world['bob'].id}/role/", {'staff': True}, format='json')
        assert response.status_code == 403

    @pytest.mark.parametrize('who, code', [('root', 'self_role_forbidden'), ('guest', 'guest_role_forbidden')])
    def test_guards(self, world, who, code):
        target = world['root'][0] if who == 'root' else world['guest']
        response = _client(world['root'][1]).post(f'/api/admin/accounts/{target.id}/role/', {'staff': True}, format='json')
        assert response.status_code == 400
        assert response.data['code'] == code


@pytest.mark.django_db
class TestSessions:
    def test_signing_out_everywhere_revokes_the_token(self, world):
        ada = world['ada'][0]
        response = _client(world['mod'][1]).post(f'/api/admin/accounts/{ada.id}/sessions/')
        assert response.status_code == 200 and response.data['revoked'] is True
        assert not Token.objects.filter(user=ada).exists()
        ada.refresh_from_db()
        assert ada.is_active, 'signing out is not suspending'

    def test_a_guest_is_never_signed_out(self, world):
        guest = world['guest']
        response = _client(world['mod'][1]).post(f'/api/admin/accounts/{guest.id}/sessions/')
        assert response.status_code == 400
        assert Token.objects.filter(user=guest).exists()

    def test_a_moderator_cannot_sign_out_another_admin(self, world):
        response = _client(world['mod'][1]).post(f"/api/admin/accounts/{world['root'][0].id}/sessions/")
        assert response.status_code == 400


@pytest.mark.django_db
class TestSites:
    def _list(self, world, **params):
        return _client(world['mod'][1]).get('/api/admin/sites/', params).data['results']

    @pytest.mark.parametrize('state, titles', [
        ('public', {'Ada Bakery', 'Bob Html'}),
        ('drafts', {'Ada Draft'}),
        ('reported', {'Bob Html'}),
    ])
    def test_filters(self, world, state, titles):
        assert {s['title'] for s in self._list(world, status=state)} == titles

    def test_kind_and_search(self, world):
        assert [s['title'] for s in self._list(world, kind='html')] == ['Bob Html']
        assert {s['title'] for s in self._list(world, q='ada')} == {'Ada Bakery', 'Ada Draft'}

    def test_detail_traffic(self, world):
        site = world['public']
        data = _client(world['mod'][1]).get(f'/api/admin/sites/{site.id}/').data
        assert data['counts']['visits_30d'] == 2
        assert data['traffic']['devices']['mobile'] == 1
        assert {p['path'] for p in data['traffic']['paths']} == {'/', 'menu'}
        assert len(data['traffic']['series']) == 30


@pytest.mark.django_db
class TestAuditTrail:
    def test_moderation_is_recorded_with_who_and_what(self, world):
        mod_client = _client(world['mod'][1])
        mod_client.post(f"/api/admin/sites/{world['html'].id}/moderate/", {'action': 'unpublish'}, format='json')
        mod_client.post(f"/api/admin/users/{world['bob'].id}/suspend/", {'suspend': True}, format='json')
        entries = mod_client.get('/api/admin/audit/').data['results']
        assert [e['action'] for e in entries[:2]] == ['user.suspend', 'site.unpublish']
        assert entries[0]['actor']['username'] == 'mod'
        assert entries[1]['target'] == {'type': 'site', 'id': str(world['html'].id), 'repr': str(world['html'])}
        assert entries[1]['source'] == 'console'

    def test_a_deleted_site_still_has_its_row(self, world):
        site_id = world['draft'].id
        _client(world['mod'][1]).post(f'/api/admin/sites/{site_id}/moderate/', {'action': 'delete'}, format='json')
        entry = LogEntry.objects.get(object_id=str(site_id))
        assert json.loads(entry.change_message)['sitebuilder'] == 'site.delete'

    def test_settings_changes_name_fields_never_values(self, world):
        _client(world['root'][1]).put('/api/admin/settings/', {'recaptcha_secret_key': 'top-secret-value'}, format='json')
        entry = _client(world['root'][1]).get('/api/admin/audit/').data['results'][0]
        assert entry['action'] == 'settings.update'
        assert entry['detail'] == 'recaptcha_secret_key'
        assert 'top-secret-value' not in json.dumps(entry, default=str)

    def test_django_admin_entries_show_up_too(self, world):
        LogEntry.objects.create(
            user=world['root'][0], content_type=ContentType.objects.get_for_model(User),
            object_id=str(world['bob'].id), object_repr='bob', action_flag=CHANGE,
            change_message=json.dumps([{'changed': {'fields': ['Email address']}}]),
        )
        entry = _client(world['mod'][1]).get('/api/admin/audit/').data['results'][0]
        assert entry['source'] == 'django-admin'
        assert 'Email address' in entry['detail']

    def test_the_account_history_lists_what_was_done_to_it_and_its_sites(self, world):
        ada = world['ada'][0]
        mod_client = _client(world['mod'][1])
        mod_client.post(f"/api/admin/sites/{world['public'].id}/moderate/", {'action': 'unpublish'}, format='json')
        history = mod_client.get(f'/api/admin/accounts/{ada.id}/').data['history']
        assert history[0]['action'] == 'site.unpublish'


@pytest.mark.django_db
class TestSystem:
    def test_reports_health_and_features_without_secrets(self, world):
        settings_row = SiteSettings.load()
        settings_row.recaptcha_site_key = 'site-key'
        settings_row.recaptcha_secret_key = 'secret-key-never-shown'
        settings_row.save()
        data = _client(world['mod'][1]).get('/api/admin/system/').data
        assert data['database']['ok'] is True
        assert data['cache']['ok'] is True
        assert data['features']['recaptcha'] is True
        assert data['records']['sites'] == 3
        assert 'secret-key-never-shown' not in json.dumps(data, default=str)

    def test_storage_adds_up_uploads(self, world):
        data = _client(world['mod'][1]).get('/api/admin/system/').data
        assert data['storage']['uploads'] == UploadedImage.objects.count()


@pytest.mark.django_db
class TestSignInIsRecorded:
    def test_logging_in_stamps_last_login(self, world):
        bob = world['bob']
        assert bob.last_login is None
        response = APIClient().post('/api/auth/login/', {'username': 'bob', 'password': 'secret123'}, format='json')
        assert response.status_code == 200
        bob.refresh_from_db()
        assert bob.last_login is not None
