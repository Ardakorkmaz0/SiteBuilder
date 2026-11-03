from email.message import Message
from http.cookiejar import CookieJar
from types import SimpleNamespace
from urllib.request import Request
from pathlib import Path
import json
import pytest
from django.test import Client
from rest_framework.test import APIClient
from builder.models import Site, PublishedPage
from builder.test_published_pages import owner, site
from builder.test_domain_serving import connected

TWO='<html><head><script data-pwb-color-mode>x()</script></head><body>Hi</body></html>'

@pytest.fixture
def palette_page(site):
    return PublishedPage.objects.create(site=site,path='',title='A',html=TWO)

def absorb(jar,response,url):
    msg=Message()
    for cookie in response.cookies.values():
        msg.add_header('Set-Cookie',cookie.OutputString())
    jar.extract_cookies(SimpleNamespace(info=lambda:msg),Request(url))

def cookies(jar,url):
    req=Request(url)
    jar.add_cookie_header(req)
    return req.get_header('Cookie') or ''

def get_with_jar(jar,path):
    return APIClient().get(path,HTTP_COOKIE=cookies(jar,'http://testserver'+path))

def test_browser_cookie_paths_isolate_sites_and_visitors(site,palette_page):
    other=Site.objects.create(owner=site.owner,title='Other',published=True)
    PublishedPage.objects.create(site=other,path='',title='B',html=TWO)
    jar=CookieJar()
    a=f'/s/{site.slug}/'
    b=f'/s/{other.slug}/'
    first=get_with_jar(jar,a+'?pwb-theme=dark')
    absorb(jar,first,'http://testserver'+a+'?pwb-theme=dark')
    assert cookies(jar,'http://testserver'+a)=='pwb-theme=dark'
    assert cookies(jar,'http://testserver'+b)==''
    assert b'data-pwb-chosen="dark"' in get_with_jar(jar,a).content
    assert b'data-pwb-chosen' not in get_with_jar(jar,b).content
    second=get_with_jar(jar,b+'?pwb-theme=light')
    absorb(jar,second,'http://testserver'+b+'?pwb-theme=light')
    assert cookies(jar,'http://testserver'+a)=='pwb-theme=dark'
    assert cookies(jar,'http://testserver'+b)=='pwb-theme=light'
    assert b'data-pwb-chosen="light"' in get_with_jar(jar,b).content
    assert b'data-pwb-chosen' not in get_with_jar(CookieJar(),a).content
    assert cookies(jar,'http://testserver/')==''


def test_invalid_url_uses_valid_cookie_and_does_not_overwrite(site,palette_page):
    response=APIClient().get(f'/s/{site.slug}/?pwb-theme=blue',HTTP_COOKIE='pwb-theme=dark')
    assert b'data-pwb-chosen="dark"' in response.content
    assert 'pwb-theme' not in response.cookies
    assert response['Cache-Control']=='private, max-age=60'


def test_backend_decoding_and_duplicate_priority_evidence(site,palette_page):
    evidence=[]
    for query in ['pwb-theme=%64ark','pwb-theme=light&pwb-theme=dark','pwb-theme=dark&pwb-theme=light']:
        response=APIClient().get(f'/s/{site.slug}/?{query}')
        evidence.append({'query':query,'cookie':response.cookies['pwb-theme'].value,'chosen_in_body':'data-pwb-chosen' in response.content.decode()})
    assert evidence==[
        {'query':'pwb-theme=%64ark','cookie':'dark','chosen_in_body':False},
        {'query':'pwb-theme=light&pwb-theme=dark','cookie':'dark','chosen_in_body':False},
        {'query':'pwb-theme=dark&pwb-theme=light','cookie':'light','chosen_in_body':False},
    ]
    Path('/tmp/sitebuilder-dark-stage2-query-evidence.json').write_text(json.dumps(evidence,indent=2))


def test_custom_host_does_not_use_shared_origin_cookie_scheme(connected):
    connected.published_pages.filter(path='').update(html=TWO)
    response=Client().get('/?pwb-theme=dark',HTTP_HOST=connected.custom_domain)
    assert response.status_code==200
    assert 'pwb-theme' not in response.cookies
    assert 'Content-Security-Policy' not in response
    assert 'Vary' not in response
    assert b'data-pwb-chosen' not in response.content
    assert response['Cache-Control']=='public, max-age=60'
    redir=Client().get(f'/s/{connected.slug}/about/?pwb-theme=dark',HTTP_HOST=connected.custom_domain)
    assert redir.status_code==301
    assert redir['Location']=='/about/?pwb-theme=dark'


def test_cross_site_automatically_carried_query_overwrites_destination_choice(site,palette_page):
    other=Site.objects.create(owner=site.owner,title='Destination',published=True)
    PublishedPage.objects.create(site=other,path='',title='B',html=TWO)
    jar=CookieJar()
    a=f'/s/{site.slug}/'
    b=f'/s/{other.slug}/'
    chosen_a=get_with_jar(jar,a+'?pwb-theme=dark')
    absorb(jar,chosen_a,'http://testserver'+a+'?pwb-theme=dark')
    chosen_b=get_with_jar(jar,b+'?pwb-theme=light')
    absorb(jar,chosen_b,'http://testserver'+b+'?pwb-theme=light')
    before=get_with_jar(jar,b).content.decode()
    assert 'data-pwb-chosen="light"' in before
    # The frontend runtime was separately observed turning original b into this query.
    carried=get_with_jar(jar,b+'?pwb-theme=dark')
    assert carried.cookies['pwb-theme'].value=='dark'
    assert carried.cookies['pwb-theme']['path']==b
    absorb(jar,carried,'http://testserver'+b+'?pwb-theme=dark')
    after=get_with_jar(jar,b).content.decode()
    assert 'data-pwb-chosen="dark"' in after
    Path('/tmp/sitebuilder-dark-stage2-cross-site-evidence.json').write_text(json.dumps({
        'site_a_path':a,'site_b_original_link':b,'site_b_runtime_carried_link':b+'?pwb-theme=dark',
        'a_cookie':cookies(jar,'http://testserver'+a),'b_cookie_after':cookies(jar,'http://testserver'+b),
        'b_before':'light','b_after':'dark','set_cookie':carried.cookies['pwb-theme'].OutputString(),
    },indent=2))
