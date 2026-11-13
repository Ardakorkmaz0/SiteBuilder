"""Each page of a site goes live on its own.

What visitors get is a set of rows (PublishedPage), one per page. Each row
remembers which page of the draft it came from and a fingerprint of that page
when it was sent, so comparing fingerprints says whether a page is live as it
stands in the draft, live in an older form, or not live at all.

`Site.live_schema` is the same set seen by the public API and the in-app
viewer: a page that was never sent, or was hidden, is not in it, so it cannot
be read from outside.

Every change to what is live first stores what it replaces (LiveSnapshot).
Restoring one stores the state it replaces in turn, so undo and redo are the
same operation.
"""
import hashlib
import json

from django.utils import timezone
from rest_framework import serializers

from .models import LiveSnapshot, PublishedPage, SiteVersion
from .validators import (
    MAX_PUBLISHED_PAGES, MAX_PUBLISHED_TOTAL_BYTES, _published_path, clean_published_pages, text_bytes,
)


THEME_SWITCH_ATTR = 'data-pwb-theme-toggle'


def _pages(schema):
    pages = schema.get('pages') if isinstance(schema, dict) else None
    return [page for page in pages if isinstance(page, dict)] if isinstance(pages, list) else []


def _site_level(schema):
    return {key: value for key, value in schema.items() if key != 'pages'} if isinstance(schema, dict) else {}


def _holds_theme_switch(components):
    if not isinstance(components, list):
        return False
    return any(
        isinstance(component, dict)
        and (component.get('type') == 'themeToggle' or _holds_theme_switch(component.get('children')))
        for component in components
    )


def _site_has_theme_switch(schema, html):
    """Mirrors hasThemeToggle in frontend/src/utils/colorMode.js."""
    if THEME_SWITCH_ATTR in (html or ''):
        return True
    return any(
        _holds_theme_switch(page.get('components')) or THEME_SWITCH_ATTR in str(page.get('html') or '')
        for page in _pages(schema)
    )


def page_fingerprint(schema, html, page):
    """Changes when what this page would render as changes: the page itself,
    what the whole site shares (a canvas page is rendered with the theme), the
    home page's mirrored document, and whether any page has a theme switch,
    which gives every page both palettes. A site with no switch keeps the
    fingerprints its pages went live with."""
    pages = _pages(schema)
    is_home = bool(pages) and pages[0].get('id') == page.get('id')
    parts = [_site_level(schema), page, html if is_home else '']
    if _site_has_theme_switch(schema, html):
        parts.append(True)
    payload = json.dumps(parts, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode('utf-8', 'surrogatepass')).hexdigest()


def _renders(page, is_home, html):
    """False for a page the editor leaves out of a publish: an empty HTML page."""
    if page.get('mode') != 'html':
        return True
    own = page.get('html')
    return bool(isinstance(own, str) and own.strip()) or (is_home and bool((html or '').strip()))


def align_rows(schema, html, rows):
    """Name the page of rows that do not say (an older client, older data).
    Rows are in page order with the pages that did not render left out, so they
    can be matched only when the counts agree; otherwise only the home page is
    certain."""
    pages = _pages(schema)
    rendered = [page for index, page in enumerate(pages) if _renders(page, index == 0, html)]
    if len(rendered) == len(rows):
        return [page.get('id') or '' for page in rendered]
    home = pages[0].get('id') or '' if pages else ''
    return [home if row_path == '' else '' for row_path in (row['path'] for row in rows)]


def _merged_pages(draft_pages, live_pages, replacing, replacement):
    """The live pages with one replaced (or removed, when `replacement` is
    None), in the draft's order. A live page the draft no longer has stays at
    the end: it is still served until the whole site is sent live."""
    live_by_id = {page.get('id'): page for page in live_pages}
    if replacement is not None:
        live_by_id[replacing] = replacement
    else:
        live_by_id.pop(replacing, None)
    ordered = [live_by_id.pop(page.get('id')) for page in draft_pages if page.get('id') in live_by_id]
    return ordered + list(live_by_id.values())


