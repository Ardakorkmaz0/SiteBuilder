import { defineConfig, devices } from '@playwright/test'

// End-to-end checks in a real browser against the real backend: the flows the
// unit tests cannot see (an iframe editor, a published page served by Django,
// two accounts sharing a draft). Each spec pins bugs that shipped once.
//
// Both servers are started here. Locally, ones already running are reused;
// point E2E_PYTHON at the backend's virtualenv if `python` is not it, e.g.
//   E2E_PYTHON=../backend/.venv/Scripts/python.exe npm run e2e
const python = process.env.E2E_PYTHON || 'python'

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // One database and one set of rate limits behind every spec.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /session\.setup\.js/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        storageState: 'e2e/.auth/state.json',
      },
    },
  ],
  webServer: [
    {
      command: `${python} manage.py runserver 127.0.0.1:8001 --noreload`,
      cwd: '../backend',
      url: 'http://127.0.0.1:8001/api/public/config/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // The suite signs in, signs up and shares far more often than a person.
      env: {
        PYTHONUNBUFFERED: '1',
        DJANGO_THROTTLE_AUTH: '1000/min',
        DJANGO_THROTTLE_GUEST: '1000/min',
        DJANGO_THROTTLE_SHARE: '1000/hour',
      },
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
