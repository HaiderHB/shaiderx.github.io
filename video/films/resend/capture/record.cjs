// Resend capture script (kit 2.1, launch format). Run from the worktree root:
//   node video/films/resend/capture/record.cjs flow <demo key>
// Then: npm run --prefix video footage -- films/resend flow
//
// The demo runs from a production build of the worktree (next build && next start -p 3203), opened with the
// review key so the page is in live mode. The film shows the page's recorded run: the hero task, recorded live
// through the real route on 2026-11-21 and replayed by the page itself (its Replay link). No model calls are
// made while recording; the replay recomputes every tool result in code from the recorded calls and paces the
// events 0.2-0.5 s apart (the live run took 73 s). The safety section calls the real store-backed broadcast
// endpoint (free, no model). The report shows the two recorded runs (improved and vague tool descriptions).
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2; cursor about 1.5x a system arrow,
// hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`:
//   top       the top of the page after the on-load replay (what backdrop)
//   calls     the tool-call log, finished (problem backdrop)
//   hook      the queued broadcast waiting for approval
//   r1        task box: Replay clicked (H1)
//   r2        scrolled to the preview, replayed by script: the email renders (H2)
//   r3        the same view, replayed again: unsubscribe fails, then is fixed (H3)
//   r4        scrolled to the approval card, replayed again: the broadcast is queued (H4)
//   safety    "Queue it, lose the response, retry" (F2a), then "Same key, different time" (F2b)
//   report    stumbles (F3a), vague vs improved (F3b), stat tiles (proof)
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const KEY = process.argv[3] || "";
const BASE = process.env.DEMO_URL || `http://localhost:3203/demo/resend/${KEY ? `?k=${KEY}` : ""}`;
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
};

// The top of the rendered email (hero image + heading) as an invisible fixed box: the email is taller than the
// viewport, so the shot focuses the part that matters. opacity 0, pointer-events none: nothing in the footage changes.
const emailTop = d => {
  const f = d.querySelector('[data-kit="preview"] iframe');
  if (!f) return null;
  const r = f.getBoundingClientRect();
  let bottom = 300;
  try {
    const h = f.contentDocument && f.contentDocument.querySelector("h1, h2");
    if (h) bottom = h.getBoundingClientRect().bottom + 14;
  } catch (e) {
    /* keep the default */
  }
  let el = d.getElementById("__kit_emailTop");
  if (!el) {
    el = d.createElement("div");
    el.id = "__kit_emailTop";
    Object.assign(el.style, { position: "fixed", pointerEvents: "none", opacity: "0", zIndex: "-1" });
    d.body.appendChild(el);
  }
  const top = r.top;
  Object.assign(el.style, { left: `${r.left - 8}px`, top: `${top}px`, width: `${r.width + 16}px`, height: `${Math.max(40, r.top + Math.min(bottom, r.height) - top)}px` });
  return el;
};

