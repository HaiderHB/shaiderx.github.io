// Blackletter capture script (kit 2.1, launch format). Run from video/:
//   DEMO_KEY=<review key> node films/blackletter/capture/record.cjs [flow]
// Then: npm run footage -- films/blackletter flow
//
// The demo runs from a production build of the worktree (next build && next start -p 3102), freshly
// started so nothing is cached, WITH a demo key: every model call in the take is live (the review of
// the seed term sheet, the confidence scores, the clarification call and the ten eval reviews).
// Waits are cut in the edit, never sped up.
//
// One continuous take, `flow`:
//   review    "Review this document" is clicked: flags stream in on the right, their quotes light up
//             in the document on the left (hook, H1); then holds on the document (H2) and on the
//             confidence bars of the pro-rata flag (H3)
//   reject    the option pool flag: Reject, the sample reason, Save rejection (F2a)
//   golden    the golden set with the new case (F2b)
//   rerun     "Apply feedback and re-run evals": the clarified rule (F3a), the scores (F3b), the
//             flags that changed (F3c)
//   top       the top of the page with the run's numbers (proof)
const path = require("path");
if (!process.env.PLAYWRIGHT_PATH) process.env.PLAYWRIGHT_PATH = "/opt/npm-tools/node_modules/playwright";
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const KEY = process.env.DEMO_KEY;
if (!KEY) throw new Error("set DEMO_KEY to a blackletter demo key");
const BASE = (process.env.DEMO_URL || "http://localhost:3102/demo/blackletter/") + "?k=" + KEY;
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
};

const POOL = '[data-testid="flag-seed:POOL:1"]';
const PR = '[data-testid="flag-seed:PR:5"]';
const TRACK = {
  heroText: '[class*="DemoLayout_hero__"]',
  toolbar: '[class*="Blackletter_toolbar__"]',
  paper: '[data-testid="document"]',
  clause1: { sel: '[data-clause="1"]', clip: true },
  clause5: { sel: '[data-clause="5"]', clip: true },
  flagPool: POOL,
  flagPR: PR,
  confPR: `${PR} [class*="Blackletter_confidence__"]`,
  poolForm: `${POOL} form`,
  poolDecided: `${POOL} [class*="Blackletter_decided__"]`,
  goldenCount: '[data-testid="golden-count"]',
  case1: '[class*="Blackletter_case__"]',
  ruleChanged: '[class*="Blackletter_playbook__"] li[data-changed]',
  scoreTiles: '[class*="Blackletter_scoreTiles__"]',
  change1: '[data-testid="change"]',
};

const PARK = [1352, 430];
const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);
async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await page.waitForSelector('[data-testid="review"]');
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const y = document.querySelector('[class*="Blackletter_toolbar__"]').getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo(0, y);
  });
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // review: live, flags stream in
  clip.mark("start");
  await clip.wait(1500);
  await clip.click(page.getByTestId("review"), { label: "review", move: 850 });
  await park(clip);
  await page.waitForSelector(POOL, { timeout: 60000 });
  clip.mark("flag1");
  await page.waitForSelector(`${POOL} [class*="Blackletter_confMeta__"]:has-text("ms")`, { timeout: 60000 });
  clip.mark("conf1");
  await page.waitForFunction(() => /Review again/.test(document.querySelector('[data-testid="review"]').textContent), null, { timeout: 90000 });
  clip.mark("review-done");
  const summary = await page.getByTestId("run-summary").textContent();
  console.log("review:", summary);
  if (!(await page.locator(PR).count())) throw new Error("no pro-rata flag in this run: record again");
  await clip.wait(7500);

  // confidence: the pro-rata flag's bars
  await clip.scrollTo((await topOf(page, PR)) - 100, 900);
  clip.mark("conf-hold");
  await clip.wait(7000);

  // reject: the option pool flag, with the sample reason
  await clip.scrollTo((await topOf(page, POOL)) - 100, 900);
  await clip.wait(800);
  await clip.click(page.locator(POOL).getByTestId("reject"), { label: "reject", move: 800 });
  await clip.wait(700);
  await clip.click(page.locator(POOL).locator("button", { hasText: "Sample reason" }), { label: "reason", move: 700 });
  await park(clip);
  await clip.wait(1600);
  clip.mark("form-ready");
  await clip.click(page.locator(POOL).getByTestId("save-reject"), { label: "save-reject", move: 850 });
  await page.waitForSelector(`${POOL} [class*="Blackletter_decided__"]`);
  clip.mark("rejected");
  await park(clip);
  await clip.wait(6500);

  // golden: the new case
  await clip.scrollTo((await topOf(page, "#learn")) - 84, 900);
  clip.mark("golden");
  await clip.wait(7000);

  // rerun: clarification, then the scores
  await clip.click(page.getByTestId("rerun"), { label: "rerun", move: 850 });
  await park(clip);
  await clip.scrollTo((await topOf(page, "#evals")) + 70, 900);
  clip.mark("evals-view");
  const scores = page.waitForSelector('[data-testid="precision"]', { timeout: 150000 }).then(() => clip.mark("scores"));
  await page.waitForSelector('[class*="Blackletter_playbook__"]', { timeout: 60000 });
  clip.mark("harness");
  await clip.wait(8000);
  await scores;
  await clip.wait(7500);
  console.log("precision:", (await page.getByTestId("precision").textContent()).replace(/\s+/g, " "));
  console.log("changes:", await page.getByTestId("change").allTextContents());

  // changes: the flags that moved
  await clip.scrollTo((await topOf(page, '[data-testid="change"]')) - 180, 900);
  clip.mark("changes");
  await clip.wait(7000);

  // top: the page's own numbers
  await clip.scrollTo(0, 1100);
  clip.mark("top");
  await clip.wait(8500);
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
