// Truss capture script (kit 2, launch format). Run from video/: node films/truss/capture/record.cjs [flow]
// Then: npm run footage -- films/truss flow   (builds assets/footage/flow.mp4 + data/clips/flow.json)
//
// The demo runs from an isolated copy of the worktree (next build && next start -p 3163), with no demo key:
// the page is in preview mode and replays its example. The model outputs in it (Gemini's JSON per invoice,
// Jev's answers, DeepSeek's notes) were recorded from live runs on the Vercel preview on 2026-11-17; the checks,
// the rules floor and the payment endpoint run in the browser on the same code as the API. No live calls.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `flow`. The page is long and cards change height while a run plays, so the script pins
// the card a shot is about (keeps its top at a fixed height by scrolling when the layout above changes).
// "New session" (the ledger card's button) empties the in-browser ledger between replays, so the clean
// Northline bill is not a duplicate of the payment the previous replay made. Nothing on the page is altered.
//   load      the page's on-load example: Northline read, checked, approved, then paid with a timeout + retry
//             (the hero card: Paying… → No reply. Retrying… → Paid once); then the top of the page holds
//   problem   Keystone picked: its resent invoice ("REMINDER · PAST DUE") in the invoice column
//   read      Northline: Read and check is pressed beside the invoice; the scan sweeps
//   bill      the same example again with the typed bill pinned: the fields land
//   checks    again with the checks pinned: eight checks tick
//   decide    again with the decision pinned: probabilities, floor, Approve, the note
//   pay       Simulate a timeout and retry is pressed in the payment card
//   ledger    again, with the ledger pinned, the payment with timeout and retry (pressed off screen)
//   hold      Crestline with the decision pinned: Hold for review (recorded with a full hold; not in the
//             kit 2.1 cut of the film, see SPEC.md)
//   stop      Keystone: the payment card "Stopped before payment"; Try to pay it anyway is pressed: 403
// Kit 2.1, the result rule: every result is recorded with a real hold of 6-7 s after it is fully on screen
// (the film keeps a result up max(2.5, 0.5 + 0.3 x words) s, 6 s at most; the screencast shows a change up to
// 0.3 s after its DOM time while spinners run), so no shot needs a held frame.
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3163/demo/truss/";
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

// tracked functions are serialised into the page, so values are baked into the source
const card = (title) =>
  new Function("d", `return [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) => ((c.querySelector('h3') || {}).textContent || '').trim() === ${JSON.stringify(title)})`);
const src = (fn) => (typeof fn === "string" ? `(d) => d.querySelector(${JSON.stringify(fn)})` : fn.toString());

const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_hero__"]',
  glance: '[class*="Truss_glance__"]',
  picker: '[class*="Truss_picker__"]',
  docCol: '[class*="Truss_docCol__"]',
  doc: '[class*="Truss_doc__"]',
  runBox: '[class*="Truss_runBox__"]',
  bill: card("Typed bill"),
  billKv: '[class*="Truss_billKv__"]',
  lines: '[class*="Truss_lines__"]',
  billFoot: '[class*="Truss_billFoot__"]',
  checks: card("Checks in code"),
  checksTable: '[class*="Truss_checks__"]',
  decision: card("Decision"),
  bars: '[class*="Truss_bars__"]',
  final: '[class*="Truss_final__"]',
  note: '[class*="Truss_note__"]',
  pay: card("Payment"),
  attempts: '[class*="Truss_attempts__"]',
  payActions: '[class*="Truss_payActions__"]',
  ledger: card("Ledger"),
  ledgerStats: '[class*="Truss_ledgerStats__"]',
  log: '[class*="RequestLog_log__"]',
};

const PARK = [1350, 600]; // the page's right gutter: nothing to hover
// The invoice column is sticky (top 96 px), so pinning it directly fights the sticky offset and the page
// scrolls whenever the bill beside it grows. Pin the picker above it instead (not sticky): with its top at
// -11 px the invoice column rests at 96 px and nothing moves while the bill fills in.
const PICKER_Y = -11;
const pin = (page, target, y) => page.evaluate(([s, y]) => window.__pin(s, y), [src(target), y]);
const unpin = (page) => page.evaluate(() => window.__unpin && window.__unpin());
const press = (page, re) =>
  page.evaluate((r) => {
    const b = [...document.querySelectorAll("button")].find((x) => new RegExp(r).test(x.textContent.trim()) && !x.disabled);
    if (!b) throw new Error("no button " + r);
    b.click();
  }, re);
const pick = (page, name) =>
  page.evaluate((n) => [...document.querySelectorAll('[role="radio"]')].find((x) => x.textContent.includes(n)).click(), name);
const seen = (page, re) => page.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re, { timeout: 30000, polling: 30 });
// the run is over when the Read button is back (not "Running")
const runDone = (page) =>
  page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Read and check/.test(b.textContent) && !b.disabled), null, { timeout: 30000, polling: 30 });
const payDone = (page) =>
  page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /Send the same request again/.test(b.textContent) && !b.disabled), null, { timeout: 30000, polling: 30 });

