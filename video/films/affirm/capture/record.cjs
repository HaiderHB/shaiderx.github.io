// Affirm capture script (kit 2.1, launch format). Run from video/: node films/affirm/capture/record.cjs take
// Then: npm run footage -- films/affirm take   (builds assets/footage/take.mp4 + data/clips/take.json)
//
// The demo runs from an ISOLATED copy of the worktree (next build && next start -p 3161), with no demo key:
// the page is in preview mode and replays its recorded example runs. The model outputs in them (DeepSeek's
// tool calls and reply per round, the decision model's answers, the hand-off note) were recorded from live
// runs on the Vercel preview on 2026-11-17; the page replays them faster and computes every tool result,
// policy check, the rules floor and the route in the browser. No live calls. The film labels it.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530), cursor about
// 1.5x a system arrow, hidden when idle.
//
// Take 2 (2026-11-18), for the result rule (kit 2.1): every result is followed by a REAL hold of 7.8 s, so a
// shot can keep its result on screen for the rule's time (up to 6 s) without a freeze frame, and every landing
// is marked (clip.mark) so the cut can start just before it.
//
// One continuous take, `take`. The script pins the card a shot is about: it keeps that card's top at a fixed
// height in the window by scrolling when the layout above it changes (a reader holding their place). Nothing
// on the page is altered.
//   hook     the top of the page: the date-change example lands in the hero card
//   empty    a new chat: the empty thread and the three questions (backdrop of the problem statement)
//   chat     "Can I move my payment date?" is sent; the agent's reply types in; HOLD; then ONE action: the
//            cursor presses "Confirm: move to the 21st"; "Done. ..." lands; HOLD
//   tools    the same example replayed with the agent run pinned: three tool calls land; HOLD
//   guard    replayed again with the policy guardrails in view: the checks land; HOLD
//   f2a      "I think I was charged twice", agent run pinned: the charges, then the dispute; HOLD
//   f2b      replayed with the decision card pinned: a person 100%, the rules floor, the Disputes queue; HOLD
//   f3       replayed with the note for the human agent pinned; HOLD
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
// the chat: her newest message, the agent's newest reply (not the "applied by code" line), its bubble
const REPLY_LI = `[...d.querySelectorAll('[class*="Chat_message__"][data-side="start"]')].filter((li) => !li.textContent.includes('applied by code')).pop()`;
const lastAsk = new Function("d", `return [...d.querySelectorAll('[class*="Chat_message__"][data-side="end"]')].pop()`);
const lastReplyMsg = new Function("d", `return ${REPLY_LI}`);
const lastReply = new Function("d", `const li = ${REPLY_LI}; return li && li.querySelector('[class*="Chat_bubble__"]')`);
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
  ask: { fn: lastAsk, clip: true },
  reply: { fn: lastReply, clip: true },
  replyMsg: { fn: lastReplyMsg, clip: true },
  proposal: { fn: lastProposal, clip: true },
  done: { fn: lastDone, clip: true },
  runCard: '[class*="Affirm_runCard__"]',
  runAsk: '[class*="Affirm_runAsk__"]',
  r1: step("Model · round 1"),
  r2: step("Model · round 2"),
  r3: step("Model · round 3"),
  guard: step("Policy guardrails"),
  decide: step("Decide"),
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

const HOLD = 7800; // a real hold after every result: the result rule asks for up to 6 s on screen

