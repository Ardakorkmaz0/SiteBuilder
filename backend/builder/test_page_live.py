"""Each page of a site goes live on its own, and that can be taken back.

Sending live used to replace every page at once. The file list now says of
each page whether it is live as it stands, live in an older form or not live,
a page can be kept off the public site, and any of it can be undone.
"""
import hashlib
import json
from importlib import import_module

import pytest
from django.apps import apps
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from .live_pages import page_fingerprint
from .models import LiveSnapshot, PublishedPage, Site, SiteVersion


def document(text):
    return f'<!DOCTYPE html><html><body><h1>{text}</h1></body></html>'


def schema(home='Home v1', about='About v1', contact='Contact v1'):
    return {'theme': {}, 'pages': [
        {'id': 'home', 'name': 'Home', 'mode': 'html', 'html': document(home), 'components': []},
        {'id': 'about', 'name': 'About', 'mode': 'html', 'html': document(about), 'components': []},
        {'id': 'contact', 'name': 'Contact', 'mode': 'html', 'html': document(contact), 'components': []},
    ]}


def row(page_id, text, path=None):
    return {'pageId': page_id, 'path': path if path is not None else ('' if page_id == 'home' else page_id), 'title': text, 'html': document(text)}


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


@pytest.fixture
def client(owner):
    api = APIClient()
    api.force_authenticate(owner)
    return api


@pytest.fixture
def site(client):
    created = client.post('/api/sites/', {'title': 'Ada', 'schema': schema(), 'html': document('Home v1')}, format='json')
    assert created.status_code == 201, created.data
    return Site.objects.get(pk=created.data['id'])


def send(client, site, page_id, text, **extra):
    return client.post(f'/api/sites/{site.pk}/page-live/', {'page': row(page_id, text, **extra)}, format='json')


def hide(client, site, page_id, hidden=True):
    return client.post(f'/api/sites/{site.pk}/page-visibility/', {'page_id': page_id, 'hidden': hidden}, format='json')


def undo(client, site, snapshot):
    return client.post(f'/api/sites/{site.pk}/live-undo/', {'snapshot': snapshot}, format='json')


def save_draft(client, site, **pages):
    return client.patch(f'/api/sites/{site.pk}/', {'schema': schema(**pages)}, format='json')


def served(site):
    return {item.path: item.html for item in PublishedPage.objects.filter(site=site)}


def visitor_pages(site):
    site.refresh_from_db()
    response = APIClient().get(f'/api/public/sites/{site.slug}/')
    return response.status_code, [page['id'] for page in response.data.get('schema', {}).get('pages', [])]


class TestWhoMaySend:
    def test_a_visitor_with_no_account_may_not(self, site):
        for path, body in (('page-live', {'page': row('about', 'x')}), ('page-visibility', {'page_id': 'about', 'hidden': True}), ('live-undo', {'snapshot': 1})):
            assert APIClient().post(f'/api/sites/{site.pk}/{path}/', body, format='json').status_code == 401
        site.refresh_from_db()
        assert site.published is False
        assert served(site) == {}

    def test_someone_else_may_not(self, client, site):
        stranger = APIClient()
        stranger.force_authenticate(User.objects.create_user('eve', 'eve@example.com', 'secret123'))
        send(client, site, 'home', 'Home v1')
        taken = client.post(f'/api/sites/{site.pk}/page-live/', {'page': row('about', 'About v1')}, format='json').data['live_undo']

        assert stranger.post(f'/api/sites/{site.pk}/page-live/', {'page': row('contact', 'Evil')}, format='json').status_code == 404
        assert stranger.post(f'/api/sites/{site.pk}/page-visibility/', {'page_id': 'about', 'hidden': True}, format='json').status_code == 404
        assert stranger.post(f'/api/sites/{site.pk}/live-undo/', {'snapshot': taken}, format='json').status_code == 404
        assert set(served(site)) == {'', 'about'}
        assert LiveSnapshot.objects.filter(pk=taken).exists()

    def test_a_snapshot_of_another_site_does_not_restore_here(self, client, owner, site):
        other = Site.objects.create(owner=owner, title='Other', schema=schema())
        first = send(client, other, 'home', 'Other home').data['live_undo']
        send(client, site, 'home', 'Home v1')

        assert undo(client, site, first).status_code == 404
        assert served(site) == {'': document('Home v1')}
        assert served(other) == {'': document('Other home')}


