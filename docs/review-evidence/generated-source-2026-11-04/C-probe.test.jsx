import {it,expect} from 'vitest'
import {writeFileSync} from 'node:fs'
import {JSDOM,VirtualConsole} from 'jsdom'
import {useEditorStore} from '../store/editorStore.js'
import {colorModeFor,colorModeHeadTags} from '../utils/colorMode.js'
import {withBuilderInteractiveHtml} from '../utils/htmlRuntime.js'
import {projectSnapshot} from '../utils/projectSnapshot.js'
it('copies, pastes and imports the alternate image through real store/snapshot',()=>{
 const schema={theme:{},pages:[{id:'p',name:'Home',background:'#ffffff',components:[{id:'i',type:'image',props:{src:'/media/a.png',srcOther:'/media/b.png',alt:'Logo'},styles:{},layout:{x:0,y:0,w:200,h:80}}]}]}
 const s=useEditorStore.getState();s.loadSchema(schema);s.selectComponent('i');s.copySelection();s.pasteClipboard();
 const images=useEditorStore.getState().schema.pages[0].components
 expect(images.map(i=>i.props.srcOther)).toEqual(['/media/b.png','/media/b.png'])
 const snapshot=projectSnapshot(useEditorStore.getState().schema,{}).schema
 s.importSchema(snapshot)
 expect(useEditorStore.getState().schema.pages[0].components.map(i=>i.props.srcOther)).toEqual(['/media/b.png','/media/b.png'])
})
it('records two authored media theme-color tags under the real head/runtime',async()=>{
 const p={id:'p',components:[{id:'toggle',type:'themeToggle',props:{}}]}
 const mode=colorModeFor({theme:{backgroundColor:'#ffffff'},colorMode:{start:'dark',theme:{backgroundColor:'#111317'}},pages:[p]},p)
 const source='<html><head><meta name="theme-color" media="(prefers-color-scheme: light)" content="#eeeeee"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#222222">'+colorModeHeadTags(mode)+'</head><body></body></html>'
 const dom=new JSDOM(withBuilderInteractiveHtml(source),{url:'https://review.test',runScripts:'dangerously',virtualConsole:new VirtualConsole(),beforeParse(w){w.matchMedia=()=>({matches:true,addEventListener(){}})}})
 await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}))
 const meta=[...dom.window.document.querySelectorAll('meta[name="theme-color"]')].map(m=>({media:m.getAttribute('media'),content:m.content,base:m.getAttribute('data-pwb-base')}))
 writeFileSync('/tmp/generated-review-C-meta.json',JSON.stringify(meta,null,2));console.log('MULTI_THEME_META',JSON.stringify(meta));expect(meta[1].content).toBe('#222222');dom.window.close()
})
