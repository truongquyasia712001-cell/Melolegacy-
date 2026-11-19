import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'ipad-safari-portrait', use: { ...devices['iPad (gen 11)'], browserName: 'webkit' } },
    { name: 'ipad-safari-landscape', use: { ...devices['iPad (gen 11) landscape'], browserName: 'webkit' } },
    { name: 'ipad-mini-safari', use: { ...devices['iPad Mini'], browserName: 'webkit' } },
    { name: 'android-chrome-tablet', use: { ...devices['Galaxy Tab S9'], browserName: 'chromium' } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 0.0.0.0',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
