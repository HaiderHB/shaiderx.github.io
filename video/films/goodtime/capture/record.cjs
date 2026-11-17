// GoodTime capture script (launch format, kit 2). Run from video/: node films/goodtime/capture/record.cjs
// Then: npm run footage -- films/goodtime   (builds assets/footage/rescue.mp4 + data/clips/rescue.json)
//
// The demo runs from an isolated copy of the worktree (next build && next start -p 3171), with no demo key:
// the page is in preview mode and replays its recorded example run of the "Out sick" message. The model
// outputs in it (the LLM's tool calls, the decision model's answer, the drafts) were recorded from live runs
// on the Vercel preview on 2026-11-16 (12.4 s live); the page replays them in about 5 s and computes every
// tool call, rule check, hold and calendar change in the browser. No live calls. The film labels it.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530), so the UI is
// 1.41x larger on the 1920 stage and 1.4-2x camera zooms stay sharp; cursor about 1.5x a system arrow, hidden
// when idle, resting 450 ms before every click.
//
// One continuous take, `rescue`, in the order the page allows (overrides lock once the candidate has changed
// the loop). The page is long and its cards change height while a run plays, so the script "pins" the card
// a shot is about: it keeps that card's top at a fixed height in the window by scrolling the page whenever
// the layout above it changes (a reader holding their place). Nothing on the page is altered.
//   hook     the top of the page while the example replays: "Loop at risk" flips to "Loop rescued"
//   before   the repair undone (Undo last change), so the loop is at risk: backdrop of the problem statement
//   run      Run the agent is pressed beside the calendar: the message card, then the calendar repairing
//   checks   the same example replayed with two steps of the agent run pinned: qualified, then checked
//   drafts   the same example replayed with the drafted messages pinned
//   override "Override: apply this instead" is pressed in the decision card
//   undo     "Undo last change" is pressed in the audit trail
//   chat     the chat card comes into view: the page plays the candidate's recorded message, the agent
//            replans, the calendar beside it moves two interviews
//   wide     the top of the page with the finished loop card
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3171/demo/goodtime/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

