"""The save gate must accept everything the editor can produce.

`sanitize_props` rebuilds each component from an explicit per-type allowlist.
That is the right shape for a security boundary — anything unlisted is dropped
— but it means the list has to be kept in step with the editor's own component
registry BY HAND, and it was not: the Text band lost four of its five fields on
every save, buttons lost their icon, icons lost their accessible label. None of
it was visible in the session that caused it, because the editor keeps its own
state after saving and only reloads the schema when the site is next opened.

So this file reads the frontend registry — the single source of what the editor
offers — and asserts every editable field survives a round-trip through the
gate. A new control added to registry.jsx now fails here instead of quietly
throwing the user's content away.

Parsing JSX with a regex is crude, but the failure mode is safe: if the parse
stops working the counts collapse and `test_parser_still_understands_the_registry`
fails loudly rather than every test below passing vacuously.
"""
import json
import re
from pathlib import Path

import pytest

from .validators import sanitize_props

REGISTRY = Path(__file__).resolve().parents[2] / 'frontend' / 'src' / 'components' / 'registry.jsx'
# Form fields list their settings once, in formField.js, and the registry
# builds their editableProps from it rather than writing them out.
FORM_FIELD = REGISTRY.parents[1] / 'utils' / 'formField.js'

# Cross-type props handled by sanitize_shared_props, not by a per-type branch.
SHARED = {
    'animIn', 'animHover', 'animSpeed', 'animDelay',
    'scrollBehavior', 'pinY', 'pinX', 'pinOffsetY', 'pinOffsetX', 'dockX',
}

# Values that satisfy each field's own validation, so a probe is never rejected
# for being the wrong shape rather than for being unlisted.
PROBES = {
    'links': [{'label': 'A', 'href': 'https://example.com'}],
    'tabs': [{'id': 't1', 'label': 'A'}],
    'activeId': 't1',
    'level': 'h2',
    'ordered': True,
    'inputType': 'email',
    'variant': 'info',
    'navLayout': 'centered',
    'brandAlign': 'left',
    'linksAlign': 'right',
    'widthMode': 'boxed',
    'mobileNavMode': 'stack',
    'linkGap': 24,
    'contentWidth': 1100,
    'flow': 'column',
    'align': 'center',
    'justify': 'between',
    'gap': 12,
    'cols': 3,
    'wrap': True,
    'tweakZoom': '1.15',
    'tweakAlign': 'center',
    'shape': 'square',
    'src': 'https://example.com/a.png',
    'href': 'https://example.com',
    'buttonHref': 'https://example.com',
}


def _editable_props_by_type():
    """{component type -> [editableProps keys]} straight from registry.jsx."""
    source = REGISTRY.read_text(encoding='utf-8')
    starts = [(m.group(1), m.start()) for m in re.finditer(r'^  ([a-z][a-zA-Z]*): \{$', source, re.M)]
    out = {}
    for i, (ctype, start) in enumerate(starts):
        end = starts[i + 1][1] if i + 1 < len(starts) else len(source)
        body = source[start:end]
        block = re.search(r'editableProps:\s*\[(.*?)\n    \],', body, re.S)
        keys = list(dict.fromkeys(re.findall(r"key:\s*'([^']+)'", block.group(1)))) if block else []
        if re.search(r'^    fieldParts: true,$', body, re.M):
            keys = list(dict.fromkeys(keys + _form_field_keys(ctype)))
        if keys:
            out[ctype] = keys
    return out


def _form_field_keys(ctype):
    """The FIELD_CONTROLS keys formField.js gives a component of this type."""
    source = FORM_FIELD.read_text(encoding='utf-8')
    block = re.search(r'export const FIELD_CONTROLS = \[(.*?)\n\]', source, re.S)
    keys = []
    for entry in re.findall(r'^  \{ (key: .*) \},?$', block.group(1) if block else '', re.M):
        only = re.search(r'componentTypes: \[([^\]]*)\]', entry)
        if only and f"'{ctype}'" not in only.group(1):
            continue
        keys.append(re.match(r"key: '([^']+)'", entry).group(1))
    return keys


EDITABLE = _editable_props_by_type()


def test_parser_still_understands_the_registry():
    """Guard the guard: a broken parse would make every test below vacuous."""
    assert REGISTRY.exists(), REGISTRY
    assert len(EDITABLE) >= 15, f'only parsed {len(EDITABLE)} types: {sorted(EDITABLE)}'
    assert 'navbar' in EDITABLE and 'section' in EDITABLE
    assert 'text' in EDITABLE['section'], EDITABLE['section']
    # Form fields come from formField.js; a parse that finds none of them
    # would let a new field setting slip past the checks below.
    assert {'inputType', 'labelColor', 'revealButton', 'helpText'} <= set(EDITABLE.get('input', [])), EDITABLE.get('input')
    assert 'inputType' not in EDITABLE.get('select', []), EDITABLE.get('select')


@pytest.mark.parametrize('ctype', sorted(EDITABLE))
def test_every_editable_field_survives_a_save(ctype):
    fields = [f for f in EDITABLE[ctype] if f not in SHARED]
    probe = {f: PROBES.get(f, 'probe') for f in fields}
    kept = sanitize_props(ctype, probe)
    dropped = [f for f in fields if f not in kept]
    assert not dropped, (
        f'{ctype}: the editor offers {dropped} but sanitize_props does not rebuild '
        f'them, so every save silently throws them away. Add them to the {ctype} '
        f'branch in validators.py (with the right guard for their type).\n'
        f'kept: {json.dumps(kept, ensure_ascii=False)}'
    )
