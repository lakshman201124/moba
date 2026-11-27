// MOBA test suite. See testing.md for the plan and tests/README.md for commands.
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL, BRIDGE_PORT, LIVE_URL, SITE_DIR } from "./support/env.js";

const API = /\.api\.spec\.js$/;
const LIVE = /\.live\.spec\.js$/;

export default defineConfig({
  testDir: ".",
  testMatch: /phase-\d+\/.*\.spec\.js$/,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  // A flaky test is a bug to fix, not something to retry away.
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  globalSetup: "./support/global-setup.js",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  // Local stand-in for Supabase (see support/bridge.py). Reused if already running.
  webServer: {
    command: `python support/bridge.py "${SITE_DIR}" ${BRIDGE_PORT}`,
    url: `${BASE_URL}/menu.html`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    // Backend calls only, no browser.
    { name: "api", testMatch: API },
    // Main phone. Every browser spec runs here.
    { name: "iphone", use: { ...devices["iPhone 15"] }, testIgnore: [API, LIVE] },
    // Extra devices run only specs tagged @devices.
    { name: "android", use: { ...devices["Pixel 7"] }, grep: /@devices/, testIgnore: [API, LIVE] },
    { name: "iphone-se", use: { ...devices["iPhone SE"] }, grep: /@devices/, testIgnore: [API, LIVE] },
    // Production, read-only smoke checks. Nothing here may create data.
    { name: "live", testMatch: LIVE, use: { ...devices["Desktop Chrome"], baseURL: LIVE_URL } },
  ],
});
