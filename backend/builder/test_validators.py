"""Focused XSS-prevention tests for builder.validators.

This module is the authoritative gate between user-supplied schema and the DB:
if a string here returns the wrong thing, the next render of the published
site can execute attacker JS in a visitor's browser. The tests below pin the
behaviour of every guard so a refactor can't silently weaken it.
"""
import pytest

from .validators import (
    sanitize_url,
    sanitize_image_src,
    sanitize_styles,
    validate_and_clean_schema,
)


class TestSanitizeUrl:
    def test_empty_and_non_string_inputs(self):
        assert sanitize_url(None) == ''
        assert sanitize_url(123) == ''
        assert sanitize_url('') == ''
        assert sanitize_url('   ') == ''

    def test_anchor_and_absolute_paths_preserved(self):
        assert sanitize_url('#about') == '#about'
        assert sanitize_url('#') == '#'
        assert sanitize_url('/login') == '/login'
        assert sanitize_url('/sites/a?p=1') == '/sites/a?p=1'

    def test_safe_schemes_pass_through(self):
        assert sanitize_url('https://example.com') == 'https://example.com'
        assert sanitize_url('http://example.com') == 'http://example.com'
        assert sanitize_url('mailto:hi@x.com') == 'mailto:hi@x.com'
        assert sanitize_url('tel:+15551234') == 'tel:+15551234'

    @pytest.mark.parametrize('bad', [
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'vbscript:msgbox()',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
    ])
    def test_dangerous_schemes_blocked(self, bad):
        assert sanitize_url(bad) == ''

    def test_unknown_protocols_dropped_but_simple_relatives_kept(self):
        assert sanitize_url('ftp://example.com') == ''
        assert sanitize_url('gopher://example.com') == ''
        assert sanitize_url('page.html') == 'page.html'
        assert sanitize_url('./about') == './about'

    def test_whitespace_trimmed(self):
        assert sanitize_url('  https://example.com  ') == 'https://example.com'


class TestSanitizeImageSrc:
    def test_data_image_png_accepted(self):
        tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA='
        assert sanitize_image_src(tiny) == tiny

    def test_data_text_html_rejected(self):
        assert sanitize_image_src('data:text/html;base64,PHNjcmlwdD4=') == ''

    def test_oversized_data_rejected(self):
        oversized = 'data:image/png;base64,' + 'A' * (100 * 1024 * 1024 + 1)
        assert sanitize_image_src(oversized) == ''

    def test_non_data_falls_back_to_sanitize_url(self):
        assert sanitize_image_src('javascript:alert(1)') == ''
        assert sanitize_image_src('https://x.com/y.png') == 'https://x.com/y.png'


class TestSanitizeStyles:
    def test_non_dict_returns_empty(self):
        assert sanitize_styles(None) == {}
        assert sanitize_styles('color:red') == {}
        assert sanitize_styles(42) == {}

    def test_drops_javascript_url_and_expression(self):
        result = sanitize_styles({
            'color': 'red',
            'backgroundImage': 'url(http://x.com/y.png)',
            'filter': 'expression(alert(1))',
            'backgroundColor': 'javascript:alert(1)',
        })
        assert result['color'] == 'red'
        assert 'backgroundImage' not in result
        assert 'filter' not in result
        assert 'backgroundColor' not in result

    def test_drops_keys_not_in_allow_list(self):
        result = sanitize_styles({
            'color': 'red',
            'animation': 'spin 2s',
            'transition': 'all 1s',
            'content': '"x"',
        })
        assert result == {'color': 'red'}

    def test_accepts_numeric_values(self):
        # Numbers come through as their string repr (line-height, opacity, …)
        result = sanitize_styles({'opacity': 0.5, 'fontSize': 16})
        assert result['opacity'] == '0.5'
        assert result['fontSize'] == '16'


