// HouseSigma capture script (kit 2.1, launch format). Run from video/:
//   DEMO_KEY=<private key> node films/housesigma/capture/record.cjs flow
// Then: npm run footage -- films/housesigma flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from a production build of this film's own worktree (next build && next start -p 3103), opened
// WITH a demo key: every model call in the take is live (the ask -> filters, the price verdict and its
// explanation, the weekly update). The server was restarted before the take, so nothing is served from cache.
// Search, comps, the estimate, the offer brief and the pulse numbers run in the browser.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2; cursor about 1.5x a system arrow,
// hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow` (the search is cleared and the ask typed in the pre-roll):
//   ask      the search box with the ask typed, no filters yet; Search is clicked: the chips land, 580 -> 12
//   results  the matches with their value hints; the second home is clicked
//   fair     its price card; "Is this a fair price?" is clicked: verdict with odds, then the explanation
//   offer    the offer-night numbers and the suggested range
//   pulse    the saved search's week; "Write this week's update" is clicked: the update streams in
//   top      the top of the page, wide (proof)
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const KEY = process.env.DEMO_KEY;
if (!KEY) throw new Error("set DEMO_KEY (the private demo key; never commit it)");
const BASE = (process.env.DEMO_URL || "http://localhost:3103/demo/housesigma/") + "?k=" + encodeURIComponent(KEY);
const ASK = "3-bed semi in Brampton under $1.1M, walk to a GO station, quiet street";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

const card = i => `[class*="Housesigma_list__"] > :nth-child(${i + 1})`;
const TRACK = {
  heroText: '[class*="DemoLayout_hero__"]',
  ask: '[data-track="ask"]',
  askForm: '[class*="Housesigma_askForm__"]',
  askIcon: '[class*="Housesigma_askIcon__"]',
  chips: '[data-track="chips"]',
  chipLast: '[class*="Housesigma_chipRow__"] > :nth-child(6)',
  count: '[data-track="count"]',
  results: '[data-track="results"]',
  card1: card(0),
  card2: card(1),
  card3: card(2),
  chart: '[data-track="chart"]',
  fair: '[data-track="fair"]',
  homeHead: '[class*="Housesigma_homeHead__"]',
  range: '[data-track="range"]',
  checkButton: '[data-action="check-price"]',
  verdictHead: '[class*="Housesigma_verdictHead__"]',
  bars: '[data-track="verdict"] [class*="ProbabilityBar_bars__"]',
  verdictMeta: '[class*="Housesigma_verdictMeta__"]',
  explain: '[data-track="explain"]',
  comps: '[data-track="comps"]',
  offerStats: '[data-track="offerStats"]',
  offerTiles: d => d.querySelector('[data-track="offerStats"]')?.firstElementChild,
  offerCard: '[class*="Housesigma_offerCard__"]',
  pulseHead: '[class*="Housesigma_pulseHead__"]',
  pulseTiles: d => d.querySelector('[data-track="pulse"]')?.children[1],
  tile1: d => d.querySelector('[data-track="pulse"]')?.children[1]?.children[0],
  tile3: d => d.querySelector('[data-track="pulse"]')?.children[1]?.children[2],
  digest: '[data-track="digest"]',
  writeButton: '[data-action="write-pulse"]',
};

const PARK = [1352, 430]; // the page's right gutter
const topOf = (page, sel) => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);
async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  // pre-roll (not in the footage): clear the example search, type the ask
  await page.waitForSelector('[data-action="clear"]');
  await page.click('[data-action="clear"]');
  await page.fill("#hs-ask", ASK);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.evaluate(y => window.scrollTo(0, y), (await topOf(page, '[data-track="ask"]')) - 96);
  await park(clip);
  await page.waitForTimeout(1800);
  await clip.begin();

  // ask: Search is clicked, the chips land
  clip.mark("ask-still");
  await clip.wait(1500);
  await clip.click(page.locator('[data-action="ask"]'), { label: "ask", move: 850 });
  await park(clip);
  await page.waitForFunction(() => document.querySelectorAll('[class*="Housesigma_filterChip__"]').length >= 5, null, { timeout: 30000, polling: 30 });
  clip.mark("chips");
  await clip.wait(700);
  clip.mark("chips-landed");
  await clip.wait(6000);

  // results: the matches; the second home is clicked
  await clip.scrollTo((await topOf(page, '[data-track="results"]')) - 92, 900);
  clip.mark("results");
  await clip.wait(1500);
  await clip.click(page.locator("[data-listing]").nth(1), { label: "pick", move: 850 });
  await park(clip);
  clip.mark("picked");
  await clip.wait(5500);

  // fair: the price check
  await clip.scrollTo((await topOf(page, '[data-track="fair"]')) - 92, 900);
  clip.mark("fair-still");
  await clip.wait(1600);
  await clip.click(page.locator('[data-action="check-price"]'), { label: "check", move: 850 });
  await park(clip);
  await page.waitForFunction(() => /\d+%/.test(document.querySelector('[data-track="verdict"] [class*="ProbabilityBar_bars__"]')?.textContent || ""), null, { timeout: 30000, polling: 30 });
  clip.mark("verdict");
  await page.waitForSelector('[data-track="explain"] [class*="Housesigma_trace__"]', { timeout: 30000 });
  clip.mark("explained");
  await clip.wait(13000);

  // offer: the brief
  await clip.scrollTo((await topOf(page, '[data-track="offerStats"]')) - 92, 900);
  clip.mark("offer");
  await clip.wait(13500);

  // pulse: the week, then the written update
  await clip.scrollTo((await topOf(page, '[class*="Housesigma_pulseHead__"]')) - 100, 900);
  clip.mark("pulse");
  await clip.wait(7500);
  clip.mark("digest-still");
  await clip.wait(1500);
  await clip.click(page.locator('[data-action="write-pulse"]'), { label: "write", move: 850 });
  await park(clip);
  await page.waitForFunction(() => (document.querySelector('[data-track="digest"]')?.innerText || "").length > 120, null, { timeout: 30000, polling: 30 });
  clip.mark("writing");
  await page.waitForSelector('[data-track="digest"] [class*="Housesigma_trace__"]', { timeout: 30000 });
  clip.mark("written");
  await clip.wait(8000);

  // top: the page from its top, wide
  await clip.scrollTo(0, 900);
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
