// GoodTime capture script (kit 1.1). Run from video/:
//   DEMO_URL=http://localhost:3171/demo/goodtime/ node films/goodtime/capture/record.cjs <clip>
// The demo runs from an isolated copy of the site (next build && next start -p 3171), in preview
// mode (no key): the page's example run, recorded from live preview runs on 2026-11-16 (DeepSeek
// V3.2 via fal + Jev). Every tool call, check, hold and calendar change in it is computed in the
// browser by the same code the API runs. Free: no live calls are made while recording.
// Clips: top (the hero glance during a replay of the rescue), main (the rescue in the run trace,
// the decision, then the candidate chat, the drafts and the audit trail).
// Then: node kit/scripts/build-footage.mjs films/goodtime
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3171/demo/goodtime/";
const HEADER = 92; // the page's sticky bar covers y < 68: park components at y = 92

// component name -> CSS selector or (document) => Element (serialised into the page: keep each self-contained)
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  hero: '[class*="DemoLayout_hero__"]',
  glance: '[class*="GoodTime_glance__"]',
  ribbon: '[class*="GoodTime_ribbon__"]',
  calendar: '[class*="GoodTime_calendar__"]',
  strip: '[class*="Schedule_strip__"]',
  stripGrid: '[class*="Schedule_grid__"]',
  loopList: '[class*="GoodTime_loopList__"]',
  invariants: '[class*="GoodTime_invariants__"]',
  messageCard: '[class*="GoodTime_messageCard__"]',
  messageInput: "#dropout-message",
  runCard: (d) =>
    [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) =>
      /^Agent run/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())
    ),
  runHead: (d) => {
    const c = [...d.querySelectorAll('[class*="Panel_card__"]')].find((x) =>
      /^Agent run/.test(((x.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())
    );
    return c && c.querySelector('[class*="Panel_cardHead__"]');
  },
  timeline: '[class*="GoodTime_main__"] > [class*="Panel_card__"] [class*="Timeline_timeline__"]',
  callCheck: (d) => [...d.querySelectorAll('[class*="GoodTime_call__"]')].find((li) => li.textContent.includes("checkAvailability")),
  callScore: (d) => [...d.querySelectorAll('[class*="GoodTime_call__"]')].find((li) => li.textContent.includes("scoreOptions")),
  callHold: (d) => [...d.querySelectorAll('[class*="GoodTime_call__"]')].find((li) => li.textContent.includes("holdSlot")),
  callIntake: (d) => [...d.querySelectorAll('[class*="GoodTime_call__"]')].find((li) => li.textContent.includes("report_dropout")),
  decision: (d) =>
    [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) =>
      /^Decision/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())
    ),
  bars: '[class*="ProbabilityBar_bars__"]',
  final: '[class*="GoodTime_final__"]',
  options: '[class*="GoodTime_options__"]',
  chat: '[class*="GoodTime_chatCard__"]',
  thread: '[class*="Chat_thread__"]',
  agentReply: (d) => {
    const items = [...d.querySelectorAll('[class*="Chat_message__"][data-side="start"]')];
    return items[items.length - 1];
  },
  changes: '[class*="GoodTime_changes__"]',
  drafts: (d) =>
    [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) =>
      /^Drafted messages/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())
    ),
  audit: '[class*="GoodTime_auditCard__"]',
  dayWed: (d) => d.querySelectorAll('[class*="Schedule_day__"]')[1],
  dayThu: (d) => d.querySelectorAll('[class*="Schedule_day__"]')[2],
  blockDesign: (d) => [...d.querySelectorAll('[class*="Schedule_block__"]')].find((b) => /^Design/.test(b.textContent) && !/moved/.test(b.textContent)),
};

async function open(name) {
  const clip = await cap.startClip({ film: FILM, name, url: BASE, track: TRACK });
  const { page } = clip;
  // the page autoplays its example run on load; let it finish so the page is still
  await page.waitForFunction(() => /Loop rescued/.test(document.body.innerText), null, { timeout: 40000 });
  await page.waitForTimeout(800);
  return clip;
}

const docTop = (page, fn) =>
  page.evaluate((src) => {
    const el = new Function("d", "return (" + src + ")(d)")(document);
    return el.getBoundingClientRect().top + window.scrollY;
  }, typeof fn === "string" ? `(d) => d.querySelector(${JSON.stringify(fn)})` : fn.toString());
const park = (page, y) => page.evaluate((v) => window.scrollTo(0, Math.max(0, v)), y);
const replayExample = (page) =>
  page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Replay/.test(b.textContent)).click());

async function startAt(clip, y, cursor) {
  await park(clip.page, y);
  await clip.page.mouse.move(cursor[0], cursor[1]);
  clip.setCursor(cursor[0], cursor[1]);
  await clip.page.waitForTimeout(600);
  await clip.begin();
}

// the hero at the top: the glance card goes from "Loop at risk" to "Loop rescued" during a replay
async function top() {
  const clip = await open("top");
  const { page } = clip;
  await startAt(clip, 0, [1990, 1120]);
  await clip.wait(600);
  await replayExample(page);
  clip.mark("replay");
  await clip.waitText("Loop at risk", { label: "atRisk", timeout: 20000 });
  await page.waitForFunction(() => /Loop rescued/.test(document.body.innerText), null, { timeout: 20000 });
  clip.mark("rescued");
  await clip.wait(3500);
  await clip.finish();
}

// the rescue: Replay in the run card, the trace and the calendar, the decision; then the candidate's
// message arrives in the chat (the page plays the recorded turn when the chat scrolls into view),
// the drafted messages and the audit trail
async function main() {
  const clip = await open("main");
  const { page } = clip;
  const sectionTop = await docTop(page, TRACK.calendar);
  await startAt(clip, sectionTop - HEADER, [1300, 700]);
  await clip.wait(1600);
  await clip.click(page.getByRole("button", { name: "Replay" }), { label: "replay", move: 900 });
  await clip.waitText("Loop at risk", { label: "atRisk", timeout: 20000 });
  await clip.wait(900);
  await clip.scrollTo((await docTop(page, TRACK.runCard)) - HEADER, 800);
  clip.mark("trace");
  await page.waitForFunction(() => /drafts written/.test(document.body.innerText), null, { timeout: 30000 });
  clip.mark("drafted");
  await clip.wait(3600);
  await clip.scrollTo((await docTop(page, TRACK.decision)) - HEADER, 900);
  clip.mark("decision");
  await clip.wait(6800);
  await clip.scrollTo((await docTop(page, TRACK.chat)) - HEADER, 1000);
  clip.mark("chat");
  await page.waitForFunction(() => document.querySelectorAll('[class*="GoodTime_changes__"]').length > 0, null, { timeout: 30000 });
  clip.mark("replied");
  await clip.wait(7600);
  await clip.scrollTo((await docTop(page, TRACK.drafts)) - HEADER, 900);
  clip.mark("drafts");
  await clip.wait(6200);
  await clip.scrollTo((await docTop(page, TRACK.audit)) - HEADER, 900);
  clip.mark("audit");
  await clip.wait(6200);
  await clip.finish();
}

const clips = { top, main };
(async () => {
  const which = process.argv[2] || "main";
  if (!clips[which]) throw new Error("unknown clip " + which);
  await clips[which]();
})().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
