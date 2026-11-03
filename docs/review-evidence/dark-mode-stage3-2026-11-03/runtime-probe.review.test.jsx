import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {JSDOM} from 'jsdom'
import PreviewPage from '../pages/PreviewPage.jsx'
import {useEditorStore} from '../store/editorStore.js'
import {getPublicSite,countSiteView} from '../api/sites.js'
import {themeToggleHtml} from '../utils/themeToggle.js'

vi.mock('../api/sites.js',()=>({getPublicSite:vi.fn(),countSiteView:vi.fn(),submitSiteForm:vi.fn(),getReviewSite:vi.fn(),submitReviewComment:vi.fn()}))
vi.mock('../components/preview/PublicToolbar.jsx',()=>({default:({onNavigate})=><nav><button onClick={()=>onNavigate('home')}>Canvas file</button><button onClick={()=>onNavigate('doc')}>HTML file</button></nav>}))
vi.mock('../components/LanguageSwitcher.jsx',()=>({default:()=>null}))
vi.mock('../i18n/useLanguage.js',()=>({useLanguage:()=>({t:(value)=>value})}))
const component=(id,type,props={},layout={x:0,y:0,w:300,h:60})=>({id,type,props,styles:{},layout})
const page=(id,components=[])=>({id,name:id,canvasWidth:1200,components})
const palette=()=>document.querySelector('[data-pwb-color-root]')?.getAttribute('data-pwb-theme')
let dark=false
const listeners=new Set()
beforeEach(()=>{
 vi.clearAllMocks();sessionStorage.clear();window.history.replaceState(null,'','/');dark=false;listeners.clear();
 window.matchMedia=()=>({get matches(){return dark},addEventListener:(type,fn)=>listeners.add(fn),removeEventListener:(type,fn)=>listeners.delete(fn)})
 globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}}
})
afterEach(()=>cleanup())
function loadStore(components){useEditorStore.getState().loadSchema({theme:{backgroundColor:'#ffffff'},pages:[page('home',components),page('about')]})}
function added(){return useEditorStore.getState().schema.pages[0].components.find(c=>c.type==='themeToggle')}
async function openMixed(){
 const sw=component('sw','themeToggle',{states:'three',label:'Theme'}, {x:20,y:20,w:180,h:44})
 getPublicSite.mockResolvedValue({slug:'a',title:'Mixed',published:true,schema:{theme:{backgroundColor:'#ffffff'},pages:[page('home',[sw]),{...page('doc'),mode:'html',html:'<!doctype html><html><head></head><body>'+themeToggleHtml({states:'three',label:'Theme'})+'<p>HTML marker</p></body></html>'}]}})
 countSiteView.mockResolvedValue({})
 await act(async()=>render(<MemoryRouter initialEntries={['/site/a']}><Routes><Route path='/site/:slug' element={<PreviewPage/>}/></Routes></MemoryRouter>))
 await screen.findByRole('radio',{name:'Dark',exact:true})
}
async function goDoc(){fireEvent.click(screen.getByRole('button',{name:'HTML file'}));await waitFor(()=>expect(document.querySelector('iframe')?.getAttribute('srcdoc')).toContain('HTML marker'));return document.querySelector('iframe')}
function actualFramePalette(srcdoc){
 const doc=new JSDOM(srcdoc,{url:'https://viewer.test/',runScripts:'dangerously',beforeParse(w){Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('sandboxed','SecurityError')}});w.matchMedia=()=>({get matches(){return dark},addEventListener(){}})}})
 const result=doc.window.document.documentElement.getAttribute('data-pwb-theme');doc.window.close();return result
}
describe('stage3 independent runtime probes',()=>{
 it('control: bulk addition preserves a mobile viewport, active page, multi-selection and one undo',()=>{
  loadStore([component('h','heading'),component('bar','navbar',{}, {x:0,y:0,w:1200,h:64})]);useEditorStore.setState({currentPageId:'about',selectedId:'bar',selectedIds:['h','bar'],viewport:'mobile'});
  const before=structuredClone(useEditorStore.getState().schema);const depth=useEditorStore.getState().past.length;
  useEditorStore.getState().addThemeSwitchToPages(['home','about']);const state=useEditorStore.getState();
  expect(state.currentPageId).toBe('about');expect(state.selectedIds).toEqual(['h','bar']);expect(state.viewport).toBe('mobile');expect(state.past.length).toBe(depth+1);expect(added().layout.y).toBe(80);
  state.undo();expect(useEditorStore.getState().schema).toEqual(before)
 })
 it('a vertical side navigation does not push a top-right switch below its bottom',()=>{
  loadStore([component('side','navbar',{navLayout:'vertical'}, {x:0,y:0,w:220,h:600})]);useEditorStore.getState().addThemeSwitchToPages(['home']);
  console.info('VERTICAL_NAV_PROOF',JSON.stringify(added().layout));expect(added().layout.y).toBe(24)
 })
 it('keeps a canvas choice when going to an HTML file of the same site',async()=>{
  await openMixed();fireEvent.click(screen.getByRole('radio',{name:'Dark',exact:true}));expect(palette()).toBe('dark');
  const frame=await goDoc();const actual=actualFramePalette(frame.getAttribute('srcdoc'));console.info('CANVAS_TO_HTML_PROOF',actual);expect(actual).toBe('dark')
 })
 it('keeps a newer canvas choice after a device choice in an HTML file',async()=>{
  dark=true;await openMixed();const frame=await goDoc();
  await act(async()=>window.dispatchEvent(new MessageEvent('message',{data:{type:'pwb-color-mode',mode:'system'},source:frame.contentWindow})));
  fireEvent.click(screen.getByRole('button',{name:'Canvas file'}));await screen.findByRole('radio',{name:'Light',exact:true});fireEvent.click(screen.getByRole('radio',{name:'Light',exact:true}));expect(palette()).toBe('light');
  const again=await goDoc();const actual=actualFramePalette(again.getAttribute('srcdoc'));console.info('HTML_CANVAS_HTML_PROOF',actual);expect(actual).toBe('light')
 })
})
