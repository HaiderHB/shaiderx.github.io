// CoinTracker capture script (kit 2.1, launch format). Run from video/: node films/cointracker/capture/record.cjs [flow]
// Then: npm run footage -- films/cointracker flow   (assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from an isolated copy of this branch (next build && next start), with NO demo key: the page is in
// preview mode and replays its recorded run (the LLM's record and actions, the decision model's routes and the
// LLM's read of the sample 1099-INT were recorded live on 2026-11-19); the checks, routes' code floor, approvals,
// the simulated broker and payroll, verification and the handoff run in the browser on the same code as the API.
// No live calls. Windows: branded Chrome (channel "chrome"); set PLAYWRIGHT_PATH if playwright is not installed.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`. The script pins the card a shot is about (keeps its top at a fixed height while the
// layout changes) and does set-up presses off screen (re-run the agent, switch on the simulated timeout, switch to
// the CPA queue). The clicks the viewer sees are real cursor clicks. Nothing on the page is altered.
//   prepare   the agent card pinned; "Prepare my 2026 tax file" clicked: the timeline runs, step 6 pauses
//   lanes     the "Your approval" lane pinned; the agent re-run (off screen): the two money moves land, locked
//   approve   the sell order's approve row + the broker panel; the simulated timeout is on (switched off screen);
//             "Approve the sell order" clicked: 504 timed out, then the retry: 200 replayed, no second order
//   replay    "Replay the retry" clicked: 200 replayed again
//   verify    "Verify it finished" clicked: 4 checks, "Done: the broker matches what was approved."
//   handoff   the request card pinned; "Upload the sample 1099-INT" clicked: "Resumed at step 6"
//   cpa       the CPA queue (switched off screen); the roof card pinned; "Sign off" clicked
//   top       the top of the page: the filing progress after all of it
// Kit 2.1, the result rule: every result is recorded with a real hold of 7 s or more after it lands.
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3160/demo/cointracker/";
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
  ...(process.platform === "win32" ? { launch: { channel: "chrome" } } : {}),
};

// window.__pin(selector, y): keep the element's top at viewport y while the layout above it changes.
const PIN_JS = `
window.__pin = (sel, y) => {
  if (window.__unpin) window.__unpin();
  const fix = () => {
    const el = document.querySelector(sel);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (Math.abs(top - y) > 0.25) window.scrollTo({ top: window.scrollY + top - y, behavior: "instant" });
  };
  const mo = new MutationObserver(fix);
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  window.__unpin = () => { mo.disconnect(); window.__unpin = null; };
  fix();
};`;

const f = (name) => `[data-focus="${name}"]`;
const TRACK = {
  hero: '[class*="DemoLayout_hero__"]',
  progress: f("progress"),
  agent: f("agent"),
  runButton: f("runButton"),
  timeline: `${f("agent")} ol`,
  pausedNote: f("pausedNote"),
  board: f("board"),
  laneAuto: f("lane-auto"),
  laneHousehold: f("lane-household"),
  laneCpa: f("lane-cpa"),
  actionSell: f("action-a2"),
  action401k: f("action-a3"),
  approvalSell: f("approval-a2"),
  approveRow: (d) => d.querySelector('[data-focus="approval-a2"]')?.lastElementChild,
  exec: f("exec-a2"),
  toggle: f("timeoutToggle"),
  key: f("key-a2"),
  requests: f("requests-a2"),
  execButtons: f("execButtons-a2"),
  verify: f("verify-a2"),
  handoff: f("handoff"),
  askInt: f("ask-int1099"),
  resumeResult: f("resumeResult"),
  cpa: f("cpa-a4"),
  cpaOptions: f("cpaOptions-a4"),
  cpaRow: (d) => d.querySelector('[data-focus="cpa-a4"]')?.lastElementChild,
};

const PARK = [1350, 600]; // the page's right gutter: nothing to hover
const pin = (page, sel, y = 84) => page.evaluate(([s, v]) => window.__pin(s, v), [sel, y]);
const unpin = (page) => page.evaluate(() => window.__unpin && window.__unpin());
const press = (page, re) =>
  page.evaluate((r) => {
    const b = [...document.querySelectorAll("button")].find((x) => new RegExp(r).test(x.textContent.trim()) && !x.disabled);
    if (!b) throw new Error("no button " + r);
    b.click();
  }, re);
