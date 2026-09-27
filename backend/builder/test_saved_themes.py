"""A theme someone made is theirs to reuse on every site, and only theirs."""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from .validators import sanitize_theme
from .views import SAVED_THEME_LIMIT


@pytest.fixture
def api(db):
    user = User.objects.create_user('ada', 'ada@example.com', 'secret123')
    client = APIClient()
    client.force_authenticate(user)
    return client


def theme(**overrides):
    return {'id': 't1', 'name': 'Studio', 'theme': {'primaryColor': '#e8543f', **overrides}}


class TestSavedThemes:
    def test_an_account_starts_with_none(self, api):
        assert api.get('/api/profile/themes/').data == {'themes': [], 'limit': SAVED_THEME_LIMIT}

    def test_a_saved_theme_comes_back_complete(self, api):
        api.put('/api/profile/themes/', {'themes': [theme()]}, format='json')

        saved = api.get('/api/profile/themes/').data['themes']

        assert saved[0]['name'] == 'Studio'
        assert saved[0]['theme']['primaryColor'] == '#e8543f'
        # Filled in, so applying it later never meets a missing field.
        assert saved[0]['theme']['accentColor'] == '#e8543f'
        assert saved[0]['theme']['textColor']

    def test_values_that_could_escape_css_are_dropped(self, api):
        api.put('/api/profile/themes/', {'themes': [theme(textColor='red;}</style><script>')]}, format='json')

        text = api.get('/api/profile/themes/').data['themes'][0]['theme']['textColor']

        assert '<' not in text and ';' not in text and '}' not in text

    def test_the_list_has_a_ceiling(self, api):
        many = [{'id': f't{i}', 'name': f'T{i}', 'theme': {}} for i in range(SAVED_THEME_LIMIT + 1)]

        response = api.put('/api/profile/themes/', {'themes': many}, format='json')

        assert response.status_code == 400
        assert api.get('/api/profile/themes/').data['themes'] == []

    def test_a_nameless_or_duplicate_theme_is_refused(self, api):
        assert api.put('/api/profile/themes/', {'themes': [theme(), theme()]}, format='json').status_code == 400
        nameless = {'id': 't2', 'name': '  ', 'theme': {}}
        assert api.put('/api/profile/themes/', {'themes': [nameless]}, format='json').status_code == 400

    def test_signed_out_there_is_nothing(self, db):
        assert APIClient().get('/api/profile/themes/').status_code in (401, 403)


class TestTheNewThemeFields:
    def test_typography_overrides_stay_empty_unless_chosen(self):
        cleaned = sanitize_theme({'primaryColor': '#111111'})

        assert cleaned['headingWeight'] == ''
        assert cleaned['bodyLineHeight'] == ''
        assert cleaned['headingLetterSpacing'] == ''

    def test_the_accent_follows_the_primary_for_older_themes(self):
        assert sanitize_theme({'primaryColor': '#111111'})['accentColor'] == '#111111'
        assert sanitize_theme({'primaryColor': '#111111', 'accentColor': '#e8543f'})['accentColor'] == '#e8543f'
