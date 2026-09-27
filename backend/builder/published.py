"""Serve a published site as real HTML, at a real URL.

Until now a published site WAS the single-page app: the server returned
`frontend/index.html`, whose head says "Sitebuilder" and nothing about the
page, and JavaScript filled the title in afterwards. Link-preview scrapers
(WhatsApp, X, LinkedIn, Discord, Slack) never run JavaScript, so every shared
site previewed as the builder's own name with no description and no image. Sub
pages lived behind `#pageId`, which the server never sees, so they could be
neither linked nor indexed.

These views serve the document the editor rendered at publish time — the same
writer the in-app viewer uses — so what a visitor, a crawler and a scraper get
is the page itself.

`/site/<slug>` stays what it was: the in-app showcase page with favourites,
reports and the creator's name. THIS is the site itself, which is what people
share, so it lives on its own short path and carries no app chrome.

SECURITY: the document is the owner's own HTML and may contain their scripts.
It must never run with this origin's privileges — that would put it next to
the admin session and the visitor's token. The response is sandboxed by CSP,
which gives it an opaque origin: scripts still run (a page's own interactions
work), forms still post, but localStorage, cookies and same-origin requests
belong to nobody. Same contract the public HTML iframe has always had.
"""
from html import escape, unescape
from html.parser import HTMLParser
import re
from urllib.parse import urlsplit, urlunsplit

from django.conf import settings
from django.http import Http404, HttpResponse, HttpResponsePermanentRedirect
from django.urls import reverse
from django.utils.xmlutils import SimplerXMLGenerator
from django.views.decorators.http import require_safe
from io import StringIO

from .access import public_sites
from .visits import record_served_view

# allow-same-origin is deliberately absent and must stay absent.
PUBLISHED_CSP = (
    'sandbox allow-scripts allow-forms allow-popups '
    'allow-popups-to-escape-sandbox allow-modals allow-downloads'
)


def _published_site(slug):
    site = public_sites().filter(slug=slug).first()
    if site is None:
        # Unpublished, suspended owner or taken down: one answer for all of
        # them, so the URL says nothing about why.
        raise Http404('Site not found.')
    return site


def _harden(response, sandbox=True):
    # The sandbox exists because /s/<slug>/ shares THIS origin with the app: it
    # gives the owner's HTML an opaque origin so it cannot reach the admin
    # session or a visitor's token. On the owner's OWN domain there is nothing
    # of ours to protect, and sandboxing there would only break their site —
    # no localStorage, no cookies, no analytics on a page they own outright.
    if sandbox:
        response['Content-Security-Policy'] = PUBLISHED_CSP
    response['X-Content-Type-Options'] = 'nosniff'
    response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # Short: a republish should show up quickly, but a burst of visitors to the
    # same page should not each hit the database.
    response['Cache-Control'] = 'public, max-age=60'
    return response


@require_safe
def serve_published_page(request, slug, path=''):
    """The page itself, exactly as the editor rendered it."""
    site = _published_site(slug)
    wanted = (path or '').strip('/')
    page = site.published_pages.filter(path=wanted).first()
    if page is None:
        raise Http404('Page not found.')
    # The showcase page counts its visits from the browser; a served document
    # has no app JavaScript to do that, so the address people actually share
    # was the one nobody counted.
    record_served_view(site, request, wanted)
    return _harden(HttpResponse(page.html, content_type='text/html; charset=utf-8'))


@require_safe
def published_sitemap(request, slug):
    """Every page of this site that is allowed to be found."""
    site = _published_site(slug)
    pages = site.published_pages.filter(no_index=False)

    out = StringIO()
    xml = SimplerXMLGenerator(out, 'utf-8')
    xml.startDocument()
    xml.startElement('urlset', {'xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9'})
    for page in pages:
        xml.startElement('url', {})
        xml.addQuickElement('loc', request.build_absolute_uri(published_page_path(site.slug, page.path)))
        xml.addQuickElement('lastmod', page.updated_at.date().isoformat())
        xml.endElement('url')
    xml.endElement('urlset')
    xml.endDocument()

    response = HttpResponse(out.getvalue(), content_type='application/xml; charset=utf-8')
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=300'
    return response


def published_page_path(slug, path=''):
    """The public URL path of one page — the single place that shape is decided."""
    if path:
        return reverse('published-page', kwargs={'slug': slug, 'path': path})
    return reverse('published-home', kwargs={'slug': slug})


