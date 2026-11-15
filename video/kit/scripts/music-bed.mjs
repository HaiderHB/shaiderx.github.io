#!/usr/bin/env node
/*
 * kit/scripts/music-bed.mjs — put an instrumental bed from kit/music/ under the whole film (kit 1.1).
 *
 *   node kit/scripts/music-bed.mjs <film> [--bed bright-pluck-112] [--align end|start] [--media-start S]
 *                                         [--lufs -20] [--fade-in 0.3] [--fade-out 1.5] [--dry-run]
 *
 * 1. Plans the bed with Kit.music.plan: data-start 0, data-duration = the root's data-duration, fade in
 *    0.3 s, fade out 1.5 s ending on the film's last frame. --align end (default) starts the bed so its own
 *    ending (kit/music/beds.json "end") lands on the last frame; --align start plays it from 0 s.
 * 2. Measures that exact excerpt (trim + the same linear fades, ffmpeg ebur128 with true peak) and sets
 *    data-volume so the film integrates at --lufs (default -20 LUFS) with true peak <= -1.5 dBTP
 *    (QA on the render: -22..-18 LUFS, <= -1 dBTP).
 * 3. Writes one <audio id="music" class="clip kit-music"> between <!-- kit:music:start --> and
 *    <!-- kit:music:end --> in index.html (inside the root, after the scene hosts), and vendors the bed
 *    into films/<slug>/assets/music/ (sync does the same on every sync).
 * Re-run it whenever the film's length changes (QA fails a bed that does not end on the last frame).
 * Used by: the film template, distru.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { vendorMusic } from "./sync.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIT = path.resolve(HERE, "..");
const argv = process.argv.slice(2);
if (!argv.length || argv[0] === "--help") {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
  process.exit(argv.length ? 0 : 1);
}
const film = path.resolve(argv[0]);
const val = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const DRY = argv.includes("--dry-run");

globalThis.Kit = undefined;
require(path.join(KIT, "lib", "core.js"));
require(path.join(KIT, "lib", "music.js"));
const Kit = globalThis.Kit;

const manifest = JSON.parse(fs.readFileSync(path.join(KIT, "music", "beds.json"), "utf8"));
const name = val("--bed", manifest.default);
const bed = manifest.beds[name];
if (!bed) {
  console.error(`unknown bed "${name}" (kit/music/beds.json: ${Object.keys(manifest.beds).join(", ")})`);
  process.exit(1);
}
const indexFile = path.join(film, "index.html");
let html = fs.readFileSync(indexFile, "utf8");
const rootTag = html.replace(/<!--[\s\S]*?-->/g, "").match(/<div[^>]*data-composition-id="main"[^>]*>/);
const filmDur = rootTag ? parseFloat((rootTag[0].match(/data-duration="([^"]+)"/) || [])[1]) : NaN;
if (!Number.isFinite(filmDur)) {
  console.error("index.html: no root data-duration");
  process.exit(1);
}
const target = parseFloat(val("--lufs", String(Kit.music.TARGET.lufs)));
const p = Kit.music.plan({
  film: filmDur,
  bed: Object.assign({ name }, bed),
  align: val("--align", "end"),
  mediaStart: argv.includes("--media-start") ? parseFloat(val("--media-start")) : undefined,
  fadeIn: parseFloat(val("--fade-in", "0.3")),
  fadeOut: parseFloat(val("--fade-out", "1.5")),
});
if (p.problems.length) {
  console.error("plan: " + p.problems.join("; "));
  process.exit(1);
}

// measure the excerpt exactly as it will play (unity gain)
const src = path.join(KIT, "music", bed.file);
const af = `afade=t=in:st=0:d=${p.fadeIn},afade=t=out:st=${(p.duration - p.fadeOut).toFixed(3)}:d=${p.fadeOut},ebur128=peak=true`;
const r = (() => {
  const out = spawnSync("ffmpeg", ["-nostats", "-hide_banner", "-ss", String(p.mediaStart), "-t", String(p.duration), "-i", src, "-af", af, "-f", "null", "-"], { encoding: "utf8" });
  return (out.stderr || "") + (out.stdout || "");
})();
const summary = r.slice(r.lastIndexOf("Summary:"));
const I = parseFloat((summary.match(/I:\s*(-?[\d.]+) LUFS/) || [])[1]);
const TP = parseFloat((summary.match(/Peak:\s*(-?[\d.]+) dBFS/) || [])[1]);
if (!Number.isFinite(I)) {
  console.error("could not measure the bed:\n" + r.slice(-600));
  process.exit(1);
}
let gain = target - I;
let capped = false;
if (Number.isFinite(TP) && TP + gain > -1.5) {
  gain = -1.5 - TP;
  capped = true;
}
const volume = Kit.music.volume(gain);
const tag =
  `<audio id="music" class="clip kit-music" src="assets/music/${bed.file}" data-kit-music="${name}" ` +
  `data-start="0" data-duration="${p.duration}" data-media-start="${p.mediaStart}" data-volume="${volume}" ` +
  `data-fade-in="${p.fadeIn}" data-fade-out="${p.fadeOut}" data-kit-lufs="${target}" data-timeline-role="music" data-track-index="9"></audio>`;

console.log(`bed ${name}: media ${p.mediaStart.toFixed(2)}-${(p.mediaStart + p.duration).toFixed(2)} s of ${bed.duration} s (align ${val("--align", "end")}), fades ${p.fadeIn}/${p.fadeOut} s`);
console.log(`excerpt at unity: ${I.toFixed(1)} LUFS, true peak ${Number.isFinite(TP) ? TP.toFixed(1) : "?"} dBTP -> gain ${gain.toFixed(2)} dB (data-volume ${volume})${capped ? " [capped by true peak]" : ""}`);
console.log(`expected film: ${(I + gain).toFixed(1)} LUFS, true peak ${Number.isFinite(TP) ? (TP + gain).toFixed(1) : "?"} dBTP`);

if (DRY) {
  console.log("\n" + tag);
  process.exit(0);
}
const re = /(<!--\s*kit:music:start\s*-->)([\s\S]*?)(<!--\s*kit:music:end\s*-->)/;
if (!re.test(html)) {
  console.error(
    "index.html has no <!-- kit:music:start --> / <!-- kit:music:end --> markers. Add them inside the root\n" +
      '(<div id="root" data-composition-id="main">), after the scene hosts, then run this again.'
  );
  process.exit(1);
}
const indent = (html.match(/\n([ \t]*)<!--\s*kit:music:start/) || [])[1] || "      ";
html = html.replace(re, `$1\n${indent}${tag}\n${indent}$3`);
fs.writeFileSync(indexFile, html);
const vendored = vendorMusic(film);
console.log(`wrote #music to index.html; vendored ${vendored.join(", ")} -> assets/music/`);
