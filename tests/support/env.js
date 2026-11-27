// Paths, ports and URLs for the test suite. Every value can be overridden with an environment variable.
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TESTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_DIR = path.resolve(TESTS_DIR, "..");
export const SITE_DIR = path.join(REPO_DIR, "site");
export const SUPABASE_DIR = path.join(REPO_DIR, "supabase");

const WIN = process.platform === "win32";
// PostgreSQL 17 binaries. On Linux/macOS leave PG_BIN empty and they are found on PATH.
export const PG_BIN = process.env.PG_BIN ?? (WIN ? "C:\\Program Files\\PostgreSQL\\17\\bin" : "");
export const pgBin = (name) => (PG_BIN ? path.join(PG_BIN, WIN ? `${name}.exe` : name) : name);

// The throwaway test cluster lives OUTSIDE the repo: the repo sits in OneDrive, and a synced
// database folder is slow and can corrupt.
const LOCAL = process.env.LOCALAPPDATA ?? path.join(os.homedir(), ".cache");
export const PGDATA = process.env.MOBA_PGDATA ?? path.join(LOCAL, "moba-test-pg", "data");
export const PG_LOG = path.join(path.dirname(PGDATA), "postgres.log");
export const PG_LOCK = path.join(path.dirname(PGDATA), "template.lock");
export const PG_PORT = Number(process.env.MOBA_PG_PORT ?? 54329);

export const BRIDGE_PORT = Number(process.env.MOBA_BRIDGE_PORT ?? 5510);
export const BASE_URL = `http://127.0.0.1:${BRIDGE_PORT}`;

// Production. Only *.live.spec.js files may use these, and only read-only.
export const LIVE_URL = process.env.MOBA_LIVE_URL ?? "https://moba-h5ag.vercel.app";
