"""Credential endpoints reject scalar/array JSON before using object fields."""
import pytest
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .guests import create_guest_user
from .models import Site


@pytest.fixture
def identities(db):
    owner = User.objects.create_user('body-owner', 'body-owner@example.com', 'Original-password-729!')
    owner_token = Token.objects.create(user=owner)
    guest = create_guest_user()
    guest_token = Token.objects.create(user=guest)
    site = Site.objects.create(owner=guest, title='Guest draft')
    return owner, owner_token, guest, guest_token, site


def assert_unchanged(identities, guest_name, owner_password):
    owner, owner_token, guest, guest_token, site = identities
    owner.refresh_from_db()
    guest.refresh_from_db()
    site.refresh_from_db()
    assert User.objects.count() == 2
    assert owner.password == owner_password
    assert owner.email == 'body-owner@example.com'
    assert guest.username == guest_name
    assert guest.email == ''
    assert not guest.has_usable_password()
    assert guest.profile.is_guest is True
    assert site.owner_id == guest.pk
    assert site.title == 'Guest draft'
    assert Token.objects.filter(pk=owner_token.pk, user=owner).exists()
    assert Token.objects.filter(pk=guest_token.pk, user=guest).exists()


@pytest.mark.parametrize('path,actor', [
    ('/api/auth/register/', 'anonymous'),
    ('/api/auth/upgrade/', 'guest'),
    ('/api/auth/adopt/', 'owner'),
])
@pytest.mark.parametrize('body', [['not-an-object'], 'not-an-object', 7])
def test_auth_rejects_non_object_json_without_mutating_accounts(identities, path, actor, body):
    owner, owner_token, guest, guest_token, _ = identities
    guest_name, owner_password = guest.username, owner.password
    client = APIClient()
    if actor != 'anonymous':
        token = guest_token if actor == 'guest' else owner_token
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    response = client.post(path, body, format='json')

    assert response.status_code == 400
    assert response.data['code'] == 'validation_error'
    assert_unchanged(identities, guest_name, owner_password)


@pytest.mark.parametrize('path', ['/api/auth/upgrade/', '/api/auth/adopt/'])
def test_anonymous_cannot_upgrade_or_adopt_existing_guest_work(identities, path):
    owner, _, guest, guest_token, _ = identities
    guest_name, owner_password = guest.username, owner.password

    response = APIClient().post(path, {
        'username': 'replacement', 'email': 'replacement@example.com',
        'password': 'Replacement-password-851!', 'guest_token': guest_token.key,
    }, format='json')

    assert response.status_code == 401
    assert_unchanged(identities, guest_name, owner_password)
