import { createContext } from 'react'

// The site font that HTML embeds start in (see baseFontTag in
// utils/htmlEmbedDocument.js). The editor canvas provides it so a theme change
// reaches every embed at once; anywhere else an embed reads the font of the
// element it sits in when it mounts.
export const EmbedFontContext = createContext('')
