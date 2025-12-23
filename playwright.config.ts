/**
 * Playwright E2E Test Configuration
 *
 * This configuration is optimized for testing a SvelteKit PWA with WebAuthn support.
 * Uses virtual authenticators via CDP (Chrome DevTools Protocol) for WebAuthn testing.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file patterns
  testMatch: '**/*.e2e.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: isCI,

  // No retries - fail fast
  retries: 0,

  // Use multiple workers for speed
  workers: isCI ? 1 : 4,

  // Reporter configuration
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  // Shared settings for all projects
  use: {
    // Base URL for navigation - SvelteKit dev server
    baseURL: 'http://localhost:5173',

    // Only trace on CI
    trace: isCI ? 'on-first-retry' : 'off',

    // Only screenshot on CI
    screenshot: isCI ? 'only-on-failure' : 'off',

    // No video - speeds up tests
    video: 'off',

    // Fast action timeout
    actionTimeout: 5000,
  },

  // Configure projects for different test scenarios
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // WebAuthn requires secure context
        launchOptions: {
          args: ['--disable-web-security', '--allow-insecure-localhost'],
        },
      },
    },
  ],

  // Run development server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 60000,
    stdout: 'ignore',
    stderr: 'ignore',
  },

  // Fast timeout settings - fail fast
  timeout: 10000,
  expect: {
    timeout: 3000,
  },

  // Output folder for test artifacts
  outputDir: 'e2e-results',
});