def statuses(site):
    """{page id: 'live' | 'older'} for the draft's pages. A page that is not
    live has no entry."""
    if not site.published:
        return {}
    rows = dict(site.published_pages.exclude(page_id='').values_list('page_id', 'fingerprint'))
    return {
        page['id']: 'live' if rows[page['id']] == page_fingerprint(site.schema, site.html, page) else 'older'
        for page in _pages(site.schema) if page.get('id') in rows
    }


def draft_is_ahead(site):
    """Whether sending the draft live would change anything for visitors."""
    row_ids = set(site.published_pages.values_list('page_id', flat=True))
    # No rows that name their page: only the whole version can be compared.
    if not row_ids or '' in row_ids:
        return site.draft_differs_from_live()
    current = statuses(site)
    draft_ids = {page.get('id') for page in _pages(site.schema)}
    hidden = set(site.private_pages or [])
    return any(current.get(page_id) != 'live' for page_id in draft_ids - hidden) or bool(row_ids - draft_ids)


def _row_data(row):
    return {
        'page_id': row.page_id, 'fingerprint': row.fingerprint, 'path': row.path, 'title': row.title,
        'html': row.html, 'no_index': row.no_index, 'position': row.position,
    }


def take_snapshot(site, was_published, page_id=''):
    """Store what a change is about to replace: one page's part, or (no
    `page_id`) everything that is live."""
    rows = site.published_pages.all()
    live = site.live_schema if isinstance(site.live_schema, dict) else None
    kept_schema = None
    if live is not None:
        kept_pages = [page for page in _pages(live) if not page_id or page.get('id') == page_id]
        kept_schema = {**_site_level(live), 'pages': kept_pages}
    draft = _pages(site.schema)
    touches_home = not page_id or (bool(draft) and draft[0].get('id') == page_id)
    snapshot = LiveSnapshot.objects.create(
        site=site, page_id=page_id,
        rows=[_row_data(row) for row in (rows.filter(page_id=page_id) if page_id else rows)],
        live_schema=kept_schema, had_live=live is not None,
        live_html=site.live_html if touches_home else '', touches_home=touches_home,
        live_at=site.live_at, published=was_published, private_pages=list(site.private_pages or []),
    )
    keep = list(LiveSnapshot.objects.filter(site=site).order_by('-created_at', '-pk')
                .values_list('pk', flat=True)[:LiveSnapshot.MAX_PER_SITE])
    LiveSnapshot.objects.filter(site=site).exclude(pk__in=keep).delete()
    return snapshot


def record_live_version(site, label):
    """A copy in the history, newest first: the newest of these is what is live."""
    SiteVersion.objects.create(site=site, schema=site.live_schema, html=site.live_html, source='publish', label=label)
    SiteVersion._prune(site)


def send_site_live(site, pages, version, was_published):
    """The whole draft (or `version`) goes live, except the pages kept off it.
    A page that does not say which one it is comes from an older client."""
    schema, html = (version.schema, version.html) if version else (site.schema, site.html)
    snapshot = take_snapshot(site, was_published)
    if any(not row.get('page_id') for row in pages):
        for row, page_id in zip(pages, align_rows(schema, html, pages)):
            row['page_id'] = row.get('page_id') or page_id
    hidden = set(site.private_pages or [])
    kept = [row for row in pages if row['page_id'] not in hidden]
    by_id = {page.get('id'): page for page in _pages(schema)}
    for row in kept:
        page = by_id.get(row['page_id'])
        row['fingerprint'] = page_fingerprint(schema, html, page) if page else ''
    site.published_pages.all().delete()
    PublishedPage.objects.bulk_create([PublishedPage(site=site, **row) for row in kept])
    sent_ids = {row['page_id'] for row in kept}
    named = bool(sent_ids) and '' not in sent_ids
    live_pages = [
        page for page in _pages(schema)
        if (page.get('id') in sent_ids if named else page.get('id') not in hidden)
    ]
    site.live_schema = {**_site_level(schema), 'pages': live_pages}
    site.live_html = html
    site.live_at = timezone.now()
    site.save(update_fields=['live_schema', 'live_html', 'live_at'])
    record_live_version(site, f'Sent live from v{version.pk}' if version else 'Sent live')
    site._live_snapshot_id = snapshot.pk


