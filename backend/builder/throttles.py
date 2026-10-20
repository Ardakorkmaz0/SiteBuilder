"""Limits tied to a verified IP must survive switching caller identities."""
from rest_framework.throttling import ScopedRateThrottle


class ScopedIPRateThrottle(ScopedRateThrottle):
    """Keep credential and guest-creation budgets on the verified client IP.

    ScopedRateThrottle uses an authenticated user's id instead of their IP.
    A caller could therefore mint a guest, send its token on the next request,
    and repeat with a fresh budget forever. Forwarded-header handling remains
    DRF's configured NUM_PROXIES policy through get_ident().
    """

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class PublicFormRateThrottle(ScopedIPRateThrottle):
    """One visitor's inbox budget, shared by API, published and customer URLs."""

    def get_cache_key(self, request, view):
        if request.method != 'POST':
            return None
        # The database identity survives a renamed slug, a different URL or a
        # customer's host. Authentication never grants another visitor budget.
        from .models import Site

        site_id = Site.objects.filter(slug=view.kwargs.get('slug')).values_list('pk', flat=True).first()
        if site_id is None:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': f'{site_id}:{self.get_ident(request)}',
        }
