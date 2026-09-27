"""Require account-bound proof and a unique claim before custom-domain serving."""
import secrets

from django.db import migrations, models
from django.db.models.functions import Lower


def require_ownership(apps, schema_editor):
    Site = apps.get_model('builder', 'Site')
    rows = list(Site.objects.exclude(custom_domain='').values_list('pk', 'custom_domain'))
    names = {}
    for pk, name in rows:
        normalized = name.strip().lower().rstrip('.')
        if normalized in names:
            raise RuntimeError(
                'Duplicate custom domain %r on sites %s and %s. Resolve the duplicate '
                'claim before retrying this migration; no customer domain was removed.'
                % (normalized, names[normalized], pk)
            )
        names[normalized] = pk
    # The previous IP-only check did not tie a DNS name to an account.
    # Retain saved domains but require their owners to prove the new TXT value.
    for name, pk in names.items():
        Site.objects.filter(pk=pk).update(
            custom_domain=name, domain_status='pending', domain_verified_at=None,
            domain_verification_token=secrets.token_hex(16),
        )


class Migration(migrations.Migration):
    dependencies = [('builder', '0021_one_spelling_per_person')]
    operations = [
        migrations.AddField(
            model_name='site', name='domain_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(require_ownership, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='site',
            constraint=models.UniqueConstraint(
                Lower('custom_domain'), condition=~models.Q(custom_domain=''),
                name='site_custom_domain_ci_unique',
            ),
        ),
    ]