const seenIn = (page, sel, re) =>
  page.waitForFunction(
    ([s, r]) => {
      const el = document.querySelector(s);
      return !!el && new RegExp(r).test(el.innerText);
    },
    [sel, re],
    { timeout: 30000, polling: 30 }
  );
const landed = (page) => seenIn(page, f("board"), "Ran automatically");

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK, init: PIN_JS }, VIEW));
  const { page } = clip;
  await landed(page); // the on-load run (pre-roll)
  await pin(page, f("agent"));
  await park(clip);
  await page.waitForTimeout(1800);
  await clip.begin();

  // prepare: the agent card pinned; ONE action: Prepare my 2026 tax file
  clip.mark("prepare-still");
  await clip.wait(1300);
  await clip.click(page.locator(f("runButton")), { label: "prepare", move: 900 });
  await seenIn(page, f("agent"), "Waiting on the household for the 1099-INT");
  clip.mark("prepare-landed");
  await clip.wait(7500);
  await park(clip);

  // lanes: the "Your approval" lane pinned; re-run off screen; the money moves land with the lock
  await pin(page, f("lane-household"), 110);
  clip.mark("lanes-still");
  await clip.wait(1300);
  await press(page, "^Prepare my 2026 tax file$");
  clip.mark("lanes-pressed");
  await landed(page);
  clip.mark("lanes-landed");
  await clip.wait(8500); // hook + H2 hold

  // approve: the broker panel pinned (the approve row sits just above it); the timeout switched on off screen
  await page.evaluate(() => document.querySelector('[data-focus="timeoutToggle"] input').click());
  await pin(page, f("exec-a2"), 190);
  clip.mark("approve-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: "Approve the sell order" }), { label: "approve", move: 900 });
  await seenIn(page, f("requests-a2"), "timed out");
  clip.mark("approve-timeout");
  await seenIn(page, f("requests-a2"), "replayed");
  clip.mark("approve-landed");
  await clip.wait(7500);

  // replay: ONE action: Replay the retry
  await clip.click(page.locator(f("execButtons-a2")).getByRole("button", { name: /Replay the retry/ }), { label: "replay", move: 700 });
  await page.waitForFunction(() => (document.querySelector('[data-focus="requests-a2"]')?.innerText.match(/replayed/g) || []).length >= 2, null, { timeout: 30000, polling: 30 });
  clip.mark("replay-landed");
  await clip.wait(7000);
  await park(clip);

  // verify: the buttons pinned higher so the checks fit below; ONE action: Verify it finished
  await pin(page, f("execButtons-a2"), 300);
  clip.mark("verify-still");
  await clip.wait(1300);
  await clip.click(page.locator(f("execButtons-a2")).getByRole("button", { name: /Verify it finished/ }), { label: "verify", move: 700 });
  await seenIn(page, f("exec-a2"), "Done: the broker");
  clip.mark("verify-landed");
  await clip.wait(7500);
  await park(clip);

  // handoff: the request card pinned; ONE action: upload the sample 1099-INT
  await pin(page, f("handoff"));
  clip.mark("handoff-still");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: /Upload the sample 1099-INT/ }), { label: "upload", move: 900 });
  await seenIn(page, f("handoff"), "Resumed at step 6");
  clip.mark("handoff-landed");
  await clip.wait(7500);
  await park(clip);

  // cpa: switch to the CPA queue off screen; the roof card pinned; ONE action: Sign off
  await press(page, "^CPA \\(");
  await page.waitForSelector(f("cpa-a4"));
  await pin(page, f("cpa-a4"));
  clip.mark("cpa-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: "Sign off" }), { label: "signoff", move: 900 });
  await seenIn(page, f("cpa-a4"), "Signed off");
  clip.mark("cpa-landed");
  await clip.wait(7000);
  await park(clip);

  // top: the filing progress after all of it (proof)
  await unpin(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  clip.mark("top");
  await clip.wait(7500);
  await clip.finish();
}

const takes = { flow };
(async () => {
  const which = process.argv[2] || "flow";
  if (!takes[which]) throw new Error("unknown take " + which + " (" + Object.keys(takes).join(", ") + ")");
  fs.mkdirSync(path.join(FILM, "raw"), { recursive: true });
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
