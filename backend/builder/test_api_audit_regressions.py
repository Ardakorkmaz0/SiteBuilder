"""Identity creation limits and guest transitions must hold at every entry point."""
from datetime import timedelta
from importlib import import_module
from types import SimpleNamespace

import pytest
from django.apps import apps
from django.contrib.auth.models import User
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from .access import DAILY_PUBLISH_LIMIT
from .guests import adopt_guest_work, create_guest_user, upgrade_guest
from .models import PublishedPage, Site, SitePublication
from .serializers import RegisterSerializer, SiteSerializer
from .throttles import ScopedIPRateThrottle


@pytest.mark.django_db
def test_rotating_guest_tokens_cannot_reset_the_identity_creation_limit(monkeypatch):
    monkeypatch.setattr(ScopedIPRateThrottle, 'THROTTLE_RATES', {
        **ScopedIPRateThrottle.THROTTLE_RATES, 'guest': '2/min',
    })
    client = APIClient()
    for _ in range(2):
        response = client.post('/api/auth/guest/', {}, format='json')
        assert response.status_code == 201
        client.credentials(HTTP_AUTHORIZATION=f'Token {response.data["token"]}')

    assert client.post('/api/auth/guest/', {}, format='json').status_code == 429
    assert User.objects.filter(profile__is_guest=True).count() == 2


@pytest.mark.django_db
def test_rotating_guest_tokens_cannot_reset_the_credential_limit(monkeypatch):
    monkeypatch.setattr(ScopedIPRateThrottle, 'THROTTLE_RATES', {
        **ScopedIPRateThrottle.THROTTLE_RATES, 'auth': '2/min',
    })
    client = APIClient()
    codes = []
    for _ in range(3):
        token = Token.objects.create(user=create_guest_user())
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        codes.append(client.post('/api/auth/login/', {
            'username': 'missing', 'password': 'wrong',
        }, format='json').status_code)

    assert codes == [400, 400, 429]


@pytest.mark.django_db
def test_a_guest_cannot_adopt_another_guest_and_bypass_the_site_cap():
    recipient, source = create_guest_user(), create_guest_user()
    for owner in (recipient, source):
        for number in range(3):
            Site.objects.create(owner=owner, title=f'Try {number}')
    client = APIClient()
    client.force_authenticate(recipient)
    source_token = Token.objects.create(user=source)

    response = client.post('/api/auth/adopt/', {'guest_token': source_token.key}, format='json')

    assert response.status_code == 403
    assert response.data['code'] == 'guest_forbidden'
    assert recipient.sites.count() == source.sites.count() == 3


@pytest.mark.django_db
def test_adoption_rechecks_a_guest_that_was_upgraded_after_authentication():
    stale_guest = create_guest_user()
    assert stale_guest.profile.is_guest
    account = User.objects.create_user('account', 'account@example.com')
    Site.objects.create(owner=stale_guest, title='Keep this')
    stale_guest.profile.__class__.objects.filter(user=stale_guest).update(is_guest=False)

    with pytest.raises(ValidationError):
        adopt_guest_work(stale_guest, account)

    assert User.objects.filter(pk=stale_guest.pk).exists()
    assert Site.objects.get(title='Keep this').owner_id == stale_guest.pk


@pytest.mark.django_db
def test_upgrade_rechecks_a_guest_that_was_already_upgraded():
    stale_guest = create_guest_user()
    assert stale_guest.profile.is_guest
    User.objects.filter(pk=stale_guest.pk).update(username='first', email='first@example.com')
    stale_guest.profile.__class__.objects.filter(user=stale_guest).update(is_guest=False)

    with pytest.raises(ValidationError):
        upgrade_guest(stale_guest, username='second', email='second@example.com', password='Long-Enough-42')

    assert User.objects.get(pk=stale_guest.pk).username == 'first'


@pytest.mark.django_db
def test_guest_upgrade_cannot_bypass_required_registration_captcha(settings):
    settings.RECAPTCHA_SECRET_KEY = 'required-secret'
    guest = create_guest_user()
    client = APIClient()
    client.force_authenticate(guest)

    response = client.post('/api/auth/upgrade/', {
        'username': 'ada', 'email': 'ada@example.com', 'password': 'Long-Enough-42',
    }, format='json')

    assert response.status_code == 400
    guest.refresh_from_db()
    assert guest.profile.is_guest


