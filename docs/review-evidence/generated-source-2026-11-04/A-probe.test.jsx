import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CodePanel from '../components/editor/CodePanel.jsx'
import LanguageProvider from '../i18n/LanguageProvider.jsx'
import UiThemeProvider from '../ui/UiThemeProvider.jsx'
import { useEditorStore } from '../store/editorStore.js'
import { zipFiles } from '../utils/zip.js'
import { JSDOM, VirtualConsole } from 'jsdom'
import { inlineProjectHtml } from '../utils/exportFiles.js'
vi.mock('../utils/zip.js', async (importActual) => { const actual=await importActual(); return {...actual,zipFiles:vi.fn(actual.zipFiles)} })
beforeEach(()=>{localStorage.clear();localStorage.setItem('pwb_language','en');URL.createObjectURL=vi.fn(()=> 'blob:review');URL.revokeObjectURL=vi.fn();HTMLAnchorElement.prototype.click=vi.fn();useEditorStore.getState().loadSchema({theme:{backgroundColor:'#ffffff'},customCss:'',customJs:'',pages:[{id:'home',name:'Home',background:'#ffffff',components:[]}]})})
describe('independent raw source export review',()=>{
 it('keeps runtime for a form added to a source draft before project ZIP export',async()=>{
  render(<UiThemeProvider><LanguageProvider><CodePanel currentPageId="home" /></LanguageProvider></UiThemeProvider>)
  const input=screen.getByRole('textbox',{name:'HTML source editor'})
  fireEvent.change(input,{target:{value:input.value.replace('</body>','<form><input name="email"><button>Send</button></form></body>')}})
  fireEvent.click(screen.getByRole('button',{name:'Export',exact:true}))
  fireEvent.click(screen.getByRole('menuitem',{name:/Editable code project/}))
  const files=zipFiles.mock.calls.at(-1)[0]
  expect(files.find(f=>f.name==='index.html').content).toContain('<form>')
  const runtime=files.find(f=>f.name==='runtime.js').content
  console.log('DRAFT_ZIP_PROOF',JSON.stringify({form:files.find(f=>f.name==='index.html').content.includes('<form>'),runtimeHandlesForm:runtime.includes('postToInbox')}))
  const dom=new JSDOM(inlineProjectHtml(files.find(f=>f.name==='index.html').content,files),{url:'https://review.test/s/a/',runScripts:'dangerously',virtualConsole:new VirtualConsole(),beforeParse(w){w.scrollTo=()=>{};w.fetch=async()=>({ok:true})}})
  await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}))
  const submit=new dom.window.Event('submit',{bubbles:true,cancelable:true})
  dom.window.document.querySelector('form').dispatchEvent(submit)
  console.log('DRAFT_ZIP_BEHAVIOR',JSON.stringify({submitPrevented:submit.defaultPrevented}))
  const prevented=submit.defaultPrevented; dom.window.close()
  expect(prevented).toBe(true)
 })
})
