from pathlib import Path
import subprocess,os,json,hashlib
# Portable path for the archived runner; original execution used the owner's checkout.
root=Path(__file__).resolve().parents[3]/'frontend'
names=['store/editorStore.js','components/editor/ColorModePanel.jsx','components/renderer/ColorMode.jsx','pages/PreviewPage.jsx','utils/colorMode.js','utils/htmlRuntime.js','utils/themeToggle.js']
paths={k:root/'src'/k for k in names};original={k:p.read_bytes() for k,p in paths.items()};src={k:v.decode() for k,v in original.items()}
panel='src/components/editor/ColorModePanel.test.jsx';renderer='src/components/renderer/ColorMode.test.jsx';preview='src/pages/PreviewPage.palette.test.jsx';util='src/utils/colorMode.test.js'
mutations=[
('root-owner-frozen','components/renderer/ColorMode.jsx','const [chosen, setChosen] = useState(null)','const [chosen, setChosen] = useState(() => mode ? firstPick(mode) : null)',[renderer]),
('root-visitor-ignored','components/renderer/ColorMode.jsx','const pick = mode ? chosen || firstPick(mode) : null','const pick = mode ? firstPick(mode) : null',[renderer]),
('root-device-listener-removed','components/renderer/ColorMode.jsx',"query.addEventListener('change', onChange)","// mutation: omit device listener",[renderer]),
('preview-canvas-site-key-removed','pages/PreviewPage.jsx','<ColorModeRoot key={slug} mode={colorMode}>','<ColorModeRoot mode={colorMode}>',[preview]),
('preview-frame-site-reset-removed','pages/PreviewPage.jsx',"if (palette.slug !== slug) setPalette({ chosen: null, forPage: null, pageId: null, slug })",'// mutation: retain the preceding site choice',[preview]),
('bulk-undo-record-removed','store/editorStore.js',"if (!targets.length) return\n    get().record('add')",'if (!targets.length) return',[panel]),
('bulk-selection-overwritten','store/editorStore.js','...(select ? { selectedId: next.selectedId, selectedIds: next.selectedIds } : {})','...({ selectedId: next.selectedId, selectedIds: next.selectedIds })',[panel]),
('bulk-active-page-changed','store/editorStore.js','return { schema: next.schema, dirty: true, ...(select ? { selectedId: next.selectedId, selectedIds: next.selectedIds } : {}) }','return { schema: next.schema, currentPageId: targets[targets.length-1].id, dirty: true, ...(select ? { selectedId: next.selectedId, selectedIds: next.selectedIds } : {}) }',[panel]),
('bulk-first-page-only','store/editorStore.js','const targets = (get().schema.pages || []).filter((page) => wanted.has(page.id))','const targets = (get().schema.pages || []).filter((page) => wanted.has(page.id)).slice(0, 1)',[panel]),
('flow-switch-left-at-end','utils/themeToggle.js','return [...rest.slice(0, at), added, ...rest.slice(at)]','return components',[panel]),
('corner-ignores-top-navbar','utils/themeToggle.js',"y: bar ? (bar.layout?.y || 0) + (bar.layout?.h || 0) + 16 : 24,",'y: 24,',[panel]),
('bulk-html-treated-as-canvas','utils/colorMode.js',"const isHtml = (page) => page.mode === 'html' || !!String(htmlMap[page.id] ?? page.html ?? '').trim()",'const isHtml = () => false',[panel,util]),
('runtime-system-not-following','utils/htmlRuntime.js',"if (device.addEventListener) device.addEventListener('change', onDeviceChange);",'if (false) {}',[util]),
('runtime-system-stores-palette','utils/htmlRuntime.js',"localStorage.setItem('pwb-color-mode', pick)","localStorage.setItem('pwb-color-mode', next)",[util]),
('head-system-not-a-choice','utils/colorMode.js',"function k(v){return v==='light'||v==='dark'||v==='system'}","function k(v){return v==='light'||v==='dark'}",[util]),
]
results=[]
try:
 for name,key,old,new,tests in mutations:
  assert src[key].count(old)==1,(name,src[key].count(old))
  paths[key].write_text(src[key].replace(old,new))
  try:
   p=subprocess.run(['npm','run','test:run','--',*tests],cwd=root,env={**os.environ,'NODE_OPTIONS':'--no-experimental-webstorage'},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
   Path('/tmp/sitebuilder-dark-stage3-mut-'+name+'.log').write_text(p.stdout)
   results.append({'mutation':name,'tests':tests,'exit':p.returncode,'summary':[s.strip() for s in p.stdout.splitlines() if '× ' in s or 'Test Files' in s or 'Tests ' in s]})
  finally:paths[key].write_bytes(original[key])
finally:
 for key,p in paths.items():p.write_bytes(original[key])
assert all(paths[k].read_bytes()==v for k,v in original.items())
Path('/tmp/sitebuilder-dark-stage3-mutation-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps(results,ensure_ascii=False,indent=2))
print('RESTORED', {k:hashlib.sha256(p.read_bytes()).hexdigest() for k,p in paths.items()})
