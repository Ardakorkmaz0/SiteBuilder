import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
const base=resolve('src/utils')
const {schemaToFiles,schemaToSingleHtml}=await import(pathToFileURL(base+'/schemaToFiles.js'))
const {schemaToResponsiveHtml}=await import(pathToFileURL(base+'/responsiveHtml.js'))
const {publishedPagesFor}=await import(pathToFileURL(base+'/publishedPages.js'))
const {DEFAULT_THEME}=await import(pathToFileURL(base+'/theme.js'))
const block=(id,type,y,props={},styles={})=>({id,type,props,styles,layout:{x:60,y,w:500,h:60}})
const components=[block('nav','navbar',0,{brand:'Brand',links:[{label:'Home',href:'#'}]},{backgroundColor:'#1d1d1f',color:'#f5f5f7'}),block('h','heading',120,{text:'Hello',level:'h1'},{color:'#1d1d1f'}),block('t','text',200,{text:'A small page.'},{color:'#555555'}),block('b','button',280,{text:'Contact',href:'#'},{backgroundColor:'#0071e3',color:'#ffffff'})]
const schema={theme:{...DEFAULT_THEME},pages:[{id:'home',name:'Home',background:'#ffffff',components}]}
const measure=(content)=>({bytes:Buffer.byteLength(content),lines:content.split('\n').length})
console.log(JSON.stringify({fixture:'generatedSize plain four blocks',published:measure(publishedPagesFor(schema)[0].html),single:measure(schemaToSingleHtml(schema)),responsive:measure(schemaToResponsiveHtml(schema)),files:schemaToFiles(schema).map(f=>({name:f.name,...measure(f.content)}))},null,2))
