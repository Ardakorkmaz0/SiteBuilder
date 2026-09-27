"""What a shared link shows: the site's own image, title, description and icon.

The Control centre stores the site-wide search and sharing details in
site_options['seo']. They used to stop there: nothing wrote them into the
published document, so a link shared on WhatsApp or X showed no image however
many times one was set. The served document now gets whichever of them it does
not already carry. The page's own tags win: an author's <meta og:image>, or a
page's own sharing image, is more specific than the site-wide default.

Added when the page is served rather than when it is published, so changing
the image in the Control centre reaches the live site at once, without a
republish. site_options is stored as the client sent it, so every value is
checked here before it goes near a document.
"""
import re
from html.parser import HTMLParser

from django.utils.html import escape

# A scraper needs a real address; data: URLs and relative paths are useless to
# it, and anything with quotes, spaces or angle brackets is not a URL at all.
_URL = re.compile(r'https?://[^\s"\'<>`]+\Z', re.IGNORECASE)
_PATH = re.compile(r'/(?!/)[^\s"\'<>`]*\Z')
_MAX_URL = 2000
_MAX_TEXT = 300
# Only the head matters, and it ends at the first </head> or <body>. Scanning
# no further keeps a long page cheap to serve.
_HEAD_END = re.compile(r'</head\s*>|<body[\s>]', re.IGNORECASE)


def _text(value, limit=_MAX_TEXT):
    if not isinstance(value, str):
        return ''
    return ' '.join(value.split())[:limit]


def public_url(value, base=''):
    """An absolute http(s) URL, or a site path made absolute against `base`.

    With no base a path is returned as it is, for use inside the app itself.
    """
    if not isinstance(value, str):
        return ''
    value = value.strip()
    if not value or len(value) > _MAX_URL:
        return ''
    if _URL.match(value):
        return value
    if _PATH.match(value):
        return (base.rstrip('/') + value) if base else value
    return ''


def site_seo(site):
    options = site.site_options if isinstance(site.site_options, dict) else {}
    seo = options.get('seo')
    return seo if isinstance(seo, dict) else {}


def share_image(site, base=''):
    """The image a card or a link preview should show for this site, if any.

    The site-wide image first; otherwise the home page's own sharing image.
    """
    image = public_url(site_seo(site).get('socialImage'), base)
    if image:
        return image
    schema = site.schema if isinstance(site.schema, dict) else {}
    pages = schema.get('pages') if isinstance(schema.get('pages'), list) else []
    home = pages[0] if pages and isinstance(pages[0], dict) else {}
    return public_url(home.get('seoImage'), base)


class _HeadScan(HTMLParser):
    """Which head tags a document already has, and where its head ends."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.keys = set()
        self.rels = set()
        self.head_close = None
        self.head_open_end = None
        self.html_open_end = None
        self.decl_end = None

    def _offset(self):
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def scan(self, html):
        self.line_starts = [0] + [match.end() for match in re.finditer('\n', html)]
        self.feed(html)
        self.close()
        return self

    def handle_decl(self, decl):
        if self.decl_end is None:
            self.decl_end = self._offset() + len(decl) + 3

    def handle_starttag(self, tag, attrs):
        values = {name.lower(): (value or '') for name, value in attrs}
        if tag == 'meta':
            for name in ('property', 'name'):
                if values.get(name):
                    self.keys.add(values[name].strip().lower())
        elif tag == 'link':
            self.rels.update(values.get('rel', '').lower().split())
        elif tag == 'head' and self.head_open_end is None:
            self.head_open_end = self._offset() + len(self.get_starttag_text() or '')
        elif tag == 'html' and self.html_open_end is None:
            self.html_open_end = self._offset() + len(self.get_starttag_text() or '')

    def handle_endtag(self, tag):
        if tag == 'head' and self.head_close is None:
            self.head_close = self._offset()


def _missing_tags(scan, seo, image):
    tags = []

    def meta(kind, key, value):
        if value and key not in scan.keys:
            tags.append(f'<meta {kind}="{key}" content="{escape(value)}">')

    title = _text(seo.get('title'), 120)
    description = _text(seo.get('description'))
    meta('property', 'og:title', title)
    meta('name', 'twitter:title', title)
    meta('name', 'description', description)
    meta('property', 'og:description', description)
    meta('name', 'twitter:description', description)
    meta('property', 'og:image', image)
    if tags and 'twitter:card' not in scan.keys:
        card = 'summary_large_image' if image or 'og:image' in scan.keys else 'summary'
        tags.append(f'<meta name="twitter:card" content="{card}">')
    if tags and 'og:type' not in scan.keys:
        tags.append('<meta property="og:type" content="website">')
    return tags


def with_site_meta(html, site, base):
    """The document with the site-wide sharing details it does not already have."""
    if not isinstance(html, str) or not html:
        return html
    seo = site_seo(site)
    image = public_url(seo.get('socialImage'), base)
    icon = public_url(seo.get('favicon'), base)
    if not (image or icon or _text(seo.get('title')) or _text(seo.get('description'))):
        return html

    end = _HEAD_END.search(html)
    head = html[:end.end()] if end else html
    try:
        scan = _HeadScan().scan(head)
    except Exception:  # A document the parser chokes on is served untouched.
        return html

    tags = _missing_tags(scan, seo, image)
    if icon:
        if 'icon' not in scan.rels:
            tags.append(f'<link rel="icon" href="{escape(icon)}">')
        if 'apple-touch-icon' not in scan.rels:
            tags.append(f'<link rel="apple-touch-icon" href="{escape(icon)}">')
    if not tags:
        return html

    # Inside the head when there is one; never before the doctype, which would
    # drop the page into quirks mode.
    for position in (scan.head_close, scan.head_open_end, scan.html_open_end, scan.decl_end):
        if position is not None:
            break
    else:
        position = 0
    return html[:position] + ''.join(tags) + html[position:]
