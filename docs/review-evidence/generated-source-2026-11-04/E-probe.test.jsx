import{it,expect,vi,afterEach}from'vitest'
import{render,screen,fireEvent,cleanup}from'@testing-library/react'
import LanguageProvider from'../i18n/LanguageProvider.jsx'
import{CodeColorsToggle,CodeField}from'../components/editor/CodeField.jsx'
import{highlightCode}from'../utils/syntaxHighlight.js'
import{JSDOM}from'jsdom'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('keeps source as text for independent hostile strings in all three languages',()=>{
 const texts=['<img src=x onerror="window.BAD=1">','</script><script>window.BAD=1</script>','<!-- <svg onload=alert(1)> -->','" & < > Türkçe \\t']
 for(const lang of['html','js','css'])for(const value of texts){const doc=new JSDOM('<body>'+highlightCode(value,lang)+'</body>').window.document;expect(doc.body.textContent).toBe(value);expect(doc.querySelector('img,script,svg')).toBeNull()}
})
it('can turn off colors when storage becomes unavailable',()=>{
 localStorage.setItem('pwb_language','en');localStorage.removeItem('pwb_code_colors')
 render(<LanguageProvider><CodeColorsToggle/><CodeField value="<p>x</p>" onChange={()=>{}} /></LanguageProvider>)
 vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new DOMException('blocked','SecurityError')})
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('blocked','SecurityError')})
 fireEvent.click(screen.getByRole('button',{name:'Code colors'}))
 expect(screen.getByRole('button',{name:'Code colors'})).toHaveAttribute('aria-pressed','false')
})
