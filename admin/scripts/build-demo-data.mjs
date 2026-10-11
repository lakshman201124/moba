#!/usr/bin/env node
// build-demo-data.mjs: turn supabase/seed.sql into the menu that demo mode starts from.
// Run from admin/: node scripts/build-demo-data.mjs
// Output: src/demo/menu.json (real MOBA menu rows, same columns as the database).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ADMIN = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ADMIN, "..");
const sql = readFileSync(join(ROOT, "supabase/seed.sql"), "utf8");

// One SQL literal: 'text' (with '' escapes), optionally ::jsonb, or null / true / false / number.
function parseValues(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === ",") { i++; continue; }
    if (ch === "'") {
      let s = "";
      i++;
      while (i < src.length) {
        if (src[i] === "'" && src[i + 1] === "'") { s += "'"; i += 2; continue; }
        if (src[i] === "'") { i++; break; }
        s += src[i++];
      }
      if (src.startsWith("::jsonb", i)) { i += 7; out.push(JSON.parse(s)); } else out.push(s);
      continue;
    }
    const m = /^[^,]+/.exec(src.slice(i));
    const raw = m[0].trim();
    i += m[0].length;
    out.push(raw === "null" ? null : raw === "true" ? true : raw === "false" ? false : Number(raw));
  }
  return out;
}

const tables = {};
for (const line of sql.split(/\r?\n/)) {
  const m = /^insert into public\.(\w+) \(([^)]*)\) values \((.*)\);$/.exec(line);
  if (!m) continue;
  const cols = m[2].split(",").map((c) => c.trim());
  const vals = parseValues(m[3]);
  const row = Object.fromEntries(cols.map((c, k) => [c, vals[k]]));
  (tables[m[1]] ??= []).push(row);
}

// Real MOBA photos from site/assets/dishes, copied into public/demo. Each photo goes on the one
// dish it shows; every other dish keeps the "No photo yet" tile rather than a borrowed picture.
const PHOTOS = {
  "Classic Rabokki": "rabokki.jpg",
  "Korean Cream Cheese Bun": "cream-cheese-bun.jpg",
  "Classic Toppoki": "toppoki.jpg",
  "Fiery Gochujang Gimbap": "gimbap.jpg",
  "Mozzarella Cheese Corn Dogg": "corn-dogg.jpg",
  "Korean Fries": "street-fries.jpg",
  "Classic Veg Mandu": "mandu.jpg",
  "Cheezy Spicy Veg Mandu": "mandu-saucy-plate.jpg",
  "Spicy Chicken Mandu": "mandu-broth-bowl.jpg",
  "Creamy Broccoli Soup": "soup.jpg",
  "Fiery Gochuchang": "rameyon.jpg",
  "Korean Fried Chicken Wings": "fried-chicken.jpg",
  "Fiery Seoul Gochujang": "starters.jpg",
};
// A category cover is the category's photo, so one of its dishes' photos is honest there.
const COVERS = {
  signatures: "rabokki.jpg", starters: "starters.jpg", crispy: "fried-chicken.jpg", street: "corn-dogg.jpg",
  mandu: "mandu.jpg", salads: "soup.jpg", gimbap: "gimbap.jpg", rameyon: "rameyon.jpg",
};

const used = new Set();
const photo = (file) => (used.add(file), `demo/dishes/${file}`);

for (const c of tables.categories) c.image_path = COVERS[c.slug] ? photo(COVERS[c.slug]) : null;
for (const d of tables.dishes) d.image_path = PHOTOS[d.name] ? photo(PHOTOS[d.name]) : null;
const placed = tables.dishes.filter((d) => d.image_path).length;
if (placed !== Object.keys(PHOTOS).length) throw new Error(`Placed ${placed} of ${Object.keys(PHOTOS).length} photos: a dish name changed`);

const outDir = join(ADMIN, "public/demo/dishes");
mkdirSync(outDir, { recursive: true });
for (const file of used) {
  const src = join(ROOT, "site/assets/dishes", file);
  if (statSync(src).size === 0) throw new Error(`${file} is empty`);
  copyFileSync(src, join(outDir, file));
}

mkdirSync(join(ADMIN, "src/demo"), { recursive: true });
writeFileSync(join(ADMIN, "src/demo/menu.json"), JSON.stringify(tables));
console.log(Object.entries(tables).map(([k, v]) => `${k}: ${v.length}`).join("\n"));
console.log(`photos: ${used.size}`);
