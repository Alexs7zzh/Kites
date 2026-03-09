import {defineConfig, devices} from '@playwright/test'

const useOriginalReference = process.env.PLAYWRIGHT_REFERENCE_APP === 'original'

const baseURL = 'http://127.0.0.1:4173'

const webServer = useOriginalReference
  ? {
      command: 'HOST=127.0.0.1 PORT=4173 BROWSER=none CI=1 npm start',
      cwd: '/Users/alex/dev/Kite-Website',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
    }
  : {
      command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
      cwd: '/Users/alex/dev/kites/web',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    }

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.07,
    },
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    viewport: {width: 1440, height: 900},
  },
  webServer,
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],
})