# --- A site on the owner's own domain --------------------------------------
#
# Everything below answers requests whose Host is a customer's domain. Only
# published pages live there: no API, no admin, no app. That is not tidiness,
# it is the point — our login form on a domain somebody else controls would
# hand them the session of anyone who used it.


def site_for_host(host):
    """Only a verified, public customer's host may run unsandboxed HTML."""
    # Imported lazily: domain verification also uses this public-site gate.
    from .domains import is_platform_host, normalize_host

    name = normalize_host(host)
    if not name or is_platform_host(name):
        return None
    return public_sites().filter(
        custom_domain=name, domain_status='connected',
        domain_verified_at__isnull=False,
    ).first()


DOMAIN_FORM_PATH = '/__sitebuilder/form/'
# Preserve the document instead of round-tripping it through an HTML serializer:
# imported pages can contain scripts, templates and intentionally unusual markup.
_ATTRIBUTE = re.compile(
    r"(?P<name>[^\s=<>/]+)(?P<equals>\s*=\s*)(?P<value>\"[^\"]*\"|'[^']*'|[^\s>]+)",
    re.IGNORECASE,
)
_CSS_URL = re.compile(r"url\(\s*(?P<q>['\"]?)(?P<url>[^)\s'\"]+)(?P=q)\s*\)", re.IGNORECASE)


class _DomainDocument(HTMLParser):
    """Retarget platform-generated URLs while leaving authored scripts intact."""

    def __init__(self, html, site):
        super().__init__(convert_charrefs=False)
        self.html = html
        self.base = f'https://{site.custom_domain}'
        self.shared = f'/s/{site.slug}'
        self.platform = urlsplit(settings.FRONTEND_URL)
        self.media_origin = (
            getattr(settings, 'CUSTOM_DOMAIN_MEDIA_ORIGIN', '') or settings.FRONTEND_URL
        ).rstrip('/')
        self.lines = [0]
        self.lines.extend(match.end() for match in re.finditer('\n', html))
        self.patches = []
        self.in_style = False
        self.head_seen = False
        self.metadata_position = 0
        self.literal_tag = None

    def _source_offset(self):
        row, column = self.getpos()
        return self.lines[row - 1] + column

    def url(self, value, absolute=False):
        try:
            parsed = urlsplit(value)
        except ValueError:
            return value
        # An external link with a coincidentally matching path is still external.
        if parsed.netloc and parsed.netloc.lower() != self.platform.netloc.lower():
            return value
        if parsed.scheme and parsed.scheme.lower() not in ('http', 'https'):
            return value
        path = parsed.path
        if path == self.shared or path.startswith(self.shared + '/'):
            path = '/' + path[len(self.shared):].lstrip('/')
            root = self.base if absolute else ''
            return root + urlunsplit(('', '', path, parsed.query, parsed.fragment))
        media_path = settings.MEDIA_URL
        if not parsed.netloc and not parsed.scheme and media_path.startswith('/') and path.startswith(media_path):
            return self.media_origin + urlunsplit(('', '', path, parsed.query, parsed.fragment))
        return value

    def css(self, value):
        return _CSS_URL.sub(
            lambda match: match.group(0).replace(match['url'], self.url(match['url']), 1),
            value,
        )

    def handle_starttag(self, tag, attrs):
        if self.literal_tag:
            return
        raw = self.get_starttag_text()
        attributes = dict(attrs)
        absolute = (tag == 'link' and 'canonical' in (attributes.get('rel') or '').lower().split()) or (
            tag == 'meta' and (attributes.get('property') or '').lower() == 'og:url'
        )

        def replace_attribute(match):
            name = match['name'].lower()
            token = match['value']
            quoted = token.startswith(('"', "'"))
            value = unescape(token[1:-1] if quoted else token)
            if name in ('href', 'src', 'poster', 'action') or (
                tag == 'meta' and name == 'content' and
                (attributes.get('property') or '').lower() in ('og:url', 'og:image', 'og:video')
            ):
                rewritten = self.url(value, absolute=absolute)
            elif name == 'srcset':
                rewritten = re.sub(r'(?<!\S)/media/[^\s,]+', lambda part: self.url(part[0]), value)
            elif name == 'style':
                rewritten = self.css(value)
            else:
                return match[0]
            if value == rewritten:
                return match[0]
            # Always quote changed values, including originally unquoted ones.
            return match['name'] + match['equals'] + '"' + escape(rewritten, quote=True) + '"'

        if tag == 'html':
            self.metadata_position = self._source_offset() + len(raw)
        elif tag == 'body':
            self.metadata_position = self._source_offset()
        rewritten = _ATTRIBUTE.sub(replace_attribute, raw)
        if tag == 'head' and not self.head_seen:
            self.head_seen = True
            rewritten += f'<meta name="pwb-form-endpoint" content="{DOMAIN_FORM_PATH}">'
        if raw != rewritten:
            self.patches.append((self._source_offset(), self._source_offset() + len(raw), rewritten))
        self.in_style = tag == 'style'
        if tag in ('textarea', 'title', 'xmp', 'noscript'):
            self.literal_tag = tag

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.in_style = False

    def handle_endtag(self, tag):
        if self.literal_tag == tag:
            self.literal_tag = None
        if tag == 'style':
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            rewritten = self.css(data)
            if rewritten != data:
                self.patches.append((self._source_offset(), self._source_offset() + len(data), rewritten))

    def handle_decl(self, decl):
        if decl.lower().startswith('doctype'):
            self.metadata_position = self._source_offset() + len(decl) + 3

    def render(self):
        self.feed(self.html)
        self.close()
        if not self.head_seen:
            self.patches.append((self.metadata_position, self.metadata_position,
                f'<meta name="pwb-form-endpoint" content="{DOMAIN_FORM_PATH}">'))
        pieces, cursor = [], 0
        for start, end, replacement in sorted(self.patches):
            pieces.extend((self.html[cursor:start], replacement))
            cursor = end
        pieces.append(self.html[cursor:])
        return ''.join(pieces)


