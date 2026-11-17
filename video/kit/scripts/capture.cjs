/*
 * kit/scripts/capture.cjs — record a demo take: Playwright + CDP screencast (1920x1080 at dsf 1; kit 2: 2x),
 * a visible cursor drawn into the page, DOM boxes of named components sampled every animation
 * frame, and event marks (clicks, scrolls, cursor path, your own labels). Everything is timed
 * from clip.begin(), which becomes t = 0 of the footage built by build-footage.mjs.
 *
 * Use it from a film's capture script (films/<slug>/capture/record.cjs):
 *   const cap = require("../../../kit/scripts/capture.cjs");
 *   const clip = await cap.startClip({
 *     film: path.join(__dirname, ".."),          // writes <film>/raw/<name>/...
 *     name: "s2",
 *     url: "http://localhost:3160/demo/acme/",
 *     track: {                                  // component name -> CSS selector, or (document) => Element
 *       email: "#email-card",
 *       trace: (d) => [...d.querySelectorAll("h3")].find((h) => h.textContent === "Agent run")?.closest("section"),
 *       line9: { sel: "#code [data-line='9']", clip: true },  // {sel | fn, clip}: clip: true records only the part
 *     },                                        // inside overflow-clipping ancestors (scroll panes); hidden = absent
 *   });
 *   const { page } = clip;
 *   // ...set the page up (pre-roll is not recorded into the footage)...
 *   clip.begin();
 *   await clip.click(page.getByRole("button", { name: "Run agent" }), { label: "run" });
 *   await clip.waitText("Reply drafted");       // waits, then marks "Reply drafted"
 *   await clip.scrollTo(1200, 1400);            // smooth scroll, logged as an event
 *   clip.mark("done");
 *   await clip.finish();
 *
 * Output (raw/ is git-ignored):
 *   raw/<name>/frames/f00000.jpg ...  screencast frames (JPEG q94)
 *   raw/<name>/frames.json            {t0, endWall, frames: [{file, ts}], marks}
 *   raw/<name>/boxes.json             {viewport, samples: [{name, t, x, y, w, h} | {name, t, absent: true}]}
 *   raw/<name>/events.json            [{type: "click"|"cursor"|"scroll"|"mark", t, ...}]
 *
 * Options: viewport {width, height} (default 1920x1080), quality (JPEG, 94), headless (true),
 *          cursor (true: draw the arrow), launch (extra chromium.launch options), init (page init script)
 * Kit 2 (launch format, all optional; defaults keep kit 1.1 captures unchanged):
 *   deviceScaleFactor  2 = record at 2x device pixels, so 1.5-2x camera zooms stay sharp. The viewport stays
 *                      in CSS px; frames are viewport x dsf (e.g. viewport 1360x765, dsf 2 -> 2720x1530).
 *                      Uses Chromium's --force-device-scale-factor (the CDP screencast ignores an emulated
 *                      dsf). Expect ~12-15 changed frames/s at 2x on a 2-core box; record when it is idle.
 *                      Keep the viewport 16:9; build-footage scales boxes and events to the 1920x1080 stage,
 *                      so a 1360 px wide viewport also makes the UI 1.41x larger in the film.
 *   cursor             {scale: 0.75, idleHide: 1200}: arrow size (1 = 30x38 CSS px, about 2x a system
 *                      arrow; 0.75 = about 1.5x) and ms without movement after which it fades out
 *   clickPause         ms the cursor rests on a target before every click (default 200; launch films 450)
 * Live runs cost money: prefer the demo's example / same-day cached runs, and label them in the film.
 */
const fs = require("fs");
const path = require("path");

function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_PATH, "playwright", "/opt/npm-tools/node_modules/playwright"].filter(Boolean);
  for (const t of tries) {
    try {
      return require(t);
    } catch (e) {
      /* next */
    }
  }
  throw new Error("playwright not found: set PLAYWRIGHT_PATH or npm i -D playwright");
}

function cursorSource(o) {
  o = o || {};
  const scale = o.scale || 1;
  const idle = o.idleHide || 0;
  return `
(() => {
  const SCALE = ${scale}, IDLE = ${idle};
  const install = () => {
    if (document.getElementById('__kit_cursor')) return;
    const c = document.createElement('div');
    c.id = '__kit_cursor';
    c.innerHTML = '<svg width="' + 30 * SCALE + '" height="' + 38 * SCALE + '" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M2 2 L2 31 L9.5 24.5 L14.5 35.5 L19.5 33.3 L14.6 22.4 L24.5 22.4 Z" fill="#ffffff" stroke="#0b0d10" stroke-width="2.2" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0px', top: '0px', zIndex: 2147483647, pointerEvents: 'none',
      transform: 'translate(-200px,-200px)', transition: IDLE ? 'opacity .22s linear' : 'none', opacity: IDLE ? '0' : '1',
      filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.45))' });
    document.documentElement.appendChild(c);
    let x = -200, y = -200, s = 1, timer = null;
    const paint = () => { c.style.transform = 'translate(' + (x - 2 * SCALE) + 'px,' + (y - 2 * SCALE) + 'px) scale(' + s + ')'; c.style.transformOrigin = 2 * SCALE + 'px ' + 2 * SCALE + 'px'; };
    const wake = () => { if (!IDLE) return; c.style.opacity = '1'; clearTimeout(timer); timer = setTimeout(() => { c.style.opacity = '0'; }, IDLE); };
    window.addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; paint(); wake(); }, true);
    window.addEventListener('mousedown', () => { s = 0.86; paint(); wake(); }, true);
    window.addEventListener('mouseup', () => { s = 1; paint(); wake(); }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();`;
}
const CURSOR_JS = cursorSource();

