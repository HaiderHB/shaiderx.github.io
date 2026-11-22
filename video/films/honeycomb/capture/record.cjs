// Honeycomb capture script (kit 2.1, launch format). Run from video/: node films/honeycomb/capture/record.cjs [flow]
// Then: npm run footage -- films/honeycomb flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from a production build of the worktree (next build && next start -p 3101), opened with a demo
// key (DEMO_KEY), so the page is in live mode. The film still shows the page's recorded run: one investigation of
// incident 1 and the eval (30 investigations), all recorded from live runs on 2026-11-21 and replayed by the page
// itself ("Replay the recorded run"). No model calls are made while recording; every tool result in the replay
// was computed in code when the run was recorded. The replay paces events 0.2-0.8 s apart (the live run took
// about 30 s).
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`:
//   top      the top of the page after the on-load replay (what backdrop)
//   alert    the alert card: burn rate, the p99 chart with the threshold and the deploy marker (H1, problem backdrop)
//   lanes    the three agent lanes; the replay runs (pressed by script): hypotheses claimed, first queries land (H2)
//   finding  the deploy agent's lane; the replay runs again: its finding lands with the cited evidence (H3)
//   root     the root cause card; the replay runs again: the card lands (hook, H4)
//   skills   the skills editor and the with / without comparison (F2)
//   evals    "Evals" in the top bar is clicked: the score tiles, then the per-incident table (F3, proof)
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const KEY = process.env.DEMO_KEY || "";
const BASE = process.env.DEMO_URL || `http://localhost:3101/demo/honeycomb/${KEY ? `?k=${KEY}` : ""}`;
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
};

const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_hero__"]',
  alert: '[data-kit="alert"]',
  alertHead: '[class*="Honeycomb_alertHead__"]',
  chart: 'svg[class*="Honeycomb_chart__"]',
  rank: '[data-kit="rank"]',
  headD: '[data-kit-lanehead="deploy"]',
  headT: '[data-kit-lanehead="tenant"]',
  headI: '[data-kit-lanehead="infra"]',
  callD1: '[data-kit-call="D1"]',
  callT1: '[data-kit-call="T1"]',
  callI1: '[data-kit-call="I1"]',
  callD2: '[data-kit-call="D2"]',
  laneD: '[data-kit-lane="deploy"]',
  findD: '[data-kit-finding="deploy"]',
  root: '[data-kit="root-cause"]',
  rootLeft: '[data-kit="root-left"]',
  rootProof: '[data-kit="root-proof"]',
  skillS1: '[data-kit-skill="S1"]',
  skillS2: '[data-kit-skill="S2"]',
  compare: '[data-kit="compare"]',
  cmpWith1: '[data-kit-compare="With skills"] li:nth-child(1)',
  cmpWith5: '[data-kit-compare="With skills"] li:nth-child(5)',
  cmpWithout1: '[data-kit-compare="Without skills"] li:nth-child(1)',
  cmpWithout5: '[data-kit-compare="Without skills"] li:nth-child(5)',
  cmpWithResult: '[data-kit-compare="With skills"] [class*="Honeycomb_compareResult__"]',
  cmpWithoutResult: '[data-kit-compare="Without skills"] [class*="Honeycomb_compareResult__"]',
  evalStats: '[class*="Honeycomb_evalStats__"]',
  tile1: '[class*="Honeycomb_evalStats__"] > :nth-child(1)',
  tile2: '[class*="Honeycomb_evalStats__"] > :nth-child(2)',
  tile3: '[class*="Honeycomb_evalStats__"] > :nth-child(3)',
  evalTable: '[data-kit="eval-table"]',
  evalRow1: '[data-kit-evalrow="flag-regression"]',
  evalRow2: '[data-kit-evalrow="bad-pod"]',
  evalRow5: '[data-kit-evalrow="tier-regression"]',
  evalsHead: "#evals-heading",
  evalsSection: "#evals",
};

const PARK = [1352, 420]; // the page's right gutter

const has = (page, sel) => page.waitForSelector(sel, { timeout: 40000, state: "attached" });
const gone = (page, sel) => page.waitForSelector(sel, { timeout: 40000, state: "detached" });
const pressReplay = page =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /Replay the recorded run/.test(x.textContent));
    if (!b) throw new Error("no Replay button");
    b.click();
  });
const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

/** Presses Replay (by script) and marks each step of the recorded run as it lands. */
async function replayAndMark(clip, name) {
  const { page } = clip;
  await pressReplay(page);
  clip.mark(`${name}-replay`);
  await gone(page, '[data-kit="root-cause"]');
  await has(page, '[data-kit-call="D1"]');
  await has(page, '[data-kit-call="T1"]');
  await has(page, '[data-kit-call="I1"]');
  clip.mark(`${name}-first-calls`);
  await has(page, '[data-kit-finding="deploy"]');
  clip.mark(`${name}-finding-deploy`);
  await has(page, '[data-kit="root-cause"]');
  clip.mark(`${name}-root`);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await has(page, '[data-kit="root-cause"]'); // pre-roll: the on-load replay finishes
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // top: title and the alert card's head
  clip.mark("top");
  await clip.wait(5000);

  // alert: the alert card
  await clip.scrollTo((await topOf(page, '[data-kit="alert"]')) - 92, 900);
  clip.mark("alert");
  await clip.wait(8000);

  // lanes: the three agents start
  await clip.scrollTo((await topOf(page, '[data-kit-lanehead="deploy"]')) - 110, 900);
  clip.mark("lanes-still");
  await clip.wait(1500);
  await replayAndMark(clip, "lanes");
  await clip.wait(4000);

  // finding: the deploy agent's finding
  await clip.scrollTo((await topOf(page, '[data-kit-finding="deploy"]')) - 150, 900);
  clip.mark("finding-still");
  await clip.wait(1500);
  await replayAndMark(clip, "finding");
  await clip.wait(4000);

  // root: the root cause card
  await clip.scrollTo((await topOf(page, '[data-kit="root-cause"]')) - 96, 900);
  clip.mark("root-still");
  await clip.wait(1500);
  await replayAndMark(clip, "root");
  await clip.wait(9000);

  // skills: the editor and the comparison
  await clip.scrollTo((await topOf(page, '[data-kit="compare"]')) - 96, 900);
  clip.mark("skills");
  await clip.wait(14000);

  // evals: the top bar's Evals link
  clip.mark("eval-still");
  await clip.wait(1300);
  await clip.click(page.locator("nav a", { hasText: "Evals" }), { label: "eval-nav", move: 850 });
  await park(clip);
  await page.waitForTimeout(1000);
  clip.mark("eval-landed");
  await clip.wait(9000);
  await clip.scrollTo((await topOf(page, '[data-kit="eval-table"]')) - 130, 900);
  clip.mark("eval-table");
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
