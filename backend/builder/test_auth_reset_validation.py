"""Password-reset JSON is untrusted input, even when a reset link is valid."""
import pytest
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


REQUEST = '/api/auth/password/reset/'
CONFIRM = '/api/auth/password/reset/confirm/'
OLD_PASSWORD = 'Original-password-729!'
NEW_PASSWORD = 'Replacement-password-851!'
BAD_VALUES = [True, 7, ['not-text'], {'value': 'not-text'}]


@pytest.fixture
def reset_account(db, settings, monkeypatch):
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
    # Do not use an SMTP connection configured outside this test.
    monkeypatch.setattr('builder.runtime_config.email_connection', lambda: None)
    user = User.objects.create_user('reset-owner', 'reset-owner@example.com', OLD_PASSWORD)
    token = Token.objects.create(user=user)
    return user, token


def reset_payload(user):
    return {
        'uid': urlsafe_base64_encode(force_bytes(user.pk)),
        'token': default_token_generator.make_token(user),
        'new_password': NEW_PASSWORD,
    }


def assert_unchanged(user, api_token, password_hash):
    user.refresh_from_db()
    assert user.password == password_hash
    assert user.email == 'reset-owner@example.com'
    assert Token.objects.filter(pk=api_token.pk, user=user).exists()


@pytest.mark.parametrize('value', BAD_VALUES)
def test_reset_request_rejects_non_text_email_without_changing_account(reset_account, mailoutbox, value):
    user, api_token = reset_account
    password_hash = user.password

    response = APIClient().post(REQUEST, {'email': value}, format='json')

    assert response.status_code == 400
    assert response.data['code'] == 'validation_error'
    assert mailoutbox == []
    assert_unchanged(user, api_token, password_hash)


@pytest.mark.parametrize('field', ['uid', 'token', 'new_password'])
@pytest.mark.parametrize('value', BAD_VALUES)
def test_reset_confirm_rejects_non_text_fields_without_writing(reset_account, field, value):
    user, api_token = reset_account
    password_hash = user.password
    payload = reset_payload(user)
    payload[field] = value

    response = APIClient().post(CONFIRM, payload, format='json')

    assert response.status_code == 400
    assert response.data['code'] == 'validation_error'
    assert_unchanged(user, api_token, password_hash)


@pytest.mark.parametrize('path', [REQUEST, CONFIRM])
def test_reset_requires_a_json_object_without_changing_account(reset_account, mailoutbox, path):
    user, api_token = reset_account
    password_hash = user.password

    response = APIClient().post(path, ['not-an-object'], format='json')

    assert response.status_code == 400
    assert response.data['code'] == 'validation_error'
    assert mailoutbox == []
    assert_unchanged(user, api_token, password_hash)


def test_reset_request_remains_generic_and_accepts_normalised_email(reset_account, mailoutbox):
    user, api_token = reset_account
    password_hash = user.password
    client = APIClient()

    known = client.post(REQUEST, {'email': ' RESET-OWNER@EXAMPLE.COM '}, format='json')
    unknown = client.post(REQUEST, {'email': 'unknown@example.com'}, format='json')

    assert known.status_code == unknown.status_code == 200
    assert known.data == unknown.data == {
        'detail': 'If an account exists for that email, a reset link is on its way.',
    }
    assert len(mailoutbox) == 1
    assert mailoutbox[0].to == ['reset-owner@example.com']
    assert_unchanged(user, api_token, password_hash)


def test_another_signed_in_account_cannot_reset_without_the_owners_link(reset_account):
    user, api_token = reset_account
    password_hash = user.password
    other = User.objects.create_user('reset-other', 'reset-other@example.com', OLD_PASSWORD)
    other_token = Token.objects.create(user=other)
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Token {other_token.key}')
    payload = reset_payload(user)
    payload['token'] = default_token_generator.make_token(other)

    response = client.post(CONFIRM, payload, format='json')

    assert response.status_code == 400
    assert_unchanged(user, api_token, password_hash)
    other.refresh_from_db()
    assert other.check_password(OLD_PASSWORD)
    assert Token.objects.filter(pk=other_token.pk, user=other).exists()


def test_a_valid_anonymous_reset_changes_only_the_owner_and_revokes_the_token(reset_account):
    user, api_token = reset_account
    other = User.objects.create_user('reset-other', 'reset-other@example.com', OLD_PASSWORD)
    other_token = Token.objects.create(user=other)
    client = APIClient()
    payload = reset_payload(user)

    response = client.post(CONFIRM, payload, format='json')

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
    assert not user.check_password(OLD_PASSWORD)
    assert not Token.objects.filter(pk=api_token.pk).exists()
    other.refresh_from_db()
    assert other.check_password(OLD_PASSWORD)
    assert Token.objects.filter(pk=other_token.pk, user=other).exists()
    # A used link is invalid and cannot replace the password again.
    assert client.post(CONFIRM, payload, format='json').status_code == 400
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)
