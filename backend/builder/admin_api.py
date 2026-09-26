"""The admin console's read side, and the audit trail every admin action writes.

Everything here is computed from records the platform already keeps: accounts,
sites, visits, favourites, uploads, reports. No number is estimated. Where a
figure only exists from some date on (sign-in times, see `_signed_in` in
views.py), the console says "no record" rather than guessing.

The audit trail rides on Django's own `LogEntry` table, which the Django admin
already writes to, so the console shows both in one list and no migration is
needed. Our entries carry a JSON object `{"sitebuilder": <action>, "detail":
<text>}` in `change_message`; the Django admin's entries carry its own JSON list.
"""
import json
import platform
from datetime import timedelta

import django
import rest_framework
from django.conf import settings
from django.contrib.admin.models import ADDITION, CHANGE, DELETION, LogEntry
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.db import connection
from django.db.migrations.recorder import MigrationRecorder
from django.db.models import Count, F, Min, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import runtime_config
from .access import is_public, public_sites
from .api_errors import error_response
from .models import (
    Favorite,
    FormSubmission,
    Profile,
    PublishedPage,
    Report,
    ReviewComment,
    SharedComponent,
    SharedComponentReport,
    Site,
    SiteVersion,
    SiteVisit,
    UploadedImage,
)

RANGES = (7, 30, 90)
DEFAULT_RANGE = 30


# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------

ACTION_LABELS = {
    'user.suspend': 'Suspended the account',
    'user.reinstate': 'Reinstated the account',
    'user.staff_on': 'Made the account an admin',
    'user.staff_off': 'Removed admin rights',
    'user.sessions_revoked': 'Signed the account out everywhere',
    'site.unpublish': 'Took the site down',
    'site.reinstate': 'Lifted the takedown',
    'site.delete': 'Deleted the site',
    'site.pin': 'Pinned the site to the home page',
    'site.unpin': 'Unpinned the site',
    'report.resolve': 'Resolved a report',
    'report.dismiss': 'Dismissed a report',
    'component.remove': 'Took the block down',
    'component.purge': 'Took the block down and removed its copies',
    'component.restore': 'Put the block back',
    'component_report.resolve': 'Resolved a block report',
    'component_report.dismiss': 'Dismissed a block report',
    'settings.update': 'Changed server settings',
}


def log_admin_action(actor, target, action, detail=''):
    """Record one admin action against `target` (any model instance).

    Called before a delete as well as after a change, so a deleted object still
    has a row naming what it was. Never raises into the caller: the action has
    already happened, and failing it over a log row would be worse than a gap.
    """
    try:
        LogEntry.objects.create(
            user_id=actor.pk,
            content_type=ContentType.objects.get_for_model(type(target)),
            object_id=str(target.pk),
            object_repr=str(target)[:200],
            action_flag=DELETION if action.endswith('.delete') else CHANGE,
            change_message=json.dumps({'sitebuilder': action, 'detail': str(detail)[:500]}),
        )
    except Exception:  # noqa: BLE001 - see docstring
        pass


def _entry_json(entry):
    try:
        message = json.loads(entry.change_message or '')
    except ValueError:
        message = None
    if isinstance(message, dict) and 'sitebuilder' in message:
        action = message['sitebuilder']
        label = ACTION_LABELS.get(action, action)
        detail = message.get('detail', '')
        source = 'console'
    else:
        action = {ADDITION: 'django.add', CHANGE: 'django.change', DELETION: 'django.delete'}.get(entry.action_flag, 'django')
        label = {ADDITION: 'Added in Django admin', CHANGE: 'Changed in Django admin', DELETION: 'Deleted in Django admin'}.get(entry.action_flag, 'Django admin')
        detail = entry.get_change_message()
        source = 'django-admin'
    return {
        'id': entry.id,
        'at': entry.action_time,
        'actor': {'id': entry.user_id, 'username': getattr(entry.user, 'username', '')},
        'action': action,
        'label': label,
        'detail': detail,
        'source': source,
        'target': {
            'type': entry.content_type.model if entry.content_type_id else '',
            'id': entry.object_id,
            'repr': entry.object_repr,
        },
    }


