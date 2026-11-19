// Apostra capture script (kit 2, launch format). Run from video/: node films/apostra/capture/record.cjs [flow]
// Then: npm run footage -- films/apostra flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from this worktree's own production build (next build && next start -p 3103; no other job
// uses this worktree), with no demo key: preview mode, the preset brief. Its model outputs (the LLM's reading
// of the brief, the shortlist, the decision model's scores) were recorded from a live run on 2026-11-18; the
// sample sellers, guardrails, bookings, the retry and the counteroffer run on the demo's server (free routes).
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`. The script pins the card a shot is about (keeps its top at a fixed height while
// cards above change size) and re-runs the preset with a different card pinned. Nothing on the page is altered.
//   load      the on-load preset run at the top of the page: the plan card books (hook, proof backdrop)
//   brief     the brief card: Plan and book is clicked; the fields the LLM read land
//   calls     again with the MCP call log pinned (pressed off screen): the calls stream in
//   screen    the products table against five checks (no new run)
//   book      again with plan checks and bookings pinned (pressed off screen): bookings land
//   retry     the request log pinned; Retry the call pressed off screen: the replayed row lands
//   approve   the approval card; Approve is clicked: approved by you, booked
//   top       the top of the page after approval (proof)
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3103/demo/apostra/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

// window.__pin(src, y): keep the element returned by the function source `src` with its top at viewport y.
const PIN_JS = `
window.__pin = (src, y) => {
  if (window.__unpin) window.__unpin();
  const get = new Function("d", "return (" + src + ")(d)");
  const fix = () => {
    const el = get(document);
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (Math.abs(top - y) > 0.25) window.scrollTo({ top: window.scrollY + top - y, behavior: "instant" });
  };
  const mo = new MutationObserver(fix);
  mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  const ro = new ResizeObserver(fix);
  document.querySelectorAll('[class*="Panel_card__"], section').forEach((c) => ro.observe(c));
  window.__unpin = () => { mo.disconnect(); ro.disconnect(); window.__unpin = null; };
  fix();
};`;

const src = (s) => `(d) => d.querySelector(${JSON.stringify(s)})`;

const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_hero__"]',
  glance: "[data-glance]",
  briefCard: '[class*="Apostra_briefCard__"]',
  runBtn: '[data-focus="run"]',
  parsed: '[data-focus="parsed"]',
  callsCard: '[class*="Apostra_callsCard__"]',
  callLog: '[data-focus="calls"]',
  screenCard: '[class*="Apostra_screenCard__"]',
  shortlist: '[class*="Apostra_shortlistCard__"]',
  bookCard: '[class*="Apostra_bookCard__"]',
  checks: '[data-focus="checks"]',
  bookings: '[class*="Apostra_bookings__"]',
  riverline: '[data-focus="booking-riverline"]',
  requests: '[data-focus="requests"]',
  approval: '[data-focus="approval"]',
};

const PARK = [1350, 600]; // the page's right gutter: nothing to hover
const pin = (page, sel, y) => page.evaluate(([s, y]) => window.__pin(s, y), [src(sel), y]);
const unpin = (page) => page.evaluate(() => window.__unpin && window.__unpin());
const press = (page, re) =>
  page.evaluate((r) => {
    const b = [...document.querySelectorAll("button")].find((x) => new RegExp(r).test(x.textContent.trim()) && !x.disabled);
    if (!b) throw new Error("no button " + r);
    b.click();
  }, re);
const seen = (page, re) => page.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re, { timeout: 30000, polling: 30 });
const seenIn = (page, sel, re) =>
  page.waitForFunction(([s, r]) => { const el = document.querySelector(s); return !!el && new RegExp(r).test(el.innerText); }, [sel, re], { timeout: 30000, polling: 30 });
const runDone = (page) =>
  page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Plan and book/.test(b.textContent) && !b.disabled) && /Plan booked/.test(document.body.innerText), null, { timeout: 40000, polling: 30 });

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK, init: PIN_JS }, VIEW));
  const { page } = clip;
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await clip.begin();

  // load: the on-load preset books at the top of the page
  clip.mark("load");
  await seenIn(page, TRACK.glance, "waiting for your approval");
  clip.mark("load-waiting");
  await runDone(page);
  clip.mark("load-done");
  await clip.wait(8000);

  // brief: still, then ONE action: Plan and book; the fields the LLM read land
  await pin(page, TRACK.briefCard, 84);
  clip.mark("brief-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: /Plan and book/ }), { label: "run", move: 850 });
  await seenIn(page, TRACK.parsed, "CPM ceiling");
  clip.mark("brief-parsed");
  await clip.wait(7000);
  await park(clip);
  await runDone(page);
  clip.mark("brief-done");
  await clip.wait(1200);

  // calls: again with the call log pinned; pressed off screen
  await pin(page, TRACK.callsCard, 84);
  clip.mark("calls-still");
  await clip.wait(1400);
  await press(page, "^Plan and book$");
  clip.mark("calls-pressed");
  await seenIn(page, TRACK.callLog, "get_products[\\s\\S]*get_products[\\s\\S]*get_products");
  clip.mark("calls-products");
  await runDone(page);
  clip.mark("calls-done");
  await clip.wait(7000);

  // screen: the products table, no new run
  await pin(page, TRACK.screenCard, 70);
  clip.mark("screen");
  await clip.wait(8000);

  // book: again with checks and bookings pinned; pressed off screen
  await pin(page, TRACK.bookCard, 84);
  clip.mark("book-still");
  await clip.wait(1400);
  await press(page, "^Plan and book$");
  clip.mark("book-pressed");
  await seenIn(page, TRACK.bookings, "Booked");
  clip.mark("book-first");
  await seenIn(page, TRACK.bookings, "Needs approval");
  clip.mark("book-escalated");
  await runDone(page);
  clip.mark("book-done");
  await clip.wait(8000);

  // retry: the request log pinned; Retry the call pressed off screen (Riverline's)
  await pin(page, TRACK.requests, 300);
  clip.mark("retry-still");
  await clip.wait(1500);
  await press(page, "Retry the call");
  clip.mark("retry-pressed");
  await seenIn(page, TRACK.requests, "replayed");
  clip.mark("retry-replayed");
  await clip.wait(7500);

  // approve: the approval card (top of the Book grid); ONE action: Approve
  await pin(page, TRACK.bookCard, 84);
  clip.mark("approve-still");
  await clip.wait(7500);
  await clip.click(page.getByRole("button", { name: /Approve \$44/ }), { label: "approve", move: 850 });
  await seenIn(page, TRACK.approval, "Approved by you");
  clip.mark("approve-done");
  await clip.wait(7500);
  await park(clip);

  // top: the plan card after approval
  await unpin(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  clip.mark("top");
  await clip.wait(8000);
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