@pytest.mark.django_db
@pytest.mark.parametrize('endpoint', ['/api/auth/register/', '/api/auth/upgrade/'])
@pytest.mark.parametrize('username', ['a' * 151, 'two words', 'name/path'])
def test_credential_entry_points_enforce_the_user_model_username_rules(endpoint, username):
    client = APIClient()
    if endpoint.endswith('upgrade/'):
        client.force_authenticate(create_guest_user())

    response = client.post(endpoint, {
        'username': username, 'email': 'ada@example.com', 'password': 'Long-Enough-42',
    }, format='json')

    assert response.status_code == 400
    assert 'username' in response.data
    assert not User.objects.filter(username=username).exists()


@pytest.mark.django_db
@pytest.mark.parametrize('field', ['username', 'email'])
def test_registration_reports_a_conflict_created_after_validation(field):
    serializer = RegisterSerializer(data={
        'username': 'ada', 'email': 'ada@example.com', 'password': 'Long-Enough-42',
    })
    assert serializer.is_valid(), serializer.errors
    User.objects.create_user(
        username='ada' if field == 'username' else 'other',
        email='ada@example.com' if field == 'email' else 'other@example.com',
    )

    with pytest.raises(ValidationError) as raised:
        serializer.save()

    assert raised.value.get_codes()[field] == ['unique']


@pytest.mark.django_db
@pytest.mark.parametrize('field', ['username', 'email'])
def test_a_guest_survives_a_credential_conflict_created_after_validation(field):
    guest = create_guest_user()
    User.objects.create_user(
        username='ada' if field == 'username' else 'other',
        email='ada@example.com' if field == 'email' else 'other@example.com',
    )

    with pytest.raises(ValidationError) as raised:
        upgrade_guest(guest, username='ada', email='ada@example.com', password='Long-Enough-42')

    assert raised.value.get_codes()[field] == ['unique']
    guest.refresh_from_db()
    assert guest.profile.is_guest
    assert not guest.has_usable_password()


@pytest.mark.django_db
def test_simultaneous_first_google_sign_in_reuses_the_winning_account(monkeypatch):
    from .views import GoogleLoginView

    winner = User.objects.create_user('winner', 'ada@example.com')
    original_filter = User.objects.filter
    first_email_read = True

    def stale_first_email_read(*args, **kwargs):
        nonlocal first_email_read
        if first_email_read and kwargs.get('email__iexact') == winner.email:
            first_email_read = False
            return original_filter(pk__in=[])
        return original_filter(*args, **kwargs)

    monkeypatch.setattr(User.objects, 'filter', stale_first_email_read)

    user = GoogleLoginView()._get_or_create_user('ada@example.com', {})

    assert user.pk == winner.pk
    assert User.objects.filter(email='ada@example.com').count() == 1


@pytest.mark.django_db
def test_google_generates_a_valid_username_from_a_valid_email_local_part():
    from .views import GoogleLoginView

    user = GoogleLoginView()._get_or_create_user('ada!studio@example.com', {})

    for validator in User._meta.get_field('username').validators:
        validator(user.username)
    assert not user.has_usable_password()


@pytest.mark.django_db
def test_form_login_preserves_scalar_password_fields():
    user = User.objects.create_user('ada', 'ada@example.com', 'Long-Enough-42')

    response = APIClient().post('/api/auth/login/', {
        'username': 'ADA', 'password': 'Long-Enough-42',
    })

    assert response.status_code == 200
    assert response.data['user']['id'] == user.pk


@pytest.mark.django_db
@pytest.mark.parametrize('body', [
    [], {'username': ['ada'], 'password': 'pass'},
    {'username': 'suspended', 'password': ['pass']},
])
def test_malformed_login_credentials_are_client_errors(body):
    User.objects.create_user('suspended', 'suspended@example.com', is_active=False)

    assert APIClient().post('/api/auth/login/', body, format='json').status_code == 400