def _entries_for(queryset, limit=20):
    return [_entry_json(e) for e in queryset.select_related('user', 'content_type').order_by('-action_time')[:limit]]


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class ConsolePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsSuperUser(IsAdminUser):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


def _range_days(request):
    try:
        days = int(request.query_params.get('days', DEFAULT_RANGE))
    except (TypeError, ValueError):
        days = DEFAULT_RANGE
    return days if days in RANGES else DEFAULT_RANGE


def _since(days):
    today = timezone.localdate()
    return today - timedelta(days=days - 1)


def _daily(queryset, field, days):
    """Counts per day for the last `days` days, every day present (0 when quiet)."""
    start = _since(days)
    rows = (
        queryset.filter(**{f'{field}__date__gte': start})
        .annotate(day=TruncDate(field))
        .values('day')
        .annotate(n=Count('id'))
    )
    counts = {row['day']: row['n'] for row in rows}
    return [
        {'date': (start + timedelta(days=offset)).isoformat(), 'count': counts.get(start + timedelta(days=offset), 0)}
        for offset in range(days)
    ]


def _display_name(user):
    profile = getattr(user, 'profile', None)
    return (profile.display_name if profile and profile.display_name else '') or user.username


def _is_guest(user):
    profile = getattr(user, 'profile', None)
    return bool(profile and profile.is_guest)


def _avatar_url(user, request):
    profile = getattr(user, 'profile', None)
    if not profile or not profile.avatar:
        return ''
    try:
        return request.build_absolute_uri(profile.avatar.url)
    except ValueError:
        return ''


def _user_brief(user):
    return {'id': user.id, 'username': user.username, 'display_name': _display_name(user)}


def _site_kind(site):
    return 'html' if (site.html or '').strip() else 'visual'


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

