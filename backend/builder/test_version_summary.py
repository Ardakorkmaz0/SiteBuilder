"""Each saved version says what it changed.

The history listed every save alike: a save of one word and a save that
replaced a page. A version now carries which pages it changed against the
version before it, how much of each (0 to 1), and whether the change is one
Undo cannot take back. With that the editor can show one page's own history,
and load one page from a version without touching the others.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .models import Site, SiteVersion
from .version_summary import restore_page, summarize


def block(block_id, text):
    return {'id': block_id, 'type': 'text', 'props': {'text': text}, 'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 200, 'h': 40}}


def canvas(page_id, name, texts):
    return {'id': page_id, 'name': name, 'mode': 'empty', 'html': '', 'components': [block(f'{page_id}_{n}', text) for n, text in enumerate(texts)]}


def document(page_id, name, html):
    return {'id': page_id, 'name': name, 'mode': 'html', 'html': html, 'components': []}


def schema(*pages, **extra):
    return {'theme': {}, 'pages': list(pages), **extra}


NINE = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']


class TestSummarize:
    def test_the_first_version_has_nothing_to_compare_with(self):
        assert summarize(None, schema(canvas('home', 'Home', NINE))) == {'first': True, 'pages': [], 'size': 0, 'hard': False, 'site': False}

    def test_a_version_that_changed_nothing_says_so(self):
        same = schema(canvas('home', 'Home', NINE))

        assert summarize(same, same) == {'first': False, 'pages': [], 'size': 0, 'hard': False, 'site': False}

    def test_one_block_of_nine_is_a_small_change_to_that_page_only(self):
        before = schema(canvas('home', 'Home', NINE), canvas('about', 'About', NINE))
        after = schema(canvas('home', 'Home', ['ONE'] + NINE[1:]), canvas('about', 'About', NINE))

        # One block of nine, on a page that counts as ten units with its settings.
        assert summarize(before, after) == {
            'first': False,
            'pages': [{'id': 'home', 'name': 'Home', 'kind': 'changed', 'size': 0.1, 'hard': False}],
            'size': 0.1,
            'hard': False,
            'site': False,
        }

    def test_every_block_rewritten_is_the_whole_page(self):
        before = schema(canvas('home', 'Home', NINE))
        after = schema(canvas('home', 'Home', [text.upper() for text in NINE]))

        assert summarize(before, after)['pages'] == [{'id': 'home', 'name': 'Home', 'kind': 'changed', 'size': 0.9, 'hard': False}]

    def test_an_html_page_is_measured_tag_by_tag(self):
        before = schema(document('home', 'Home', '<main><h1>Olive</h1><p>Bread</p><p>Coffee</p><p>Cake</p></main>'))
        after = schema(document('home', 'Home', '<main><h1>Olive</h1><p>Bread</p><p>Tea</p><p>Cake</p></main>'))

        # "Coffee" became "Tea": one token of the page's fourteen, plus one for its settings.
        assert summarize(before, after)['pages'] == [{'id': 'home', 'name': 'Home', 'kind': 'changed', 'size': 0.067, 'hard': False}]

    def test_a_page_that_changes_between_html_and_canvas_is_hard_to_take_back(self):
        before = schema(document('home', 'Home', '<h1>Olive</h1>'))
        after = schema(canvas('home', 'Home', ['Olive']))

        summary = summarize(before, after)

        assert summary['hard'] is True
        assert summary['pages'] == [{'id': 'home', 'name': 'Home', 'kind': 'mode', 'size': 1.0, 'hard': True}]

    def test_a_deleted_page_is_hard_to_take_back_and_a_new_one_is_not(self):
        before = schema(canvas('home', 'Home', NINE), canvas('old', 'Old', NINE))
        after = schema(canvas('home', 'Home', NINE), canvas('new', 'New', NINE))

        summary = summarize(before, after)

        assert summary['pages'] == [
            {'id': 'new', 'name': 'New', 'kind': 'added', 'size': 1.0, 'hard': False},
            {'id': 'old', 'name': 'Old', 'kind': 'removed', 'size': 1.0, 'hard': True},
        ]
        assert summary['hard'] is True

    def test_a_change_to_the_theme_alone_touches_no_page(self):
        before = schema(canvas('home', 'Home', NINE))
        after = schema(canvas('home', 'Home', NINE), theme={'primaryColor': '#ff0000'})

        assert summarize(before, after) == {'first': False, 'pages': [], 'size': 0.05, 'hard': False, 'site': True}


class TestRestorePage:
    def test_one_page_comes_back_and_the_others_stay(self):
        now = schema(canvas('home', 'Home', ['new home']), canvas('about', 'About', ['new about']))
        then = schema(canvas('home', 'Home', ['old home']), canvas('about', 'About', ['old about']))

        restored, html = restore_page(now, '', then, 'about')

        assert [page['components'][0]['props']['text'] for page in restored['pages']] == ['new home', 'old about']
        assert html == ''

    def test_the_first_page_brings_the_site_document_with_it(self):
        now = schema(canvas('home', 'Home', ['canvas now']))
        then = schema(document('home', 'Home', '<h1>Then</h1>'))

        restored, html = restore_page(now, '', then, 'home')

        assert restored['pages'][0]['mode'] == 'html'
        assert html == '<h1>Then</h1>'

    def test_a_page_the_version_does_not_have_is_no_restore(self):
        assert restore_page(schema(canvas('home', 'Home', NINE)), '', schema(canvas('home', 'Home', NINE)), 'gone') is None


@pytest.fixture
def owner(db):
    return User.objects.create_user('ada', 'ada@example.com', 'secret123')


@pytest.fixture
def site(owner):
    made = Site.objects.create(owner=owner, title='Olive', schema=schema(canvas('home', 'Home', ['old home']), canvas('about', 'About', ['old about'])), html='')
    SiteVersion.snapshot(made, source='manual', force=True)
    made.schema = schema(canvas('home', 'Home', ['new home']), canvas('about', 'About', ['new about']))
    made.save()
    SiteVersion.snapshot(made, source='manual', force=True)
    return made


def as_user(user):
    api = APIClient()
    if user:
        api.force_authenticate(user)
    return api


def texts(site_row):
    return [page['components'][0]['props']['text'] for page in Site.objects.get(pk=site_row.pk).schema['pages']]


class TestHistoryList:
    def test_each_row_says_what_it_changed(self, owner, site):
        rows = as_user(owner).get(f'/api/sites/{site.pk}/versions/').data

        assert [row['summary']['first'] for row in rows] == [False, True]
        assert [(page['id'], page['size']) for page in rows[0]['summary']['pages']] == [('home', 0.5), ('about', 0.5)]

    def test_rows_saved_before_the_summary_get_one_when_the_list_is_read(self, owner, site):
        SiteVersion.objects.filter(site=site).update(summary=None)

        rows = as_user(owner).get(f'/api/sites/{site.pk}/versions/').data

        assert [row['summary']['first'] for row in rows] == [False, True]
        stored = list(SiteVersion.objects.filter(site=site).values_list('summary', flat=True))
        assert [summary['first'] for summary in stored] == [False, True]
        assert [page['id'] for page in stored[0]['pages']] == ['home', 'about']


class TestLoadingOnePage:
    def url(self, site):
        oldest = SiteVersion.objects.filter(site=site).order_by('created_at').first()
        return f'/api/sites/{site.pk}/versions/{oldest.pk}/restore/'

    def test_the_owner_gets_that_page_back_and_keeps_the_rest(self, owner, site):
        revision = site.revision

        res = as_user(owner).post(self.url(site), {'page': 'about'}, format='json')

        assert res.status_code == 200
        assert texts(site) == ['new home', 'old about']
        assert Site.objects.get(pk=site.pk).revision == revision + 1
        # The state it replaced is kept, as for a whole load.
        assert SiteVersion.objects.filter(site=site, label='before restore').count() == 1

    def test_without_a_page_the_whole_version_is_loaded_as_before(self, owner, site):
        as_user(owner).post(self.url(site), {}, format='json')

        assert texts(site) == ['old home', 'old about']

    def test_a_page_the_version_does_not_have_changes_nothing(self, owner, site):
        before = SiteVersion.objects.filter(site=site).count()

        res = as_user(owner).post(self.url(site), {'page': 'gone'}, format='json')

        assert res.status_code == 404
        assert res.data['code'] == 'page_not_in_version'
        assert texts(site) == ['new home', 'new about']
        assert SiteVersion.objects.filter(site=site).count() == before

    def test_nobody_else_can_load_a_page(self, site):
        stranger = User.objects.create_user('bob', 'bob@example.com', 'secret123')

        assert as_user(stranger).post(self.url(site), {'page': 'about'}, format='json').status_code == 404
        assert as_user(None).post(self.url(site), {'page': 'about'}, format='json').status_code in (401, 403)
        assert texts(site) == ['new home', 'new about']
