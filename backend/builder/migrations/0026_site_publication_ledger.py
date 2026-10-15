"""Keep daily publication slots after site deletion; backfill surviving history."""
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def backfill_publications(apps, schema_editor):
    Site = apps.get_model('builder', 'Site')
    SitePublication = apps.get_model('builder', 'SitePublication')
    alias = schema_editor.connection.alias
    pending = []
    history = Site.objects.using(alias).exclude(last_published_at=None).values_list(
        'pk', 'owner_id', 'last_published_at',
    )
    for site_pk, owner_id, stamp in history.iterator(chunk_size=500):
        day = django.utils.timezone.localdate(stamp) if django.utils.timezone.is_aware(stamp) else stamp.date()
        pending.append(SitePublication(owner_id=owner_id, site_pk=site_pk, published_on=day))
        if len(pending) == 500:
            SitePublication.objects.using(alias).bulk_create(pending, batch_size=500, ignore_conflicts=True)
            pending.clear()
    if pending:
        SitePublication.objects.using(alias).bulk_create(pending, batch_size=500, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ('builder', '0025_ai_assistant_settings'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SitePublication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('site_pk', models.PositiveBigIntegerField()),
                ('published_on', models.DateField(default=django.utils.timezone.localdate)),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='site_publications', to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'indexes': [models.Index(fields=['owner', 'published_on'], name='site_publication_owner_day')],
                'constraints': [models.UniqueConstraint(
                    fields=('owner', 'site_pk', 'published_on'), name='site_publication_daily_unique',
                )],
            },
        ),
        migrations.RunPython(backfill_publications, migrations.RunPython.noop),
    ]