@pytest.mark.django_db
class TestValidateAndCleanSchema:
    """Top-level pipeline: catches the kind of injection that crosses multiple
    layers (a malicious href hidden behind a sanitized style, a script tag
    smuggled in customCss, etc.)."""

    def test_strips_script_tags_from_custom_css(self):
        clean = validate_and_clean_schema({
            'customCss': 'a{color:red}</style><script>alert(1)</script>',
            'pages': [{'id': 'home', 'name': 'Home', 'components': []}],
        })
        css = clean['customCss']
        assert '<script' not in css.lower()
        assert '</style' not in css.lower()

    def test_blocks_javascript_in_custom_css_url(self):
        clean = validate_and_clean_schema({
            'customCss': 'a{background:url(JavaScript:alert(1))}',
            'pages': [{'id': 'home', 'name': 'Home', 'components': []}],
        })
        assert 'javascript:' not in clean['customCss'].lower()

    def test_anchor_href_javascript_dropped(self):
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'btn1', 'type': 'button',
                    'props': {'text': 'Click', 'href': 'javascript:alert(1)'},
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 100, 'h': 40},
                }],
            }],
        })
        href = clean['pages'][0]['components'][0]['props']['href']
        assert href == ''

    def test_shared_fixed_position_props_are_preserved(self):
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'btn1', 'type': 'button',
                    'props': {
                        'text': 'Pinned',
                        'scrollBehavior': 'fixed',
                        'pinY': 'bottom',
                        'pinX': 'right',
                        'pinOffsetY': 18,
                        'pinOffsetX': 24,
                        'pinZIndex': 200,
                    },
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 100, 'h': 40},
                }],
            }],
        })
        props = clean['pages'][0]['components'][0]['props']
        assert props['scrollBehavior'] == 'fixed'
        assert props['pinY'] == 'bottom'
        assert props['pinX'] == 'right'
        assert props['pinOffsetY'] == 18
        assert props['pinOffsetX'] == 24
        assert props['pinZIndex'] == 200

    def test_navbar_links_each_sanitized(self):
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'nav1', 'type': 'navbar',
                    'props': {
                        'brand': 'X',
                        'links': [
                            {'label': 'Safe', 'href': '#about'},
                            {'label': 'Attack', 'href': 'javascript:alert(1)'},
                            {'label': 'External', 'href': 'https://x.com'},
                        ],
                    },
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 800, 'h': 60},
                }],
            }],
        })
        links = clean['pages'][0]['components'][0]['props']['links']
        assert links[0]['href'] == '#about'
        assert links[1]['href'] == ''
        assert links[2]['href'] == 'https://x.com'

    def test_html_embed_escapes_script_close_tags(self):
        """`</script>` inside the embed code MUST be neutered so it can't
        prematurely close the wrapping script when re-serialised."""
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'h1', 'type': 'html',
                    'props': {'code': '<div>x</div></script><script>alert(1)</script>'},
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 200, 'h': 100},
                }],
            }],
        })
        code = clean['pages'][0]['components'][0]['props']['code']
        # Literal </script must have been escaped (e.g. with a backslash) so
        # the parser doesn't see a script-end inside our wrapper.
        assert '</script' not in code.lower()

    def test_html_embed_palette_metadata_round_trips(self):
        """_paletteType/_paletteVariant/_baseSize drive the client's fill-mode
        and content scaling; dropping them makes reloaded embeds re-scale
        against the palette default. Slugs and clamped numbers survive, junk
        does not."""
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [
                    {
                        'id': 'h1', 'type': 'html',
                        'props': {
                            'code': '<div>x</div>',
                            '_paletteType': 'container',
                            '_paletteVariant': 'bootstrap-1',
                            '_baseSize': {'w': 436.4, 'h': 146},
                        },
                        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 436, 'h': 146},
                    },
                    {
                        'id': 'h2', 'type': 'html',
                        'props': {
                            'code': '<div>y</div>',
                            '_paletteType': '<img onerror=alert(1)>',
                            '_baseSize': {'w': 'NaN', 'h': -5},
                        },
                        'styles': {}, 'layout': {'x': 0, 'y': 200, 'w': 200, 'h': 100},
                    },
                ],
            }],
        })
        good, bad = clean['pages'][0]['components']
        assert good['props']['_paletteType'] == 'container'
        assert good['props']['_paletteVariant'] == 'bootstrap-1'
        assert good['props']['_baseSize'] == {'w': 436, 'h': 146}
        assert '_paletteType' not in bad['props']
        assert '_baseSize' not in bad['props']

    def test_html_embed_site_font_flag_round_trips(self):
        """_siteFont marks an embed that starts in the site's font. Only a real
        True survives; anything else would switch an older embed's font."""
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [
                    {
                        'id': 'h1', 'type': 'html',
                        'props': {'code': '<div>x</div>', '_siteFont': True},
                        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 200, 'h': 80},
                    },
                    {
                        'id': 'h2', 'type': 'html',
                        'props': {'code': '<div>y</div>', '_siteFont': 'yes'},
                        'styles': {}, 'layout': {'x': 0, 'y': 100, 'w': 200, 'h': 80},
                    },
                ],
            }],
        })
        flagged, junk = clean['pages'][0]['components']
        assert flagged['props']['_siteFont'] is True
        assert '_siteFont' not in junk['props']

    def test_html_embed_appearance_tweaks_round_trip(self):
        """Appearance overrides survive as sanitized CSS values; markup and
        junk enums are dropped."""
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'h1', 'type': 'html',
                    'props': {
                        'code': '<div>x</div>',
                        'tweakBackground': '#111827',
                        'tweakAccent': 'linear-gradient(90deg, #6d28d9, #2563eb)',
                        'tweakFont': 'Georgia, "Times New Roman", serif',
                        'tweakPadding': '24px',
                        'tweakAlign': 'center',
                        'tweakZoom': '1.3',
                        'tweakTextColor': '<script>alert(1)</script>',
                    },
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 400, 'h': 200},
                }],
            }],
        })
        props = clean['pages'][0]['components'][0]['props']
        assert props['tweakBackground'] == '#111827'
        assert props['tweakFont'] == 'Georgia, "Times New Roman", serif'
        assert props['tweakPadding'] == '24px'
        assert props['tweakAlign'] == 'center'
        assert props['tweakZoom'] == '1.3'
        # Markup characters are stripped by _css_value; nothing executable stays.
        assert '<' not in props.get('tweakTextColor', '')

        clean2 = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'h2', 'type': 'html',
                    'props': {'code': 'x', 'tweakAlign': 'justify', 'tweakZoom': '99'},
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 400, 'h': 200},
                }],
            }],
        })
        props2 = clean2['pages'][0]['components'][0]['props']
        assert 'tweakAlign' not in props2
        assert 'tweakZoom' not in props2

    def test_container_auto_layout_round_trips(self):
        """Auto-layout flow props survive a save; junk is normalized."""
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'c1', 'type': 'container',
                    'props': {'flow': 'grid', 'gap': 24, 'cols': 4, 'align': 'center',
                              'justify': 'between', 'wrap': True},
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 600, 'h': 300},
                    'children': [],
                }],
            }],
        })
        props = clean['pages'][0]['components'][0]['props']
        assert props['flow'] == 'grid'
        assert props['gap'] == 24
        assert props['cols'] == 4
        assert props['align'] == 'center'
        assert props['justify'] == 'between'
        assert props['wrap'] is True

        bad = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [{
                    'id': 'c2', 'type': 'container',
                    'props': {'flow': 'diagonal', 'cols': 99, 'align': 'sideways'},
                    'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 600, 'h': 300},
                    'children': [],
                }],
            }],
        })
        p2 = bad['pages'][0]['components'][0]['props']
        assert p2['flow'] == 'free'
        assert p2['cols'] == 12
        assert p2['align'] == 'stretch'

    def test_html_embed_shape_round_trips(self):
        """The locked frame shape survives a save; junk values are dropped."""
        def clean_shape(value):
            data = validate_and_clean_schema({
                'pages': [{
                    'id': 'home', 'name': 'Home',
                    'components': [{
                        'id': 'h1', 'type': 'html',
                        'props': {'code': '<img src="/a.png">', 'shape': value},
                        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 200, 'h': 200},
                    }],
                }],
            })
            return data['pages'][0]['components'][0]['props'].get('shape')

        assert clean_shape('square') == 'square'
        assert clean_shape('circle') == 'circle'
        assert clean_shape('oval') is None
        assert clean_shape('<script>') is None

    def test_styles_mobile_preserved_and_sanitized(self):
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [
                    {
                        'id': 'h1', 'type': 'heading',
                        'props': {'text': 'Hi', 'level': 'h1'},
                        'styles': {'fontSize': '44px'},
                        'stylesMobile': {
                            'fontSize': '28px',
                            'filter': 'expression(alert(1))',  # must be dropped
                        },
                        'layout': {'x': 0, 'y': 0, 'w': 600, 'h': 60},
                    },
                    {
                        'id': 'h2', 'type': 'heading',
                        'props': {'text': 'Plain', 'level': 'h2'},
                        'styles': {}, 'layout': {'x': 0, 'y': 80, 'w': 600, 'h': 60},
                    },
                ],
            }],
        })
        overridden, plain = clean['pages'][0]['components']
        assert overridden['stylesMobile'] == {'fontSize': '28px'}
        # No overrides → the key is omitted so legacy schemas stay identical.
        assert 'stylesMobile' not in plain

    def test_region_children_and_navbar_width_settings_are_preserved(self):
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [
                    {
                        'id': 'nav1', 'type': 'navbar',
                        'props': {
                            'brand': 'Site', 'links': [],
                            'navLayout': 'centered', 'widthMode': 'boxed',
                            'contentWidth': 1140,
                        },
                        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 1000, 'h': 64},
                    },
                    {
                        'id': 'region1', 'type': 'region',
                        'props': {'contentWidth': 1200},
                        'styles': {}, 'layout': {'x': 0, 'y': 80, 'w': 1200, 'h': 360},
                        'children': [{
                            'id': 'heading1', 'type': 'heading',
                            'props': {'text': 'Inside', 'level': 'h2', 'dockX': 'right'},
                            'styles': {}, 'layout': {'x': 40, 'y': 40, 'w': 400, 'h': 60},
                        }],
                    },
                ],
            }],
        })
        nav, region = clean['pages'][0]['components']
        assert nav['props']['navLayout'] == 'centered'
        assert nav['props']['widthMode'] == 'boxed'
        assert nav['props']['contentWidth'] == 1140
        assert region['props']['contentWidth'] == 1200
        assert region['children'][0]['type'] == 'heading'
        assert region['children'][0]['props']['dockX'] == 'right'


    def test_px_field_values_survive_a_save(self):
        """The editor's px field writes its unit ("1200px"). float() refused it,
        so every save reset a navbar's content width to 980 and its link gap to
        20, and an emptied content width (full width) came back as 980 too."""
        nav = lambda cid, props: {
            'id': cid, 'type': 'navbar', 'props': {'brand': 'Site', 'links': [], **props},
            'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 1920, 'h': 64},
        }
        clean = validate_and_clean_schema({
            'pages': [{
                'id': 'home', 'name': 'Home',
                'components': [
                    nav('typed', {'contentWidth': '1200px', 'linkGap': '30px'}),
                    nav('emptied', {'contentWidth': ''}),
                    nav('unset', {}),
                    {
                        'id': 'region1', 'type': 'region', 'props': {'contentWidth': '1100px'},
                        'styles': {}, 'layout': {'x': 0, 'y': 80, 'w': 1100, 'h': 360}, 'children': [],
                    },
                ],
            }],
        })
        typed, emptied, unset, region = clean['pages'][0]['components']
        assert typed['props']['contentWidth'] == 1200
        assert typed['props']['linkGap'] == 30
        assert emptied['props']['contentWidth'] == ''
        assert unset['props']['contentWidth'] == ''
        assert region['props']['contentWidth'] == 1100

