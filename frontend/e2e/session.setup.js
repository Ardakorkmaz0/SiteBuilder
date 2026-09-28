// A fresh account for this run. The password is made here, used once to sign
// up and never written anywhere; the specs work with the token.
import fs from 'node:fs'
import { randomBytes } from 'node:crypto'
import { test as setup, expect } from '@playwright/test'
import { API, AUTH_DIR, SESSION_FILE, STATE_FILE, APP_ORIGIN } from './support.js'

setup('sign up the account the specs use', async ({ request }) => {
  const tag = randomBytes(4).toString('hex')
  const username = `e2e_${tag}`
  const response = await request.post(`${API}/auth/register/`, {
    data: { username, email: `${username}@example.test`, password: `E2e-${randomBytes(12).toString('base64url')}` },
  })
  expect(response.status(), await response.text()).toBe(201)
  const { token, user } = await response.json()

  fs.mkdirSync(AUTH_DIR, { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify({ token, user }))
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    cookies: [],
    origins: [{
      origin: APP_ORIGIN,
      localStorage: [
        { name: 'pwb_token', value: token },
        { name: 'pwb_user', value: JSON.stringify(user) },
        { name: 'pwb_language', value: 'en' },
        { name: 'pwb_editor_tour_v1', value: '1' },
      ],
    }],
  }))
})
