// Router state can be supplied by any page. Only return to a local editor.
export function editorReturnPath(from) {
  return typeof from === 'string' && /^\/editor\/\d+(?:\?[^#]*)?$/.test(from) ? from : '/'
}