// text inside one card (by its title), e.g. the decision landing in the Decision card, not in the audit trail
const seenIn = (page, title, re) =>
  page.waitForFunction(
    ([t, r]) => {
      const c = [...document.querySelectorAll('[class*="Panel_card__"]')].find((x) => ((x.querySelector("h3") || {}).textContent || "").trim() === t);
      return !!c && new RegExp(r).test(c.innerText);
    },
    [title, re],
    { timeout: 30000, polling: 30 }
  );

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

/** A clean Northline bill: new session, pick it (the page resets the run). */
async function freshNorthline(page) {
  await press(page, "^New session$");
  await page.waitForTimeout(150);
  await pick(page, "Northline Electric");
  await page.waitForTimeout(250);
}

async function flow() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "flow", url: BASE, track: TRACK, init: PIN_JS }, VIEW));
  const { page } = clip;
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await clip.begin();

  // load: the on-load example plays at the top of the page, then pays with a timeout and a retry
  clip.mark("load");
  await seen(page, "Paying…");
  clip.mark("load-paying");
  await seen(page, "No reply\\. Retrying");
  clip.mark("load-timeout");
  await seen(page, "Paid once");
  clip.mark("load-paid");
  await clip.wait(9000); // the top of the page holds (proof)

  // problem: Keystone's resent invoice in the invoice column
  await pick(page, "Keystone Drywall");
  await pin(page, TRACK.picker, PICKER_Y);
  clip.mark("problem");
  await clip.wait(7200);

  // read: still, then ONE action: Read and check beside the Northline invoice; the scan sweeps
  await freshNorthline(page);
  await pin(page, TRACK.picker, PICKER_Y);
  clip.mark("read-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: /Read and check/ }), { label: "read", move: 850 });
  await seen(page, "Schema valid");
  clip.mark("read-extracted");
  await runDone(page);
  clip.mark("read-done");
  await clip.wait(1500);
  await park(clip);
  await clip.wait(1300);

  // bill: the same example again with the typed bill pinned (pressed off screen)
  await freshNorthline(page);
  await pin(page, TRACK.bill, 84);
  clip.mark("bill-still");
  await clip.wait(1400);
  await press(page, "Read and check");
  clip.mark("bill-pressed");
  await seen(page, "Schema valid");
  clip.mark("bill-landed");
  await runDone(page);
  await clip.wait(6500); // the typed bill holds

  // checks: again with the checks pinned
  await freshNorthline(page);
  await pin(page, TRACK.checks, 84);
  clip.mark("checks-still");
  await clip.wait(1400);
  await press(page, "Read and check");
  clip.mark("checks-pressed");
  await seenIn(page, "Checks in code", "1/8 passed");
  clip.mark("checks-first");
  await seenIn(page, "Checks in code", "4/8 passed");
  clip.mark("checks-four");
  await seen(page, "8/8 passed");
  clip.mark("checks-all");
  await runDone(page);
  await clip.wait(7500); // the eight checks hold

  // decide: again with the decision pinned; the run stays approved and unpaid for the payment shot
  await freshNorthline(page);
  await pin(page, TRACK.decision, 84);
  clip.mark("decide-still");
  await clip.wait(1400);
  await press(page, "Read and check");
  clip.mark("decide-pressed");
  await seenIn(page, "Decision", "the model may approve");
  clip.mark("decide-landed");
  await runDone(page);
  clip.mark("decide-done"); // the note has finished typing
  await clip.wait(8000); // the decision holds

  // pay: still, then ONE action: Simulate a timeout and retry
  await pin(page, TRACK.pay, 84);
  clip.mark("pay-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: /Simulate a timeout and retry/ }), { label: "pay", move: 850 });
  await seenIn(page, "Payment", "timed out");
  clip.mark("pay-timeout");
  await payDone(page);
  clip.mark("pay-done");
  await clip.wait(7500); // both attempts hold
  await park(clip);
  await clip.wait(900);

  // ledger: again, with the ledger pinned; the payment with timeout and retry is pressed off screen
  await freshNorthline(page);
  await press(page, "Read and check");
  await runDone(page);
  await pin(page, TRACK.ledger, 84);
  clip.mark("ledger-still");
  await clip.wait(1500);
  await press(page, "Simulate a timeout and retry");
  clip.mark("ledger-pressed");
  await payDone(page);
  clip.mark("ledger-done");
  await clip.wait(8000); // the ledger holds

  // hold: Crestline with the decision pinned
  await pick(page, "Crestline Mechanical");
  await page.waitForTimeout(200);
  await pin(page, TRACK.decision, 84);
  clip.mark("hold-still");
  await clip.wait(1400);
  await press(page, "Read and check");
  clip.mark("hold-pressed");
  await seenIn(page, "Decision", "at least hold");
  clip.mark("hold-landed");
  await runDone(page);
  clip.mark("hold-done"); // the note has finished typing
  await clip.wait(8000); // the held decision holds

  // stop: Keystone; the payment card says it was stopped; ONE action: Try to pay it anyway
  await pick(page, "Keystone Drywall");
  await page.waitForTimeout(200);
  await press(page, "Read and check");
  await runDone(page);
  await pin(page, TRACK.pay, 84);
  clip.mark("stop-still");
  await clip.wait(1600);
  await clip.click(page.getByRole("button", { name: /Try to pay it anyway/ }), { label: "force", move: 850 });
  await seen(page, "Refused with 403");
  clip.mark("stop-refused");
  await clip.wait(7500); // the refusal holds
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