def test_page_seo_fields_survive_a_save():
    """Page metadata is on the page allowlist, so it is not dropped on save."""
    clean = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'components': [],
        'seoTitle': 'Ada Lovelace', 'seoDescription': 'Analytical engines.',
        'seoImage': 'https://cdn.example.com/card.png',
    }]})['pages'][0]
    assert clean['seoTitle'] == 'Ada Lovelace'
    assert clean['seoDescription'] == 'Analytical engines.'
    assert clean['seoImage'] == 'https://cdn.example.com/card.png'


def test_page_seo_text_is_clipped_to_what_search_engines_read():
    clean = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'components': [],
        'seoTitle': 'T' * 200, 'seoDescription': 'D' * 500,
    }]})['pages'][0]
    assert len(clean['seoTitle']) == 70
    assert len(clean['seoDescription']) == 200


def test_page_seo_image_rejects_a_script_url():
    clean = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'components': [],
        'seoImage': 'javascript:alert(1)',
    }]})['pages'][0]
    assert clean['seoImage'] == ''


def _one_component(component):
    """Round-trip a single component through the save gate."""
    return validate_and_clean_schema({
        'pages': [{'id': 'p1', 'name': 'Home', 'components': [component]}],
    })['pages'][0]['components'][0]


def test_text_band_keeps_every_field_the_editor_offers():
    """A section exposes five fields; rebuilding only `heading` used to throw
    the other four away on every save — including the body copy a freshly
    dropped band ships with — and the loss only surfaced on the next load."""
    clean = _one_component({
        'id': 's1', 'type': 'section',
        'props': {
            'eyebrow': 'WHAT WE DO',
            'heading': 'Design that ships',
            'text': 'A short paragraph that introduces the section.',
            'buttonText': 'See the work',
            'buttonHref': 'https://example.com/work',
        },
        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 1000, 'h': 280},
    })
    assert clean['props'] == {
        'eyebrow': 'WHAT WE DO',
        'heading': 'Design that ships',
        'text': 'A short paragraph that introduces the section.',
        'buttonText': 'See the work',
        'buttonHref': 'https://example.com/work',
    }


