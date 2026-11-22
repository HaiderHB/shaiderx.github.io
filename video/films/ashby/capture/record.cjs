// Ashby capture script (kit 2.1, launch format). Run from video/: node films/ashby/capture/record.cjs [flow]
// Then: npm run footage -- films/ashby flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from a production build of the worktree (next build && next start -p 3201), opened with the review
// key (DEMO_KEY), so the page is in live mode. The film still shows the page's recorded runs (three live rediscovery
// runs and nine drafts, recorded through the real routes on 2026-11-21), replayed by the page itself via its
// "Replay" link (pressed by script). No model calls are made while recording. The page replays a ~70 s run in ~7 s.
// The override and the eval are computed in the browser from the recorded runs.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2; cursor about 1.5x, hidden when idle,
// resting 450 ms before every click. PLAYWRIGHT_PATH points at a local playwright install.
//
// One continuous take, `flow`:
//   top        the title and the "Worth a second look" card; a replay runs and the card lands (hook, what backdrop)
//   reqs       the job description and role cards; a replay runs and the requirement chips land (problem, H1)
//   list       the shortlist; a replay runs and the rows land with verdicts (H2)
//   maya       Maya's row is clicked: fit verdict and "Last time" (H3)
//   evidence   Maya's cited evidence (H4)
//   guard      the guardrail checks (F2a)
//   override   "HR tech or scheduling" switched to Must; the top five re-rank (F2b)
//   eval       "Eval" in the top bar: tiles, then the per-role table (F3, proof)
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const KEY = process.env.DEMO_KEY || "";
const BASE = process.env.DEMO_URL || `http://localhost:3201/demo/ashby/${KEY ? `?k=${KEY}` : ""}`;
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
};

const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_heroText__"]',
  hero: '[data-kit="hero"]',
  heroThen: '[data-kit="hero-then"]',
  jd: '[data-kit="jd"]',
  reqCard: '[data-kit="req-card"]',
  reqs: '[data-kit="reqs"]',
  shortlist: '[data-kit="shortlist"]',
  row1: '[data-kit="shortlist"] [data-kit="row-1"]',
  row3: '[data-kit="shortlist"] [data-kit="row-3"]',
  row5: '[data-kit="shortlist"] [data-kit="row-5"]',
  row10: '[data-kit="shortlist"] [data-kit="row-10"]',
  detail: '[data-kit="detail"]',
  fit: '[data-kit="detail"] [data-kit="fit"]',
  past: '[data-kit="detail"] [data-kit="past"]',
  evM1: '[data-kit="ev-M1"]',
  evM2: '[data-kit="ev-M2"]',
  evM3: '[data-kit="ev-M3"]',
  guardrails: '[data-kit="guardrails"]',
  ovN2: '[data-kit="ov-N2"]',
  miniList: '[data-kit="mini-list"]',
  evalHead: "#eval-heading",
  tileAgent: '[data-kit="tile-agent"]',
  tileKeyword: '[data-kit="tile-keyword"]',
  evalStats: '[class*="Ashby_evalStats__"]',
  evalTable: '[data-kit="eval-table"]',
  evalSpe: '[data-kit="eval-spe"]',
  evalFd: '[data-kit="eval-fd"]',
};

const PARK = [1352, 420]; // the page's right gutter

const has = (page, sel) => page.waitForSelector(sel, { timeout: 40000, state: "attached" });
const gone = (page, sel) => page.waitForSelector(sel, { timeout: 40000, state: "detached" });
const pressReplay = page =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "Replay");
    if (!b) throw new Error("no Replay button");
    b.click();
  });
const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);
const replayDone = page =>
  page.waitForFunction(() => /Example run, recorded/.test(document.querySelector('[data-kit="req-card"]')?.textContent || ""), null, { timeout: 40000 });

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await has(page, '[data-kit="hero-verdict"]'); // pre-roll: the on-load replay finishes
  await replayDone(page);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // top: the second-look card lands
  clip.mark("top");
  await clip.wait(1500);
  await pressReplay(page);
  clip.mark("top-replay");
  await gone(page, '[data-kit="hero-verdict"]');
  await has(page, '[data-kit="hero-verdict"]');
  clip.mark("hero-landed");
  await replayDone(page);
  await clip.wait(5000);

  // reqs: the role card
  await clip.scrollTo((await topOf(page, '[data-kit="jd"]')) - 92, 900);
  clip.mark("reqs-still");
  await clip.wait(3500);
  await pressReplay(page);
  clip.mark("reqs-replay");
  await gone(page, '[data-kit="reqs"]');
  await has(page, '[data-kit="reqs"]');
  clip.mark("reqs-landed");
  await replayDone(page);
  await clip.wait(3000);

  // list: the shortlist fills
  await clip.scrollTo((await topOf(page, '[data-kit="shortlist"]')) - 92, 900);
  clip.mark("list-still");
  await clip.wait(1500);
  await pressReplay(page);
  clip.mark("list-replay");
  await gone(page, '[data-kit="shortlist"] [data-kit="row-1"]');
  await has(page, '[data-kit="shortlist"] [data-kit="row-1"]');
  clip.mark("list-first-row");
  await replayDone(page);
  clip.mark("list-done");
  await clip.wait(4000);

  // maya: click her row
  clip.mark("maya-still");
  await clip.wait(1300);
  const maya = page.locator('[data-kit="shortlist"] button', { hasText: "Maya Okafor" });
  await clip.click(maya, { label: "maya", move: 800 });
  await park(clip);
  clip.mark("maya-landed");
  await clip.wait(6000);

  // evidence
  await clip.scrollTo((await topOf(page, '[data-kit="ev-M1"]')) - 110, 900);
  clip.mark("evidence");
  await clip.wait(7000);

  // guard: guardrail checks
  await clip.scrollTo((await topOf(page, '[data-kit="guardrails"]')) - 100, 900);
  clip.mark("guard");
  await clip.wait(6500);

  // override: scheduling becomes a must
  await clip.scrollTo((await topOf(page, '[data-kit="ov-N2"]')) - 160, 900);
  clip.mark("override-still");
  await clip.wait(1500);
  await clip.click(page.locator('[data-kit="ov-N2"] button', { hasText: "Must" }), { label: "override", move: 800 });
  await park(clip);
  clip.mark("override-landed");
  await clip.wait(6000);

  // eval: the top bar's Eval link
  clip.mark("eval-still");
  await clip.wait(1300);
  await clip.click(page.locator("nav a", { hasText: "Eval" }), { label: "eval-nav", move: 850 });
  await park(clip);
  await page.waitForTimeout(1000);
  clip.mark("eval-landed");
  await clip.wait(7000);
  await clip.scrollTo((await topOf(page, '[data-kit="eval-table"]')) - 110, 900);
  clip.mark("eval-table");
  await clip.wait(7500);
  await clip.scrollTo((await topOf(page, "#eval-heading")) - 100, 900);
  clip.mark("eval-wide");
  await clip.wait(7500);
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
