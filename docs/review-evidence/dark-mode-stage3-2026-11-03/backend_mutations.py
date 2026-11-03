from pathlib import Path
import subprocess,json
# The original execution used the owner's absolute checkout path. This archived
# copy resolves the same backend relative to itself for repeatable review runs.
root=Path(__file__).resolve().parents[3]/'backend'
cmd=['.venv-linux/bin/python','-m','pytest','-q','builder/test_published_pages.py::TestRememberingAVisitorsPalette','builder/test_validators.py::TestLightAndDark','builder/test_page_live.py::TestStatusOfEachPage']
cases=[
 ('no_system_cookie','builder/published.py', "_PALETTES = ('light', 'dark', 'system')", "_PALETTES = ('light', 'dark')"),
 ('system_cookie_not_read','builder/published.py','    if kept in _PALETTES:',"    if kept in ('light', 'dark'):"),
 ('last_query_value','builder/published.py','    chosen = next(iter(request.GET.getlist(_PALETTE_PARAM)), None)','    chosen = request.GET.get(_PALETTE_PARAM)'),
 ('raw_encoded_query','builder/published.py','    chosen = next(iter(request.GET.getlist(_PALETTE_PARAM)), None)',"    raw = re.search(r'(?:^|&)pwb-theme=(light|dark|system)(?:&|$)', request.META.get('QUERY_STRING', ''))\n    chosen = raw[1] if raw else None"),
 ('drop_three_states','builder/validators.py',"three = {'states': 'three'} if props.get('states') == 'three' else {}",'three = {}'),
 ('drop_three_names','builder/validators.py',"names = {key: _str(props.get(key))[:80] for key in ('lightLabel', 'darkLabel', 'deviceLabel') if props.get(key)}",'names = {}'),
 ('unlimited_three_names','builder/validators.py',"names = {key: _str(props.get(key))[:80] for key in ('lightLabel', 'darkLabel', 'deviceLabel') if props.get(key)}", "names = {key: _str(props.get(key)) for key in ('lightLabel', 'darkLabel', 'deviceLabel') if props.get(key)}"),
 ('unknown_three_states_allowed','builder/validators.py',"three = {'states': 'three'} if props.get('states') == 'three' else {}", "three = {'states': props.get('states')} if props.get('states') else {}"),
 ('ignore_three_canvas_switch','builder/live_pages.py',"component.get('type') == 'themeToggle' or _holds_theme_switch(component.get('children'))", "(component.get('type') == 'themeToggle' and component.get('props', {}).get('states') != 'three') or _holds_theme_switch(component.get('children'))"),
 ('html_switch_requires_bare_attribute','builder/live_pages.py',"THEME_SWITCH_ATTR in str(page.get('html') or '')", "THEME_SWITCH_ATTR + '>' in str(page.get('html') or '')"),
]
results=[]
for name,rel,before,after in cases:
    path=root/rel
    original=path.read_bytes()
    source=original.decode()
    assert source.count(before)==1,name
    try:
        path.write_text(source.replace(before,after))
        p=subprocess.run(cmd,cwd=root,text=True,capture_output=True)
        out=p.stdout+p.stderr
        Path(f'/tmp/sitebuilder-dark-stage3-{name}.log').write_text(out)
        results.append({'case':name,'returncode':p.returncode,'summary':[x for x in out.splitlines() if x.startswith('FAILED') or ' failed,' in x or ' passed' in x]})
    finally:
        path.write_bytes(original)
Path('/tmp/sitebuilder-dark-stage3-mutations.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