class AdminOverviewView(APIView):
    """The console's first screen: what happened on the platform in a range
    (7, 30 or 90 days) and what is waiting for an admin."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        days = _range_days(request)
        start = _since(days)
        users = User.objects.all()
        guests = users.filter(profile__is_guest=True)
        sites = Site.objects.all()
        public = public_sites()
        visits = SiteVisit.objects.filter(created_at__date__gte=start)
        uploads = UploadedImage.objects.aggregate(n=Count('id'), size=Sum('size'))

        devices = {row['device']: row['n'] for row in visits.values('device').annotate(n=Count('id'))}
        referrers = [
            {'referrer': row['referrer'] or '', 'count': row['n']}
            for row in visits.values('referrer').annotate(n=Count('id')).order_by('-n')[:8]
        ]
        top_by_visits = (
            sites.filter(visits__created_at__date__gte=start)
            .annotate(n=Count('visits'))
            .select_related('owner')
            .order_by('-n')[:8]
        )
        categories = [
            {'category': row['category'], 'count': row['n']}
            for row in public.values('category').annotate(n=Count('id')).order_by('-n')
        ]
        recent_users = users.select_related('profile').order_by('-date_joined')[:8]
        recent_sites = sites.select_related('owner').order_by('-created_at')[:8]
        new_in_range = users.filter(date_joined__date__gte=start)

        return Response({
            'range_days': days,
            'since': start.isoformat(),
            'accounts': {
                'total': users.count(),
                'registered': users.exclude(profile__is_guest=True).count(),
                'guests': guests.count(),
                'suspended': users.filter(is_active=False).count(),
                'admins': users.filter(Q(is_staff=True) | Q(is_superuser=True)).count(),
                'new_in_range': new_in_range.count(),
                'new_registered_in_range': new_in_range.exclude(profile__is_guest=True).count(),
                'signed_in_in_range': users.filter(last_login__date__gte=start).count(),
                # Sign-in times are only kept from the day that started; before
                # it the console shows "no record", not "never".
                'sign_ins_recorded_since': users.aggregate(first=Min('last_login'))['first'],
            },
            'sites': {
                'total': sites.count(),
                'public': public.count(),
                'drafts': sites.filter(published=False, moderation_blocked=False).count(),
                'taken_down': sites.filter(moderation_blocked=True).count(),
                'pinned': sites.exclude(pinned_at=None).count(),
                'html': sites.exclude(html='').count(),
                'custom_domains': sites.exclude(custom_domain='').count(),
                'created_in_range': sites.filter(created_at__date__gte=start).count(),
            },
            'traffic': {
                'visits_in_range': visits.count(),
                'views_all_time': sites.aggregate(n=Sum('view_count'))['n'] or 0,
                'devices': {key: devices.get(key, 0) for key in ('desktop', 'mobile', 'tablet')},
                'referrers': referrers,
                'top_sites': [
                    {'id': s.id, 'title': s.title, 'slug': s.slug, 'owner': _user_brief(s.owner), 'visits': s.n, 'views_all_time': s.view_count}
                    for s in top_by_visits
                ],
            },
            'engagement': {
                'favorites': Favorite.objects.count(),
                'form_submissions': FormSubmission.objects.count(),
                'form_submissions_unread': FormSubmission.objects.filter(is_read=False).count(),
                'review_comments': ReviewComment.objects.count(),
                'review_comments_open': ReviewComment.objects.filter(resolved=False).count(),
                'versions': SiteVersion.objects.count(),
                'shared_components': SharedComponent.objects.count(),
            },
            'storage': {'uploads': uploads['n'] or 0, 'bytes': uploads['size'] or 0},
            'waiting': {
                'site_reports': Report.objects.filter(status='open').count(),
                'component_reports': SharedComponentReport.objects.filter(status='open').count(),
            },
            'series': {
                'signups': _daily(users, 'date_joined', days),
                'sites_created': _daily(sites, 'created_at', days),
                'visits': _daily(SiteVisit.objects.all(), 'created_at', days),
            },
            'categories': categories,
            'recent_users': [
                {**_user_brief(u), 'date_joined': u.date_joined, 'is_guest': _is_guest(u), 'is_active': u.is_active}
                for u in recent_users
            ],
            'recent_sites': [
                {'id': s.id, 'title': s.title, 'slug': s.slug, 'owner': _user_brief(s.owner), 'created_at': s.created_at, 'public': is_public(s)}
                for s in recent_sites
            ],
            'recent_actions': _entries_for(LogEntry.objects.all(), limit=6),
        })


# ---------------------------------------------------------------------------
# Accounts
# ---------------------------------------------------------------------------

USER_SORTS = {
    'joined': '-date_joined',
    'joined_asc': 'date_joined',
    'last_login': '-last_login',
    'sites': '-n_sites',
    'views': '-n_views',
    'name': 'username',
}


class AdminAccountListView(APIView):
    """Every account, filterable by kind and state, sortable, searchable."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = User.objects.select_related('profile').annotate(
            n_sites=Count('sites', distinct=True),
            n_public=Count('sites', filter=Q(sites__published=True, sites__moderation_blocked=False), distinct=True),
            n_views=Sum('sites__view_count'),
        )
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(profile__display_name__icontains=q))
        state = request.query_params.get('status', 'all')
        if state == 'active':
            qs = qs.filter(is_active=True)
        elif state == 'suspended':
            qs = qs.filter(is_active=False)
        elif state == 'admins':
            qs = qs.filter(Q(is_staff=True) | Q(is_superuser=True))
        elif state == 'guests':
            qs = qs.filter(profile__is_guest=True)
        elif state == 'registered':
            qs = qs.exclude(profile__is_guest=True)
        order = USER_SORTS.get(request.query_params.get('sort', 'joined'), '-date_joined')
        if order in ('-last_login', '-n_views'):
            # Accounts with nothing recorded go last, not first.
            qs = qs.order_by(F(order[1:]).desc(nulls_last=True), '-date_joined')
        else:
            qs = qs.order_by(order, '-date_joined')

        paginator = ConsolePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([
            {
                **_user_brief(u),
                'email': u.email,
                'avatar_url': _avatar_url(u, request),
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'is_superuser': u.is_superuser,
                'is_guest': _is_guest(u),
                'date_joined': u.date_joined,
                'last_login': u.last_login,
                'sites': u.n_sites,
                'public_sites': u.n_public,
                'views': u.n_views or 0,
            }
            for u in page
        ])


