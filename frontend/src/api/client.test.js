import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import client from './client.js'
import { useAuthStore } from '../store/authStore.js'
import { SESSION_EXPIRED_EVENT } from '../utils/editorRecovery.js'

function refuse(config) {
  return Promise.reject(Object.assign(new Error('Unauthorized'), { config, response: { status: 401 } }))
}

beforeEach(() => useAuthStore.getState().setAuth('active-token', { id: 7 }))
afterEach(() => useAuthStore.getState().logout())

describe('an unauthorized API response', () => {
  it('captures unsaved work synchronously before clearing the active identity', async () => {
    const capture = vi.fn(() => expect(useAuthStore.getState().user.id).toBe(7))
    window.addEventListener(SESSION_EXPIRED_EVENT, capture, { once: true })
    await expect(client.get('/sites/1/', { adapter: refuse })).rejects.toThrow('Unauthorized')
    expect(capture).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('keeps the editor accessible if its recovery storage is full', async () => {
    window.addEventListener(SESSION_EXPIRED_EVENT, (event) => event.preventDefault(), { once: true })
    await expect(client.get('/sites/1/', { adapter: refuse })).rejects.toThrow('Unauthorized')
    expect(useAuthStore.getState().token).toBe('active-token')
  })

  it('does not sign a new session out for an old request', async () => {
    await expect(client.get('/sites/1/', { adapter: (config) => {
      useAuthStore.getState().setAuth('new-token', { id: 8 })
      return refuse(config)
    } })).rejects.toThrow('Unauthorized')
    expect(useAuthStore.getState().token).toBe('new-token')
  })

  it('does not erase a guest session when a public sign-in is refused', async () => {
    await expect(client.post('/auth/login/', {}, { publicAuth: true, adapter: (config) => {
      expect(config.headers.Authorization).toBeUndefined()
      return refuse(config)
    } })).rejects.toThrow('Unauthorized')
    expect(useAuthStore.getState().token).toBe('active-token')
  })
})
