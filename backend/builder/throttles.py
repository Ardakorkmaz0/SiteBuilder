"""Limits on creating identities must survive switching between those identities."""
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
