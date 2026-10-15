"""One person, one spelling.

Two rules that only look cosmetic.

**Usernames are lowercase.** Django compares them byte for byte, so `Ada` and
`ada` were two accounts that read as one. That is an impersonation kit on a
platform where the username is how you grant someone access to a site — the
owner types a name into the share list and has no way to see which of the two
they picked. Names are folded on the way in, and the login form folds what it
is given too, so somebody who has always typed their name with a capital keeps
getting in.

**One address, one account.** The serializers already refused a second
registration with a taken email, but that check is a read followed by a write:
two requests arriving together both pass it, and Django's own admin never asks.
The database enforces it now — case-insensitively, and only for addresses that
exist, because guests deliberately have none.
"""
from django.contrib.auth.models import User
from rest_framework.exceptions import ErrorDetail, ValidationError


def normalise_username(value):
    """The one spelling of a name. Empty in, empty out — the callers validate."""
    return (value or '').strip().lower()


def normalise_email(value):
    """Addresses are matched and stored casefolded; the local part is
    case-sensitive in the RFC and in nobody's mail server."""
    return (value or '').strip().lower()


def refuse_identity_conflicts(username, email, *, exclude_user_id=None):
    """Translate a database uniqueness race into the usual field errors.

    Call after the failed write's atomic block has rolled back, so the same
    connection can query the winning row safely.
    """
    users = User.objects.all()
    if exclude_user_id is not None:
        users = users.exclude(pk=exclude_user_id)
    errors = {}
    if users.filter(username__iexact=username).exists():
        errors['username'] = [ErrorDetail('This username is already taken.', code='unique')]
    if email and users.filter(email__iexact=email).exists():
        errors['email'] = [ErrorDetail('An account with this email already exists.', code='unique')]
    if errors:
        raise ValidationError(errors)
