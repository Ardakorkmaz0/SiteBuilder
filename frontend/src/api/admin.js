import client from './client.js'

// Admin-only: every user with their sites (requires is_staff on the server).
// Paginated — returns DRF's { count, next, previous, results } envelope. `q`
// filters by username / email / display name (server-side).
export const listAdminUsers = (page = 1, q = '') =>
  client.get('/admin/users/', { params: { page, ...(q ? { q } : {}) } }).then((r) => r.data)

// Platform-wide totals + top sites for the admin dashboard header.
export const getAdminStats = () => client.get('/admin/stats/').then((r) => r.data)

// Moderation queue (defaults to open reports). status: open|resolved|dismissed|all
export const listReports = (status = 'open', page = 1) =>
  client.get('/admin/reports/', { params: { status, page } }).then((r) => r.data)

export const resolveReport = (reportId, action /* 'resolve' | 'dismiss' */) =>
  client.post(`/admin/reports/${reportId}/resolve/`, { action }).then((r) => r.data)

// Suspend (is_active=false) or reinstate a user.
export const suspendUser = (userId, suspend) =>
  client.post(`/admin/users/${userId}/suspend/`, { suspend }).then((r) => r.data)

// Take down a site: 'unpublish' (a moderation block the owner cannot lift),
// 'reinstate' (lifts it; the site comes back unpublished) or 'delete' (hard).
export const moderateSite = (siteId, action) =>
  client.post(`/admin/sites/${siteId}/moderate/`, { action }).then((r) => r.data)

// Lift a site above the ranking on the home feed, or let it back down.
// Superuser-only, and only a published site can be pinned — see
// AdminSitePinView. Returns { detail, pinned }.
export const pinSite = (siteId, pinned) =>
  client.post(`/admin/sites/${siteId}/pin/`, { pinned }).then((r) => r.data)

// Flagged community blocks. Its own queue: a site gets unpublished, a block
// gets pulled out of a library it has already been copied out of.
export const listComponentReports = (status = 'open', page = 1) =>
  client.get('/admin/component-reports/', { params: { status, page } }).then((r) => r.data)

export const resolveComponentReport = (reportId, action /* 'resolve' | 'dismiss' */) =>
  client.post(`/admin/component-reports/${reportId}/resolve/`, { action }).then((r) => r.data)

// 'remove' unlists it and leaves copies alone; 'purge' also deletes the copies
// from every site that took one; 'restore' puts it back in the library.
export const moderateComponent = (componentId, action) =>
  client.post(`/admin/components/${componentId}/moderate/`, { action }).then((r) => r.data)

// Runtime SiteSettings (superuser-only). GET masks secrets (returns *_set
// booleans); PUT — blank secret fields keep the stored value.
export const getSettings = () => client.get('/admin/settings/').then((r) => r.data)

export const updateSettings = (payload) =>
  client.put('/admin/settings/', payload).then((r) => r.data)

// --- Admin console (backend/builder/admin_api.py) ---------------------------

// Drop empty filters so the URL (and the server's defaults) stay honest.
const params = (values) => Object.fromEntries(
  Object.entries(values).filter(([, value]) => value !== '' && value !== undefined && value !== null),
)

// Platform activity for a 7, 30 or 90 day range, plus what is waiting.
export const getAdminOverview = (days = 30) =>
  client.get('/admin/overview/', { params: { days } }).then((r) => r.data)

// status: all|registered|guests|admins|active|suspended
// sort: joined|joined_asc|last_login|sites|views|name
export const listAccounts = ({ q = '', status = 'all', sort = 'joined', page = 1 } = {}) =>
  client.get('/admin/accounts/', { params: params({ q, status, sort, page }) }).then((r) => r.data)

export const getAccount = (userId) =>
  client.get(`/admin/accounts/${userId}/`).then((r) => r.data)

// Superuser-only. Grant or remove staff (admin) rights.
export const setAccountAdmin = (userId, staff) =>
  client.post(`/admin/accounts/${userId}/role/`, { staff }).then((r) => r.data)

// Revokes the account's token: signed out on every device, still usable.
export const signOutAccount = (userId) =>
  client.post(`/admin/accounts/${userId}/sessions/`).then((r) => r.data)

// status: all|public|drafts|taken_down|pinned|reported|domains; kind: html|visual
// sort: updated|created|views|visits|favorites|title
export const listAdminSites = ({ q = '', status = 'all', kind = '', category = '', sort = 'updated', page = 1 } = {}) =>
  client.get('/admin/sites/', { params: params({ q, status, kind, category, sort, page }) }).then((r) => r.data)

export const getAdminSite = (siteId) =>
  client.get(`/admin/sites/${siteId}/`).then((r) => r.data)

// status: all|published|removed|withdrawn|reported
export const listAdminComponents = ({ q = '', status = 'all', page = 1 } = {}) =>
  client.get('/admin/components/', { params: params({ q, status, page }) }).then((r) => r.data)

// What admins did: this console and the Django admin, newest first.
export const listAdminActivity = ({ actor = '', target = '', page = 1 } = {}) =>
  client.get('/admin/audit/', { params: params({ actor, target, page }) }).then((r) => r.data)

export const getAdminSystem = () => client.get('/admin/system/').then((r) => r.data)
