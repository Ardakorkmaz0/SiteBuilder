import {createRequire} from 'node:module'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {writeFileSync} from 'node:fs'
const {JSDOM,VirtualConsole}=createRequire(resolve('package.json'))('jsdom')
const {runtimeNeeds,withBuilderInteractiveHtml,withoutUnusedRules,withoutBuilderShim}=await import(pathToFileURL(resolve('src/utils/htmlRuntime.js')))
const rows=[]
for (const title of ['ab','a>b']) {
 const source=`<!doctype html><html><body><button id="add" title="${title}" onclick="document.body.insertAdjacentHTML('beforeend','&lt;form id=f&gt;&lt;input name=x value=x&gt;&lt;button&gt;Send&lt;/button&gt;&lt;/form&gt;')">Add</button></body></html>`
 const out=withBuilderInteractiveHtml(source)
 const dom=new JSDOM(out,{url:'https://review.test/s/a/',runScripts:'dangerously',virtualConsole:new VirtualConsole(),beforeParse(w){w.fetch=async()=>({ok:true});w.scrollTo=()=>{}}})
 await new Promise(r=>dom.window.addEventListener('load',r,{once:true}))
 dom.window.document.getElementById('add').click()
 const form=dom.window.document.getElementById('f')
 const event=new dom.window.Event('submit',{bubbles:true,cancelable:true})
 form.dispatchEvent(event)
 rows.push({title,needs:runtimeNeeds(source),createdForm:!!form,submitPrevented:event.defaultPrevented})
 dom.window.close()
}
const css=withoutUnusedRules('.a:is(.b,.c) {color:red;}','<p class="a b">x</p>')
rows.push({cssProbe:css})
writeFileSync('/tmp/generated-review-author-proof.json',JSON.stringify(rows,null,2)); console.log(JSON.stringify(rows))
