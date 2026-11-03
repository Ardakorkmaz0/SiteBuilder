import {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {MemoryRouter} from 'react-router-dom'
import './src/index.css'
import LanguageProvider from './src/i18n/LanguageProvider.jsx'
import UiThemeProvider from './src/ui/UiThemeProvider.jsx'
import {CodeField,CodeColorsToggle} from './src/components/editor/CodeField.jsx'
import {setCodeColors} from './src/components/editor/useCodeColors.js'
import PublicToolbar from './src/components/preview/PublicToolbar.jsx'
const descriptor=Object.getOwnPropertyDescriptor(window,'localStorage')
const original=localStorage.getItem('pwb_code_colors')
const initial='<script>const title = "Türkçe";</script>\n\t<p>Hello</p>\n'+('one long line '.repeat(90))
function App(){
 const [value,setValue]=useState(initial),[count,setCount]=useState(12),[active,setActive]=useState('p0'),[lang,setLang]=useState('html'),[blocked,setBlocked]=useState(false)
 const pages=Array.from({length:count},(_,i)=>({id:'p'+i,name:i===11?'Page 11 with a very long title '.repeat(8):'Page '+i}))
 const restore=()=>{Object.defineProperty(window,'localStorage',descriptor);setCodeColors(original!=='off');if(original===null)localStorage.removeItem('pwb_code_colors');else localStorage.setItem('pwb_code_colors',original);setBlocked(false)}
 return <main style={{padding:30,minHeight:'170vh'}}>
 <h1>Review UI harness</h1><p>Real CodeField and PublicToolbar; fixture controls only.</p>
 <button onClick={()=>{setValue(initial);setLang('html')}}>Load short source</button>{' '}
 <button onClick={()=>{setValue('/*x'.repeat(66000));setLang('css')}}>Load repetitive CSS</button>{' '}
 <button onClick={()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('Review blocked storage','SecurityError')}});setBlocked(true)}}>Block local storage</button>{' '}
 <button onClick={restore}>Restore preference</button>{' '}
 <button onClick={()=>setCount(4)}>Four pages</button>{' '}<button onClick={()=>setCount(5)}>Five pages</button>{' '}<button onClick={()=>{setCount(12);setActive('p11')}}>Last long page</button>
 <p><output aria-label="Review state">{JSON.stringify({length:value.length,blocked,active,count})}</output></p>
 <CodeColorsToggle />
 <div style={{height:260,width:'min(600px,100%)',display:'flex',flexDirection:'column',marginTop:12}}>
 <CodeField value={value} lang={lang} aria-label="Review source" onChange={e=>setValue(e.target.value)} spellCheck={false} className="min-h-0 flex-1 resize-none border-0 bg-[#0d1117] p-5 font-mono text-[13px] leading-6 text-gray-100"/>
 </div>
 <PublicToolbar site={{title:'Review site',slug:'review',schema:{pages}}} pages={pages} activePageId={active} onNavigate={setActive} device="desktop" onDeviceChange={()=>{}} scriptMode="on" onScriptModeChange={()=>{}} />
 </main>
}
createRoot(document.getElementById('root')).render(<MemoryRouter><UiThemeProvider><LanguageProvider><App/></LanguageProvider></UiThemeProvider></MemoryRouter>)