// in-page sampler: records a component's rect whenever it changes (every animation frame)
function samplerSource(defs) {
  return `(() => {
    const defs = ${JSON.stringify(defs)};
    const fns = {};
    for (const [name, d] of Object.entries(defs)) {
      fns[name] = d.sel ? (doc) => doc.querySelector(d.sel) : new Function('document', 'return (' + d.fn + ')(document)');
    }
    const st = (window.__kitTrack = { samples: [], last: {}, on: true });
    const tick = () => {
      if (!st.on) return;
      const ts = performance.timeOrigin + performance.now();
      for (const name of Object.keys(fns)) {
        let el = null;
        try { el = fns[name](document); } catch (e) { el = null; }
        let key = 'absent', rec = { name, ts, absent: true };
        if (el) {
          let r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          // clip: true -> only the part not hidden by overflow-clipping ancestors (a line in a code view)
          if (defs[name].clip && r.width > 0 && r.height > 0) {
            let L = r.left, T = r.top, R = r.right, B = r.bottom;
            for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
              const s = getComputedStyle(a);
              if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
              const ar = a.getBoundingClientRect();
              if (s.overflowX !== 'visible') { L = Math.max(L, ar.left); R = Math.min(R, ar.right); }
              if (s.overflowY !== 'visible') { T = Math.max(T, ar.top); B = Math.min(B, ar.bottom); }
            }
            r = { left: L, top: T, width: Math.max(0, R - L), height: Math.max(0, B - T) };
          }
          if (r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') {
            rec = { name, ts, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
            key = [rec.x, rec.y, rec.w, rec.h].join(',');
          }
        }
        if (st.last[name] !== key) { st.last[name] = key; st.samples.push(rec); }
      }
      requestAnimationFrame(tick);
    };
    tick();
  })()`;
}

