import { schemaToFiles } from './schemaToFiles.js'

export function componentPageDocument(page, htmlMap) {
  const html = page?.mode === 'html' ? htmlMap?.[page.id] : ''
  return typeof html === 'string' && html.trim() ? html : ''
}

export function componentHtmlFiles(schema, htmlMap, files = schemaToFiles(schema)) {
  let pageIndex = 0
  return files.filter((file) => file.lang === 'html').map((file) => {
    const page = schema?.pages?.[pageIndex++]
    const document = componentPageDocument(page, htmlMap)
    return {
      ...file, pageId: page?.id, ownDocument: !!document,
      generatedContent: document || file.content,
    }
  })
}

export function pendingComponentSourceDrafts(drafts, schema, htmlMap) {
  if (!Object.keys(drafts).length) return {}
  return Object.fromEntries(componentHtmlFiles(schema, htmlMap)
    .filter((file) => Object.prototype.hasOwnProperty.call(drafts, file.name) && drafts[file.name] !== file.generatedContent)
    .map((file) => [file.name, drafts[file.name]]))
}
