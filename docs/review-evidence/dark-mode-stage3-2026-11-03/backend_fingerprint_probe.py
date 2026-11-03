# Review evidence only: real API calls for the two surviving fingerprint mutants.
# Run explicitly from backend; this file is outside the normal test suite.
import pytest
from builder.test_page_live import owner, client, site, schema, send


@pytest.mark.parametrize('kind', ['canvas-three', 'html-choices'])
def test_three_way_switch_elsewhere_marks_live_home_older(client, site, kind):
    assert send(client, site, 'home', 'Home v1').status_code == 200
    changed = schema()
    if kind == 'canvas-three':
        changed['pages'][1]['components'] = [
            {'id': 'three', 'type': 'themeToggle', 'props': {'states': 'three', 'label': 'Theme'}},
        ]
    else:
        changed['pages'][1]['html'] += '<div data-pwb-theme-toggle="choices"><button>Device</button></div>'
    response = client.patch(f'/api/sites/{site.pk}/', {'schema': changed}, format='json')
    assert response.status_code == 200
    site.refresh_from_db()
    if kind == 'canvas-three':
        assert site.schema['pages'][1]['components'][0]['props']['states'] == 'three'
    assert response.data['page_live'] == {'home': 'older'}