async function startClip(opts) {
  const { chromium } = loadPlaywright();
  const width = (opts.viewport && opts.viewport.width) || 1920;
  const height = (opts.viewport && opts.viewport.height) || 1080;
  const outDir = path.join(opts.film, "raw", opts.name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, "frames"), { recursive: true });

  // kit 2: a real 2x surface. The CDP screencast returns frames at the window's size in device-independent px and
  // ignores an emulated deviceScaleFactor, so the scale is forced on the browser and the context takes the window size.
  const dsf = opts.deviceScaleFactor && opts.deviceScaleFactor !== 1 ? opts.deviceScaleFactor : 1;
  const launch = Object.assign({ headless: opts.headless !== false }, opts.launch || {});
  if (dsf !== 1) launch.args = (launch.args || []).concat([`--force-device-scale-factor=${dsf}`, `--window-size=${width},${height}`]);
  const browser = await chromium.launch(launch);
  const ctx = await browser.newContext(dsf !== 1 ? { viewport: null } : { viewport: { width, height }, deviceScaleFactor: 1 });
  if (opts.cursor !== false) await ctx.addInitScript(opts.cursor && typeof opts.cursor === "object" ? cursorSource(opts.cursor) : CURSOR_JS);
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let recording = true;
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId });
    } catch (e) {
      /* closed */
    }
    if (!recording) return;
    const file = `f${String(frames.length).padStart(5, "0")}.jpg`;
    fs.writeFileSync(path.join(outDir, "frames", file), Buffer.from(data, "base64"));
    frames.push({ file, ts: metadata.timestamp });
  });
  if (opts.url) await page.goto(opts.url, { waitUntil: "networkidle" });
  if (dsf !== 1) {
    const inner = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
    if (inner[0] !== width || inner[1] !== height) throw new Error(`viewport is ${inner.join("x")}, wanted ${width}x${height} (deviceScaleFactor ${dsf})`);
  }
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: opts.quality || 94, maxWidth: Math.round(width * dsf), maxHeight: Math.round(height * dsf), everyNthFrame: 1 });

  const defs = {};
  for (const [name, v] of Object.entries(opts.track || {})) {
    if (typeof v === "function") defs[name] = { fn: v.toString() };
    else if (v && typeof v === "object") defs[name] = Object.assign(typeof v.fn === "function" ? { fn: v.fn.toString() } : { sel: v.sel }, v.clip ? { clip: true } : {});
    else defs[name] = { sel: v };
  }

  let t0 = null;
  const marks = [];
  const events = [];
  let cur = { x: width + 70, y: height + 40 };
  const now = () => (t0 == null ? 0 : +(Date.now() / 1000 - t0).toFixed(3));

  const clip = {
    page,
    cdp,
    outDir,
    get t() {
      return now();
    },
    async begin() {
      t0 = Date.now() / 1000;
      marks.push({ label: "begin", t: 0 });
      if (Object.keys(defs).length) await page.evaluate(samplerSource(defs));
    },
    mark(label) {
      const t = now();
      marks.push({ label, t });
      events.push({ type: "mark", t, label });
      console.log(`[${opts.name}] ${t.toFixed(2)}s ${label}`);
      return t;
    },
    setCursor(x, y) {
      cur = { x, y };
    },
    async moveTo(x, y, ms = 700) {
      // time-based path with a slight arc; position is a function of elapsed time
      const from = { ...cur };
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const start = Date.now();
      const dx = x - from.x, dy = y - from.y;
      const bend = Math.min(60, Math.hypot(dx, dy) * 0.08);
      const len = Math.hypot(dx, dy) || 1;
      for (;;) {
        const p = Math.min(1, (Date.now() - start) / ms);
        const e = ease(p);
        const arc = Math.sin(Math.PI * e) * bend;
        const px = from.x + dx * e + (-dy / len) * arc;
        const py = from.y + dy * e + (dx / len) * arc;
        await page.mouse.move(px, py);
        cur = { x: px, y: py };
        if (t0 != null) events.push({ type: "cursor", t: now(), x: Math.round(px), y: Math.round(py) });
        if (p >= 1) break;
        await new Promise((r) => setTimeout(r, 14));
      }
    },
    async click(target, { move = 800, pause = opts.clickPause != null ? opts.clickPause : 200, label } = {}) {
      const loc = typeof target === "string" ? page.locator(target).first() : target;
      const b = await loc.boundingBox();
      if (!b) throw new Error("click target not visible: " + (label || target));
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await clip.moveTo(x, y, move);
      await page.waitForTimeout(pause);
      await page.mouse.down();
      await page.waitForTimeout(90);
      await page.mouse.up();
      const t = now();
      events.push({ type: "click", t, x: Math.round(x), y: Math.round(y), label: label || null, box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } });
      if (label) clip.mark(label);
      return t;
    },
    async scrollTo(targetY, ms = 900) {
      const a = now();
      const from = await page.evaluate(() => window.scrollY);
      await page.evaluate(
        ([targetY, ms]) =>
          new Promise((res) => {
            const startY = window.scrollY, d = targetY - startY, s = performance.now();
            const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
            const step = (n) => {
              const p = Math.min(1, (n - s) / ms);
              window.scrollTo(0, startY + d * ease(p));
              if (p < 1) requestAnimationFrame(step);
              else res();
            };
            requestAnimationFrame(step);
          }),
        [targetY, ms]
      );
      events.push({ type: "scroll", t: a, t1: now(), from, to: targetY });
    },
    async docY(target) {
      const loc = typeof target === "string" ? page.locator(target).first() : target;
      return loc.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    },
    async waitText(text, { timeout = 90000, label } = {}) {
      await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout, polling: 50 });
      return clip.mark(label || text);
    },
    async wait(ms) {
      await page.waitForTimeout(ms);
    },
    async finish() {
      clip.mark("end");
      const endWall = Date.now() / 1000;
      let samples = [];
      try {
        samples = await page.evaluate(() => {
          const st = window.__kitTrack;
          if (!st) return [];
          st.on = false;
          return st.samples;
        });
      } catch (e) {
        console.warn("box sampler lost (page navigated?)", e.message);
      }
      recording = false;
      await cdp.send("Page.stopScreencast").catch(() => {});
      await ctx.close();
      await browser.close();
      const boxes = samples.map((s) => Object.assign({}, s, { t: +(s.ts / 1000 - t0).toFixed(3), ts: undefined }));
      fs.writeFileSync(path.join(outDir, "frames.json"), JSON.stringify({ t0, endWall, viewport: { width, height }, deviceScaleFactor: dsf, frames, marks }, null, 1));
      fs.writeFileSync(path.join(outDir, "boxes.json"), JSON.stringify({ viewport: { width, height }, samples: boxes }, null, 1));
      fs.writeFileSync(path.join(outDir, "events.json"), JSON.stringify(events, null, 1));
      console.log(`[${opts.name}] ${frames.length} frames, ${boxes.length} box samples, ${events.length} events -> ${outDir}`);
      return { frames: frames.length, marks };
    },
  };
  return clip;
}

module.exports = { startClip, CURSOR_JS, cursorSource };
