#!/usr/bin/env node
/*
 * kit/scripts/new-film.mjs — scaffold a film on the retention-first template.
 *
 *   node kit/scripts/new-film.mjs <slug> --company "Acme" [--force]
 *
 * Creates video/films/<slug>/ from kit/templates/film/ (kit 1.1: index.html with cold open -> footage
 * scene -> end card + captions + the music bed, compositions/demo.html, compositions/captions.html (v2
 * cues + progress stepper), SPEC.md, capture/record.cjs, capture/cuts.json, package.json), makes raw/,
 * renders/, assets/footage/, data/clips/, links node_modules and vendors the kit and the bed (sync). Then:
 *   1. write capture/record.cjs, run it          -> raw/<clip>/
 *   2. node kit/scripts/build-footage.mjs films/<slug>   -> assets/footage, data/clips
 *   3. edit compositions + index.html variables (data-kit-accent = the demo's accent); npx hyperframes check
 *   4. node kit/scripts/music-bed.mjs films/<slug>       -> the bed levelled to -20 LUFS for the final length
 *   5. node kit/scripts/qa.mjs films/<slug> --frames     -> renders/qa/contact-sheet.jpg
 *   6. npx hyperframes render --quality delivery -o renders/<slug>-launch.mp4; qa.mjs --video (loudness)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncFilm } from "./sync.mjs";

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIDEO = path.resolve(KIT, "..");
const args = process.argv.slice(2);
const slug = args[0];
if (!slug || slug.startsWith("-")) {
  console.error('usage: new-film.mjs <slug> --company "Name" [--force]');
  process.exit(1);
}
const get = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const company = get("--company", slug.replace(/(^|-)(\w)/g, (m, a, b) => (a ? " " : "") + b.toUpperCase()));
const force = args.includes("--force");
const film = path.join(VIDEO, "films", slug);
if (fs.existsSync(path.join(film, "index.html")) && !force) {
  console.error(`films/${slug} exists (use --force to overwrite template files; raw/ and assets/ are kept)`);
  process.exit(1);
}

const subst = (s) => s.replaceAll("{{SLUG}}", slug).replaceAll("{{COMPANY}}", company);
function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copy(s, d);
    else if (/\.(html|md|json|cjs|mjs|js|css|txt)$/.test(e.name)) fs.writeFileSync(d, subst(fs.readFileSync(s, "utf8")));
    else fs.copyFileSync(s, d);
  }
}
copy(path.join(KIT, "templates", "film"), film);
for (const d of ["raw", "renders", "assets/footage", "data/clips"]) fs.mkdirSync(path.join(film, d), { recursive: true });
syncFilm(film);
console.log(`\nfilms/${slug} ready. Next: capture/record.cjs -> build-footage -> compositions -> qa.mjs --frames -> render`);
