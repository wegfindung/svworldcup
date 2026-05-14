import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm --prefix server run start',
    url: 'http://127.0.0.1:3000/api/public/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      PUBLIC_WEB_URL: 'http://127.0.0.1:3000',
      DATABASE_URL: '',
      DB_HOST: '',
      DB_PORT: '',
      DB_NAME: '',
      DB_USER: '',
      DB_PASS: '',
      ADMIN_BOOTSTRAP_EMAILS: 'admin@example.com',
      ADMIN_BOOTSTRAP_PASSWORD: 'admin-password-123',
      ADMIN_API_TOKEN: 'admin-api-token-e2e',
      SHARE_SNAPSHOT_SECRET: 'share-secret-e2e',
      CSRF_TOKEN_SECRET: 'csrf-secret-e2e',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
