"""A refused sign-up says which rule failed, in words and in a code.

Every refusal used to arrive with the code "invalid", and the client showed
"Please enter a valid value." for a taken username and a weak password alike.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient


@pytest.fixture
def taken(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret-Pass-123')


def register(**body):
    base = {'username': 'grace', 'email': 'grace@example.com', 'password': 'Long-enough-9x'}
    return APIClient().post('/api/auth/register/', {**base, **body}, format='json')


def test_a_taken_username_says_so(taken):
    response = register(username='Ada')

    assert response.status_code == 400
    assert response.data['username'] == ['This username is already taken.']
    assert response.data['error_codes']['username'] == ['unique']


def test_a_taken_email_says_so(taken):
    response = register(email='ADA@example.com')

    assert response.data['error_codes']['email'] == ['unique']


def test_password_rules_keep_their_own_codes(db):
    response = register(password='12345678')

    assert response.data['password'] == ['This password is too common.', 'This password is entirely numeric.']
    assert response.data['error_codes']['password'] == ['password_too_common', 'password_entirely_numeric']


def test_a_guest_prefix_is_reserved(db):
    from .guests import GUEST_USERNAME_PREFIX

    response = register(username=GUEST_USERNAME_PREFIX + 'me')

    assert response.data['error_codes']['username'] == ['reserved']
