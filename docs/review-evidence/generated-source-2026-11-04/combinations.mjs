import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'
const require = createRequire(resolve('package.json'))
const { JSDOM, VirtualConsole } = require('jsdom')
const { builderInteractiveJs, runtimeNeeds } = await import(pathToFileURL(resolve('src/utils/htmlRuntime.js')))
const markers = ['<button data-pwb-theme-toggle>Theme</button>', '<nav data-builder-mobile-nav></nav>', '<p data-pwb-reveal></p>', '<div data-builder-tabs></div>', '<form></form>', '<div data-builder-sticky></div>', '<div data-pwb-fit="x"></div>', '<input>', '<p data-anim-in="fade"></p>']
const result = { combinations: 512, compiled: 0, initialized: 0, failures: [] }
for (let mask=0; mask<512; mask++) {
 const source=markers.filter((_,i)=>mask&(1<<i)).join('')
 const script=builderInteractiveJs(source)
 try { new Function(script); result.compiled++ } catch(e) { result.failures.push({mask,phase:'compile',error:String(e)});continue }
 const errors=[]
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(String(e)))
 const dom=new JSDOM('<!doctype html><html><body>'+source+'</body></html>',{url:'https://review.test',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole})
 dom.window.scrollTo=()=>{}
 dom.window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}})
 dom.window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}}
 dom.window.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}}
 try {dom.window.eval(script);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));if(errors.length)throw new Error(errors.join(';'));result.initialized++} catch(e){result.failures.push({mask,needs:runtimeNeeds(source),phase:'init',error:String(e)})}
 dom.window.close()
 if (mask%32===0) global.gc?.()
}
writeFileSync('/tmp/generated-review-combinations.json',JSON.stringify(result,null,2))
console.log(JSON.stringify(result))
