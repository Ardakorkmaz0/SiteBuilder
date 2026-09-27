"""A form on the shared address reaches the owner's inbox.

The page at /s/<slug>/ runs in an opaque origin (its sandbox CSP), so its
runtime posts cross-origin to /s/<slug>/__sitebuilder/form/. Before this the
page had no inbox address at all, and a published form's message was lost.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import FormSubmission, PublishedPage, Site

DOC = '<!DOCTYPE html><html><head><title>Ada</title></head><body><form><input name="email"></form></body></html>'


@pytest.fixture
def site(db):
    owner = User.objects.create_user('ada', 'ada@example.com', 'secret123')
    site = Site.objects.create(owner=owner, title='Ada', published=True)
    PublishedPage.objects.create(site=site, path='', title='Ada', html=DOC)
    return site


def endpoint(site):
    return f'/s/{site.slug}/__sitebuilder/form/'


def post(site, body, **extra):
    return APIClient().post(endpoint(site), body, format='json', HTTP_ORIGIN='null', **extra)


class TestTheInbox:
    def test_the_served_page_names_its_inbox_first_in_the_head(self, site):
        html = APIClient().get(f'/s/{site.slug}/').content.decode()

        assert html.startswith(f'<!DOCTYPE html><html><head><meta name="pwb-form-endpoint" content="{endpoint(site)}">')

    def test_a_message_lands_in_the_inbox(self, site):
        response = post(site, {'data': {'email': 'visitor@example.com'}, 'page': '/s/ada/', 'website': ''})

        assert response.status_code == 201
        assert FormSubmission.objects.get(site=site).data == {'email': 'visitor@example.com'}
        # The sandboxed page can read the answer; nothing credentialed is allowed.
        assert response['Access-Control-Allow-Origin'] == '*'
        assert 'Access-Control-Allow-Credentials' not in response

    def test_the_preflight_is_answered_here(self, site):
        response = APIClient().options(
            endpoint(site), HTTP_ORIGIN='null',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST', HTTP_ACCESS_CONTROL_REQUEST_HEADERS='content-type',
        )

        assert response.status_code == 204
        assert response['Access-Control-Allow-Origin'] == '*'
        assert 'POST' in response['Access-Control-Allow-Methods']
        assert 'Content-Type' in response['Access-Control-Allow-Headers']

    def test_the_honeypot_still_catches_bots(self, site):
        response = post(site, {'data': {'email': 'x'}, 'website': 'http://spam.example'})

        assert response.status_code == 204
        assert not FormSubmission.objects.exists()

    def test_an_unpublished_site_takes_no_messages(self, site):
        Site.objects.filter(pk=site.pk).update(published=False)

        response = post(site, {'data': {'email': 'x'}})

        assert response.status_code == 404
        assert not FormSubmission.objects.exists()

    def test_only_post_is_taken(self, site):
        assert APIClient().get(endpoint(site)).status_code == 405

    def test_the_app_api_keeps_its_own_cors(self, site):
        # corsheaders now covers /api/ only; the app's origin still gets its headers there.
        response = APIClient().get('/api/public/config/', HTTP_ORIGIN='http://localhost:5173')

        assert response['Access-Control-Allow-Origin'] == 'http://localhost:5173'
