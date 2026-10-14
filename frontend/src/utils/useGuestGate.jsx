import { useState } from 'react'
import { useIsGuest } from '../store/authStore.js'
import GuestGateDialog from '../components/auth/GuestGate.jsx'

// How many sites a guest may keep; the server's guests.GUEST_SITE_LIMIT, so the
// app can say so before a request it knows will be refused.
export const GUEST_SITE_LIMIT = 3

// gate('publish') returns true when it handled the click — the caller stops
// there. For a signed-in account it always returns false, so the call site
// reads as the normal path with one guard line on top.
export function useGuestGate() {
  const isGuest = useIsGuest()
  const [action, setAction] = useState(null)
  const gate = (next) => {
    if (!isGuest) return false
    setAction(next)
    return true
  }
  const dialog = action ? <GuestGateDialog action={action} onClose={() => setAction(null)} /> : null
  return { isGuest, gate, dialog }
}
