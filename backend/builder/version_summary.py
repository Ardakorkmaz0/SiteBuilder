"""What changed between two saved versions of a site, in a few numbers.

The history list shows every save, and a save of one comma looks like a save
that replaced the page. Each version carries this summary of its difference
from the version before it: which pages changed and by how much (0 to 1), and
whether the change is one that Undo cannot take back, so that the history is
the only way to it (a page that changed between HTML and canvas, a page that
was deleted).
"""
import json
import re
from collections import Counter

MAX_PAGES = 40
_HTML_TOKEN = re.compile(r'<[^>]*>|[^<]+')
_SITE_KEYS = ('theme', 'customCss', 'customJs', 'colorMode')


def _pages(schema):
    pages = schema.get('pages') if isinstance(schema, dict) else None
    return [page for page in pages or [] if isinstance(page, dict)]


def _blocks(components, out):
    for component in components or []:
        if not isinstance(component, dict):
            continue
        own = {key: value for key, value in component.items() if key != 'children'}
        out[str(component.get('id'))] = json.dumps(own, sort_keys=True)
        _blocks(component.get('children'), out)
    return out


def _tokens(html):
    if not isinstance(html, str) or not html:
        return Counter()
    return Counter(token.strip() for token in _HTML_TOKEN.findall(html) if token.strip())


def _page_change(before, after):
    """How much of a page is different, 0 to 1."""
    blocks_before = _blocks(before.get('components'), {})
    blocks_after = _blocks(after.get('components'), {})
    changed = len(set(blocks_before) ^ set(blocks_after))
    changed += sum(1 for key in set(blocks_before) & set(blocks_after) if blocks_before[key] != blocks_after[key])

    html_before = _tokens(before.get('html'))
    html_after = _tokens(after.get('html'))
    # A token that was rewritten is one gone and one new: counted once.
    gone = sum((html_before - html_after).values())
    new = sum((html_after - html_before).values())
    changed += max(gone, new)

    skip = ('components', 'html', 'htmlBackup')
    settings_before = {key: value for key, value in before.items() if key not in skip}
    settings_after = {key: value for key, value in after.items() if key not in skip}
    if settings_before != settings_after:
        changed += 1

    total = 1 + max(
        len(blocks_before) + sum(html_before.values()),
        len(blocks_after) + sum(html_after.values()),
    )
    if not changed:
        return 0.0
    return max(0.01, min(1.0, round(changed / total, 3)))


def summarize(before, after):
    """The summary stored on a version: `after` is that version's schema and
    `before` the schema of the version before it (None for the first)."""
    if not isinstance(before, dict):
        return {'first': True, 'pages': [], 'size': 0, 'hard': False, 'site': False}
    old = {str(page.get('id')): page for page in _pages(before)}
    seen = set()
    pages = []
    for page in _pages(after):
        page_id = str(page.get('id'))
        seen.add(page_id)
        name = str(page.get('name') or '')[:80]
        if page_id not in old:
            pages.append({'id': page_id, 'name': name, 'kind': 'added', 'size': 1.0, 'hard': False})
            continue
        size = _page_change(old[page_id], page)
        mode_changed = (old[page_id].get('mode') == 'html') != (page.get('mode') == 'html')
        if size or mode_changed:
            pages.append({'id': page_id, 'name': name, 'kind': 'mode' if mode_changed else 'changed', 'size': size, 'hard': mode_changed})
    for page_id, page in old.items():
        if page_id not in seen:
            pages.append({'id': page_id, 'name': str(page.get('name') or '')[:80], 'kind': 'removed', 'size': 1.0, 'hard': True})
    site = any(before.get(key) != (after or {}).get(key) for key in _SITE_KEYS)
    size = max([page['size'] for page in pages] + [0.05 if site else 0])
    return {
        'first': False,
        'pages': pages[:MAX_PAGES],
        'size': size,
        'hard': any(page['hard'] for page in pages),
        'site': site,
    }


def fill_missing(rows):
    """Give a summary to the rows that have none (versions older than this
    field, and the copies kept when a site goes live). `rows` are one site's
    versions, newest first. Returns the rows that were filled, for saving."""
    filled = []
    for index, row in enumerate(rows):
        if row.summary is not None:
            continue
        older = rows[index + 1] if index + 1 < len(rows) else None
        row.summary = summarize(older.schema if older is not None else None, row.schema)
        filled.append(row)
    return filled


def restore_page(schema, html, version_schema, page_id):
    """`schema` with the page `page_id` as `version_schema` has it, and the
    site's own html, which mirrors the first page's document. None when the
    version has no such page. A page the site no longer has comes back at
    the end."""
    wanted = next((page for page in _pages(version_schema) if str(page.get('id')) == page_id), None)
    if wanted is None:
        return None
    pages = _pages(schema)
    if any(str(page.get('id')) == page_id for page in pages):
        pages = [wanted if str(page.get('id')) == page_id else page for page in pages]
    else:
        pages = pages + [wanted]
    first = pages[0] if pages else {}
    if str(first.get('id')) == page_id:
        html = wanted.get('html') if isinstance(wanted.get('html'), str) else ''
    return {**schema, 'pages': pages}, html
