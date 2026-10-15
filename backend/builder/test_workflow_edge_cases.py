"""Malformed workflow requests cannot change inbox, comments or visit counters."""
from unittest.mock import patch
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from .models import FormSubmission, ReviewComment, Site, SiteVisit


@pytest.fixture
def workflow(db):
    owner = User.objects.create_user('workflow-edge-owner')
    site = Site.objects.create(owner=owner, title='Workflow edges', published=True)
    client = APIClient(raise_request_exception=False)
    client.force_authenticate(owner)
    return client, site


@pytest.mark.parametrize('kind,field', [('submission', 'is_read'), ('comment', 'resolved')])
@pytest.mark.parametrize('body', [{}, {'value': 'false'}, {'value': 0}, {'value': 1}, {'value': None}, {'value': []}, []])
def test_invalid_state_change_is_a_client_error_and_preserves_the_row(workflow, kind, field, body):
    client, site = workflow
    if kind == 'submission':
        row = FormSubmission.objects.create(site=site, data={'name': 'Ada'})
        path = f'/api/sites/{site.pk}/submissions/{row.pk}/'
    else:
        row = ReviewComment.objects.create(site=site, author_name='Ada', body='Please review.')
        path = f'/api/sites/{site.pk}/comments/{row.pk}/resolve/'
    payload = {field: body['value']} if isinstance(body, dict) and 'value' in body else body
    response = client.patch(path, payload, format='json')
    assert response.status_code == 400, response.content
    row.refresh_from_db()
    assert getattr(row, field) is False


@pytest.mark.parametrize('kind,field', [('submission', 'is_read'), ('comment', 'resolved')])
def test_workflow_state_can_be_set_and_cleared_with_explicit_booleans(workflow, kind, field):
    client, site = workflow
    if kind == 'submission':
        row = FormSubmission.objects.create(site=site, data={'name': 'Ada'})
        path = f'/api/sites/{site.pk}/submissions/{row.pk}/'
    else:
        row = ReviewComment.objects.create(site=site, author_name='Ada', body='Please review.')
        path = f'/api/sites/{site.pk}/comments/{row.pk}/resolve/'
    for value in [True, False]:
        response = client.patch(path, {field: value}, format='json')
        assert response.status_code == 200
        row.refresh_from_db()
        assert getattr(row, field) is value


@pytest.mark.parametrize('kind,field', [('submission', 'is_read'), ('comment', 'resolved')])
@pytest.mark.parametrize('encoding', ['multipart', 'urlencoded'])
def test_empty_form_does_not_silently_clear_workflow_state(workflow, kind, field, encoding):
    client, site = workflow
    if kind == 'submission':
        row = FormSubmission.objects.create(site=site, data={'name': 'Ada'}, is_read=True)
        path = f'/api/sites/{site.pk}/submissions/{row.pk}/'
    else:
        row = ReviewComment.objects.create(site=site, author_name='Ada', body='Please review.', resolved=True)
        path = f'/api/sites/{site.pk}/comments/{row.pk}/resolve/'
    response = client.patch(path, {}, format='multipart') if encoding == 'multipart' else client.patch(
        path, '', content_type='application/x-www-form-urlencoded',
    )
    assert response.status_code == 400
    row.refresh_from_db()
    assert getattr(row, field) is True


@pytest.mark.parametrize('body', [[], 'invalid', {'path': {}}, {'referrer': []}])
def test_bad_analytics_input_does_not_count_a_visit(workflow, body):
    _, site = workflow
    response = APIClient(raise_request_exception=False).post(
        f'/api/public/sites/{site.slug}/view/', body, format='json',
    )
    assert response.status_code == 400, response.content
    site.refresh_from_db()
    assert site.view_count == 0
    assert not SiteVisit.objects.filter(site=site).exists()


def test_analytics_counter_and_event_roll_back_together_on_storage_failure(workflow):
    _, site = workflow
    with patch('builder.views.SiteVisit.objects.create', side_effect=RuntimeError('Event storage failed')):
        response = APIClient(raise_request_exception=False).post(
            f'/api/public/sites/{site.slug}/view/', {'path': '/home'}, format='json',
        )
    assert response.status_code == 500
    site.refresh_from_db()
    assert site.view_count == 0
    assert not SiteVisit.objects.filter(site=site).exists()


def test_analytics_preserves_long_path_compatibility_and_strips_referrer_secrets(workflow):
    _, site = workflow
    response = APIClient().post(f'/api/public/sites/{site.slug}/view/', {
        'path': '/' + 'a' * 250,
        'referrer': 'https://user:password@search.example/results?private=' + 'x' * 600,
    }, format='json')
    assert response.status_code == 200
    visit = SiteVisit.objects.get(site=site)
    assert visit.path == '/' + 'a' * 179
    assert visit.referrer == 'search.example'


def test_thirty_day_analytics_includes_the_entire_first_calendar_day(workflow):
    client, site = workflow
    zone = ZoneInfo('Europe/Istanbul')
    now = datetime(2026, 10, 15, 12, 0, tzinfo=zone)
    start = now.replace(hour=0, minute=0) - timedelta(days=29)
    for stamp in [start, start + timedelta(hours=1), start - timedelta(microseconds=1)]:
        event = SiteVisit.objects.create(site=site)
        SiteVisit.objects.filter(pk=event.pk).update(created_at=stamp)
    with timezone.override(zone), patch('builder.views.timezone.now', return_value=now):
        response = client.get(f'/api/sites/{site.pk}/analytics/')
    assert response.status_code == 200
    assert response.data['last_30_days'] == 2
    assert response.json()['daily'] == [{'day': start.date().isoformat(), 'views': 2}]
