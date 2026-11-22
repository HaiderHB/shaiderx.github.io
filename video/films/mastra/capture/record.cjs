// Mastra capture script (kit 2.1, launch format). Run from video/: node films/mastra/capture/record.cjs <key> [flow]
// Then: npm run footage -- films/mastra flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from a production build of the worktree (next build && next start -p 3202), opened with the
// review key so the page is in live mode without the preview chip. The film shows the page's own example run
// (baseline and candidate over 40 cases plus one suggestion per failure cluster, recorded through the live routes
// on 2026-11-21), replayed by the page's "Replay the benchmark" and "Re-run with 5 changes" buttons, clicked by
// this script. No model calls happen while recording. The replay reveals one case every 55 ms (re-run: 45 ms);
// the live runs it was recorded from took several minutes.
//
// Playwright: set PLAYWRIGHT_PATH or install it where Node can find it; this machine uses the system Chrome.
//
// One continuous take, `flow`:
//   bench    the run card: Replay pressed, the 40-case grid fills (H1)
//   traces   the failure clusters and the example trace; "Bad tool arguments" clicked: the failing call (H2, H3)
//   verdict  the checks the trace was graded on (H4)
//   fixes    the suggestion cards: bad arguments, then memory (F2a, F2b)
//   rollout  "Re-run with 5 changes" clicked: the candidate grid fills, the gate lands (F3a, F3b, proof, hook)
const path = require("path");
if (!process.env.PLAYWRIGHT_PATH) process.env.PLAYWRIGHT_PATH = path.resolve(__dirname, "../../../../../mastra-scratch/node_modules/playwright");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const KEY = process.env.DEMO_KEY || process.argv[2] || "";
const BASE = process.env.DEMO_URL || `http://localhost:3202/demo/mastra/${KEY ? `?k=${KEY}` : ""}`;
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
  launch: { channel: "chrome" },
};

const cluster = name => d => [...d.querySelectorAll('button[class*="Mastra_cluster__"]')].find(b => b.textContent.includes(name));

const TRACK = {
  heroText: '[class*="DemoLayout_hero__"]',
  runCard: "[data-run]",
  grid: "[data-run] [data-grid]",
  runStats: '[class*="Mastra_runStats__"]',
  clusterList: "[data-clusterlist]",
  clusterStop: cluster("Stopped early"),
  clusterBad: cluster("Bad tool arguments"),
  traceCard: "[data-tracecard]",
  thread: '[data-tracecard] [class*="Mastra_thread__"]',
  traceBox: "[data-trace]",
  verdict: "[data-verdict]",
  sugStop: '[class*="Mastra_suggestion__"][data-cause="early_stop"]',
  sugBad: '[class*="Mastra_suggestion__"][data-cause="bad_args"]',
  sugMemory: '[class*="Mastra_suggestion__"][data-cause="memory"]',
  candCard: "[data-cand]",
  candGrid: '[data-cand] [class*="Mastra_caseGrid__"]',
  gate: "[data-gate]",
  perCluster: "[data-clusters]",
  rolloutGrid: '[class*="Mastra_rolloutGrid__"]',
  rolloutHead: "#rollout-heading",
};

const PARK = [1352, 420]; // the page's right gutter

const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);
const waitText = (page, re, timeout = 20000) =>
  page.waitForFunction(source => new RegExp(source).test(document.body.innerText), re.source, { timeout });

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  // pre-roll: the on-load replay finishes, then the run card is brought into view
  await page.waitForTimeout(4500);
  await page.evaluate(y => window.scrollTo(0, y), (await topOf(page, "[data-run]")) - 92);
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // bench: Replay pressed, the grid fills
  clip.mark("bench-still");
  await clip.wait(1400);
  await clip.click(page.getByRole("button", { name: "Replay the benchmark" }), { label: "replay", move: 700 });
  clip.mark("bench-replay");
  await park(clip);
  await waitText(page, /Running/, 3000).catch(() => {});
  await waitText(page, /Replay the benchmark/);
  clip.mark("bench-done");
  await clip.wait(4500);

  // traces: clusters and the example trace
  await clip.scrollTo((await topOf(page, "[data-tracecard]")) - 90, 900);
  clip.mark("traces");
  await clip.wait(6500);
  await clip.click(page.locator('button[class*="Mastra_cluster__"]', { hasText: "Bad tool arguments" }), { label: "cluster-bad", move: 800 });
  clip.mark("trace-bad");
  await park(clip);
  await clip.wait(6000);

  // verdict: the checks
  await clip.scrollTo((await topOf(page, "[data-verdict]")) - 200, 900);
  clip.mark("verdict");
  await clip.wait(6500);

  // fixes: the suggestion cards
  await clip.scrollTo((await topOf(page, '[class*="Mastra_suggestion__"][data-cause="bad_args"]')) - 110, 900);
  clip.mark("fix-bad");
  await clip.wait(6500);
  await clip.scrollTo((await topOf(page, '[class*="Mastra_suggestion__"][data-cause="memory"]')) - 110, 900);
  clip.mark("fix-memory");
  await clip.wait(6500);

  // rollout: re-run with the candidate, the gate lands
  await clip.scrollTo((await topOf(page, "#rollout-heading")) - 120, 900);
  clip.mark("rollout-still");
  await clip.wait(1400);
  await clip.click(page.getByRole("button", { name: /^Re-run with/ }), { label: "rerun", move: 800 });
  clip.mark("rerun");
  await park(clip);
  await waitText(page, /Re-running/, 3000).catch(() => {});
  await page.waitForFunction(() => !/Re-running/.test(document.body.innerText), null, { timeout: 20000 });
  await page.waitForSelector("[data-gate]", { timeout: 20000, state: "attached" });
  clip.mark("gate");
  await clip.wait(12000);
  await clip.finish();
}

const takes = { flow };
(async () => {
  const which = process.argv[3] || "flow";
  if (!takes[which]) throw new Error("unknown take " + which);
  await takes[which]();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
