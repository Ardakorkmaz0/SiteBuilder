"""A suspended account learns it is suspended, but only with its password.

It used to hear "wrong username or password" even with the right one, and a
reset email never comes for a suspended account, so the person had no way to
find out why they could not get in.
"""
from unittest import mock

import pytest
from django.contrib.auth.hashers import check_password as real_check_password
from django.contrib.auth.models import User
from rest_framework.test import APIClient

PASSWORD = 'Long-enough-9x'


@pytest.fixture
def suspended(db):
    return User.objects.create_user('ada', 'ada@example.com', PASSWORD, is_active=False)


@pytest.fixture
def active(db):
    return User.objects.create_user('grace', 'grace@example.com', PASSWORD)


def login(username, password):
    return APIClient().post('/api/auth/login/', {'username': username, 'password': password}, format='json')


def test_the_right_password_is_told_the_account_is_suspended(suspended):
    response = login('Ada', PASSWORD)

    assert response.status_code == 403
    assert response.data['code'] == 'account_suspended'
    assert 'token' not in response.data


def test_a_wrong_password_hears_what_anyone_else_would(suspended, active):
    for_suspended = login('ada', 'not-the-password')
    for_active = login('grace', 'not-the-password')
    for_nobody = login('nobody', 'not-the-password')

    assert for_suspended.status_code == for_active.status_code == for_nobody.status_code == 400
    assert for_suspended.data == for_active.data == for_nobody.data
    assert for_suspended.data['error_codes'] == {'non_field_errors': ['authorization']}


def test_a_suspended_account_costs_one_password_check_like_any_other(suspended, active):
    # Two checks for a suspended name would let its timing give it away.
    with mock.patch('django.contrib.auth.base_user.check_password', side_effect=real_check_password) as checked:
        login('ada', 'not-the-password')
    assert checked.call_count == 1
    with mock.patch('django.contrib.auth.base_user.check_password', side_effect=real_check_password) as checked:
        login('grace', 'not-the-password')
    assert checked.call_count == 1


def test_an_active_account_still_signs_in(active):
    response = login('grace', PASSWORD)

    assert response.status_code == 200
    assert response.data['token']