@pytest.mark.django_db
def test_deleting_published_sites_does_not_refund_daily_publication_slots():
    owner = User.objects.create_user('publisher')
    client = APIClient()
    client.force_authenticate(owner)
    for number in range(DAILY_PUBLISH_LIMIT):
        response = client.post('/api/sites/', {
            'title': f'Deleted site {number}', 'published': True,
        }, format='json')
        assert response.status_code == 201
        assert client.delete(f'/api/sites/{response.data["id"]}/').status_code == 204

    response = client.post('/api/sites/', {
        'title': 'One too many', 'published': True,
    }, format='json')

    assert response.status_code == 400
    assert SitePublication.objects.filter(owner=owner).count() == DAILY_PUBLISH_LIMIT
    assert not Site.objects.filter(owner=owner).exists()


@pytest.mark.django_db
def test_publication_rechecks_the_allowance_after_validation():
    owner = User.objects.create_user('publisher')
    client = APIClient()
    client.force_authenticate(owner)
    for number in range(DAILY_PUBLISH_LIMIT - 1):
        assert client.post('/api/sites/', {
            'title': f'Live {number}', 'published': True,
        }, format='json').status_code == 201
    pending = Site.objects.create(owner=owner, title='Waiting on another request')
    serializer = SiteSerializer(pending, data={'published': True}, partial=True,
                                context={'request': SimpleNamespace(user=owner)})
    assert serializer.is_valid(), serializer.errors
    assert client.post('/api/sites/', {'title': 'Last slot', 'published': True}, format='json').status_code == 201

    with pytest.raises(ValidationError) as raised:
        serializer.save()

    assert 'published' in raised.value.detail
    pending.refresh_from_db()
    assert not pending.published


@pytest.mark.django_db
@pytest.mark.parametrize('creating', [True, False])
def test_a_failed_document_replacement_rolls_back_the_whole_publication(monkeypatch, creating):
    owner = User.objects.create_user('publisher')
    site = None
    if not creating:
        site = Site.objects.create(owner=owner, title='Existing', published=True, html='Old HTML')
        PublishedPage.objects.create(site=site, path='', html='Old page')
    serializer = SiteSerializer(site, data={
        'title': 'New title', 'published': True, 'html': 'New HTML',
        'published_pages': [{'path': '', 'html': 'New page'}],
    }, partial=not creating, context={'request': SimpleNamespace(user=owner)})
    assert serializer.is_valid(), serializer.errors

    def fail_write(*args, **kwargs):
        raise RuntimeError('Simulated document write failure')

    monkeypatch.setattr(PublishedPage.objects, 'bulk_create', fail_write)
    with pytest.raises(RuntimeError):
        serializer.save(**({'owner': owner} if creating else {}))

    assert not SitePublication.objects.filter(owner=owner).exists()
    if creating:
        assert not Site.objects.filter(owner=owner).exists()
    else:
        site.refresh_from_db()
        assert (site.title, site.html) == ('Existing', 'Old HTML')
        assert list(site.published_pages.values_list('html', flat=True)) == ['Old page']


@pytest.mark.django_db
def test_publication_ledger_backfills_the_available_last_published_history():
    owner = User.objects.create_user('publisher')
    stamp = timezone.now() - timedelta(days=1)
    site = Site.objects.create(owner=owner, title='Previously live', last_published_at=stamp)
    migration = import_module('builder.migrations.0026_site_publication_ledger')

    for _ in range(2):
        migration.backfill_publications(apps, SimpleNamespace(connection=connection))

    entry = SitePublication.objects.get(owner=owner, site_pk=site.pk)
    assert entry.published_on == timezone.localdate(stamp)


@pytest.mark.django_db
@pytest.mark.parametrize('endpoint', ['/api/explore/', '/api/search/?q=maker&mode=results'])
def test_public_site_and_people_cards_use_a_constant_number_of_queries(endpoint):
    client = APIClient()
    requester = User.objects.create_user('requester')
    if '/search/' in endpoint:
        client.force_authenticate(requester)

    def make_card(number):
        owner = User.objects.create_user(f'maker{number}')
        owner.profile.display_name = f'Maker {number}'
        owner.profile.save(update_fields=['display_name'])
        Site.objects.create(owner=owner, title=f'Maker project {number}', published=True)

    make_card(0)
    with CaptureQueriesContext(connection) as single:
        response = client.get(endpoint)
        assert response.status_code == 200
    for number in range(1, 12):
        make_card(number)
    with CaptureQueriesContext(connection) as multiple:
        response = client.get(endpoint)
        assert response.status_code == 200

    # Expanding every result to a different owner/profile must not add queries.
    assert len(multiple) <= len(single)
    assert len(multiple) <= 6
