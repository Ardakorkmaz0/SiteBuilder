import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {writeFileSync} from 'node:fs'
const require=createRequire(resolve('package.json'));const {JSDOM,VirtualConsole}=require('jsdom');const {expect}=require('@playwright/test')
const {withBuilderInteractiveHtml}=await import(pathToFileURL(resolve('src/utils/htmlRuntime.js')))
const {themeToggleHtml}=await import(pathToFileURL(resolve('src/utils/themeToggle.js')))
const base='<html data-pwb-theme-base="light" data-pwb-theme-alt="dark" data-pwb-theme="light" data-pwb-theme-pick="light"><body>'+themeToggleHtml({states:'three',label:'Color theme',showLabel:'on'})+'<a href="/s/a/about/">About</a></body></html>'
const dom=new JSDOM(withBuilderInteractiveHtml(base),{url:'https://review.test/s/a/?pwb-theme=light',runScripts:'dangerously',virtualConsole:new VirtualConsole(),beforeParse(w){Object.defineProperty(w,'localStorage',{get(){throw new w.DOMException('blocked','SecurityError')}});w.matchMedia=()=>({matches:false,addEventListener(){}})}})
await new Promise(r=>dom.window.addEventListener('load',r,{once:true}))
const doc=dom.window.document;const dark=doc.querySelector('[data-pwb-theme-choose="dark"]');let clicks=0
doc.addEventListener('click',e=>{if(e.target===dark&&++clicks===1)e.stopImmediatePropagation()},{capture:true})
await expect(async()=>{dark.click();expect(doc.documentElement.getAttribute('data-pwb-theme')).toBe('dark')}).toPass({timeout:1000,intervals:[0]})
const link=doc.querySelector('a');doc.addEventListener('auxclick',e=>e.preventDefault())
const event=new dom.window.MouseEvent('auxclick',{button:1,bubbles:true,cancelable:true});link.dispatchEvent(event)
const out={ignoredFirstClickWasHiddenByToPass:clicks===2,clicks,auxCanceled:event.defaultPrevented,rewrittenHref:link.href,manualGotoWouldUse:link.href}
writeFileSync('/tmp/generated-review-B-proof.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));dom.window.close()