def test_text_band_button_link_still_goes_through_the_url_guard():
    clean = _one_component({
        'id': 's1', 'type': 'section',
        'props': {'heading': 'H', 'buttonHref': 'javascript:alert(1)'},
        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 1000, 'h': 280},
    })
    assert clean['props']['buttonHref'] == ''


def test_button_keeps_its_icon():
    for ctype in ('button', 'linkbutton'):
        clean = _one_component({
            'id': 'b1', 'type': ctype,
            'props': {'text': 'Contact', 'href': '#contact', 'icon': 'mail'},
            'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 160, 'h': 44},
        })
        assert clean['props']['icon'] == 'mail', ctype


def test_icon_keeps_its_accessible_label():
    clean = _one_component({
        'id': 'i1', 'type': 'icon',
        'props': {'name': 'star', 'label': 'Favourite'},
        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 48, 'h': 48},
    })
    assert clean['props']['label'] == 'Favourite'


@pytest.mark.parametrize('ctype', ['list', 'quote', 'alert'])
def test_a_link_around_a_list_a_quote_or_an_alert_survives_a_save(ctype):
    """The editor offers "Wrap in a link" on these three and the published page
    writes it, but the save gate dropped it, so the link was gone on reload."""
    clean = _one_component({
        'id': 'c1', 'type': ctype,
        'props': {'text': 'Read more', 'href': 'https://example.com/more'},
        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 300, 'h': 80},
    })
    assert clean['props']['href'] == 'https://example.com/more'


