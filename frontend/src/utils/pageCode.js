import { schemaToSingleHtml } from './schemaToFiles.js'
import { schemaToResponsiveHtml } from './responsiveHtml.js'
import { colorModeFor } from './colorMode.js'

// One page rendered on its own, through whichever writer that page's layout
// mode uses. Shared by the Source panel and the live code ticker, so what the
// editor shows is the same document the export writes.
export function pageToResponsiveHtml(page, title, schema = {}) {
  const pageSchema = { ...schema, pages: [page] }
  // A switch on any page of the site gives this one both palettes too.
  const colorMode = colorModeFor(schema, page)
  return page?.flowMode
    ? schemaToSingleHtml(pageSchema, title, { colorMode })
    : schemaToResponsiveHtml(pageSchema, title, { colorMode })
}