// window.__pin(src, y): keep the element returned by the function source `src` with its top at viewport y.
// It re-scrolls from mutation and resize observers, which run before the next paint, so the card never jumps.
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
  document.querySelectorAll('[class*="Panel_card__"]').forEach((c) => ro.observe(c));
  window.__unpin = () => { mo.disconnect(); ro.disconnect(); window.__unpin = null; };
  fix();
};`;

// tracked functions are serialised into the page, so values are baked into the source
const card = (title) =>
  new Function("d", `return [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) => /^${title}/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim()))`);
const step = (name) => new Function("d", `return [...d.querySelectorAll('[class*="Timeline_step__"]')].find((li) => li.textContent.includes(${JSON.stringify(name)}))`);
const src = (fn) => (typeof fn === "string" ? `(d) => d.querySelector(${JSON.stringify(fn)})` : fn.toString());

// component name -> CSS selector or (document) => Element. Track every component a shot or a spotlight uses.
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  hero: '[class*="DemoLayout_hero__"]',
  glance: '[class*="GoodTime_glance__"]',
  glanceStatus: '[class*="GoodTime_glanceStatus__"]',
  ribbon: '[class*="GoodTime_ribbon__"]',
  glanceStats: '[class*="GoodTime_glanceStats__"]',
  calendar: '[class*="GoodTime_calendar__"]',
  strip: '[class*="Schedule_strip__"]',
  loopList: '[class*="GoodTime_loopList__"]',
  messageCard: '[class*="GoodTime_messageCard__"]',
  messageInput: "#dropout-message",
  runCard: card("Agent run"),
  stepRead: step("report_dropout"),
  stepLoop: step("getLoop"),
  stepFind: step("findQualifiedInterviewers"),
  stepCheck: step("checkAvailability"),
  stepScore: step("scoreOptions"),
  decision: card("Decision"),
  bars: '[class*="ProbabilityBar_bars__"]',
  final: '[class*="GoodTime_final__"]',
  options: '[class*="GoodTime_options__"]',
  draftsCard: card("Drafted messages"),
  drafts: '[class*="GoodTime_drafts__"]',
  draft1: '[class*="GoodTime_drafts__"] > li:nth-child(1)',
  draft2: '[class*="GoodTime_drafts__"] > li:nth-child(2)',
  chat: '[class*="GoodTime_chatCard__"]',
  thread: '[class*="Chat_thread__"]',
  audit: '[class*="GoodTime_auditCard__"]',
  auditHead: '[class*="GoodTime_auditCard__"] [class*="Panel_cardHead__"]',
  auditList: '[class*="AuditTrail_trail__"]',
};

const PARK = [1344, 720]; // the page's right margin: nothing to hover
const pin = (page, target, y) => page.evaluate(([s, y]) => window.__pin(s, y), [src(target), y]);
const unpin = (page) => page.evaluate(() => window.__unpin && window.__unpin());
const press = (page, re) => page.evaluate((r) => [...document.querySelectorAll("button")].find((b) => new RegExp(r).test(b.textContent)).click(), re);
const seen = (page, re) => page.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re, { timeout: 30000, polling: 30 });

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

// one replay of the example: marks when the loop is at risk, rescued, and when the drafts are written
async function watchRun(clip, name) {
  const { page } = clip;
  await seen(page, "Loop at risk");
  clip.mark(name + "-risk");
  await seen(page, "Loop rescued");
  clip.mark(name + "-rescued");
  await seen(page, "drafts written");
  clip.mark(name + "-done");
}

async function rescue() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "rescue", url: BASE, track: TRACK, init: PIN_JS }, VIEW));
  const { page } = clip;
  // the page plays its example on load; let it finish (pre-roll)
  await seen(page, "drafts written");
  await page.evaluate(() => window.scrollTo(0, 0));
  await park(clip);
  await page.waitForTimeout(1800);
  await clip.begin();

  // hook: the top of the page while the example replays
  await clip.wait(900);
  clip.mark("hook-replay");
  await press(page, "Replay");
  await watchRun(clip, "hook");
  await clip.wait(4400);

  // before: the repair undone, so the calendar shows the dropped interview (the problem statement's backdrop)
  await press(page, "Undo last change");
  await pin(page, TRACK.messageCard, 92);
  clip.mark("before");
  await clip.wait(7600);

  // run: still, then ONE action: press Run the agent. The calendar beside it goes red, then repairs.
  clip.mark("run-still");
  await clip.wait(1200);
  await clip.click(page.getByRole("button", { name: "Run the agent" }), { label: "run", move: 850 });
  await watchRun(clip, "run");
  await clip.wait(4600);
  await park(clip);

  // checks: the same example again with two steps of the agent run pinned
  await pin(page, TRACK.stepFind, 150);
  await clip.wait(1900);
  clip.mark("checks-replay");
  await press(page, "Replay");
  await watchRun(clip, "checks");
  await clip.wait(3600);

  // drafts: the same example again with the drafted messages pinned (their card's top just under the page's
  // bar, so the chat card above stays out of view and does not start its recorded turn yet)
  await pin(page, TRACK.draftsCard, 14);
  await clip.wait(700);
  clip.mark("drafts-replay");
  await press(page, "Replay");
  await watchRun(clip, "drafts");
  await clip.wait(4400);

  // override: still, then ONE action: apply another valid repair
  await pin(page, TRACK.decision, 92);
  clip.mark("override-still");
  await clip.wait(1700);
  await clip.click(page.getByRole("button", { name: "Override: apply this instead" }).first(), { label: "override", move: 850 });
  await clip.wait(3800);
  await park(clip);

  // undo: still, then ONE action: undo it in the audit trail
  await pin(page, TRACK.audit, 92);
  clip.mark("undo-still");
  await clip.wait(1900);
  await clip.click(page.getByRole("button", { name: "Undo last change" }), { label: "undo", move: 850 });
  await clip.wait(3800);
  await park(clip);
  await clip.wait(1500);

  // chat: the chat card comes into view and the page plays the candidate's recorded message
  await pin(page, TRACK.chat, 92);
  clip.mark("chat");
  await page.waitForFunction(() => document.querySelectorAll('[class*="GoodTime_changes__"] li').length > 0, null, { timeout: 30000, polling: 30 });
  clip.mark("chat-moved");
  await clip.wait(6200);

  // wide: the top of the page, the finished loop card
  await unpin(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  clip.mark("wide");
  await clip.wait(8200);
  await clip.finish();
}

const takes = { rescue };
(async () => {
  const which = process.argv[2] || "rescue";
  if (!takes[which]) throw new Error("unknown take " + which + " (" + Object.keys(takes).join(", ") + ")");
  fs.mkdirSync(path.join(FILM, "raw"), { recursive: true });
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
