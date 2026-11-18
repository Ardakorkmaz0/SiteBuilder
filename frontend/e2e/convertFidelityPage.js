export async function convertFidelityPage(page, source) {
  await page.goto('/')
  return page.evaluate(async (html) => {
    const { measureHtmlPage } = await import('/src/utils/htmlPageMeasure.js')
    const { canvasPageFromMeasured } = await import('/src/utils/htmlToCanvas.js')
    const { useEditorStore } = await import('/src/store/editorStore.js')
    const { publishedPagesFor } = await import('/src/utils/publishedPages.js')
    const measured = await measureHtmlPage(html, { width: 1280, timeout: 180000 })
    const result = canvasPageFromMeasured(measured)
    const store = useEditorStore.getState()
    store.loadSchema({ theme: {}, pages: [{ id: 'page_home', name: 'Home', mode: 'html', components: [] }] })
    store.convertPageToCanvas('page_home', {
      ...result,
      htmlBackup: html,
      seoTitle: result.title,
      seoDescription: result.description,
      language: result.language,
    })
    const schema = useEditorStore.getState().schema
    const count = (list) => list.reduce((sum, c) => sum + 1 + count(c.children || []), 0)
    const kinds = {}
    const tally = (list) => list.forEach((c) => { kinds[c.type] = (kinds[c.type] || 0) + 1; tally(c.children || []) })
    tally(schema.pages[0].components)
    return {
      schema,
      html: publishedPagesFor(schema, {}, 'Bench', '')[0]?.html || '',
      blocks: count(schema.pages[0].components),
      kinds,
      ranScripts: measured.ranScripts,
    }
  }, source)
}
