// Runs once before the suite: start the test Postgres and build the template database if the
// migrations, seed or fixtures changed. Skipped when only the live smoke project runs.
import { ensureTemplate } from "./db.js";

export default async function globalSetup(config) {
  const projects = config.projects.map((p) => p.name);
  const onlyLive = process.argv.some((a) => a === "--project=live") || (projects.length === 1 && projects[0] === "live");
  if (onlyLive) return;
  await ensureTemplate();
}
