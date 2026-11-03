from pathlib import Path
import subprocess,json
# Portable archive of the executed runner. The compact sibling probe preserves
# the same two real-API expectations without depending on a temporary /tmp file.
root=Path(__file__).resolve().parents[3]/'backend'
probe=Path(__file__).with_name('backend_fingerprint_probe.py')
path=root/'builder/live_pages.py'
original=path.read_bytes()
cases=[
 ('ignore_three_canvas_switch',"component.get('type') == 'themeToggle' or _holds_theme_switch(component.get('children'))", "(component.get('type') == 'themeToggle' and component.get('props', {}).get('states') != 'three') or _holds_theme_switch(component.get('children'))"),
 ('html_switch_requires_bare_attribute',"THEME_SWITCH_ATTR in str(page.get('html') or '')", "THEME_SWITCH_ATTR + '>' in str(page.get('html') or '')"),
]
results=[]
base=['.venv-linux/bin/python','-m','pytest','-q']
for name,before,after in cases:
    assert original.decode().count(before)==1
    try:
        path.write_text(original.decode().replace(before,after))
        for suite,args in [('full_file',['builder/test_page_live.py']),('temporary_controls',['-c','pytest.ini',str(probe),'-k','three_way_switch_elsewhere'])]:
            p=subprocess.run(base+args,cwd=root,text=True,capture_output=True)
            out=p.stdout+p.stderr
            Path(f'/tmp/sitebuilder-dark-stage3-{name}-{suite}.log').write_text(out)
            results.append({'mutation':name,'suite':suite,'returncode':p.returncode,'summary':[x for x in out.splitlines() if x.startswith('FAILED') or ' failed,' in x or ' passed' in x]})
    finally:
        path.write_bytes(original)
Path('/tmp/sitebuilder-dark-stage3-fingerprint-mutations.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