@pytest.mark.parametrize('ctype', ['list', 'quote', 'alert'])
def test_a_link_around_a_list_a_quote_or_an_alert_goes_through_the_url_guard(ctype):
    clean = _one_component({
        'id': 'c1', 'type': ctype,
        'props': {'text': 'Read more', 'href': 'javascript:alert(1)'},
        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 300, 'h': 80},
    })
    assert 'href' not in clean['props']


@pytest.mark.parametrize('ctype', ['list', 'quote', 'alert'])
def test_a_list_a_quote_or_an_alert_without_a_link_stores_what_it_did_before(ctype):
    clean = _one_component({
        'id': 'c1', 'type': ctype, 'props': {'text': 'Plain'},
        'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 300, 'h': 80},
    })
    assert 'href' not in clean['props']


def test_page_editor_mode_survives_an_emptied_html_document():
    """`mode` was not stored, so it was re-derived from the html on load: an
    HTML page whose document had been cleared silently turned back into a
    component canvas."""
    clean = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'components': [], 'mode': 'html', 'html': '',
    }]})['pages'][0]
    assert clean['mode'] == 'html'


def test_page_without_mode_is_derived_from_its_document():
    doc = '<!doctype html><html><body>hi</body></html>'
    legacy = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'components': [], 'html': doc,
    }]})['pages'][0]
    plain = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'components': [],
    }]})['pages'][0]
    assert legacy['mode'] == 'html'
    assert plain['mode'] == 'empty'