def send_draft_live_without_pages(site):
    """Public with no live version yet and no pages sent (an older client, a
    settings switch): what is saved is what visitors see."""
    hidden = set(site.private_pages or [])
    site.live_schema = {
        **_site_level(site.schema),
        'pages': [page for page in _pages(site.schema) if page.get('id') not in hidden],
    }
    site.live_html = site.html
    site.live_at = timezone.now()
    site.save(update_fields=['live_schema', 'live_html', 'live_at'])
    record_live_version(site, 'Sent live')


def _page_in_draft(site, page_id):
    return next((page for page in _pages(site.schema) if page.get('id') == page_id), None)


def _set_live_page(site, page_id, replacement):
    current = site.live_schema if isinstance(site.live_schema, dict) else {}
    site.live_schema = {
        **_site_level(site.schema),
        'pages': _merged_pages(_pages(site.schema), _pages(current), page_id, replacement),
    }


def send_page_live(site, data, was_published):
    """One page goes live: its row and its place in the live version. The rest
    of what is live stays as it is. Raises ValidationError when it would not fit."""
    page_id = data['page_id']
    page = _page_in_draft(site, page_id)
    others = site.published_pages.exclude(page_id=page_id)
    row = clean_published_pages([data])[0]
    if others.count() >= MAX_PUBLISHED_PAGES:
        raise serializers.ValidationError(f'Too many pages to publish (max {MAX_PUBLISHED_PAGES}).')
    # In UTF-8 bytes, as every other size limit: the database counts characters.
    used = sum(text_bytes(html) for html in others.values_list('html', flat=True).iterator())
    if used + text_bytes(row['html']) > MAX_PUBLISHED_TOTAL_BYTES:
        raise serializers.ValidationError('The published site is too large (max 250 MB).')
    snapshot = take_snapshot(site, was_published, page_id)
    site.published_pages.filter(page_id=page_id).delete()
    row['path'] = _published_path(row['path'], set(others.values_list('path', flat=True)))
    row['page_id'] = page_id
    row['fingerprint'] = page_fingerprint(site.schema, site.html, page)
    row['position'] = next(index for index, item in enumerate(_pages(site.schema)) if item.get('id') == page_id)
    PublishedPage.objects.create(site=site, **row)
    _set_live_page(site, page_id, page)
    if _pages(site.schema)[0].get('id') == page_id:
        site.live_html = site.html
    site.live_at = timezone.now()
    # Sending a page live is the explicit way back from keeping it off.
    site.private_pages = [item for item in (site.private_pages or []) if item != page_id]
    site.published = True
    site.revision += 1
    site.save(update_fields=['live_schema', 'live_html', 'live_at', 'private_pages', 'published', 'revision', 'updated_at'])
    record_live_version(site, f'Sent live: {page.get("name") or page_id}')
    site._live_snapshot_id = snapshot.pk


def set_page_hidden(site, page_id, hidden):
    """Keep a page off the public site, or stop keeping it off. Hiding also
    takes it off what is live now; showing it again sends nothing."""
    page = _page_in_draft(site, page_id)
    snapshot = take_snapshot(site, site.published, page_id)
    was_live = site.published_pages.filter(page_id=page_id).exists()
    others = [item for item in (site.private_pages or []) if item != page_id]
    site.private_pages = [*others, page_id] if hidden else others
    fields = ['private_pages', 'revision', 'updated_at']
    if hidden and was_live:
        site.published_pages.filter(page_id=page_id).delete()
        _set_live_page(site, page_id, None)
        site.live_at = timezone.now()
        fields += ['live_schema', 'live_at']
    site.revision += 1
    site.save(update_fields=fields)
    if hidden and was_live:
        record_live_version(site, f'Taken off live: {page.get("name") or page_id}')
    site._live_snapshot_id = snapshot.pk