// wait until fn(document) is truthy, then mark the moment
async function when(clip, label, body) {
  await clip.page.waitForFunction(new Function("return (" + body + ")(document)"), null, { timeout: 30000, polling: 30 });
  clip.mark(label);
}
const routes = (page) => page.evaluate(() => document.querySelectorAll('[class*="Affirm_routeLine__"]').length);
const routed = (n) => `(d) => d.querySelectorAll('[class*="Affirm_routeLine__"]').length > ${n}`;
const callIn = (title) => `(d) => { const li = (${step(title).toString()})(d); return li && li.querySelector('[class*="ToolCall_call__"]'); }`;

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
  let n;

  // hook (+ the what backdrop): the date-change example lands in the hero card
  await clip.wait(1000);
  n = await routes(page);
  clip.mark("hook-go");
  await press(page, DATE);
  await when(clip, "hook-resolved", routed(n));
  await clip.wait(5200);

  // empty: a new chat, the three questions (the problem backdrop)
  await fresh(page);
  await pin(page, TRACK.chatCard, 70);
  clip.mark("empty");
  await clip.wait(4600);

  // chat: her question is sent, the reply types in; HOLD. Then ONE action: Confirm; HOLD.
  n = await routes(page);
  clip.mark("chat-go");
  await press(page, DATE);
  await when(clip, "chat-typing", `(d) => { const b = (${lastReply.toString()})(d); return b && !b.querySelector('[class*="States_typing"]') && b.textContent.trim().length > 0; }`);
  await when(clip, "chat-typed", `(d) => { const li = (${lastReplyMsg.toString()})(d); return li && li.querySelector('[class*="Affirm_proposal__"]'); }`);
  await when(clip, "chat-routed", routed(n));
  await clip.wait(HOLD);
  await clip.click(page.getByRole("button", { name: /Confirm: move to the 21st/ }).last(), { label: "confirm", move: 850, pause: 900 });
  await when(clip, "confirm-done", `(d) => (${lastDone.toString()})(d)`);
  await clip.wait(HOLD);
  await park(clip);

  // tools: the same example again with the agent run pinned (three tool calls land)
  await pin(page, TRACK.runCard, -110);
  await clip.wait(1300);
  n = await routes(page);
  clip.mark("tools-go");
  await press(page, DATE);
  await when(clip, "tools-r1", callIn("Model · round 1"));
  await when(clip, "tools-r2", callIn("Model · round 2"));
  await when(clip, "tools-r3", callIn("Model · round 3"));
  await when(clip, "tools-routed", routed(n));
  await clip.wait(HOLD);

  // guard: replayed again with the guardrails in view (pinned where they land: the run card's own top)
  const g = await page.evaluate(() => {
    const step = [...document.querySelectorAll('[class*="Timeline_step__"]')].find((li) => ((li.querySelector("strong") || {}).textContent || "").startsWith("Policy guardrails"));
    const card = document.querySelector('[class*="Affirm_runCard__"]');
    return { off: step.getBoundingClientRect().top - card.getBoundingClientRect().top };
  });
  await pin(page, TRACK.runCard, Math.round(90 - g.off));
  await clip.wait(1300);
  n = await routes(page);
  clip.mark("guard-go");
  await press(page, DATE);
  await when(clip, "guard-lands", `(d) => (${step("Policy guardrails").toString()})(d)`);
  await when(clip, "guard-routed", routed(n));
  await clip.wait(HOLD);

  // f2a: the double charge, agent run pinned
  await pin(page, TRACK.runCard, -110);
  await clip.wait(1300);
  n = await routes(page);
  clip.mark("f2a-go");
  await press(page, TWICE);
  await when(clip, "f2a-r1", callIn("Model · round 1"));
  await when(clip, "f2a-r2", callIn("Model · round 2"));
  await when(clip, "f2a-r3", callIn("Model · round 3"));
  await when(clip, "f2a-routed", routed(n));
  await clip.wait(HOLD);

  // f2b: replayed with the decision card pinned
  await fresh(page);
  await page.evaluate(() => document.getElementById("route").scrollIntoView({ behavior: "instant" }));
  await pin(page, TRACK.decisionCard, 70);
  await clip.wait(1600);
  clip.mark("f2b-go");
  await press(page, TWICE);
  await when(clip, "f2b-lands", `(d) => d.querySelector('[class*="Affirm_decisionBody__"]')`);
  await clip.wait(HOLD);

  // f3: replayed with the note for the human agent pinned
  await fresh(page);
  await pin(page, TRACK.note, 110);
  await clip.wait(1600);
  clip.mark("f3-go");
  await press(page, TWICE);
  await when(clip, "f3-lands", `(d) => d.querySelector('[class*="Affirm_nextStep__"]')`);
  await clip.wait(HOLD);

  // proof: the top of the page with the date-change example in the hero card
  await unpin(page);
  await fresh(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await clip.wait(800);
  n = await routes(page);
  clip.mark("proof-go");
  await press(page, DATE);
  await when(clip, "proof-resolved", routed(n));
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
