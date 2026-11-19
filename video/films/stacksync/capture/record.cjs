// Stacksync capture script (kit 2.1, launch format). Run from video/: node films/stacksync/capture/record.cjs [flow]
// Then: node kit/scripts/build-footage.mjs films/stacksync flow   (assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from this branch's own worktree (next build && next start -p 3101), with no demo key: the page
// is in preview mode and replays its recorded runs (the LLM's write plan and the decision model's route were
// recorded live on 2026-11-18; the checks, the field map, the final route and the write run in the browser on
// the same code as the API, the write against an in-tab store). No live calls.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`. The script pins the card a shot is about (keeps its top at a fixed height while
// cards above change size) and re-runs the sample (Run again, pressed off screen) so each shot sees its result
// land. Nothing on the page is altered.
//   load      the top of the page; Run again: the clean deal's verdict lands ("Safe to apply", 97%); holds
//   map       the field map pinned; the plan lands as CRM -> ERP rows
//   checks    the checks pinned; eleven checks tick, "11/11 pass"
//   verdict   the verdict card pinned; the route, the bars and "11 of 11 checks pass" land
//   apply     the write card pinned; Apply to ERP is clicked: 201 created SO-10412
//   retry     Replay the retry is clicked: 200 replayed, no duplicate sales order
//   blocked   the broken deal picked with the verdict pinned: Blocked, two reasons
//   brokenmap the broken deal's field map (red rows), held for the problem backdrop
//   approval  the risky deal picked; its approval card pinned; Approve and write is clicked: written once
// Kit 2.1, the result rule: every result is recorded with a real hold of 7 s or more after it lands.
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3101/demo/stacksync/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

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
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_hero__"]',
  route: "#route",
  deal: f("deal"),
  verdict: f("verdict"),
  verdictTop: f("verdictTop"),
  bars: f("bars"),
  codeSays: f("codeSays"),
  reasons: f("reasons"),
  map: f("map"),
  // the map and checks cards are taller than the viewport: shots frame their head through one row
  mapHead: `${f("map")} > div:first-child`,
  mapRow5: `${f("map")} ol > li:nth-child(5)`,
  mapRow6: `${f("map")} ol > li:nth-child(6)`,
  mapRow7: `${f("map")} ol > li:nth-child(7)`,
  checks: f("checks"),
  checksHead: `${f("checks")} > div:first-child`,
  checkRow6: `${f("checks")} ul > li:nth-child(6)`,
  checkRow7: `${f("checks")} ul > li:nth-child(7)`,
  checkRow9: `${f("checks")} ul > li:nth-child(9)`,
  apply: f("apply"),
  key: f("key"),
  applyButtons: f("applyButtons"),
  requests: f("requests"),
  erp: f("erp"),
  approval: f("approval"),
  approvalReasons: f("approvalReasons"),
};

const PARK = [1350, 600]; // the page's right gutter: nothing to hover
const PIN_Y = 84;
const pin = (page, sel, y = PIN_Y) => page.evaluate(([s, v]) => window.__pin(s, v), [sel, y]);
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
// a run is over when the verdict card shows the check summary (the bars have landed)
const runDone = (page) => seenIn(page, f("codeSays"), "checks pass");
const running = (page) => seenIn(page, f("verdictTop"), "drafting|checking|scoring");

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function rerun(clip, label) {
  await press(clip.page, "^Run again$");
  await running(clip.page);
  clip.mark(`${label}-pressed`);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK, init: PIN_JS }, VIEW));
  const { page } = clip;
  await runDone(page); // the on-load run (pre-roll)
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // load: the top of the page; the clean deal runs again and its verdict lands
  clip.mark("load");
  await clip.wait(1200);
  await rerun(clip, "load");
  await runDone(page);
  clip.mark("load-landed");
  await clip.wait(9000); // hook + proof hold

  // map: the field map pinned; the plan lands
  await pin(page, f("map"));
  clip.mark("map-still");
  await clip.wait(1300);
  await rerun(clip, "map");
  await seenIn(page, f("map"), "items\\[2\\]");
  clip.mark("map-landed");
  await runDone(page);
  await clip.wait(7500);

  // checks: pinned; eleven checks tick
  await pin(page, f("checks"));
  clip.mark("checks-still");
  await clip.wait(1300);
  await rerun(clip, "checks");
  await seenIn(page, f("checks"), "11/11 pass");
  clip.mark("checks-landed");
  await clip.wait(7500);

  // verdict: pinned; the route lands
  await pin(page, f("verdict"));
  clip.mark("verdict-still");
  await clip.wait(1300);
  await rerun(clip, "verdict");
  await runDone(page);
  clip.mark("verdict-landed");
  await clip.wait(7500);

  // apply: the write card pinned; ONE action: Apply to ERP
  await pin(page, f("apply"));
  clip.mark("apply-still");
  await clip.wait(1500);
  await clip.click(page.locator(`${f("applyButtons")} button`).first(), { label: "apply", move: 850 });
  await seenIn(page, f("requests"), "created");
  clip.mark("apply-landed");
  await clip.wait(7000);

  // retry: ONE action: Replay the retry
  await clip.click(page.getByRole("button", { name: /Replay the retry/ }), { label: "retry", move: 700 });
  await seenIn(page, f("requests"), "replayed");
  clip.mark("retry-landed");
  await clip.wait(7500);
  await park(clip);

  // blocked: the broken deal, verdict pinned (picked off screen)
  await pin(page, f("verdict"));
  clip.mark("blocked-still");
  await clip.wait(1300);
  await press(page, "Pilot with a pre-order");
  await running(page);
  clip.mark("blocked-pressed");
  await runDone(page);
  clip.mark("blocked-landed");
  await clip.wait(8000);

  // brokenmap: the broken deal's field map, red rows (problem backdrop)
  await pin(page, f("map"));
  clip.mark("brokenmap");
  await clip.wait(4500);

  // approval: the risky deal, its approval card pinned; ONE action: Approve and write
  await press(page, "New logo, big discount");
  await runDone(page);
  await page.waitForSelector(f("approval"));
  await pin(page, f("approval"));
  clip.mark("approval-still");
  await clip.wait(1800);
  await clip.click(page.getByRole("button", { name: /Approve and write/ }), { label: "approve", move: 850 });
  await seenIn(page, f("approval"), "written once as");
  clip.mark("approval-landed");
  await clip.wait(7500);
  await park(clip);
  await clip.wait(800);
  await unpin(page);
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
