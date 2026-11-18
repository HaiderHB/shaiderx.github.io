/*
 * kit/lib/launch.js — the launch format (kit 2): the rules as data, shared by the page and QA, and the
 * statement scene (one big sentence over blurred, dimmed product footage).
 *
 * A film opts in with data-kit-format="launch" on its root; every scene host in index.html then names its
 * beat: data-kit-beat="hook | what | problem | hero | feature | proof | end".
 *
 * Kit.launch.RULES                 lengths, word limits and sizes QA gates (see video/README.md, "Launch format")
 * Kit.launch.BEATS                 the beat order: hook, what, problem, hero, feature, proof, end
 * Kit.launch.readingTime(words)    max(2.5, 0.5 + 0.6 x words) seconds: how long a caption stays on screen
 * Kit.launch.isLaunch(rootEl?)     true when the film root carries data-kit-format="launch"
 * Kit.launch.mag(scale, clip)      effective magnification of the page: camera zoom x the clip's stageScale
 *                                  (a 1360 px wide capture is already 1.41x on the 1920 stage)
 * Kit.launch.cover(region, zoom)   camera transform that fills the frame with a footage region {x, y, w, h}
 * Kit.launch.statement({id, tl, push = 0.04})
 *     Animates a statement scene built from components/statement-scene.html: the backdrop camera covers the
 *     frame with the region in data-kit-cam="x,y,w,h" on the composition root (default: the whole footage,
 *     zoom 1.06) and pushes in slowly (the scene's ONE camera move); the sentence arrives word by word
 *     (blur 8 px -> 0), *word* = the accent word; the small line fades in after it.
 */
(function (g) {
  const Kit = (g.Kit = g.Kit || {});

  const RULES = {
    duration: { min: 55, max: 90, targetMin: 60, targetMax: 75 },
    scenes: { min: 7, max: 9 },
    // one-line caption: 8 words (12 at the very most), 64-72 px, on screen 2.5-7 s and >= 0.5 + 0.6 s per word
    cue: { words: 8, maxWords: 12, base: 0.5, perWord: 0.6, minSec: 2.5, maxSec: 7, head: 68, minHead: 64, maxHead: 72, tracking: -0.022, width: 1920 - 2 * 120, chipWords: 5 },
    hook: { words: 7, maxSec: 5, head: 72 },
    // kit 2.1: a text-only screen (what, problem) stays 3 s (2.8-3.5); keep its sentence to 10 words
    statement: { words: 10, maxWords: 12, sec: 3, minSec: 2.8, maxSec: 3.5 },
    // a stranger knows what it is and what problem it solves by here (seconds)
    whatBy: 12,
    problemBy: 20,
    hero: 1,
    features: 2,
    proof: { minStats: 1, maxStats: 3, hoodWords: 16, minSec: 5, maxSec: 10 },
    end: { minSec: 4, maxSec: 6 },
    // hero and feature shots show the page at >= 1.5x (camera zoom x stage scale); wide views live in hook / proof
    minMag: 1.5,
    chapters: { min: 3, max: 4 },
    // the scene rule: still, ONE action, the result holds
    still: 1.0,
    hold: 1.5,
    // kit 2.1, the result rule: once the result a shot waits for is on screen (data-kit-lands) it stays
    // max(2.5, 0.5 + 0.3 x data-kit-read words) s, 6 s at most, before the cut; a wait longer than half the
    // shot (and 2.5 s) is trimmed, not shown
    land: { hold: 2.5, base: 0.5, perWord: 0.3, maxHold: 6, waitShare: 0.5, waitSec: 2.5 },
    jargon: ["llm", "json", "api", "schema", "prompt", "token", "tokens", "embedding", "embeddings", "regex", "anchor", "anchored", "anchoring", "sse", "mcp", "rag", "webhook", "endpoint", "payload", "docx", "ooxml"],
  };
  const BEATS = ["hook", "what", "problem", "hero", "feature", "proof", "end"];

  function readingTime(words) {
    return +Math.max(RULES.cue.minSec, RULES.cue.base + RULES.cue.perWord * words).toFixed(2);
  }

  function isLaunch(root) {
    const el = root || (typeof document !== "undefined" ? document.querySelector('[data-composition-id="main"]') : null);
    return !!el && el.getAttribute("data-kit-format") === "launch";
  }

  function mag(scale, clip) {
    const c = typeof clip === "string" ? Kit.clips.get(clip) : clip;
    return +(scale * ((c && c.stageScale) || 1)).toFixed(3);
  }

  function cover(region, zoom) {
    const r = region || { x: 0, y: 0, w: 1920, h: 1080 };
    const s = Math.max(1920 / r.w, 1080 / r.h) * (zoom || 1);
    return { scale: +s.toFixed(4), x: +(960 - s * (r.x + r.w / 2)).toFixed(2), y: +(540 - s * (r.y + r.h / 2)).toFixed(2) };
  }

  function statement(o) {
    const tl = o.tl;
    const host = document.querySelector('[data-composition-id="' + o.id + '"]');
    if (!host) {
      Kit.warn("statement " + o.id + ": root not found");
      return null;
    }
    const inner = host.querySelector("[data-kit-cam]") || host;
    const duration = parseFloat(host.getAttribute("data-duration")) || 6;
    const cam = host.querySelector(".kit-cam");
    const nums = String(inner.getAttribute("data-kit-cam") || "").split(",").map(Number);
    const region = nums.length === 4 && nums.every(Number.isFinite) ? { x: nums[0], y: nums[1], w: nums[2], h: nums[3] } : null;
    const push = o.push != null ? o.push : 0.04;
    if (cam) {
      const a = cover(region, region ? 1 : 1.06);
      const b = cover(region, (region ? 1 : 1.06) * (1 + push));
      tl.set(cam, Object.assign({ transformOrigin: "0 0" }, a), 0);
      tl.to(cam, Object.assign({ duration: Math.max(0.2, duration - 0.02), ease: "none" }, b), 0.001);
    }
    const text = host.querySelector(".kit-statement-text");
    const sub = host.querySelector(".kit-statement-sub");
    let landed = 0.1;
    if (text) {
      if (Kit.captions) Kit.captions.accent(text);
      // kit 2.1: a 3 s screen has the whole sentence up within ~0.5 s
      landed = Kit.reveal.words(tl, text, 0.06, duration <= 3.6 ? { stagger: 0.03, dur: 0.16 } : { stagger: 0.045, dur: 0.18 });
    }
    if (sub) Kit.reveal.blurIn(tl, sub, Math.min(landed + 0.1, 0.9), { dur: 0.3, blur: 6 });
    return { duration, region };
  }

  // seconds a landed result must stay on screen before the cut (words = what the viewer has to read in it)
  function landHold(words) {
    const L = RULES.land;
    return +Math.min(L.maxHold, Math.max(L.hold, L.base + L.perWord * (words || 0))).toFixed(2);
  }

  Kit.launch = { RULES, BEATS, readingTime, landHold, isLaunch, mag, cover, statement };
  if (typeof module === "object" && module.exports) module.exports = Kit;
})(typeof window !== "undefined" ? window : globalThis);
