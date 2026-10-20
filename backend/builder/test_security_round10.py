"""Refused sharing writes, nested IDs and streamed upload totals stay bounded."""
import pytest
from django.contrib.auth.models import User
from django.test import RequestFactory
from rest_framework.test import APIClient

from .models import FormSubmission, ReviewComment, Site, SiteVersion, SiteViewer
from .upload_limits import LimitedUploadHandler, UploadLimitExceeded


@pytest.fixture
def world(db):
    owner = User.objects.create_user('security-owner')
    stranger = User.objects.create_user('security-stranger')
    friend = User.objects.create_user('security-friend')
    site = Site.objects.create(
        owner=owner, title='Private design', share_mode='off',
        html='<h1>Private design</h1>',
    )
    other = Site.objects.create(owner=stranger, title='Other private design')
    api = APIClient(raise_request_exception=False)
    api.force_authenticate(owner)
    return owner, stranger, friend, site, other, api


def _rows():
    return [list(model.objects.order_by('pk').values()) for model in (
        Site, SiteViewer, SiteVersion, FormSubmission, ReviewComment,
    )]


def _assert_unchanged(before):
    # A failed assertion must not print private review-link values in row dumps.
    unchanged = _rows() == before
    assert unchanged


@pytest.mark.parametrize('role,status', [('anonymous', 401), ('stranger', 404)])
def test_a_foreign_caller_cannot_open_the_review_link(world, role, status):
    _, stranger, _, site, _, _ = world
    api = APIClient()
    if role == 'stranger':
        api.force_authenticate(stranger)
    before = _rows()
    response = api.post(f'/api/sites/{site.pk}/share/', {
        'mode': 'link', 'add': 'missing-account',
    }, format='json')
    assert response.status_code == status
    _assert_unchanged(before)
    assert APIClient().get(f'/api/public/reviews/{site.review_token}/').status_code == 404


@pytest.mark.parametrize('body', [
    [],
    {'mode': 'link', 'add': 'missing-account'},
    {'mode': 'link', 'add': 'security-owner'},
    {'mode': 'link', 'add': {'username': 'security-friend'}},
    {'mode': 'invalid', 'add': 'security-friend'},
    {'mode': 'link', 'remove': {'id': 1}},
    {'mode': 'link', 'remove': 'not-an-account-id'},
    {'mode': 'link', 'remove': True},
    {'mode': 'link', 'remove': 1.5},
])
def test_refused_owner_share_write_preserves_every_row_and_private_access(world, body):
    _, _, _, site, _, api = world
    before = _rows()
    response = api.post(f'/api/sites/{site.pk}/share/', body, format='json')
    assert response.status_code == 400
    _assert_unchanged(before)
    assert APIClient().get(f'/api/public/reviews/{site.review_token}/').status_code == 404


def test_owner_can_explicitly_invite_and_remove_without_rewriting_content(world):
    _, _, friend, site, other, api = world
    foreign_viewer = SiteViewer.objects.create(site=other, user=friend)
    original_schema, original_html, revision = site.schema, site.html, site.revision
    response = api.post(f'/api/sites/{site.pk}/share/', {
        'mode': 'people', 'add': friend.username,
    }, format='json')
    assert response.status_code == 200
    site.refresh_from_db()
    assert site.share_mode == 'people'
    assert list(SiteViewer.objects.filter(site=site).values_list('user_id', flat=True)) == [friend.pk]
    assert APIClient().get(f'/api/public/reviews/{site.review_token}/').status_code == 403
    invited = APIClient()
    invited.force_authenticate(friend)
    assert invited.get(f'/api/public/reviews/{site.review_token}/').status_code == 200

    response = api.post(f'/api/sites/{site.pk}/share/', {
        'mode': 'off', 'remove': str(friend.pk),
    }, format='json')
    assert response.status_code == 200
    site.refresh_from_db()
    assert site.share_mode == 'off'
    assert not SiteViewer.objects.filter(site=site).exists()
    assert SiteViewer.objects.filter(pk=foreign_viewer.pk, site=other, user=friend).exists()
    assert (site.schema, site.html, site.revision) == (original_schema, original_html, revision)
    assert APIClient().get(f'/api/public/reviews/{site.review_token}/').status_code == 404


def test_a_viewer_storage_failure_rolls_back_the_mode_change(world, monkeypatch):
    _, _, friend, site, _, api = world
    before = _rows()

    def fail_create(*args, **kwargs):
        raise RuntimeError('Simulated viewer storage failure')

    monkeypatch.setattr(SiteViewer.objects, 'get_or_create', fail_create)
    response = api.post(f'/api/sites/{site.pk}/share/', {
        'mode': 'link', 'add': friend.username,
    }, format='json')
    assert response.status_code == 500
    _assert_unchanged(before)
    assert APIClient().get(f'/api/public/reviews/{site.review_token}/').status_code == 404


@pytest.mark.parametrize('action', [
    'restore', 'overwrite', 'pin', 'delete-version',
    'read-submission', 'delete-submission', 'resolve-comment',
])
def test_an_owned_parent_url_does_not_authorize_another_sites_child(world, action):
    _, _, _, site, other, api = world
    version = SiteVersion.snapshot(other, source='manual', force=True)
    submission = FormSubmission.objects.create(site=other, data={'message': 'Keep private'})
    comment = ReviewComment.objects.create(site=other, author_name='Reviewer', body='Keep unresolved')
    root = f'/api/sites/{site.pk}/'
    paths = {
        'restore': ('post', f'versions/{version.pk}/restore/', {}),
        'overwrite': ('post', f'versions/{version.pk}/overwrite/', {}),
        'pin': ('patch', f'versions/{version.pk}/pin/', {'pinned': True}),
        'delete-version': ('delete', f'versions/{version.pk}/', None),
        'read-submission': ('patch', f'submissions/{submission.pk}/', {'is_read': True}),
        'delete-submission': ('delete', f'submissions/{submission.pk}/', None),
        'resolve-comment': ('patch', f'comments/{comment.pk}/resolve/', {'resolved': True}),
    }
    method, path, data = paths[action]
    before = _rows()
    response = getattr(api, method)(root + path, data, format='json')
    assert response.status_code == 404
    _assert_unchanged(before)


def test_streamed_files_share_the_six_mb_request_budget_without_content_length():
    request = RequestFactory().post('/api/images/')
    handler = LimitedUploadHandler(request)
    handler.handle_raw_input(None, {}, None, b'boundary')
    three_mb = b'x' * (3 * 1024 * 1024)
    for name in ['first.png', 'second.png']:
        handler.new_file('file', name, 'image/png', len(three_mb))
        handler.receive_data_chunk(three_mb, 0)
        handler.file_complete(len(three_mb))
    handler.new_file('file', 'third.png', 'image/png', 1)
    with pytest.raises(UploadLimitExceeded):
        handler.receive_data_chunk(b'x', 0)