class AdminAccountDetailView(APIView):
    """One account in full: profile, standing, everything it owns and has done."""

    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        try:
            user = User.objects.select_related('profile').get(pk=user_id)
        except User.DoesNotExist:
            return error_response('user_not_found', 'User not found.', status.HTTP_404_NOT_FOUND)
        since = _since(30)
        sites = (
            Site.objects.filter(owner=user)
            .annotate(
                n_favorites=Count('favorited_by', distinct=True),
                n_open_reports=Count('reports', filter=Q(reports__status='open'), distinct=True),
                n_visits=Count('visits', filter=Q(visits__created_at__date__gte=since), distinct=True),
            )
            .order_by('-updated_at')
        )
        profile = getattr(user, 'profile', None) or Profile(user=user)
        uploads = UploadedImage.objects.filter(owner=user).aggregate(n=Count('id'), size=Sum('size'))
        site_ids = list(sites.values_list('id', flat=True))
        site_type = ContentType.objects.get_for_model(Site)
        user_type = ContentType.objects.get_for_model(User)
        history = LogEntry.objects.filter(
            Q(content_type=user_type, object_id=str(user.id))
            | Q(content_type=site_type, object_id__in=[str(i) for i in site_ids]),
        )
        return Response({
            **_user_brief(user),
            'email': user.email,
            'avatar_url': _avatar_url(user, request),
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'is_guest': bool(profile.is_guest),
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'signed_in': Token.objects.filter(user=user).exists(),
            'profile': {
                'headline': profile.headline,
                'bio': profile.bio,
                'location': profile.location,
                'website': profile.website,
                'github': profile.github,
                'twitter': profile.twitter,
                'instagram': profile.instagram,
            },
            'counts': {
                'sites': len(site_ids),
                'public_sites': sum(1 for s in sites if is_public(s)),
                'views': sum(s.view_count for s in sites),
                'favorites_given': Favorite.objects.filter(user=user).count(),
                'favorites_received': Favorite.objects.filter(site__owner=user).count(),
                'uploads': uploads['n'] or 0,
                'upload_bytes': uploads['size'] or 0,
                'form_submissions': FormSubmission.objects.filter(site__owner=user).count(),
                'review_comments': ReviewComment.objects.filter(site__owner=user).count(),
                'shared_components': SharedComponent.objects.filter(author=user).count(),
                'reports_filed': Report.objects.filter(reporter=user).count(),
                'reports_against': Report.objects.filter(site__owner=user).count(),
            },
            'sites': [
                {
                    'id': s.id, 'title': s.title, 'slug': s.slug, 'kind': _site_kind(s),
                    'public': is_public(s), 'published': s.published,
                    'moderation_blocked': s.moderation_blocked, 'pinned': s.pinned_at is not None,
                    'category': s.category, 'view_count': s.view_count, 'visits_30d': s.n_visits,
                    'favorites': s.n_favorites, 'open_reports': s.n_open_reports,
                    'created_at': s.created_at, 'updated_at': s.updated_at,
                }
                for s in sites
            ],
            'history': _entries_for(history),
        })


