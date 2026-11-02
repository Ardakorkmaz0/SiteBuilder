from django.db import migrations


def offline_sites_forget_their_live_version(apps, schema_editor):
    """Sites taken offline used to keep their live copy, and a moderator's take
    down kept the served pages too. Sending one page live merged into that copy,
    and an old undo step could put them back. The history keeps what went live."""
    Site = apps.get_model('builder', 'Site')
    LiveSnapshot = apps.get_model('builder', 'LiveSnapshot')
    PublishedPage = apps.get_model('builder', 'PublishedPage')
    offline = Site.objects.filter(published=False)
    PublishedPage.objects.filter(site__in=offline).delete()
    LiveSnapshot.objects.filter(site__in=offline).delete()
    offline.update(live_schema=None, live_html='', live_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('builder', '0029_per_page_live'),
    ]

    operations = [
        migrations.RunPython(offline_sites_forget_their_live_version, migrations.RunPython.noop),
    ]