const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  glance: '[data-kit="glance"]',
  task: "#resend-task",
  replay: d => [...d.querySelectorAll("button")].find(b => /^\s*Replay\s*$/.test(b.textContent)),
  taskFocus: d => {
    const a = d.querySelector("#resend-task");
    const b = [...d.querySelectorAll("button")].find(x => /^\s*Replay\s*$/.test(x.textContent) || /Skip to the result/.test(x.textContent));
    if (!a) return null;
    let el = d.getElementById("__kit_taskFocus");
    if (!el) {
      el = d.createElement("div");
      el.id = "__kit_taskFocus";
      Object.assign(el.style, { position: "fixed", pointerEvents: "none", opacity: "0", zIndex: "-1" });
      d.body.appendChild(el);
    }
    const ra = a.getBoundingClientRect();
    const rb = b ? b.getBoundingClientRect() : ra;
    const left = Math.min(ra.left, rb.left);
    const top = Math.min(ra.top, rb.top);
    Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${Math.max(ra.right, rb.right) - left}px`, height: `${Math.max(ra.bottom, rb.bottom) - top}px` });
    return el;
  },
  calls: '[data-kit="calls"]',
  previewCard: '[data-kit="preview-card"]',
  emailTop,
  lintCard: '[data-kit="lint-card"]',
  lintHead: '[class*="Resend_lintHead__"]',
  lintRow3: '[data-kit="lint"] li:nth-child(3)',
  outbox: '[data-kit="outbox"]',
  approval: 'article[data-kit="approval"]',
  safetyActions: '[data-kit="safety-actions"]',
  retryButton: '[data-kit="retry"]',
  log: '[data-kit="request-log"]',
  tileCreated: '[class*="Resend_safetyStats__"] > :nth-child(1)',
  safetyStats: '[class*="Resend_safetyStats__"]',
  reportHead: "#report-heading",
  reportStats: '[class*="Resend_reportStats__"]',
  compare: '[data-kit="ux-compare"]',
  outcome: '[data-kit="outcome"]',
  stumbles: '[data-kit="report-stumbles"]',
  stumble1: { sel: '[data-kit="stumbles"] li:nth-child(1)', clip: true },
  stumble2: { sel: '[data-kit="stumbles"] li:nth-child(2)', clip: true },
  stumble3: { sel: '[data-kit="stumbles"] li:nth-child(3)', clip: true },
};

const PARK = [1352, 420]; // the page's right gutter

const has = (page, sel) => page.waitForSelector(sel, { timeout: 60000, state: "attached" });
const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);
const pressReplay = page =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /^\s*Replay\s*$/.test(x.textContent));
    if (!b) throw new Error("no Replay button");
    b.click();
  });

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

/** Marks each step of the recorded run as it lands (the replay was just started). */
async function markRun(clip, name) {
  const { page } = clip;
  await page.waitForFunction(() => !document.querySelector('article[data-kit="approval"]'), null, { timeout: 20000 });
  await has(page, '[data-kit="preview"] iframe');
  clip.mark(`${name}-preview`);
  await has(page, '[data-kit="lint"] li[data-status="fail"]');
  clip.mark(`${name}-lint-fail`);
  await has(page, '[data-kit="lint"] li[data-status="fixed"]');
  clip.mark(`${name}-lint-fixed`);
  await has(page, 'article[data-kit="approval"]');
  clip.mark(`${name}-approval`);
  await has(page, '[data-kit="final"]');
  clip.mark(`${name}-final`);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await has(page, '[data-kit="final"]'); // pre-roll: the on-load replay finishes
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // top: title and the glance card (what backdrop)
  clip.mark("top");
  await clip.wait(3500);

  // calls: the finished tool-call log (problem backdrop)
  await clip.scrollTo((await topOf(page, '[data-kit="calls"]')) - 90, 900);
  clip.mark("calls");
  await clip.wait(3500);

  // hook: the queued broadcast
  await clip.scrollTo((await topOf(page, 'article[data-kit="approval"]')) - 200, 900);
  clip.mark("hook");
  await clip.wait(5500);

  // r1: the task box; Replay is clicked
  await clip.scrollTo((await topOf(page, '[data-kit="task"]')) - 86, 900);
  clip.mark("r1-still");
  await clip.wait(3600);
  const replayButton = page.locator("button", { hasText: /^\s*Replay\s*$/ });
  await clip.click(replayButton, { label: "r1-click", move: 800 });
  await park(clip);
  await markRun(clip, "r1");
  await clip.wait(1500);

  // r2: scrolled to the preview, replayed by script: the email renders
  await clip.scrollTo((await topOf(page, '[data-kit="preview-card"]')) + 120, 900);
  clip.mark("r2-still");
  await clip.wait(1200);
  await pressReplay(page);
  clip.mark("r2-replay");
  await markRun(clip, "r2");
  await clip.wait(1500);

  // r3: the lint card in view, replayed by script: lint fails, the agent fixes it
  await clip.scrollTo((await topOf(page, '[data-kit="lint-card"]')) - 84, 700);
  clip.mark("r3-still");
  await clip.wait(1200);
  await pressReplay(page);
  clip.mark("r3-replay");
  await markRun(clip, "r3");
  await clip.wait(1500);

  // r4: scrolled to the approval card, replayed by script: the broadcast is queued
  await clip.scrollTo((await topOf(page, 'article[data-kit="approval"]')) - 240, 900);
  clip.mark("r4-still");
  await clip.wait(1200);
  await pressReplay(page);
  clip.mark("r4-replay");
  await markRun(clip, "r4");
  await clip.wait(5000);

  // safety: retry, then a reused key
  await clip.scrollTo((await topOf(page, '[data-kit="safety-actions"]')) - 110, 1000);
  clip.mark("safety-still");
  await clip.wait(1800);
  await clip.click(page.locator('[data-kit="retry"]'), { label: "retry-click", move: 900 });
  await park(clip);
  await page.waitForFunction(() => document.querySelectorAll('[data-kit="request-log"] li').length >= 2, null, { timeout: 20000 });
  clip.mark("retry-done");
  await clip.wait(4500);
  await clip.click(page.getByRole("button", { name: "Same key, different time" }), { label: "conflict-click", move: 800 });
  await park(clip);
  await page.waitForFunction(() => document.querySelectorAll('[data-kit="request-log"] li').length >= 3, null, { timeout: 20000 });
  clip.mark("conflict-done");
  await clip.wait(4500);

  // report: stumbles, the comparison, the tiles
  await clip.scrollTo((await topOf(page, "#report")) - 70, 1000);
  clip.mark("report-top");
  await clip.wait(7000);
  await clip.scrollTo((await topOf(page, '[data-kit="report-compare"]')) - 90, 900);
  clip.mark("report-grid");
  await clip.wait(9000);
  await clip.finish();
}

const takes = { flow };
(async () => {
  const which = process.argv[2] || "flow";
  if (!takes[which]) throw new Error("unknown take " + which);
  await takes[which]();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
