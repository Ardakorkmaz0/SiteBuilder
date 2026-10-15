// A failed write must release the file's write lock and discard its temporary
// contents. Closing is reserved for a successful write because close commits
// the replacement to disk.
export async function writeFileContents(handle, contents) {
  const writable = await handle.createWritable()
  try {
    await writable.write(contents)
    await writable.close()
  } catch (error) {
    try { await writable.abort() } catch { /* preserve the original write error */ }
    throw error
  }
}
