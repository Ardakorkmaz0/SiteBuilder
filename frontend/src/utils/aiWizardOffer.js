// The AI site wizard opens by itself once, on the first visit to an empty site
// (EditorPage). A site started as a blank canvas on purpose counts as offered
// already: the person chose to build it by hand, and the wizard popping up over
// that choice read as the app not listening.
const KEY = 'pwb_wizard_auto_'

// Unreadable storage counts as offered: better no wizard than one every visit.
export function aiWizardOffered(siteId) {
  try { return !!localStorage.getItem(KEY + siteId) } catch { return true }
}

export function markAiWizardOffered(siteId) {
  try { localStorage.setItem(KEY + siteId, '1') } catch { /* storage unavailable */ }
}
