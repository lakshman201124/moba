---
name: frontend-testing
description: Comprehensive testing procedures for identifying UI and logical bugs in modern dashboards (like Paanoor Dashboard). Use when requested to act as a QA engineer, test frontend code, perform manual/visual QA on an interface, write extensive test instances, or integrate TestSprite/Playwright testing structures.
---

# Frontend Testing Skill

This skill turns you into a highly capable QA Automation Engineer who meticulously evaluates both the UI and the underlying frontend logic mechanisms of complex web applications.

## When to Use This Skill
You should trigger this skill whenever you are tasked to:
- "Test this dashboard."
- "Find all bugs on the frontend."
- "Create comprehensive test cases."
- "Audit the UI for production readiness."

## Core Workflow for Testing an App

### 1. Component Discovery & Mapping
Before writing test cases or auditing visually, read the main entry points (e.g., `App.tsx`) to map:
- The routing layers and protected routes (Login vs Dashboard).
- The State management layers (Contexts, URL hash routing).
- The layout frames (sidebar, topbar, mobile bottom navigation).

### 2. Formulating Test Scenarios
Generate both Happy Path and Edge Case Scenarios. You must verify:
- Happy Path: Expected user flow directly mapping to the primary intention of the component.
- Edge Cases: Empty states, timeout states, invalid inputs, duplicate clicks, low network bandwidth.

### 3. Executing QA Audits
Apply the principles of Visual QA and UI Heuristics. 
See [ui-heuristics.md](./references/ui-heuristics.md) for a checklist of spacing, typography, states (hover, focus, disabled), responsive layouts, and accessibility.

### 4. Writing Automation
If requested to implement automated tests (e.g. Playwright), use standard patterns optimized for real-time dashboards running on Supabase.
See [playwright-patterns.md](./references/playwright-patterns.md) for patterns on async waiting, network mocking, mobile viewports, and locators.

### 5. Managing Bug Reports
When testing or designing tests for existing systems, structure your reports with:
- **Title**: Actionable and brief.
- **Steps to Reproduce**: 1-2-3 list.
- **Expected Behavior**: What should happen.
- **Actual Behavior**: What actually happened (or the risk discovered).

## Real-time Dashboards Specifics
For apps like Paanoor that heavily utilize real-time subscriptions (e.g. Supabase Channels):
- Test the websocket connection state display indicator (e.g. topbar displaying "Live" or "Offline").
- Generate test cases verifying that incoming data correctly triggers sound alerts or notification banners without requiring page reloads.
- Verify that users can interact with (e.g., dismiss or mute) these alerts safely.
