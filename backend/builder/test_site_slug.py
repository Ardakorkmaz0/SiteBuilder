"""A site's address spells its title out, Turkish letters included."""
import pytest
from django.contrib.auth.models import User

from .models import Site


@pytest.mark.django_db
@pytest.mark.parametrize(('title', 'slug'), [
    ('ZZ Yayın Testi', 'zz-yayin-testi'),
    ('Kadıköy Kafe', 'kadikoy-kafe'),
    ('Çiğdem Şimşek Ağaç Işık', 'cigdem-simsek-agac-isik'),
    ('Straße', 'strasse'),
    ('Наши работы', 'site'),
])
def test_a_new_site_gets_its_title_spelled_out(title, slug):
    owner = User.objects.create_user('owner', password='x')
    assert Site.objects.create(owner=owner, title=title).slug == slug


@pytest.mark.django_db
def test_an_existing_address_does_not_change_with_the_title():
    owner = User.objects.create_user('owner', password='x')
    site = Site.objects.create(owner=owner, title='Kafe')
    site.title = 'Kadıköy Kafe'
    site.save()
    assert site.slug == 'kafe'