def forget_live_version(site):
    """A site taken offline has no live version: whatever goes live next starts
    from nothing, and an older undo step cannot bring anything back. What went
    live stays in the history."""
    site.published_pages.all().delete()
    LiveSnapshot.objects.filter(site=site).delete()
    site.live_schema = None
    site.live_html = ''
    site.live_at = None
    site.save(update_fields=['live_schema', 'live_html', 'live_at'])


def _restore_rows(site, snapshot):
    scope = site.published_pages.filter(page_id=snapshot.page_id) if snapshot.page_id else site.published_pages.all()
    scope.delete()
    taken = set(site.published_pages.values_list('path', flat=True))
    # Only a whole-site restore can bring back a page that was hidden since.
    hidden = set() if snapshot.page_id else set(site.private_pages or [])
    rows = []
    for data in snapshot.rows:
        if data['page_id'] in hidden:
            continue
        # The address may have been given to another page since.
        path = _published_path(data['path'], taken)
        taken.add(path)
        rows.append(PublishedPage(site=site, **{**data, 'path': path}))
    PublishedPage.objects.bulk_create(rows)


def _restore_live_schema(site, snapshot):
    if snapshot.page_id:
        current = site.live_schema if isinstance(site.live_schema, dict) else {}
        kept = _pages(snapshot.live_schema or {})
        pages = _merged_pages(_pages(site.schema), _pages(current), snapshot.page_id, kept[0] if kept else None)
        if not pages and not snapshot.had_live:
            site.live_schema = None
        else:
            site_level = _site_level(snapshot.live_schema) if snapshot.live_schema else _site_level(current)
            site.live_schema = {**site_level, 'pages': pages}
    elif snapshot.had_live:
        hidden = set(site.private_pages or [])
        site.live_schema = {
            **_site_level(snapshot.live_schema),
            'pages': [page for page in _pages(snapshot.live_schema) if page.get('id') not in hidden],
        }
    else:
        site.live_schema = None


def _private_pages_after_restore(site, snapshot):
    """A change to one page moves only that page's mark, whatever other tabs have
    hidden since. Sending the whole site moves no mark at all."""
    current = list(site.private_pages or [])
    if not snapshot.page_id:
        return current
    others = [item for item in current if item != snapshot.page_id]
    return [*others, snapshot.page_id] if snapshot.page_id in (snapshot.private_pages or []) else others


def restore_snapshot(site, snapshot):
    """Put back what a snapshot holds, leaving a snapshot of what it replaced
    for the opposite direction."""
    reverse = take_snapshot(site, site.published, snapshot.page_id)
    site.private_pages = _private_pages_after_restore(site, snapshot)
    _restore_rows(site, snapshot)
    _restore_live_schema(site, snapshot)
    if snapshot.touches_home:
        site.live_html = snapshot.live_html
    site.live_at = snapshot.live_at
    # A site stays public while something is still live on it.
    site.published = snapshot.published or site.published_pages.exists()
    site.revision += 1
    site.save(update_fields=['live_schema', 'live_html', 'live_at', 'private_pages', 'published', 'revision', 'updated_at'])
    if site.live_schema is not None:
        record_live_version(site, 'Sending live undone')
    snapshot.delete()
    site._live_snapshot_id = reverse.pk


def adopt_live_pages_into_draft(site):
    """"Copy live to draft" with pages that may not all be live: a page that is
    not live keeps its draft, instead of disappearing from it."""
    live = site.live_schema
    draft_pages = _pages(site.schema)
    live_by_id = {page.get('id'): page for page in _pages(live)}
    draft_ids = {page.get('id') for page in draft_pages}
    pages = [live_by_id.get(page.get('id'), page) for page in draft_pages]
    pages += [page for page in _pages(live) if page.get('id') not in draft_ids]
    home = pages[0].get('id') if pages else None
    if home in live_by_id:
        site.html = site.live_html
    site.schema = {**_site_level(live), 'pages': pages}
