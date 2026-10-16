// Browser smoke tests (`pnpm test:e2e`): the built app and its API, driven in a real
// browser. They cover what unit tests can't see — tabs, the diagram's drawing and
// colors, sign-in — so a broken page fails CI before Vercel deploys it.
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
/** Inside the git-ignored data/ folder. */
const E2E_DATA_DIR = 'data/e2e'
const ci = !!process.env.CI

export default defineConfig({
  testDir: 'e2e',
  // Each test signs up its own user, so they can run in parallel against one server.
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Locally, use the Chrome already installed instead of downloading a browser;
    // CI installs Playwright's Chromium (see .github/workflows/ci.yml).
    ...devices['Desktop Chrome'],
    channel: ci ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  // The production server: the built frontend (dist/, from `pnpm build`) plus the API.
  // Its database is wiped first: sign-ups are rate-limited per address (5 an hour), so a
  // database kept between runs would start refusing the test's sign-up.
  webServer: {
    command: `node -e "require('fs').rmSync('${E2E_DATA_DIR}', { recursive: true, force: true })" && tsx server/index.ts --production`,
    url: `http://127.0.0.1:${PORT}/api/auth/me`,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DB_PATH: `${E2E_DATA_DIR}/solar.db`,
      // Plain http here, so the session cookie mustn't require HTTPS.
      COOKIE_SECURE: 'false',
    },
  },
})
