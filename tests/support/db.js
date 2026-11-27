// Throwaway PostgreSQL for tests: one cluster, one template database built from the real
// migrations + seed + fixtures.sql, and a fresh clone of that template for every test.
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { PG_LOCK, PG_LOG, PG_PORT, PGDATA, SUPABASE_DIR, TESTS_DIR, pgBin } from "./env.js";

const run = promisify(execFile);
const ENV = { ...process.env, PGCLIENTENCODING: "UTF8", PGUSER: "postgres", PGPORT: String(PG_PORT), PGHOST: "localhost" };
export const STAFF_ID = "11111111-1111-4111-8111-111111111111";
export const NON_STAFF_ID = "22222222-2222-4222-8222-222222222222";

export class SqlError extends Error {
  constructor(sqlstate, message, detail) {
    super(`${sqlstate}: ${message}`);
    this.sqlstate = sqlstate;
    this.text = message;
    this.detail = detail;
  }
}

function parseError(stderr) {
  const m = stderr.match(/ERROR:\s+([0-9A-Z]{5}):\s+(.*)/);
  const d = stderr.match(/DETAIL:\s+(.*)/);
  return m ? new SqlError(m[1], m[2].trim(), d?.[1]?.trim() ?? null) : new SqlError("XX000", stderr.trim() || "psql failed", null);
}

/** Run SQL in `db` as postgres (or after `set role ...` inside the SQL). Returns trimmed stdout. */
export async function psql(db, sql) {
  try {
    const { stdout } = await run(pgBin("psql"), ["-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-d", db, "-c", sql], { env: ENV, maxBuffer: 32 * 1024 * 1024 });
    return stdout.trim();
  } catch (e) {
    throw parseError(String(e.stderr ?? e.message));
  }
}

async function psqlFile(db, file) {
  try {
    await run(pgBin("psql"), ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", db, "-f", file], { env: ENV, maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    throw new Error(`Loading ${path.basename(file)} failed: ${String(e.stderr ?? e.message).slice(0, 500)}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isReady() {
  try {
    await run(pgBin("pg_isready"), ["-p", String(PG_PORT), "-h", "localhost"], { env: ENV });
    return true;
  } catch {
    return false;
  }
}

/** Create (first run only) and start the test cluster. Safe to call from several processes. */
export async function ensureCluster() {
  if (await isReady()) return;
  if (!fs.existsSync(path.join(PGDATA, "PG_VERSION"))) {
    fs.mkdirSync(path.dirname(PGDATA), { recursive: true });
    await run(pgBin("initdb"), ["-D", PGDATA, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--no-locale"], { env: ENV });
    // Throwaway data: trade durability for speed.
    fs.appendFileSync(path.join(PGDATA, "postgresql.conf"),
      `\nport = ${PG_PORT}\nmax_connections = 300\nfsync = off\nsynchronous_commit = off\nfull_page_writes = off\nshared_buffers = 256MB\n`);
  }
  // Detached with no inherited handles: on Windows the server inherits pg_ctl's stdout/stderr,
  // so waiting on pg_ctl itself would hang for as long as Postgres runs.
  const child = spawn(pgBin("pg_ctl"), ["-D", PGDATA, "-l", PG_LOG, "start"], { env: ENV, detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  for (let i = 0; i < 120; i++) {
    if (await isReady()) return;
    await sleep(500);
  }
  throw new Error(`Postgres did not start within 60 s. See ${PG_LOG}`);
}

function sourceFiles() {
  const migrations = fs.readdirSync(path.join(SUPABASE_DIR, "migrations")).filter((f) => f.endsWith(".sql")).sort()
    .map((f) => path.join(SUPABASE_DIR, "migrations", f));
  return [path.join(SUPABASE_DIR, "tests", "supabase-stubs.sql"), ...migrations, path.join(SUPABASE_DIR, "seed.sql"), path.join(TESTS_DIR, "support", "fixtures.sql")];
}

/** Name of the template for the current SQL sources; changes whenever a migration, the seed or fixtures change. */
export function templateName() {
  const h = createHash("sha256");
  for (const f of sourceFiles()) h.update(path.basename(f)).update(fs.readFileSync(f));
  return `moba_tpl_${h.digest("hex").slice(0, 12)}`;
}

async function dbExists(name) {
  return (await psql("postgres", `select 1 from pg_database where datname = '${name}'`)) === "1";
}

/** Build the template once per SQL change. Other processes wait for whoever holds the lock. */
export async function ensureTemplate() {
  await ensureCluster();
  const name = templateName();
  for (let i = 0; i < 600; i++) {
    if (await dbExists(name)) return name;
    let locked = false;
    try {
      fs.mkdirSync(PG_LOCK);
      locked = true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      // Stale lock (a crashed run) after 3 minutes.
      if (Date.now() - fs.statSync(PG_LOCK).mtimeMs > 180000) fs.rmSync(PG_LOCK, { recursive: true, force: true });
      await sleep(500);
      continue;
    }
    try {
      if (await dbExists(name)) return name;
      const build = `${name}_build`;
      await psql("postgres", `drop database if exists ${build} with (force)`);
      await psql("postgres", `create database ${build}`);
      for (const f of sourceFiles()) await psqlFile(build, f);
      await psql("postgres", `alter database ${build} rename to ${name}`);
      // Old templates from earlier SQL versions are no longer needed.
      const old = (await psql("postgres", `select datname from pg_database where datname like 'moba_tpl_%' and datname <> '${name}' and datname not like '%_build'`)).split("\n").filter(Boolean);
      for (const o of old) await psql("postgres", `drop database if exists ${o} with (force)`).catch(() => {});
      return name;
    } finally {
      if (locked) fs.rmSync(PG_LOCK, { recursive: true, force: true });
    }
  }
  throw new Error("Timed out waiting for the test template database");
}

/** Fresh database for one test. */
export async function cloneDb(name) {
  const tpl = await ensureTemplate();
  await psql("postgres", `drop database if exists ${name} with (force)`);
  await psql("postgres", `create database ${name} template ${tpl} strategy file_copy`);
  return name;
}

export async function dropDb(name) {
  await psql("postgres", `drop database if exists ${name} with (force)`).catch(() => {});
}

/** Helpers bound to one test database. */
export function dbHandle(name) {
  return {
    name,
    sql: (q) => psql(name, q),
    asAnon: (q) => psql(name, `set role anon; ${q}`),
    asStaff: (q) => psql(name, `set role authenticated; set request.jwt.claim.sub = '${STAFF_ID}'; ${q}`),
    asNonStaff: (q) => psql(name, `set role authenticated; set request.jwt.claim.sub = '${NON_STAFF_ID}'; ${q}`),
    json: async (q) => JSON.parse((await psql(name, q)) || "null"),
  };
}