def _saved_props(props, ctype='region'):
    schema = {'pages': [{'id': 'home', 'name': 'Home', 'components': [
        {'id': 'band_1', 'type': ctype, 'props': props, 'styles': {}, 'layout': {'x': 0, 'y': 0, 'w': 1000, 'h': 300}},
    ]}]}
    return validate_and_clean_schema(schema)['pages'][0]['components'][0]['props']


def test_block_anchor_survives_a_save():
    # The readable section name (#about). Dropped by the save gate, every link
    # pointing at it would go dead again on the next load.
    assert _saved_props({'anchor': 'hakkimizda'})['anchor'] == 'hakkimizda'
    assert _saved_props({'anchor': 'pricing-2025'}, 'heading')['anchor'] == 'pricing-2025'


def test_block_anchor_survives_on_a_pinned_block_too():
    props = _saved_props({'anchor': 'top-bar', 'scrollBehavior': 'fixed'}, 'navbar')
    assert props['anchor'] == 'top-bar'


@pytest.mark.parametrize('bad', [
    'About', 'has space', '"><script>', '-lead', 'trail-', 'top', '', 'x' * 61, 42, None,
])
def test_block_anchor_rejects_anything_but_a_slug(bad):
    # It is written into an HTML id attribute on the published page.
    assert 'anchor' not in _saved_props({'anchor': bad})


class TestPageDocumentSettings:
    """The save gate rebuilds pages from an explicit key list, so a setting it
    does not know about is dropped silently — invisible until the next reload.
    """

    def _page(self, **extra):
        page = {'id': 'p1', 'name': 'Home', 'components': []}
        page.update(extra)
        return validate_and_clean_schema({'pages': [page]})['pages'][0]

    def test_any_well_formed_language_tag_survives(self):
        assert self._page(language='de')['language'] == 'de'
        assert self._page(language='pt-BR')['language'] == 'pt-BR'
        assert self._page(language='es-419')['language'] == 'es-419'

    def test_malformed_language_falls_back_to_english(self):
        assert self._page(language='" onload="alert(1)')['language'] == 'en'
        assert self._page(language='')['language'] == 'en'
        assert self._page()['language'] == 'en'

    def test_direction_theme_colour_and_smooth_scroll_round_trip(self):
        page = self._page(direction='rtl', themeColor='#0f172a', smoothScroll=True)
        assert page['direction'] == 'rtl'
        assert page['themeColor'] == '#0f172a'
        assert page['smoothScroll'] is True

    def test_junk_direction_and_colour_are_dropped_not_stored(self):
        page = self._page(direction='sideways', themeColor='red" onload="x', smoothScroll='yes')
        assert page['direction'] == ''
        assert page['themeColor'] == ''
        assert page['smoothScroll'] is True


