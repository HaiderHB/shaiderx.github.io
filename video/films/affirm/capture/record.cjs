// Affirm capture script (kit 2, launch format). Run from video/: node films/affirm/capture/record.cjs take
// Then: npm run footage -- films/affirm take   (builds assets/footage/take.mp4 + data/clips/take.json)
//
// The demo runs from an ISOLATED copy of the worktree (next build && next start -p 3161), with no demo key:
// the page is in preview mode and replays its recorded example runs. The model outputs in them (DeepSeek's
// tool calls and reply per round, the decision model's answers, the hand-off note) were recorded from live
// runs on the Vercel preview on 2026-11-17; the page replays them faster and computes every tool result,
// policy check, the rules floor and the route in the browser. No live calls. The film labels it.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530), cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `take`. Before each replay the script presses "New chat" (no cursor, so the shot
// starts clean) and pins the card a shot is about: it keeps that card's top at a fixed height in the window
// by scrolling when the layout above it changes (a reader holding their place). Nothing on the page is altered.
//   hook     the top of the page: the date-change example lands in the hero card
//   empty    a new chat: the empty thread and the three questions (backdrop of the problem statement)
//   h1       the cursor presses "Can I move my payment date?"; her message lands and the agent answers
//   h2       the same example replayed with the agent run pinned: three tool calls land
//   h3       replayed again with the policy guardrails in view: the checks land
//   h4       the proposed change: the cursor presses "Confirm: move to the 21st"
//   f2a      "I think I was charged twice", agent run pinned: the charges, then the dispute
//   f2b      replayed with the decision card pinned: a person 100%, the rules floor, the Disputes queue
//   f3       replayed with the note for the human agent pinned
//   proof    the top of the page with the date-change example in the hero card
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3161/demo/affirm/";
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
  document.querySelectorAll('[class*="Panel_card__"], [class*="DemoLayout_hero__"]').forEach((c) => ro.observe(c));
  window.__unpin = () => { mo.disconnect(); ro.disconnect(); window.__unpin = null; };
  fix();
};`;

const step = (title) =>
  new Function("d", `return [...d.querySelectorAll('[class*="Timeline_step__"]')].find((li) => ((li.querySelector('strong') || {}).textContent || '').startsWith(${JSON.stringify(title)}))`);
const lastProposal = new Function("d", `return [...d.querySelectorAll('[class*="Affirm_proposal__"]')].pop()`);
const lastDone = new Function("d", `return [...d.querySelectorAll('[class*="Chat_message__"]')].reverse().find((li) => li.textContent.includes('Done. Your'))`);
const src = (fn) => (typeof fn === "string" ? `(d) => d.querySelector(${JSON.stringify(fn)})` : fn.toString());

// component name -> CSS selector or (document) => Element. ONE card, ONE clause, ONE button per shot.
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  hero: '[class*="DemoLayout_hero__"]',
  glance: '[class*="Affirm_glance__"]',
  chatCard: '[class*="Affirm_chatCard__"]',
  thread: '[class*="Chat_thread__"]',
  presets: '[class*="Affirm_presets__"]',
  runCard: '[class*="Affirm_runCard__"]',
  r1: step("Model · round 1"),
  r2: step("Model · round 2"),
  r3: step("Model · round 3"),
  guard: step("Policy guardrails"),
  decide: step("Decide"),
  proposal: { fn: lastProposal, clip: true },
  done: { fn: lastDone, clip: true },
  loans: '[class*="Affirm_loansCard__"]',
  decision: '[class*="Affirm_decisionBody__"]',
  decisionCard: '[class*="Affirm_decisionCard__"]',
  note: '[class*="Affirm_handoffCard__"]',
  nextStep: '[class*="Affirm_nextStep__"]',
};

const PARK = [1346, 740]; // the page's right margin: nothing to hover
const pin = (page, target, y) => page.evaluate(([s, y]) => window.__pin(s, y), [src(target), y]);
const unpin = (page) => page.evaluate(() => window.__unpin && window.__unpin());
const press = (page, re) => page.evaluate((r) => [...document.querySelectorAll("button")].find((b) => new RegExp(r).test(b.textContent)).click(), re);
const seen = (page, re) => page.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re, { timeout: 30000, polling: 30 });
const DATE = "^Can I move my payment date";
const TWICE = "^I think I was charged twice";

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

// press a question and wait until its turn has a route (a new route line under the agent's reply)
async function ask(page, re) {
  const before = await page.evaluate(() => document.querySelectorAll('[class*="Affirm_routeLine__"]').length);
  await press(page, re);
  await page.waitForFunction((n) => document.querySelectorAll('[class*="Affirm_routeLine__"]').length > n, before, { timeout: 30000, polling: 30 });
}

async function fresh(page) {
  await press(page, "New chat");
  await seen(page, "Waiting for a question");
}

async function take() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "take", url: BASE, track: TRACK, init: PIN_JS }, VIEW));
  const { page } = clip;
  // pre-roll: the page plays its example on load; let it finish, then start clean at the top
  await seen(page, "Resolved by the agent");
  await page.waitForTimeout(1200);
  await fresh(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1600);
  await clip.begin();

  // hook (+ the what backdrop): the date-change example lands in the hero card
  await clip.wait(1000);
  clip.mark("hook-go");
  await press(page, DATE);
  await seen(page, "Resolved by the agent");
  clip.mark("hook-resolved");
  await clip.wait(5200);

  // empty: a new chat, the three questions (the problem backdrop)
  await fresh(page);
  await pin(page, TRACK.chatCard, 70);
  clip.mark("empty");
  await clip.wait(6800);

  // h1: still, then ONE action: press the first question
  clip.mark("h1-still");
  await clip.wait(1300);
  await clip.click(page.locator('[class*="Affirm_presets__"] button').first(), { label: "h1-ask", move: 850 });
  await seen(page, "Resolved by the agent");
  clip.mark("h1-resolved");
  await clip.wait(3200);
  await park(clip);

  // h2: the same example again with the agent run pinned (three tool calls land)
  await pin(page, TRACK.runCard, -110);
  await clip.wait(1600);
  clip.mark("h2-go");
  await ask(page, DATE);
  clip.mark("h2-resolved");
  await clip.wait(3000);

  // h3: replayed again with the guardrails in view (pinned where they land: the run card's own top)
  const g = await page.evaluate(() => {
    const step = [...document.querySelectorAll('[class*="Timeline_step__"]')].find((li) => ((li.querySelector("strong") || {}).textContent || "").startsWith("Policy guardrails"));
    const card = document.querySelector('[class*="Affirm_runCard__"]');
    return { off: step.getBoundingClientRect().top - card.getBoundingClientRect().top, h: step.getBoundingClientRect().height };
  });
  await pin(page, TRACK.runCard, Math.round(90 - g.off));
  await clip.wait(1600);
  clip.mark("h3-go");
  await ask(page, DATE);
  clip.mark("h3-resolved");
  await clip.wait(3200);

  // h4: the proposed change in the chat; still, then ONE action: Confirm
  await pin(page, lastProposal, 170);
  clip.mark("h4-still");
  await clip.wait(1400);
  await unpin(page);
  await clip.click(page.getByRole("button", { name: /Confirm: move to the 21st/ }).last(), { label: "h4-confirm", move: 850 });
  await seen(page, "Done. Your rowing machine");
  clip.mark("h4-done");
  await clip.wait(3200);
  await park(clip);

  // f2a: the double charge, agent run pinned
  await pin(page, TRACK.runCard, -110);
  await clip.wait(1600);
  clip.mark("f2a-go");
  await ask(page, TWICE);
  clip.mark("f2a-routed");
  await clip.wait(2600);

  // f2b: replayed with the decision card pinned
  await fresh(page);
  await page.evaluate(() => document.getElementById("route").scrollIntoView({ behavior: "instant" }));
  await pin(page, TRACK.decisionCard, 70);
  await clip.wait(1600);
  clip.mark("f2b-go");
  await press(page, TWICE);
  await seen(page, "Handed to Disputes");
  clip.mark("f2b-routed");
  await clip.wait(3600);

  // f3: replayed with the note for the human agent pinned
  await fresh(page);
  await pin(page, TRACK.note, 110);
  await clip.wait(1600);
  clip.mark("f3-go");
  await press(page, TWICE);
  await seen(page, "Suggested next step");
  clip.mark("f3-note");
  await clip.wait(7000);

  // proof: the top of the page with the date-change example in the hero card
  await unpin(page);
  await fresh(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await clip.wait(800);
  clip.mark("proof-go");
  await press(page, DATE);
  await seen(page, "Resolved by the agent");
  clip.mark("proof-resolved");
  await clip.wait(7500);
  await clip.finish();
}

const takes = { take };
(async () => {
  const which = process.argv[2] || "take";
  if (!takes[which]) throw new Error("unknown take " + which);
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
