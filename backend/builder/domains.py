"""Account-bound DNS verification and isolated customer-domain routing."""
import ipaddress
import re
from urllib.parse import urlsplit

import dns.exception
import dns.resolver
from django.conf import settings
from django.http import Http404, HttpResponseNotFound, HttpResponsePermanentRedirect
from django.http.request import split_domain_port
from rest_framework.throttling import UserRateThrottle

_LABEL = re.compile(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z')
_RESERVED_SUFFIXES = ('localhost', 'local', 'internal', 'invalid', 'onion')


def _dns_name(value, *, single_label=False):
    if not isinstance(value, str) or not value or any(c.isspace() or ord(c) < 32 for c in value):
        raise ValueError('Invalid hostname')
    try:
        name = value.removesuffix('.').encode('idna').decode('ascii').lower()
    except UnicodeError as exc:
        raise ValueError('Invalid hostname') from exc
    labels = name.split('.')
    if len(name) > 253 or (not single_label and len(labels) < 2):
        raise ValueError('Invalid hostname')
    if not all(_LABEL.fullmatch(label) for label in labels):
        raise ValueError('Invalid hostname')
    # Numeric addresses are not customer DNS names, including dotted IPv4.
    if labels[-1].isdigit():
        raise ValueError('Invalid hostname')
    return name


def normalize_domain(value):
    """Accept a hostname or its root HTTP(S) URL, without silently losing parts."""
    if not isinstance(value, str):
        raise ValueError('Invalid domain')
    if any(ord(c) < 32 for c in value):
        raise ValueError('Invalid domain')
    raw = value.strip()
    if not raw:
        return ''
    if any(c.isspace() or ord(c) < 32 for c in raw):
        raise ValueError('Invalid domain')
    if '://' in raw:
        parsed = urlsplit(raw)
        if parsed.scheme.lower() not in ('http', 'https') or parsed.path not in ('', '/'):
            raise ValueError('Use a domain without a page path')
        if parsed.query or parsed.fragment or '?' in raw or '#' in raw:
            raise ValueError('Use a domain without a query or fragment')
        raw = parsed.netloc
    # Reject credentials, ports, IPv6, escapes, slashes and malformed URL syntax.
    if any(char in raw for char in '/\\:@?#%'):
        raise ValueError('Use a domain without credentials or a port')
    return _dns_name(raw)


def normalize_host(value):
    """Strict HTTP Host parsing; a valid port does not change the DNS identity."""
    if not isinstance(value, str) or value != value.strip():
        return ''
    raw = value
    if ':' in raw:
        raw, sep, port = raw.rpartition(':')
        if not sep or not port.isascii() or not port.isdigit() or not 1 <= int(port) <= 65535:
            return ''
    try:
        return _dns_name(raw, single_label=True)
    except ValueError:
        return ''


def is_platform_host(name):
    """Names reserved for platform infrastructure must never serve user HTML."""
    try:
        name = _dns_name(name, single_label=True)
    except ValueError:
        return True
    if any(name == suffix or name.endswith('.' + suffix) for suffix in _RESERVED_SUFFIXES):
        return True
    entries = list(getattr(settings, 'ALLOWED_HOSTS', []))
    # Explicit infrastructure roots reserve their entire subtree. Keeping
    # customer HTML below a platform cookie domain can compromise that cookie.
    reserved_roots = list(getattr(settings, 'CUSTOM_DOMAIN_RESERVED_HOSTS', []))
    frontend = urlsplit(getattr(settings, 'FRONTEND_URL', '') or '').hostname
    reserved_roots += [frontend, getattr(settings, 'CUSTOM_DOMAIN_TARGET', '')]
    entries += ['.' + str(root).lstrip('.') for root in reserved_roots if root]
    for entry in entries:
        if not entry or entry == '*':
            continue
        suffix = str(entry).startswith('.')
        try:
            reserved = _dns_name(str(entry).lstrip('.'), single_label=True)
        except ValueError:
            continue
        if name == reserved or (suffix and name.endswith('.' + reserved)):
            return True
    return False


def _target():
    hostname, addresses = '', set()
    raw = (getattr(settings, 'CUSTOM_DOMAIN_TARGET', '') or '').strip()
    if raw:
        try:
            hostname = _dns_name(raw)
        except ValueError:
            pass
    for raw_ip in (getattr(settings, 'CUSTOM_DOMAIN_IP', '') or '').split(','):
        if raw_ip.strip():
            try:
                addresses.add(str(ipaddress.ip_address(raw_ip.strip())))
            except ValueError:
                # Misconfiguration must not produce a misleading partial target.
                return '', set()
    return hostname, addresses


def target_configured():
    hostname, addresses = _target()
    return bool(hostname or addresses)


def _resolve_records(name, kind):
    """Bounded DNS-only lookups, with no HTTP request to untrusted domains."""
    timeout = max(0.2, min(float(getattr(settings, 'CUSTOM_DOMAIN_DNS_TIMEOUT', 2)), 5.0))
    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout
    resolver.lifetime = timeout
    try:
        answers = resolver.resolve(name + '.', kind, lifetime=timeout, search=False)
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return set()
    if kind == 'TXT':
        return {b''.join(record.strings).decode('utf-8', errors='replace') for record in answers}
    if kind == 'CNAME':
        return {str(record.target).lower().rstrip('.') for record in answers}
    return {str(ipaddress.ip_address(record.address)) for record in answers}


def _addresses(name):
    # BOTH families matter: a stale AAAA next to the correct A sends some
    # visitors elsewhere. An error in either lookup must not verify a subset.
    return _resolve_records(name, 'A') | _resolve_records(name, 'AAAA')


def verification_value(site):
    return 'sitebuilder-verification=' + site.domain_verification_token


def check_domain(domain, token):
    """Require an account-bound TXT challenge AND exact routing to this service."""
    if not domain:
        return False, 'no_domain'
    if is_platform_host(domain):
        return False, 'domain_reserved'
    target, explicit = _target()
    if not (target or explicit):
        return False, 'target_unknown'
    try:
        txt = _resolve_records('_sitebuilder.' + domain, 'TXT')
        if not txt:
            return False, 'ownership_missing'
        if 'sitebuilder-verification=' + token not in txt:
            return False, 'ownership_mismatch'
        if target and _resolve_records(domain, 'CNAME') == {target}:
            return True, 'ok'
        expected = explicit or _addresses(target)
        if not expected:
            return False, 'target_unknown'
        found = _addresses(domain)
        if not found:
            return False, 'not_resolving'
        if found <= expected:
            return True, 'ok'
        return False, 'points_elsewhere'
    except (dns.exception.DNSException, OSError, ValueError):
        return False, 'dns_error'


def dns_records(site):
    """Exact FQDNs avoid silently instructing apex owners to configure www."""
    if not site.custom_domain:
        return []
    records = [{
        'type': 'TXT', 'name': '_sitebuilder.' + site.custom_domain,
        'value': verification_value(site), 'purpose': 'ownership',
        'note': 'Required: proves that this domain belongs to this site.',
    }]
    target, addresses = _target()
    if target:
        records.append({
            'type': 'CNAME', 'name': site.custom_domain, 'value': target,
            'purpose': 'routing',
            'note': 'Routing option: use CNAME for a subdomain. For an apex, use A or AAAA.',
        })
    for address in sorted(addresses):
        records.append({
            'type': 'AAAA' if ':' in address else 'A',
            'name': site.custom_domain, 'value': address, 'purpose': 'routing',
            'note': 'Routing option: use instead of CNAME. Remove conflicting address records.',
        })
    return records


def domain_allowed(host):
    """Allow certificate issuance only for a verified, currently public site."""
    from .published import site_for_host
    # ACME authorizations are DNS names, never host:port values or URLs.
    try:
        name = normalize_domain(host)
    except ValueError:
        return False
    if name != (host or '').lower().rstrip('.'):
        return False
    return site_for_host(name) is not None


class DomainVerificationThrottle(UserRateThrottle):
    scope = 'domain_verify'


def _platform_request_host(raw_host):
    """Only exact app hostnames may reach app sessions, even with wildcard hosts."""
    domain, _port = split_domain_port(raw_host.lower())
    if not domain:
        return False
    allowed = list(getattr(settings, 'ALLOWED_HOSTS', []))
    allowed.append(urlsplit(getattr(settings, 'FRONTEND_URL', '') or '').hostname)
    # A suffix in ALLOWED_HOSTS reserves the subtree from customer content,
    # but does not grant app cookies/API access on arbitrary descendants.
    for raw in allowed:
        if not raw or raw == '*':
            continue
        raw = str(raw).lstrip('.').lower().rstrip('.')
        if raw == domain:
            return True
        try:
            if _dns_name(raw, single_label=True) == domain:
                return True
        except ValueError:
            pass
    return False


class CustomDomainMiddleware:
    """Intercept customer hosts before any platform session/API middleware."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from .published import serve_domain_form, serve_for_host, site_for_host
        raw_host = request.META.get('HTTP_HOST', request.META.get('SERVER_NAME', ''))
        name = normalize_host(raw_host)
        site = site_for_host(name) if name else None
        if site is None:
            if not _platform_request_host(raw_host):
                return HttpResponseNotFound('Not found')
            return self.get_response(request)
        # This middleware precedes SecurityMiddleware: preserve production's
        # HTTPS redirect here and use the validated database host, not headers.
        if getattr(settings, 'SECURE_SSL_REDIRECT', False) and not request.is_secure():
            return HttpResponsePermanentRedirect('https://' + site.custom_domain + request.get_full_path())
        if request.method == 'POST' and request.path == '/__sitebuilder/form/':
            return serve_domain_form(site, request)
        if request.method not in ('GET', 'HEAD'):
            return HttpResponseNotFound('Not found')
        try:
            response = serve_for_host(site, request.path, request)
            if request.method == 'HEAD':
                response.content = b''
            return response
        except Http404:
            return HttpResponseNotFound('Not found')