class TestLightAndDark:
    """A site visitors can switch between its two palettes."""

    def _schema(self, **extra):
        comp = {'id': 't1', 'type': 'themeToggle', 'props': {'label': 'Dark mode', 'showLabel': 'on'}}
        return validate_and_clean_schema({'pages': [{'id': 'p', 'components': [comp]}], **extra})

    def test_the_switch_survives_a_save(self):
        props = self._schema()['pages'][0]['components'][0]['props']
        assert props['label'] == 'Dark mode'
        assert props['showLabel'] == 'on'

    def _switch(self, **props):
        comp = {'id': 't1', 'type': 'themeToggle', 'props': {'label': 'Theme', **props}}
        return validate_and_clean_schema({'pages': [{'id': 'p', 'components': [comp]}]})['pages'][0]['components'][0]['props']

    def test_a_two_way_switch_stores_what_it_did_before(self):
        assert self._switch() == {'label': 'Theme', 'showLabel': ''}

    def test_the_three_way_switch_survives_a_save_with_its_names(self):
        assert self._switch(states='three', lightLabel='Açık', darkLabel='Koyu', deviceLabel='Cihaz') == {
            'label': 'Theme', 'showLabel': '', 'states': 'three',
            'lightLabel': 'Açık', 'darkLabel': 'Koyu', 'deviceLabel': 'Cihaz',
        }

    def test_an_unknown_kind_of_switch_is_a_two_way_one(self):
        assert self._switch(states='<b>') == {'label': 'Theme', 'showLabel': ''}

    def test_a_choice_name_is_cut_like_the_label(self):
        assert self._switch(states='three', lightLabel='x' * 200)['lightLabel'] == 'x' * 80

    def _image(self, **props):
        comp = {'id': 'i1', 'type': 'image', 'props': {'src': 'https://a.test/light.png', **props}}
        return validate_and_clean_schema({'pages': [{'id': 'p', 'components': [comp]}]})['pages'][0]['components'][0]['props']

    def test_an_image_stores_what_it_did_before_until_it_has_a_second_version(self):
        assert 'srcOther' not in self._image()
        assert self._image(srcOther='https://a.test/dark.png')['srcOther'] == 'https://a.test/dark.png'

    def test_an_images_second_version_is_cleaned_like_the_first(self):
        assert 'srcOther' not in self._image(srcOther='javascript:alert(1)')

    def test_a_site_without_the_other_palette_stores_nothing_for_it(self):
        assert 'colorMode' not in self._schema()

    def test_the_other_palette_keeps_only_hex_colours(self):
        clean = self._schema(colorMode={
            'theme': {
                'backgroundColor': '#111317',
                'textColor': 'red;} body{background:url(x)',
                'primaryColor': '#60a5fa" onload="x',
                'fontFamily': 'Comic Sans MS',
            },
            'followDevice': True,
        })['colorMode']
        assert clean == {'theme': {'backgroundColor': '#111317'}, 'followDevice': True}

    def test_following_the_device_is_a_real_yes_only(self):
        assert self._schema(colorMode={'followDevice': 'yes'})['colorMode']['followDevice'] is False

    def test_what_the_site_opens_in_is_kept_and_decides_following_the_device(self):
        assert self._schema(colorMode={'start': 'dark', 'followDevice': True})['colorMode'] == {
            'theme': {}, 'followDevice': False, 'start': 'dark',
        }
        assert self._schema(colorMode={'start': 'system'})['colorMode'] == {
            'theme': {}, 'followDevice': True, 'start': 'system',
        }
        assert self._schema(colorMode={'start': 'light', 'followDevice': True})['colorMode'] == {
            'theme': {}, 'followDevice': False, 'start': 'light',
        }

    def test_an_unknown_opening_is_left_out(self):
        assert self._schema(colorMode={'start': 'blue', 'followDevice': True})['colorMode'] == {
            'theme': {}, 'followDevice': True,
        }
        assert self._schema(colorMode={'start': ['dark']})['colorMode'] == {'theme': {}, 'followDevice': False}

    def test_a_site_that_never_chose_stores_what_it_did_before(self):
        assert self._schema(colorMode={'theme': {}, 'followDevice': False})['colorMode'] == {
            'theme': {}, 'followDevice': False,
        }


def test_a_block_that_fits_its_box_keeps_it_after_a_save():
    clean = validate_and_clean_schema({'pages': [{'id': 'p', 'components': [
        {'id': 'h', 'type': 'heading', 'props': {'text': 'Hi', 'fit': 'box'}},
        {'id': 'e', 'type': 'html', 'props': {'code': '<p>x</p>', 'fit': 'off'}},
        {'id': 'b', 'type': 'button', 'props': {'text': 'Go', 'fit': 'stretch;'}},
    ]}]})
    props = [c['props'] for c in clean['pages'][0]['components']]
    assert props[0]['fit'] == 'box'
    assert props[1]['fit'] == 'off'
    assert 'fit' not in props[2]