class AdminAccountRoleView(APIView):
    """Grant or remove admin (staff) rights. Superuser-only; never on yourself,
    never on another superuser (their rights are not the console's to change)."""

    permission_classes = [IsSuperUser]

    def post(self, request, user_id):
        staff = request.data.get('staff')
        if not isinstance(staff, bool):
            return error_response('invalid_role', 'staff must be true or false.')
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return error_response('user_not_found', 'User not found.', status.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return error_response('self_role_forbidden', "You can't change your own admin rights.")
        if target.is_superuser:
            return error_response('superuser_role_forbidden', "A superuser's rights can't be changed here.")
        if _is_guest(target):
            return error_response('guest_role_forbidden', 'A guest account cannot be made an admin.')
        target.is_staff = staff
        target.save(update_fields=['is_staff'])
        log_admin_action(request.user, target, 'user.staff_on' if staff else 'user.staff_off')
        return Response({'detail': 'Role updated.', 'is_staff': target.is_staff})


class AdminAccountSessionsView(APIView):
    """Sign an account out of every device by revoking its API token. The
    account stays usable; the next sign-in issues a fresh token."""

    permission_classes = [IsAdminUser]

    def post(self, request, user_id):
        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return error_response('user_not_found', 'User not found.', status.HTTP_404_NOT_FOUND)
        if (target.is_staff or target.is_superuser) and not request.user.is_superuser and target.id != request.user.id:
            return error_response('admin_sessions_forbidden', "Only a superuser can sign another admin out.")
        if _is_guest(target):
            # A guest has no password: revoking its token would lock its owner
            # out of the work for good.
            return error_response('guest_sessions_forbidden', 'A guest account cannot be signed out; it has no way back in.')
        revoked, _ = Token.objects.filter(user=target).delete()
        log_admin_action(request.user, target, 'user.sessions_revoked')
        return Response({'detail': 'Signed out everywhere.', 'revoked': bool(revoked)})


# ---------------------------------------------------------------------------
# Sites
# ---------------------------------------------------------------------------

SITE_SORTS = {
    'updated': '-updated_at',
    'created': '-created_at',
    'views': '-view_count',
    'visits': '-n_visits',
    'favorites': '-n_favorites',
    'title': 'title',
}


class AdminSiteListView(APIView):
    """Every site on the platform, whoever owns it."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        since = _since(30)
        qs = Site.objects.select_related('owner', 'owner__profile').annotate(
            n_visits=Count('visits', filter=Q(visits__created_at__date__gte=since), distinct=True),
            n_favorites=Count('favorited_by', distinct=True),
            n_open_reports=Count('reports', filter=Q(reports__status='open'), distinct=True),
        )
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(slug__icontains=q) | Q(owner__username__icontains=q) | Q(custom_domain__icontains=q))
        state = request.query_params.get('status', 'all')
        if state == 'public':
            qs = qs.filter(pk__in=public_sites().values('pk'))
        elif state == 'drafts':
            qs = qs.filter(published=False, moderation_blocked=False)
        elif state == 'taken_down':
            qs = qs.filter(moderation_blocked=True)
        elif state == 'pinned':
            qs = qs.exclude(pinned_at=None)
        elif state == 'reported':
            qs = qs.filter(reports__status='open').distinct()
        elif state == 'domains':
            qs = qs.exclude(custom_domain='')
        category = request.query_params.get('category', '')
        if category:
            qs = qs.filter(category=category)
        kind = request.query_params.get('kind', '')
        if kind == 'html':
            qs = qs.exclude(html='')
        elif kind == 'visual':
            qs = qs.filter(html='')
        qs = qs.order_by(SITE_SORTS.get(request.query_params.get('sort', 'updated'), '-updated_at'), '-id')

        paginator = ConsolePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([
            {
                'id': s.id, 'title': s.title, 'slug': s.slug, 'kind': _site_kind(s),
                'owner': _user_brief(s.owner),
                'category': s.category,
                'public': is_public(s), 'published': s.published,
                'moderation_blocked': s.moderation_blocked, 'pinned': s.pinned_at is not None,
                'view_count': s.view_count, 'visits_30d': s.n_visits,
                'favorites': s.n_favorites, 'open_reports': s.n_open_reports,
                'custom_domain': s.custom_domain,
                'created_at': s.created_at, 'updated_at': s.updated_at, 'last_published_at': s.last_published_at,
            }
            for s in page
        ])


class AdminSiteDetailView(APIView):
    """One site in full: standing, traffic, what visitors and reviewers left."""

    permission_classes = [IsAdminUser]

    def get(self, request, site_id):
        try:
            site = Site.objects.select_related('owner', 'owner__profile').get(pk=site_id)
        except Site.DoesNotExist:
            return error_response('site_not_found', 'Site not found.', status.HTTP_404_NOT_FOUND)
        since = _since(30)
        visits = SiteVisit.objects.filter(site=site, created_at__date__gte=since)
        devices = {row['device']: row['n'] for row in visits.values('device').annotate(n=Count('id'))}
        schema_pages = (site.schema or {}).get('pages') if isinstance(site.schema, dict) else None
        reports = site.reports.select_related('reporter').order_by('-created_at')[:10]
        history = LogEntry.objects.filter(content_type=ContentType.objects.get_for_model(Site), object_id=str(site.id))
        return Response({
            'id': site.id, 'title': site.title, 'slug': site.slug, 'kind': _site_kind(site),
            'owner': {**_user_brief(site.owner), 'is_active': site.owner.is_active},
            'category': site.category, 'tags': site.tags,
            'public': is_public(site), 'published': site.published,
            'moderation_blocked': site.moderation_blocked, 'moderated_at': site.moderated_at,
            'pinned': site.pinned_at is not None, 'pinned_at': site.pinned_at,
            'share_mode': site.share_mode,
            'custom_domain': site.custom_domain, 'domain_status': site.domain_status,
            'created_at': site.created_at, 'updated_at': site.updated_at, 'last_published_at': site.last_published_at,
            'counts': {
                'pages': len(schema_pages) if isinstance(schema_pages, list) else PublishedPage.objects.filter(site=site).count(),
                'published_pages': PublishedPage.objects.filter(site=site).count(),
                'versions': SiteVersion.objects.filter(site=site).count(),
                'favorites': site.favorited_by.count(),
                'view_count': site.view_count,
                'visits_30d': visits.count(),
                'form_submissions': FormSubmission.objects.filter(site=site).count(),
                'form_submissions_unread': FormSubmission.objects.filter(site=site, is_read=False).count(),
                'review_comments': ReviewComment.objects.filter(site=site).count(),
                'review_comments_open': ReviewComment.objects.filter(site=site, resolved=False).count(),
            },
            'traffic': {
                'series': _daily(SiteVisit.objects.filter(site=site), 'created_at', 30),
                'devices': {key: devices.get(key, 0) for key in ('desktop', 'mobile', 'tablet')},
                'referrers': [
                    {'referrer': row['referrer'] or '', 'count': row['n']}
                    for row in visits.values('referrer').annotate(n=Count('id')).order_by('-n')[:6]
                ],
                'paths': [
                    {'path': row['path'] or '/', 'count': row['n']}
                    for row in visits.values('path').annotate(n=Count('id')).order_by('-n')[:6]
                ],
            },
            'reports': [
                {
                    'id': r.id, 'reason': r.reason, 'reason_label': r.get_reason_display(), 'detail': r.detail, 'status': r.status,
                    'created_at': r.created_at, 'reporter': r.reporter.username if r.reporter else '',
                }
                for r in reports
            ],
            'history': _entries_for(history),
        })


# ---------------------------------------------------------------------------
# Community blocks
# ---------------------------------------------------------------------------

class AdminComponentListView(APIView):
    """Every shared block, including drafts and ones taken down."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = SharedComponent.objects.select_related('author').annotate(
            n_open_reports=Count('reports', filter=Q(reports__status='open'), distinct=True),
        )
        q = request.query_params.get('q', '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(author__username__icontains=q))
        state = request.query_params.get('status', 'all')
        if state in {choice for choice, _ in SharedComponent.STATUS_CHOICES}:
            qs = qs.filter(status=state)
        elif state == 'reported':
            qs = qs.filter(reports__status='open').distinct()
        qs = qs.order_by('-created_at')
        paginator = ConsolePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([
            {
                'id': c.id, 'title': c.title, 'category': c.category,
                'author': _user_brief(c.author) if c.author_id else None,
                'status': c.status, 'visibility': c.visibility,
                'use_count': c.use_count, 'view_count': c.view_count,
                'open_reports': c.n_open_reports, 'created_at': c.created_at,
            }
            for c in page
        ])


# ---------------------------------------------------------------------------
# Audit trail and system
# ---------------------------------------------------------------------------

class AdminAuditView(APIView):
    """What admins did, newest first: this console and the Django admin."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = LogEntry.objects.select_related('user', 'content_type').order_by('-action_time')
        actor = request.query_params.get('actor', '').strip()
        if actor:
            qs = qs.filter(user__username__icontains=actor)
        target = request.query_params.get('target', '')
        if target in ('user', 'site', 'sharedcomponent', 'report', 'sharedcomponentreport', 'sitesettings'):
            qs = qs.filter(content_type__model=target)
        paginator = ConsolePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([_entry_json(e) for e in page])


def _check(fn):
    try:
        return bool(fn())
    except Exception:  # noqa: BLE001 - a health check reports, it doesn't raise
        return False


def _database_ok():
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
        return cursor.fetchone()[0] == 1


def _cache_ok():
    key = 'sitebuilder:admin:health'
    cache.set(key, 'ok', 10)
    return cache.get(key) == 'ok'


class AdminSystemView(APIView):
    """How the server is doing and how it is configured. Names features that
    are on or off; never returns a secret or a key."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        latest = (
            MigrationRecorder.Migration.objects.filter(app='builder').order_by('-applied').values('name', 'applied').first()
        )
        cache_backend = settings.CACHES.get('default', {}).get('BACKEND', '')
        return Response({
            'server_time': timezone.now(),
            'timezone': settings.TIME_ZONE,
            'debug': settings.DEBUG,
            'versions': {
                'python': platform.python_version(),
                'django': django.get_version(),
                'rest_framework': rest_framework.VERSION,
            },
            'database': {'engine': connection.vendor, 'ok': _check(_database_ok)},
            'cache': {'backend': cache_backend.rsplit('.', 1)[-1], 'shared': 'redis' in cache_backend.lower(), 'ok': _check(_cache_ok)},
            'features': {
                'email': bool(runtime_config.email_host()),
                'google_sign_in': bool(runtime_config.google_client_id()),
                'recaptcha': bool(runtime_config.recaptcha_site_key() and runtime_config.recaptcha_secret_key()),
            },
            'frontend_url': runtime_config.frontend_url(),
            'latest_migration': latest,
            'records': {
                'users': User.objects.count(),
                'sites': Site.objects.count(),
                'published_pages': PublishedPage.objects.count(),
                'versions': SiteVersion.objects.count(),
                'visits': SiteVisit.objects.count(),
                'favorites': Favorite.objects.count(),
                'uploads': UploadedImage.objects.count(),
                'form_submissions': FormSubmission.objects.count(),
                'review_comments': ReviewComment.objects.count(),
                'shared_components': SharedComponent.objects.count(),
                'site_reports': Report.objects.count(),
                'component_reports': SharedComponentReport.objects.count(),
                'audit_entries': LogEntry.objects.count(),
            },
            'storage': UploadedImage.objects.aggregate(uploads=Count('id'), bytes=Sum('size')),
        })
