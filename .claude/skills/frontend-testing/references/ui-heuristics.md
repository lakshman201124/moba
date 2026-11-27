# UI Heuristics for Frontend Testing

When executing visual QA and UI testing, apply these heuristics to rigorously audit the interface.

## 1. Visual Hierarchy & Typography
- [ ] Ensure `<h1>` is present and unique per page for SEO/accessibility.
- [ ] Check relative font sizes (e.g. `<h2>` should be smaller than `<h1>`).
- [ ] Validate contrast ratio of text against background (WCAG 2.1 AA).
- [ ] Check line-heights for readability.

## 2. Interactive Element States
- [ ] **Default state:** Element is visible and styled properly.
- [ ] **Hover state:** Cursor changes to pointer, element provides visual feedback (e.g., color shift, scale).
- [ ] **Active/Pressed state:** Element visually depresses or indicates activation.
- [ ] **Focus state:** Keyboard navigation outlines the element (accessibility ring).
- [ ] **Disabled state:** Element looks inactive (opacity lowered, greyscale) and cursor shows `not-allowed`.

## 3. Feedback & Loading Scenarios
- [ ] **Loading Skeletons:** Ensure skeletons match the shape of the content they replace to minimize Layout Shift (CLS).
- [ ] **Spinners/Indicators:** Displayed immediately on asynchronous actions.
- [ ] **Success Toasts/Snackbars:** Visual confirmation after CRUD operations.
- [ ] **Error Toasts/Banners:** Clear, actionable error messages on request failures.
- [ ] **Empty States:** Meaningful illustrations and CTA when a list/table is empty.

## 4. Input Validations (Forms)
- [ ] **Required fields:** Highlighted when missed on submit.
- [ ] **Format validation:** Validating email, phone, and standard string formats.
- [ ] **Inline errors:** Rendered synchronously under the specific input field that caused the error.
- [ ] **Input sanitation:** Stripping leading/trailing spaces correctly.
- [ ] **Button disabling:** Disable submit button while the form is submitting to prevent duplicate POST requests.

## 5. Responsiveness & Layout Shifts
- [ ] **Mobile Viewport (< 768px):** Verify critical actions are reachable (e.g., bottom navigation bars).
- [ ] **Tablet Viewport (768px - 1024px):** Verify grid column adjustments (e.g., from 3 to 2 columns).
- [ ] **Desktop Viewport (> 1024px):** Verify layout doesn't overstretch, max-widths are applied.
- [ ] Ensure there is no horizontal scrolling on mobile viewports.
- [ ] Z-index checks: Modals should appear above sidebars, drop-downs above content.

## 6. Edge Cases
- [ ] Rapid consecutive clicking on buttons (debounce/throttle logic checks).
- [ ] Extremely long text strings in tables or cards (text should truncate with ellipsis).
- [ ] Missing images/icons (should show fallbacks).
- [ ] Disconnected network states (should show offline banner or retry states).