def test_an_html_block_keeps_its_measured_phone_height():
    def phone(value):
        clean = validate_and_clean_schema({'pages': [{'id': 'p', 'components': [
            {'id': 'e', 'type': 'html', 'props': {'code': '<p>x</p>', '_phoneH': value}},
        ]}]})
        return clean['pages'][0]['components'][0]['props'].get('_phoneH')
    assert phone({'w': 358, 'h': 64, 'key': 'abc123'}) == {'w': 358, 'h': 64, 'key': 'abc123'}
    assert phone({'w': 358, 'h': 64, 'key': '"><script>'}) is None
    assert phone({'w': 358, 'h': 2}) is None


# The editor lets a page grow as long as its content, lets the page be up to
# 4000 px wide and lets a block be as tall as what is in it. The save gate used
# to hold a block to y 20000, width 2000 and height 5000: a block below, wider
# or taller than that was moved or cut on save, and the editor showed the
# change only after the site was opened again.
def test_a_block_far_down_a_long_page_stays_where_it_was_put():
    saved = _one_component({
        'id': 'card_1', 'type': 'card', 'props': {}, 'styles': {},
        'layout': {'x': 40, 'y': 20320, 'w': 290, 'h': 480},
        'mobileLayout': {'x': 16, 'y': 31400, 'w': 358, 'h': 420},
    })
    assert saved['layout'] == {'x': 40, 'y': 20320, 'w': 290, 'h': 480}
    assert saved['mobileLayout'] == {'x': 16, 'y': 31400, 'w': 358, 'h': 420}


@pytest.mark.parametrize('width', [2560, 4000])
def test_a_block_as_wide_as_a_wide_page_keeps_its_width(width):
    page = validate_and_clean_schema({'pages': [{
        'id': 'p1', 'name': 'Home', 'canvasWidth': width,
        'components': [{
            'id': 'image_1', 'type': 'image', 'props': {}, 'styles': {},
            'layout': {'x': 0, 'y': 0, 'w': width, 'h': 900},
        }],
    }]})['pages'][0]
    assert page['canvasWidth'] == width
    assert page['components'][0]['layout'] == {'x': 0, 'y': 0, 'w': width, 'h': 900}


def test_a_block_taller_than_five_screens_keeps_its_height():
    saved = _one_component({
        'id': 'band_1', 'type': 'region', 'props': {}, 'styles': {},
        'layout': {'x': 0, 'y': 0, 'w': 1000, 'h': 8200},
        'mobileLayout': {'x': 0, 'y': 0, 'w': 390, 'h': 14600},
        'children': [],
    })
    assert saved['layout'] == {'x': 0, 'y': 0, 'w': 1000, 'h': 8200}
    assert saved['mobileLayout'] == {'x': 0, 'y': 0, 'w': 390, 'h': 14600}


def test_a_long_html_block_keeps_the_sizes_it_was_measured_at():
    props = _one_component({
        'id': 'embed_1', 'type': 'html', 'styles': {},
        'props': {
            'code': '<p>x</p>',
            '_baseSize': {'w': 900, 'h': 6400},
            '_phoneH': {'w': 358, 'h': 9100, 'key': 'abc123'},
        },
        'layout': {'x': 0, 'y': 0, 'w': 900, 'h': 6400},
    })['props']
    assert props['_baseSize'] == {'w': 900, 'h': 6400}
    assert props['_phoneH'] == {'w': 358, 'h': 9100, 'key': 'abc123'}


def test_a_box_is_still_held_to_a_limit():
    saved = _one_component({
        'id': 'card_1', 'type': 'card', 'props': {}, 'styles': {},
        'layout': {'x': 9000000, 'y': 9000000, 'w': 9000000, 'h': 9000000},
    })
    assert saved['layout'] == {'x': 5000, 'y': 200000, 'w': 4000, 'h': 100000}
