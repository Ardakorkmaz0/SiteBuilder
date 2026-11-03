from builder.live_pages import page_fingerprint
from builder.validators import sanitize_color_mode


def test_explicit_light_is_kept_and_turns_legacy_device_off():
    assert sanitize_color_mode({'start': 'light', 'followDevice': True}) == {
        'theme': {}, 'followDevice': False, 'start': 'light',
    }


def test_switch_only_in_home_mirror_marks_another_page_different():
    home = {'id': 'home', 'components': []}
    about = {'id': 'about', 'components': []}
    schema = {'theme': {}, 'pages': [home, about]}
    before = page_fingerprint(schema, '<p>Home</p>', about)
    after = page_fingerprint(schema, '<button data-pwb-theme-toggle>Switch</button>', about)
    assert before != after

from builder.test_page_live import owner, client, site, send, document


def test_global_mirror_switch_reaches_statuses_through_real_serializer(client, site):
    assert send(client, site, 'home', 'Home v1').status_code == 200
    assert send(client, site, 'about', 'About v1').status_code == 200
    changed = document('Home v1') + '<button data-pwb-theme-toggle>Switch</button>'
    response = client.patch(f'/api/sites/{site.pk}/', {'html': changed}, format='json')
    assert response.status_code == 200
    site.refresh_from_db()
    assert site.html == changed
    assert 'data-pwb-theme-toggle' not in site.schema['pages'][0]['html']
    assert response.data['page_live'] == {'home': 'older', 'about': 'older'}
