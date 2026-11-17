#!/usr/bin/env node
/*
 * kit/scripts/new-film.mjs — scaffold a film in the launch format (kit 2).
 *
 *   node kit/scripts/new-film.mjs <slug> --company "Acme" [--force]
 *
 * Creates video/films/<slug>/ from kit/templates/film/: index.html (data-kit-format="launch": hook -> what it
 * is -> problem -> hero -> feature 2 -> feature 3 -> proof -> end card, + captions with chapters + the music
 * bed), compositions/ (hook, what, problem, hero, feature2, feature3, proof, captions), SPEC.md with the beat
 * table (beat, seconds, picture, caption, focus box, honesty), capture/record.cjs (2x capture), capture/cuts.json,
 * package.json; makes raw/, renders/, assets/footage/, data/clips/, links node_modules and vendors the kit and
 * the bed (sync). Then:
 *   1. fill SPEC.md's beat table; read every caption against its reading time
 *   2. write capture/record.cjs, run it          -> raw/<take>/
 *   3. node kit/scripts/build-footage.mjs films/<slug>   -> assets/footage, data/clips
 *   4. set media times, focus names and captions in compositions/ and index.html; npx hyperframes check
 *   5. node kit/scripts/music-bed.mjs films/<slug>       -> the bed levelled to -20 LUFS for the final length
 *   6. node kit/scripts/qa.mjs films/<slug> --frames     -> renders/qa/contact-sheet.jpg; look at ~20 stills
 *   7. npx hyperframes render --quality delivery -o renders/<slug>-launch.mp4; qa.mjs --video (loudness)
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
