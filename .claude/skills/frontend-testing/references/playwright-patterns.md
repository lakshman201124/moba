# Playwright Patterns for Frontend Testing

This reference details the patterns and practices to follow when using Playwright to test the Paanoor Dashboard or similar applications.

## 1. Environment & Setup
- **Base URL:** Configure `playwright.config.ts` to point to the local development server (e.g., `http://localhost:5173`) and use an `.env` file for testing variables.
- **State Seeding:** Before critical flows (like `Orders` and `Drivers`), set up known states in Supabase.
- **Global Auth Setup:** Don't log in per test. Set up a global `auth.setup.ts` to cache the `sessionStorage` or cookies, so tests run faster by reusing the logged-in state.

## 2. Locators (Best Practices)
- Avoid using fragile CSS classes. Use `data-testid` attributes whenever possible.
  ```typescript
  // Recommended
  await page.getByTestId('submit-btn').click();
  // Instead of
  await page.locator('.btn-primary.mt-4').click();
  ```
- Use semantic selectors like ARIA roles for accessibility verification:
  ```typescript
  await page.getByRole('button', { name: 'Login' }).click();
  ```

## 3. Handling Asynchronous & Real-time Operations
- Supabase connects via WebSockets (`realtime-health` channels). Wait for specific DOM elements to appear rather than using generic `page.waitForTimeout()`.
  ```typescript
  // Wait for the status indicator to turn green/Connected
  await expect(page.locator('.status-connected')).toBeVisible({ timeout: 10000 });
  ```
- Since the dashboard refreshes on its own or uses real-time pushes (e.g., `<OrderAlertBanner />`), use `.waitFor()` to anticipate pop-ups:
  ```typescript
  const alertBanner = page.locator('.order-alert-banner');
  await alertBanner.waitFor({ state: 'visible' });
  await alertBanner.getByRole('button', { name: 'Dismiss' }).click();
  ```

## 4. Mobile & Responsive Testing
- The Paanoor Dashboard has a bottom mobile navigation bar that shows on smaller viewports.
- Configure separate `projects` in Playwright for Desktop and Mobile viewports.
  ```typescript
  // Example for playwright.config.ts
  projects: [
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ]
  ```
- In mobile tests, ensure the `mobileNav` buttons route correctly and `TabBar` functions as expected.

## 5. Mocking Network (Optional but recommended for Edge cases)
- To simulate "Offline" behavior or Supabase returning a 500 error:
  ```typescript
  await page.route('**/rest/v1/orders*', route => {
    route.fulfill({ status: 500, body: 'Internal Server Error' });
  });
  // Assert error banner appears
  await expect(page.locator('.error-toast')).toBeVisible();
  ```

## 6. Visual Testing (Regression)
- For critical, static sections of the app (like `Analytics` charts rendering), capture screenshots:
  ```typescript
  await expect(page).toHaveScreenshot('analytics-dashboard.png', { maxDiffPixels: 100 });
  ```