class TestOnePageGoesLive:
    def test_only_that_page_is_served_and_shown_to_visitors(self, client, site):
        response = send(client, site, 'home', 'Home v1')

        assert response.status_code == 200, response.data
        assert served(site) == {'': document('Home v1')}
        assert response.data['page_live'] == {'home': 'live'}
        assert response.data['published'] is True
        # The drafts of the others cannot be read from outside.
        assert visitor_pages(site) == (200, ['home'])
        assert APIClient().get(f'/s/{site.slug}/about/').status_code == 404

    def test_the_other_pages_stay_as_they_were_sent(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        save_draft(client, site, home='Home v2', about='About v2')

        response = send(client, site, 'about', 'About v2')

        assert served(site) == {'': document('Home v1'), 'about': document('About v2')}
        site.refresh_from_db()
        assert [page['html'] for page in site.live_schema['pages']] == [document('Home v1'), document('About v2')]
        assert response.data['page_live'] == {'home': 'older', 'about': 'live'}

    def test_it_refuses_a_page_the_saved_site_does_not_have(self, client, site):
        response = send(client, site, 'ghost', 'Ghost')

        assert response.status_code == 404
        assert response.data['code'] == 'page_not_found'
        assert served(site) == {}

    def test_it_refuses_a_stale_tab_and_changes_nothing(self, client, site):
        send(client, site, 'home', 'Home v1')
        stale = site.revision - 100
        response = client.post(f'/api/sites/{site.pk}/page-live/', {'page': row('about', 'About v1'), 'base_revision': stale}, format='json')

        assert response.status_code == 409
        assert response.data['code'] == 'site_changed'
        assert set(served(site)) == {''}

    def test_it_moves_the_revision_so_another_tab_cannot_save_a_stale_published(self, client, site):
        before = client.get(f'/api/sites/{site.pk}/').data['revision']
        response = send(client, site, 'home', 'Home v1')

        assert response.data['revision'] == before + 1
        assert client.patch(f'/api/sites/{site.pk}/', {'published': False, 'base_revision': before}, format='json').status_code == 409
        site.refresh_from_db()
        assert site.published is True

    def test_a_renamed_page_gives_up_its_old_address(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1', path='about')
        send(client, site, 'about', 'About v1', path='team')

        assert set(served(site)) == {'', 'team'}

    def test_two_pages_cannot_take_one_address(self, client, site):
        send(client, site, 'about', 'About v1', path='shared')
        send(client, site, 'contact', 'Contact v1', path='shared')

        assert served(site) == {'shared': document('About v1'), 'shared-2': document('Contact v1')}

    def test_a_guest_cannot_go_public_this_way(self, db):
        guest = User.objects.create_user('guest-abc123', '', 'secret123')
        guest.profile.is_guest = True
        guest.profile.save(update_fields=['is_guest'])
        api = APIClient()
        api.force_authenticate(guest)
        site = Site.objects.create(owner=guest, title='Guest', schema=schema())

        assert send(api, site, 'home', 'Home v1').status_code == 400
        site.refresh_from_db()
        assert site.published is False
        assert served(site) == {}

    def test_the_size_limit_counts_what_is_already_live(self, client, site, monkeypatch):
        monkeypatch.setattr('builder.live_pages.MAX_PUBLISHED_TOTAL_BYTES', len(document('Home v1')) + 5)
        send(client, site, 'home', 'Home v1')

        assert send(client, site, 'about', 'About v1').status_code == 400
        assert set(served(site)) == {''}

    def test_the_size_limit_counts_bytes_not_characters(self, client, site, monkeypatch):
        # Five two-byte letters: room for both pages counted in characters, not in bytes.
        home, about = document('Ééééé'), document('About v1')
        monkeypatch.setattr('builder.live_pages.MAX_PUBLISHED_TOTAL_BYTES', len(home) + len(about))
        assert send(client, site, 'home', 'Ééééé').status_code == 200

        assert send(client, site, 'about', 'About v1').status_code == 400
        assert set(served(site)) == {''}


class TestStatusOfEachPage:
    def test_saving_a_change_makes_only_that_page_older(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')

        response = client.patch(f'/api/sites/{site.pk}/', {'schema': schema(about='About v2')}, format='json')

        assert response.data['page_live'] == {'home': 'live', 'about': 'older'}
        assert response.data['live_differs'] is True

    def test_saving_with_no_change_leaves_it_live(self, client, site):
        send(client, site, 'home', 'Home v1')

        assert save_draft(client, site).data['page_live'] == {'home': 'live'}

    def test_a_change_the_whole_site_shares_makes_every_page_older(self, client, site):
        send(client, site, 'home', 'Home v1')
        changed = schema()
        changed['theme'] = {'primaryColor': '#112233'}

        assert client.patch(f'/api/sites/{site.pk}/', {'schema': changed}, format='json').data['page_live'] == {'home': 'older'}

    def test_a_switch_on_one_page_makes_the_other_pages_older(self, client, site):
        # A switch anywhere gives every page both palettes, so the live document
        # of a page with no switch no longer matches what it would be sent as.
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        with_switch = schema()
        with_switch['pages'][1]['html'] = document('About v1') + '<button data-pwb-theme-toggle>x</button>'

        response = client.patch(f'/api/sites/{site.pk}/', {'schema': with_switch}, format='json')

        assert response.data['page_live'] == {'home': 'older', 'about': 'older'}

    def test_a_switch_only_in_the_home_document_makes_the_other_pages_older(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        changed = document('Home v1') + '<button data-pwb-theme-toggle>x</button>'

        response = client.patch(f'/api/sites/{site.pk}/', {'html': changed}, format='json')

        site.refresh_from_db()
        assert site.html == changed
        assert 'data-pwb-theme-toggle' not in site.schema['pages'][0]['html']
        assert response.data['page_live'] == {'home': 'older', 'about': 'older'}

    def test_a_three_way_switch_on_one_page_makes_the_other_pages_older(self, client, site):
        send(client, site, 'home', 'Home v1')
        with_switch = schema()
        with_switch['pages'][1]['components'] = [{'id': 'sw', 'type': 'themeToggle', 'props': {'states': 'three'}}]

        response = client.patch(f'/api/sites/{site.pk}/', {'schema': with_switch}, format='json')

        assert response.data['page_live'] == {'home': 'older'}

    def test_a_three_way_switch_in_an_html_page_makes_the_other_pages_older(self, client, site):
        send(client, site, 'home', 'Home v1')
        with_switch = schema()
        with_switch['pages'][1]['html'] = document('About v1') + '<div role="radiogroup" data-pwb-theme-toggle="choices"></div>'

        response = client.patch(f'/api/sites/{site.pk}/', {'schema': with_switch}, format='json')

        assert response.data['page_live'] == {'home': 'older'}

    def test_removing_the_only_switch_makes_the_other_pages_older(self, client, site):
        with_switch = schema()
        with_switch['pages'][1]['components'] = [
            {'id': 'box', 'type': 'container', 'children': [{'id': 'sw', 'type': 'themeToggle', 'props': {}}]},
        ]
        client.patch(f'/api/sites/{site.pk}/', {'schema': with_switch}, format='json')
        send(client, site, 'home', 'Home v1')
        assert client.get(f'/api/sites/{site.pk}/').data['page_live'] == {'home': 'live'}

        assert save_draft(client, site).data['page_live'] == {'home': 'older'}

    def test_a_site_with_no_switch_keeps_the_fingerprints_its_pages_went_live_with(self):
        page = {'id': 'home', 'components': [{'id': 'a', 'type': 'text', 'children': []}]}
        draft = {'theme': {}, 'pages': [page]}
        before = hashlib.sha256(
            json.dumps([{'theme': {}}, page, '<p>Hi</p>'], sort_keys=True).encode(),
        ).hexdigest()

        assert page_fingerprint(draft, '<p>Hi</p>', page) == before

    def test_an_unpublished_site_has_nothing_live(self, client, site):
        send(client, site, 'home', 'Home v1')

        assert client.patch(f'/api/sites/{site.pk}/', {'published': False}, format='json').data['page_live'] == {}

    def test_an_older_version_sent_live_shows_as_older(self, client, site):
        client.patch(f'/api/sites/{site.pk}/', {'published': True, 'published_pages': [row('home', 'Home v1'), row('about', 'About v1'), row('contact', 'Contact v1')]}, format='json')
        version = SiteVersion.objects.filter(site=site, source='publish').first()
        save_draft(client, site, about='About v2')
        client.patch(f'/api/sites/{site.pk}/', {'published_pages': [row('home', 'Home v2'), row('about', 'About v2'), row('contact', 'Contact v2')]}, format='json')

        response = client.patch(f'/api/sites/{site.pk}/', {
            'live_from_version': version.pk,
            'published_pages': [row('home', 'Home v1'), row('about', 'About v1'), row('contact', 'Contact v1')],
        }, format='json')

        assert response.data['page_live'] == {'home': 'live', 'about': 'older', 'contact': 'live'}

    def test_the_draft_is_not_ahead_when_every_shown_page_is_live(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        assert client.get(f'/api/sites/{site.pk}/').data['live_differs'] is True

        assert hide(client, site, 'contact').data['live_differs'] is False


class TestKeepingAPageOffThePublicSite:
    def test_hiding_takes_it_down_and_keeps_its_draft(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')

        response = hide(client, site, 'about')

        assert response.status_code == 200
        assert set(served(site)) == {''}
        assert response.data['page_live'] == {'home': 'live'}
        assert response.data['private_pages'] == ['about']
        assert visitor_pages(site) == (200, ['home'])
        site.refresh_from_db()
        assert [page['id'] for page in site.schema['pages']] == ['home', 'about', 'contact']

    def test_sending_the_whole_site_leaves_it_out(self, client, site):
        send(client, site, 'home', 'Home v1')
        hide(client, site, 'about')

        response = client.patch(f'/api/sites/{site.pk}/', {'published_pages': [row('home', 'Home v1'), row('about', 'About v1'), row('contact', 'Contact v1')]}, format='json')

        assert set(served(site)) == {'', 'contact'}
        assert response.data['page_live'] == {'home': 'live', 'contact': 'live'}
        assert visitor_pages(site) == (200, ['home', 'contact'])

    def test_an_older_client_that_names_no_page_cannot_put_it_back(self, client, site):
        send(client, site, 'home', 'Home v1')
        hide(client, site, 'about')
        sent = [{key: value for key, value in row(page_id, page_id).items() if key != 'pageId'} for page_id in ('home', 'about', 'contact')]

        client.patch(f'/api/sites/{site.pk}/', {'published_pages': sent}, format='json')

        assert set(served(site)) == {'', 'contact'}

    def test_sending_that_page_alone_shows_it_again(self, client, site):
        hide(client, site, 'about')

        response = send(client, site, 'about', 'About v1')

        assert response.data['private_pages'] == []
        assert 'about' in served(site)

    def test_showing_it_again_sends_nothing_by_itself(self, client, site):
        send(client, site, 'home', 'Home v1')
        hide(client, site, 'about')

        response = hide(client, site, 'about', hidden=False)

        assert response.data['private_pages'] == []
        assert set(served(site)) == {''}

    def test_the_home_page_cannot_be_hidden(self, client, site):
        send(client, site, 'home', 'Home v1')

        response = hide(client, site, 'home')

        assert response.status_code == 400
        assert response.data['code'] == 'home_page_required'
        assert set(served(site)) == {''}
        site.refresh_from_db()
        assert site.private_pages == []

    def test_a_copy_someone_else_makes_never_has_it(self, client, owner, site):
        send(client, site, 'home', 'Home v1')
        hide(client, site, 'about')
        other = APIClient()
        other.force_authenticate(User.objects.create_user('bob', 'bob@example.com', 'secret123'))

        copy = other.post(f'/api/sites/clone/{site.slug}/', format='json')

        assert copy.status_code == 201, copy.data
        pages = Site.objects.get(pk=copy.data['id']).schema['pages']
        assert [page['id'] for page in pages] == ['home']

    def test_your_own_copy_stays_private_too(self, client, site):
        hide(client, site, 'about')

        copy = client.post(f'/api/sites/clone/{site.slug}/', format='json')

        assert copy.status_code == 201, copy.data
        assert Site.objects.get(pk=copy.data['id']).private_pages == ['about']


class TestUndo:
    def test_undo_of_a_page_puts_back_what_it_replaced_and_redo_returns(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        save_draft(client, site, about='About v2')
        sent = send(client, site, 'about', 'About v2')
        assert served(site)['about'] == document('About v2')

        back = undo(client, site, sent.data['live_undo'])

        assert back.status_code == 200, back.data
        assert served(site)['about'] == document('About v1')
        assert back.data['page_live'] == {'home': 'live', 'about': 'older'}
        site.refresh_from_db()
        assert site.live_schema['pages'][1]['html'] == document('About v1')

        again = undo(client, site, back.data['live_undo'])

        assert served(site)['about'] == document('About v2')
        assert again.data['page_live']['about'] == 'live'
        site.refresh_from_db()
        assert site.live_schema['pages'][1]['html'] == document('About v2')

    def test_undo_leaves_a_page_sent_after_it_alone(self, client, site):
        send(client, site, 'home', 'Home v1')
        first = send(client, site, 'about', 'About v1')
        send(client, site, 'contact', 'Contact v1')

        undo(client, site, first.data['live_undo'])

        assert set(served(site)) == {'', 'contact'}
        assert visitor_pages(site) == (200, ['home', 'contact'])

    def test_undo_of_the_first_send_takes_the_site_down_again(self, client, site):
        sent = send(client, site, 'home', 'Home v1')

        back = undo(client, site, sent.data['live_undo'])

        assert back.data['published'] is False
        assert served(site) == {}
        site.refresh_from_db()
        assert site.live_schema is None
        assert site.live_at is None
        assert visitor_pages(site)[0] == 404

        undo(client, site, back.data['live_undo'])
        site.refresh_from_db()
        assert site.published is True
        assert served(site) == {'': document('Home v1')}

    def test_undo_of_hiding_brings_the_page_back(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        hidden = hide(client, site, 'about')

        back = undo(client, site, hidden.data['live_undo'])

        assert back.data['private_pages'] == []
        assert served(site)['about'] == document('About v1')
        assert visitor_pages(site) == (200, ['home', 'about'])

    def test_undo_of_sending_the_whole_site(self, client, site):
        first = client.patch(f'/api/sites/{site.pk}/', {'published': True, 'published_pages': [row('home', 'Home v1'), row('about', 'About v1')]}, format='json')
        assert first.data['live_undo']
        second = client.patch(f'/api/sites/{site.pk}/', {'schema': schema(home='Home v2'), 'published_pages': [row('home', 'Home v2')]}, format='json')

        back = undo(client, site, second.data['live_undo'])

        assert served(site) == {'': document('Home v1'), 'about': document('About v1')}
        # The draft stays what was saved.
        site.refresh_from_db()
        assert site.schema['pages'][0]['html'] == document('Home v2')
        # Home was edited since it went live; About was not.
        assert back.data['page_live'] == {'home': 'older', 'about': 'live'}
        assert visitor_pages(site)[1] == ['home', 'about']

    def test_a_used_snapshot_cannot_be_used_twice(self, client, site):
        send(client, site, 'home', 'Home v1')
        sent = send(client, site, 'about', 'About v1')
        undo(client, site, sent.data['live_undo'])

        again = undo(client, site, sent.data['live_undo'])

        assert again.status_code == 404
        assert again.data['code'] == 'live_undo_gone'

    def test_an_ordinary_save_offers_nothing_to_undo(self, client, site):
        send(client, site, 'home', 'Home v1')

        assert save_draft(client, site, home='Home v2').data['live_undo'] is None

    def test_only_the_newest_snapshots_are_kept(self, client, site):
        for number in range(LiveSnapshot.MAX_PER_SITE + 3):
            send(client, site, 'home', f'Home {number}')

        assert LiveSnapshot.objects.filter(site=site).count() == LiveSnapshot.MAX_PER_SITE

    def test_the_newest_live_row_in_history_is_what_is_live_after_undo(self, client, site):
        send(client, site, 'home', 'Home v1')
        sent = send(client, site, 'about', 'About v1')

        undo(client, site, sent.data['live_undo'])

        newest = SiteVersion.objects.filter(site=site, source='publish').first()
        assert newest.label == 'Sending live undone'
        assert [page['id'] for page in newest.schema['pages']] == ['home']


class TestTakingASiteOffline:
    @staticmethod
    def offline(client, site):
        response = client.patch(f'/api/sites/{site.pk}/', {'published': False}, format='json')
        assert response.status_code == 200, response.data

    def test_a_step_from_before_cannot_bring_it_back(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        hidden = hide(client, site, 'about')
        self.offline(client, site)

        back = undo(client, site, hidden.data['live_undo'])

        assert back.status_code == 404
        assert back.data['code'] == 'live_undo_gone'
        site.refresh_from_db()
        assert site.published is False
        assert site.private_pages == ['about']
        assert served(site) == {}
        assert visitor_pages(site)[0] == 404

    def test_a_page_sent_afterwards_comes_back_alone(self, client, owner, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        self.offline(client, site)

        send(client, site, 'home', 'Home v2')

        assert visitor_pages(site) == (200, ['home'])
        other = APIClient()
        other.force_authenticate(User.objects.create_user('bob', 'bob@example.com', 'secret123'))
        copy = other.post(f'/api/sites/clone/{site.slug}/', format='json')
        assert [page['id'] for page in Site.objects.get(pk=copy.data['id']).schema['pages']] == ['home']

    def test_nothing_of_the_old_version_stays_behind(self, client, site):
        send(client, site, 'home', 'Home v1')
        self.offline(client, site)

        site.refresh_from_db()
        assert site.live_schema is None
        assert site.live_html == ''
        assert site.live_at is None
        assert not LiveSnapshot.objects.filter(site=site).exists()
        # What went live before is still in History.
        assert SiteVersion.objects.filter(site=site, source='publish').exists()

    def test_a_page_hidden_while_offline_stays_out_when_it_returns(self, client, site):
        send(client, site, 'home', 'Home v1')
        send(client, site, 'about', 'About v1')
        self.offline(client, site)
        hide(client, site, 'about')

        client.patch(f'/api/sites/{site.pk}/', {'published': True}, format='json')

        status_code, pages = visitor_pages(site)
        assert status_code == 200
        assert 'about' not in pages

    def test_a_save_of_a_draft_does_not_end_a_redo(self, client, site):
        sent = send(client, site, 'home', 'Home v1')
        back = undo(client, site, sent.data['live_undo'])
        assert back.data['published'] is False

        save_draft(client, site, about='About v2')

        again = undo(client, site, back.data['live_undo'])
        assert again.status_code == 200
        assert served(site) == {'': document('Home v1')}

    def test_a_save_that_does_not_mention_it_leaves_the_site_as_it_is(self, client, site):
        send(client, site, 'home', 'Home v1')
        site.refresh_from_db()

        saved = client.put(f'/api/sites/{site.pk}/', {'title': 'Ada', 'schema': schema(about='About v2'), 'html': document('Home v1')}, format='json')

        assert saved.status_code == 200, saved.data
        assert saved.data['published'] is True
        assert served(site) == {'': document('Home v1')}

    def test_a_moderators_take_down_leaves_nothing_to_return_to(self, client, owner, site):
        send(client, site, 'home', 'Home v1')
        about = send(client, site, 'about', 'About v1')
        moderator = APIClient()
        moderator.force_authenticate(User.objects.create_superuser('mod', 'mod@example.com', 'secret123'))

        taken = moderator.post(f'/api/admin/sites/{site.pk}/moderate/', {'action': 'unpublish'}, format='json')

        assert taken.status_code == 200, taken.data
        assert served(site) == {}
        assert undo(client, site, about.data['live_undo']).status_code == 404
        assert moderator.post(f'/api/admin/sites/{site.pk}/moderate/', {'action': 'reinstate'}, format='json').status_code == 200
        site.refresh_from_db()
        assert site.published is False

        send(client, site, 'contact', 'Contact v1')

        assert list(served(site)) == ['contact']
        assert visitor_pages(site) == (200, ['contact'])

    def test_what_the_owner_sent_while_blocked_does_not_outlast_the_block(self, client, site):
        moderator = APIClient()
        moderator.force_authenticate(User.objects.create_superuser('mod', 'mod@example.com', 'secret123'))
        moderator.post(f'/api/admin/sites/{site.pk}/moderate/', {'action': 'unpublish'}, format='json')
        saved = client.patch(f'/api/sites/{site.pk}/', {'published': True, 'published_pages': [row('home', 'Home v1')]}, format='json')
        assert saved.status_code == 200, saved.data
        assert served(site) == {'': document('Home v1')}

        moderator.post(f'/api/admin/sites/{site.pk}/moderate/', {'action': 'reinstate'}, format='json')

        site.refresh_from_db()
        assert site.published is False
        assert served(site) == {}
        assert site.live_schema is None

    def test_the_migration_clears_what_sites_already_offline_kept(self, owner):
        migration = import_module('builder.migrations.0030_offline_sites_have_no_live_version')
        offline = Site.objects.create(
            owner=owner, title='Offline', published=False, schema=schema(), html='',
            live_schema=schema(), live_html=document('Old'), live_at=timezone.now(),
        )
        LiveSnapshot.objects.create(site=offline, rows=[], had_live=True)
        PublishedPage.objects.create(site=offline, path='', html=document('Old'), position=0)
        public = Site.objects.create(
            owner=owner, title='Public', published=True, schema=schema(), html='',
            live_schema=schema(), live_html=document('Now'), live_at=timezone.now(),
        )
        kept = LiveSnapshot.objects.create(site=public, rows=[], had_live=True)
        PublishedPage.objects.create(site=public, path='', html=document('Now'), position=0)

        migration.offline_sites_forget_their_live_version(apps, None)

        offline.refresh_from_db()
        assert offline.live_schema is None
        assert offline.live_html == ''
        assert offline.live_at is None
        assert not LiveSnapshot.objects.filter(site=offline).exists()
        assert not PublishedPage.objects.filter(site=offline).exists()
        public.refresh_from_db()
        assert public.live_schema == schema()
        assert public.live_html == document('Now')
        assert LiveSnapshot.objects.filter(pk=kept.pk).exists()
        assert PublishedPage.objects.filter(site=public).exists()


class TestUndoFromAnotherTab:
    def test_undoing_one_page_leaves_another_pages_hide_alone(self, client, site):
        send(client, site, 'home', 'Home v1')
        contact = send(client, site, 'contact', 'Contact v1')
        hide(client, site, 'about')

        back = undo(client, site, contact.data['live_undo'])

        assert back.status_code == 200, back.data
        assert back.data['private_pages'] == ['about']
        assert list(served(site)) == ['']

    def test_undoing_a_hide_still_brings_that_page_back(self, client, site):
        send(client, site, 'home', 'Home v1')
        hide(client, site, 'contact')
        about = hide(client, site, 'about')

        back = undo(client, site, about.data['live_undo'])

        assert back.data['private_pages'] == ['contact']

    def test_undoing_a_whole_send_does_not_return_a_page_hidden_since(self, client, site):
        client.patch(f'/api/sites/{site.pk}/', {'published': True, 'published_pages': [row('home', 'Home v1'), row('about', 'About v1')]}, format='json')
        second = client.patch(f'/api/sites/{site.pk}/', {'published_pages': [row('home', 'Home v2'), row('about', 'About v2')]}, format='json')
        hide(client, site, 'about')

        back = undo(client, site, second.data['live_undo'])

        assert back.status_code == 200, back.data
        assert back.data['private_pages'] == ['about']
        assert served(site) == {'': document('Home v1')}
        assert visitor_pages(site) == (200, ['home'])

    def test_a_tab_that_is_behind_is_refused_and_changes_nothing(self, client, site):
        send(client, site, 'home', 'Home v1')
        contact = send(client, site, 'contact', 'Contact v1')
        behind = contact.data['revision']
        hide(client, site, 'about')

        refused = client.post(f'/api/sites/{site.pk}/live-undo/', {'snapshot': contact.data['live_undo'], 'base_revision': behind}, format='json')

        assert refused.status_code == 409
        assert refused.data['code'] == 'site_changed'
        assert sorted(served(site)) == ['', 'contact']
        assert LiveSnapshot.objects.filter(pk=contact.data['live_undo']).exists()


class TestCopyLiveToDraft:
    def test_a_page_that_is_not_live_keeps_its_draft(self, client, site):
        send(client, site, 'home', 'Home v1')
        save_draft(client, site, home='Home v2', about='About v2')

        response = client.post(f'/api/sites/{site.pk}/live-to-draft/')

        assert response.status_code == 200, response.data
        site.refresh_from_db()
        assert [page['html'] for page in site.schema['pages']] == [document('Home v1'), document('About v2'), document('Contact v1')]


class TestExistingRows:
    def test_the_migration_names_each_rows_page_with_its_true_colour(self, owner):
        migration = import_module('builder.migrations.0029_per_page_live')
        live = schema()
        site = Site.objects.create(owner=owner, title='Old', published=True, schema=schema(about='About draft'), html='', live_schema=live, live_html='')
        PublishedPage.objects.create(site=site, path='', html=document('Home v1'), position=0)
        PublishedPage.objects.create(site=site, path='about', html=document('About v1'), position=1)
        PublishedPage.objects.create(site=site, path='contact', html=document('Contact v1'), position=2)

        migration.rows_name_their_pages(apps, None)

        response = APIClient()
        response.force_authenticate(owner)
        assert response.get(f'/api/sites/{site.pk}/').data['page_live'] == {'home': 'live', 'about': 'older', 'contact': 'live'}

    def test_pages_that_did_not_render_do_not_shift_the_match(self, owner):
        migration = import_module('builder.migrations.0029_per_page_live')
        live = schema()
        live['pages'][1]['html'] = ''
        site = Site.objects.create(owner=owner, title='Old', published=True, schema=live, html='', live_schema=live, live_html='')
        PublishedPage.objects.create(site=site, path='', html=document('Home v1'), position=0)
        PublishedPage.objects.create(site=site, path='contact', html=document('Contact v1'), position=1)

        migration.rows_name_their_pages(apps, None)

        assert dict(site.published_pages.values_list('path', 'page_id')) == {'': 'home', 'contact': 'contact'}
