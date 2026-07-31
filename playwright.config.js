// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  // Each test gets its own persistent context with the extension loaded;
  // serial keeps blocked-state from leaking between concurrently running tests.
  workers: 1,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure'
  }
});
