// Vena capture script (kit 2.1, launch format). Run from video/: node films/vena/capture/record.cjs [flow]
// Then: npm run footage -- films/vena flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from a production build of the worktree (next build && next start -p 3102) with NO demo key:
// the page is in preview mode and replays its example. The model answers in it (the fast decision model's
// probabilities per row, the LLM's second look on two rows) were recorded from a live run of the sample on
// 2026-11-19 (UTC); profile, checks, trust, statements and eval run in the browser on the same code as the API.
// No live model calls are made while recording. The replay paces rows ~48 ms apart and holds the LLM's
// pending state 1.3 s (the live run took 1.25 s for all fast calls and 2.1 s for the LLM).
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`:
//   top       the top of the page after the on-load replay: title + the 38 / 38 card (proof, what backdrop)
//   export    the raw export card (H1, problem backdrop)
//   map       the map card from its toolbar; Replay is pressed: rows snap onto the chart (hook, H2)
//   llm       rows 27-37 in view; the replay runs again (pressed by script, off screen); the two unsure rows
//             wait for the LLM, then land (H3)
//   checks    the checks card; the replay runs again (pressed by script); the checks land when it ends (H4)
//   trace     row 29 (AWS hosting) is clicked: its source cells, the fast model's bars, the LLM's reason,
//             checks and trust (F2)
//   eval      "Eval" in the top bar is clicked: the eval cards (F3)
const path = require("path");
// Recorded on Windows with Playwright installed in an untracked scratch folder; elsewhere set PLAYWRIGHT_PATH
const scratchPlaywright = path.join(__dirname, "../../../../.vena-scratch/node_modules/playwright");
if (!process.env.PLAYWRIGHT_PATH && require("fs").existsSync(scratchPlaywright)) process.env.PLAYWRIGHT_PATH = scratchPlaywright;
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3102/demo/vena/";
const VIEW = {
  viewport: { width: 1360, height: 765 },
  deviceScaleFactor: 2,
  cursor: { scale: 0.75, idleHide: 1200 },
  clickPause: 450,
  quality: 92,
  launch: process.platform === "win32" ? { channel: "chrome" } : {},
};

const row = id => ({ sel: `[data-row="${id}"]`, clip: true });
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_hero__"]',
  heroCard: '[class*="Vena_heroCard__"]',
  toolbar: '[class*="Vena_toolbar__"]',
  replay: d => [...d.querySelectorAll("button")].find(b => /Replay/.test(b.textContent)),
  timeline: '[class*="Vena_timelineCard__"]',
  fileCard: '[class*="Vena_fileCard__"]',
  mapCard: '[class*="Vena_mapCard__"]',
  rL3: row("L3"),
  rL8: row("L8"),
  rL12: row("L12"),
  rL16: row("L16"),
  rL27: row("L27"),
  rL29: row("L29"),
  rL35: row("L35"),
  rL37: row("L37"),
  detail: '[class*="Vena_detailCell__"]',
  traceSource: '[class*="Vena_traceSource__"]',
  traceWhy: '[class*="Vena_traceWhy__"]',
  traceTrust: '[class*="Vena_traceTrust__"]',
  checks: '[class*="Vena_checksCard__"]',
  evalScore: '[class*="Vena_evalScore__"]',
  evalCases: '[class*="Vena_evalCases__"]',
  evalCost: '[class*="Vena_evalCost__"]',
  navEval: d => [...d.querySelectorAll("nav a")].find(a => a.textContent.trim() === "Eval"),
};

const PARK = [1352, 420]; // the page's right gutter
const DONE = "38 of 38 rows match the hand-made ground truth";
const PENDING = "the LLM is taking a second look";

const seen = (page, text) => page.waitForFunction(t => document.body.innerText.includes(t), text, { timeout: 30000, polling: 30 });
const gone = (page, text) => page.waitForFunction(t => !document.body.innerText.includes(t), text, { timeout: 30000, polling: 30 });
const pressReplay = page =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find(x => /Replay/.test(x.textContent) && !x.disabled);
    if (!b) throw new Error("no Replay button");
    b.click();
  });
const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

/** Replays the example and marks the LLM wait and the end. */
async function replayAndMark(clip, name) {
  const { page } = clip;
  await gone(page, DONE);
  clip.mark(`${name}-started`);
  await seen(page, PENDING);
  clip.mark(`${name}-pending`);
  await gone(page, PENDING);
  clip.mark(`${name}-llm`);
  await seen(page, DONE);
  clip.mark(`${name}-done`);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  await seen(page, DONE); // pre-roll: the on-load replay finishes
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1600);
  await clip.begin();

  // top: title and the 38 / 38 card
  clip.mark("top");
  await clip.wait(8000);

  // export: the raw file card
  await clip.scrollTo((await topOf(page, '[class*="Vena_fileCard__"]')) - 96, 900);
  clip.mark("export");
  await clip.wait(7500);

  // map: the toolbar and the first rows; Replay pressed on screen
  await clip.scrollTo((await topOf(page, "#map")) - 84, 900);
  clip.mark("map-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: /Replay/ }), { label: "map-replay", move: 850 });
  await park(clip);
  await replayAndMark(clip, "map");
  await clip.wait(5500);

  // llm: the rows around the two unsure ones; replay pressed by script (the button is off screen)
  await clip.scrollTo((await topOf(page, '[data-row="L27"]')) - 110, 900);
  clip.mark("llm-still");
  await clip.wait(1300);
  await pressReplay(page);
  clip.mark("llm-replay");
  await replayAndMark(clip, "llm");
  await clip.wait(6000);

  // checks: the checks card; replay pressed by script
  await clip.scrollTo((await topOf(page, "#checks")) - 84, 900);
  clip.mark("checks-still");
  await clip.wait(1300);
  await pressReplay(page);
  clip.mark("checks-replay");
  await replayAndMark(clip, "checks");
  await clip.wait(7000);

  // trace: row 29 opened
  await clip.scrollTo((await topOf(page, '[data-row="L29"]')) - 96, 900);
  clip.mark("trace-still");
  await clip.wait(1400);
  await clip.click(page.locator('[data-row="L29"]'), { label: "trace-open", move: 850 });
  await park(clip);
  await page.waitForSelector('[class*="Vena_detailCell__"]');
  clip.mark("trace-landed");
  await clip.wait(12000);

  // eval: the top bar's Eval link
  clip.mark("eval-still");
  await clip.wait(1300);
  await clip.click(page.locator("nav a", { hasText: "Eval" }), { label: "eval-nav", move: 850 });
  await park(clip);
  await page.waitForTimeout(900);
  clip.mark("eval-landed");
  await clip.wait(13000);
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
