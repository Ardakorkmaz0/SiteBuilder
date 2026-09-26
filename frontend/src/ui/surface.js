// Which part of the product a path belongs to. The editor keeps the studio
// theme it was built with; every other screen uses the app system in
// ui/app-surface.css, keyed on <html data-surface="app">. On <html> rather
// than a wrapper so dialogs portalled to <body> are covered too.
const EDITOR_PATHS = /^\/(editor|code)(\/|$)/

export function surfaceFor(pathname) {
  return EDITOR_PATHS.test(pathname || '/') ? 'editor' : 'app'
}

export function markSurface(pathname) {
  document.documentElement.dataset.surface = surfaceFor(pathname)
}