def serve_for_host(site, path, request=None):
    """One page of that site, addressed as the site's own URL."""
    wanted = (path or '').strip('/')
    if wanted == 'sitemap.xml':
        return _domain_sitemap(site)
    if wanted == 'robots.txt':
        return _domain_robots(site)
    # Old bookmarks/links embedded in previously published documents keep working.
    prefix = f's/{site.slug}'
    if wanted == prefix or wanted.startswith(prefix + '/'):
        target = '/' + wanted[len(prefix):].strip('/')
        if not target.endswith('/'):
            target += '/'
        query = request.META.get('QUERY_STRING', '') if request is not None else ''
        return HttpResponsePermanentRedirect(target + ('?' + query if query else ''))
    page = site.published_pages.filter(path=wanted).first()
    if page is None:
        raise Http404('Page not found.')
    if request is not None:
        record_served_view(site, request, wanted)
    response = _harden(
        HttpResponse(_DomainDocument(page.html, site).render(), content_type='text/html; charset=utf-8'),
        sandbox=False,
    )
    if page.no_index:
        response['X-Robots-Tag'] = 'noindex'
    return response


def serve_domain_form(site, request):
    """One anonymous inbox endpoint, bound to this host's site by middleware."""
    from .views import PublicFormSubmissionView

    # No token/session is consumed on a domain controlled by a customer. The
    # inherited serializer, public-site gate, honeypot and anonymous rate cap
    # stay identical to the existing public inbox endpoint.
    class DomainFormSubmissionView(PublicFormSubmissionView):
        authentication_classes = []
        http_method_names = ['post']

    response = DomainFormSubmissionView.as_view()(request, slug=site.slug)
    response.render()  # This response returns from middleware before Django's view rendering.
    response['Cache-Control'] = 'no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response


def _domain_robots(site):
    body = f'User-agent: *\nAllow: /\nSitemap: https://{site.custom_domain}/sitemap.xml\n'
    response = HttpResponse(body, content_type='text/plain; charset=utf-8')
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=300'
    return response


def _domain_sitemap(site):
    """The same sitemap, written in the addresses the site actually has."""
    base = f'https://{site.custom_domain}'
    out = StringIO()
    xml = SimplerXMLGenerator(out, 'utf-8')
    xml.startDocument()
    xml.startElement('urlset', {'xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9'})
    for page in site.published_pages.filter(no_index=False):
        xml.startElement('url', {})
        xml.addQuickElement('loc', f'{base}/{page.path}/' if page.path else f'{base}/')
        xml.addQuickElement('lastmod', page.updated_at.date().isoformat())
        xml.endElement('url')
    xml.endElement('urlset')
    xml.endDocument()

    response = HttpResponse(out.getvalue(), content_type='application/xml; charset=utf-8')
    response['X-Content-Type-Options'] = 'nosniff'
    response['Cache-Control'] = 'public, max-age=300'
    return response
