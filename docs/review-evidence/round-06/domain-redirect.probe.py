import html
import re
import pytest
from django.contrib.auth.models import User
from django.test import Client
from django.utils import timezone
from builder.models import PublishedPage, Site

@pytest.mark.django_db
def test_block_embedded_shared_path_redirects_to_domain_root_without_mutating_publication(settings):
    settings.FRONTEND_URL = 'https://app.builder.example'
    settings.ALLOWED_HOSTS = ['testserver', 'app.builder.example']
    settings.CUSTOM_DOMAIN_TARGET = 'sites.example.com'
    owner = User.objects.create_user('round6-domain-review')
    site = Site.objects.create(owner=owner, title='Round6', slug='round6-domain', published=True, custom_domain='portfolio.example', domain_status='connected', domain_verified_at=timezone.now())
    block = '<a href="/s/round6-domain/about/?pwb-theme=dark&amp;from=block#details">About</a>'
    source = '<iframe data-builder-html-block srcdoc="' + html.escape(block, quote=True) + '"></iframe>'
    home = PublishedPage.objects.create(site=site, path='', title='Home', html=source)
    PublishedPage.objects.create(site=site, path='about', title='About', html='<h1>About</h1>')
    client = Client()
    response = client.get('/', HTTP_HOST='portfolio.example')
    assert response.status_code == 200
    outer = re.search(r'srcdoc="([^"]*)"', response.content.decode()).group(1)
    nested = html.unescape(outer)
    href = html.unescape(re.search(r'href="([^"]*)"', nested).group(1))
    assert href == '/s/round6-domain/about/?pwb-theme=dark&from=block#details'
    redirect = client.get(href.split('#', 1)[0], HTTP_HOST='portfolio.example')
    assert redirect.status_code == 301
    assert redirect['Location'] == '/about/?pwb-theme=dark&from=block'
    target = client.get(redirect['Location'], HTTP_HOST='portfolio.example')
    assert target.status_code == 200
    assert b'<h1>About</h1>' in target.content
    root = client.get('/s/round6-domain/?from=home', HTTP_HOST='portfolio.example')
    assert root.status_code == 301
    assert root['Location'] == '/?from=home'
    assert client.get('/s/another-site/about/', HTTP_HOST='portfolio.example').status_code == 404
    home.refresh_from_db()
    assert home.html == source
