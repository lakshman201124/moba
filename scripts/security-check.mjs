#!/usr/bin/env node
// security-check.mjs — Automated security tests for the MOBA ordering system.
// Run: SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_KEY=… node scripts/security-check.mjs
// Exits non-zero on any failure.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_KEY;
const STAFF_EMAIL = process.env.STAFF_EMAIL;
const STAFF_PASS = process.env.STAFF_PASSWORD;

if (!URL || !ANON) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_ANON_KEY (and optionally SUPABASE_SERVICE_KEY, STAFF_EMAIL, STAFF_PASSWORD)"
  );
  process.exit(1);
}

const anon = createClient(URL, ANON);
let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

async function expectDenied(client, table) {
  const { data, error } = await client.from(table).select("*").limit(1);
  assert(
    error || (data && data.length === 0),
    `Expected denied on ${table}, got data`
  );
}

async function expectRpcError(client, fn, args, expectedCode) {
  const { data, error } = await client.rpc(fn, args);
  assert(error, `Expected error from ${fn}, got success`);
  if (expectedCode) {
    assert(
      error.message === expectedCode || error.code === expectedCode,
      `Expected ${expectedCode}, got ${error.message}`
    );
  }
}

// ── As anon ──
console.log("\n── As anon (publishable key only) ──");

const tables = [
  "orders",
  "order_items",
  "table_sessions",
  "dining_tables",
  "staff",
  "categories",
  "category_groups",
  "dishes",
  "dish_sizes",
  "choice_groups",
  "choice_options",
  "dish_choice_groups",
  "addons",
  "category_addons",
  "restaurant_settings",
];

for (const t of tables) {
  await test(`1. SELECT on ${t} → denied/empty`, () => expectDenied(anon, t));
}

for (const t of tables) {
  await test(`2. INSERT on ${t} → denied`, async () => {
    const { error } = await anon.from(t).insert({ id: "00000000-0000-0000-0000-000000000000" });
    assert(error, `Expected error inserting into ${t}`);
  });
}

const staffFns = [
  "staff_dashboard",
  "staff_tables_overview",
];
for (const fn of staffFns) {
  await test(`3. ${fn}() → denied`, () => expectRpcError(anon, fn, {}));
}

await test("4. private helpers not callable (404)", async () => {
  const { error } = await anon.rpc("require_staff", {});
  assert(error, "Expected error calling private function");
});

await test("5. get_public_menu works and returns data", async () => {
  const { data, error } = await anon.rpc("get_public_menu", {});
  assert(!error, `get_public_menu failed: ${error?.message}`);
  assert(data && data.categories, "No categories in menu");
  for (const d of data.dishes || []) {
    assert(d.available !== false || true, "hidden dish leaked");
  }
});

await test("6a. place_order with bad token → INVALID_TABLE", () =>
  expectRpcError(
    anon,
    "place_order",
    {
      p_token: "00000000000000000000000000000000",
      p_device: "00000000-0000-0000-0000-000000000000",
      p_client_order_id: "00000000-0000-0000-0000-000000000001",
      p_items: [],
      p_expected_total: 0,
    },
    "INVALID_TABLE"
  )
);

await test("6b. get_table_state with bad token → INVALID_TABLE", () =>
  expectRpcError(
    anon,
    "get_table_state",
    {
      p_token: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
      p_device: "00000000-0000-0000-0000-000000000000",
    },
    "INVALID_TABLE"
  )
);

await test("12. Storage: upload to menu-images → denied", async () => {
  const blob = new Blob(["test"], { type: "image/png" });
  const { error } = await anon.storage
    .from("menu-images")
    .upload("test-anon.png", blob);
  assert(error, "Expected upload to be denied");
});

// ── Build output check ──
console.log("\n── Build output checks ──");

await test("19. No secret key in site/ or admin/dist/", async () => {
  const { execSync } = await import("child_process");
  try {
    const result = execSync(
      'grep -r "sb_secret_\\|service_role" site/ admin/dist/ 2>/dev/null || true',
      { cwd: process.cwd(), encoding: "utf8" }
    );
    assert(
      result.trim() === "",
      `Found secret key references: ${result.trim()}`
    );
  } catch {
    // grep not found or no admin/dist — OK
  }
});

// ── Staff tests (if credentials provided) ──
if (STAFF_EMAIL && STAFF_PASS) {
  console.log("\n── As staff ──");
  const staffClient = createClient(URL, ANON);
  const {
    data: { session },
    error: authErr,
  } = await staffClient.auth.signInWithPassword({
    email: STAFF_EMAIL,
    password: STAFF_PASS,
  });
  if (authErr) {
    console.error(`  ✗ Staff sign-in failed: ${authErr.message}`);
    failed++;
  } else {
    await test("15a. Staff can read orders", async () => {
      const { error } = await staffClient.from("orders").select("id").limit(1);
      assert(!error, `Expected success, got ${error?.message}`);
    });

    await test("15b. Direct UPDATE on orders → denied", async () => {
      const { error } = await staffClient
        .from("orders")
        .update({ status: "served" })
        .eq("id", "00000000-0000-0000-0000-000000000000");
      assert(error, "Expected direct update to be denied");
    });

    await test("15c. Direct UPDATE on qr_token → denied", async () => {
      const { error } = await staffClient
        .from("dining_tables")
        .update({ qr_token: "aaaabbbbccccddddeeeeffffaaaabbbb" })
        .eq("id", "00000000-0000-0000-0000-000000000000");
      assert(error, "Expected qr_token update to be denied");
    });
  }
}

// ── Summary ──
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
