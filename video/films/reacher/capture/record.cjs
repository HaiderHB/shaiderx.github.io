// Reacher capture script (kit 1.1). Run from video/, with the demo served from an isolated copy
// (next build && next start -p 3160, never inside the shared worktree):
//   node films/reacher/capture/record.cjs <clip>
// The page runs in preview mode (no key): every model output on screen is the example run that was
// recorded live on the Vercel preview on 2026-11-16 (Jev + deepseek/deepseek-v3.2) and replayed by the
// page; the filter, ranking, ask parsing and guardrail re-run in the browser. No live calls, no cost.
// Clips: top (page top: the run-at-a-glance card while the example ranking replays), main (step 1
// Find creators -> shortlist, Invite -> streamed invite, step 3 reply -> Jev + guardrail + reply).
// Then: npm run footage -- films/reacher
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3160/demo/reacher/";
const HEADER = 92; // the sticky bar covers y < 68: park components at y = 92

const card = (title) => (d) =>
  [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) =>
    ((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim().startsWith(title)
  );

// component name -> CSS selector or (document) => Element (serialised into the page: keep each self-contained)
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  glance: '[class*="Reacher_glance__"]',
  glanceTop: '[class*="Reacher_glanceTopMatch__"]',
  funnel: '[class*="Reacher_glanceFunnel__"]',
  heroTitle: '[class*="DemoLayout_heroText__"]',
  flow: '[class*="Timeline_flow__"]',
  matchHead: (d) => d.querySelector("#match header"),
  picker: '[class*="Reacher_picker__"]',
  products: '[class*="Reacher_products__"]',
  product1: (d) => d.querySelectorAll('[class*="Reacher_product__"]')[0],
  findButton: '[class*="Reacher_picker__"] [class*="Reacher_runRow__"] button',
  runRow: '[class*="Reacher_picker__"] [class*="Reacher_runRow__"]',
  pickerNotice: '[class*="Reacher_picker__"] [class*="Reacher_notice__"]',
  runCard: '[class*="Reacher_runCard__"]',
  runHead: (d) => {
    const c = d.querySelector('[class*="Reacher_runCard__"]');
    return c && c.querySelector('[class*="Panel_cardHead__"]');
  },
  timeline: '[class*="Timeline_timeline__"]',
  stepFilter: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[0],
  stepFit: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[1],
  stepAccept: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[2],
  stepPick: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[3],
  listCard: '[class*="Reacher_listCard__"]',
  listHead: (d) => {
    const c = d.querySelector('[class*="Reacher_listCard__"]');
    return c && c.querySelector('[class*="Panel_cardHead__"]');
  },
  rows: '[class*="Reacher_rows__"]',
  row1: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[0],
  row2: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[1],
  row3: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[2],
  row4: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[3],
  row5: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[4],
  row6: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[5],
  row7: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[6],
  row8: (d) => d.querySelectorAll('[class*="Reacher_row__"]')[7],
  scores1: (d) => {
    const r = d.querySelectorAll('[class*="Reacher_row__"]')[0];
    return r && r.querySelector('[class*="Reacher_scores__"]');
  },
  why1: (d) => {
    const r = d.querySelectorAll('[class*="Reacher_row__"]')[0];
    return r && r.querySelector('[class*="Reacher_why__"]');
  },
  inviteHead: (d) => d.querySelector("#invite header"),
  creatorCard: '[class*="Reacher_creatorCard__"]',
  styleNote: '[class*="Reacher_styleNote__"]',
  inviteCard: '[class*="Reacher_inviteCard__"]',
  inviteTerms: '[class*="Reacher_inviteCard__"] [class*="Reacher_terms__"]',
  inviteBody: (d) => d.querySelector('[class*="Reacher_inviteStream__"]') || d.querySelector("#invite-text"),
  checks: '[class*="Reacher_checks__"]',
  draftButton: '[class*="Reacher_inviteCard__"] [class*="Reacher_runRow__"] button',
  replyHead: (d) => d.querySelector("#reply header"),
  threadCard: '[class*="Reacher_threadCard__"]',
  thread: '[class*="Reacher_thread__"]',
  bubbleInvite: (d) => d.querySelectorAll('[class*="Reacher_bubble__"]')[0],
  bubbleCreator: (d) => [...d.querySelectorAll('[class*="Reacher_bubble__"]')].find((b) => b.dataset.from === "creator"),
  bubbleDraft: (d) => [...d.querySelectorAll('[class*="Reacher_bubble__"]')].find((b) => b.hasAttribute("data-draft")),
  composer: '[class*="Reacher_composer__"]',
  presets: '[class*="Reacher_presets__"]',
  decideButton: '[class*="Reacher_composer__"] button[type="submit"]',
  decisionCard: '[class*="Reacher_decisionCard__"]',
  actionBars: '[class*="Reacher_actionBars__"]',
  final: '[class*="Reacher_final__"]',
  guard: '[class*="Reacher_guard__"]',
  guardTable: '[class*="Reacher_guardTable__"]',
  guardCommission: (d) => d.querySelectorAll('[class*="Reacher_guardRow__"]')[1],
  replyTimes: '[class*="Reacher_replyTimes__"]',
};

async function open(name) {
  const clip = await cap.startClip({ film: FILM, name, url: BASE, track: TRACK });
  const { page } = clip;
  // the page autoplays its example run on load and then fills steps 2 and 3: let it settle
  await page.waitForFunction(() => /Replay/.test(document.body.innerText), null, { timeout: 40000 });
  await page.waitForTimeout(800);
  return clip;
}

const docTop = (page, sel) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
const park = (page, y) => page.evaluate((v) => window.scrollTo(0, Math.max(0, v)), y);

async function startAt(clip, y, cursor) {
  await park(clip.page, y);
  await clip.page.mouse.move(cursor[0], cursor[1]);
  clip.setCursor(cursor[0], cursor[1]);
  await clip.page.waitForTimeout(500);
  await clip.begin();
}

// Page top: the example ranking replays (the page's own Replay button, below the fold, starts it) and
// the run-at-a-glance card fills: funnel 40 -> 12 -> 10 -> 8, top match, Jev calls.
async function top() {
  const clip = await open("top");
  const { page } = clip;
  await startAt(clip, 0, [1990, 1120]);
  await clip.wait(300);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Replay");
    b.click();
  });
  clip.mark("replay");
  await page.waitForFunction(() => !document.body.innerText.includes("likely to accept"), null, { timeout: 5000, polling: 20 });
  await clip.waitText("likely to accept", { label: "top", timeout: 30000 });
  await clip.wait(3500);
  await clip.finish();
}

async function main() {
  const clip = await open("main");
  const { page } = clip;
  // step 1: the section head and the product picker
  await startAt(clip, (await docTop(page, '#match header')) - HEADER, [1240, 700]);
  await clip.wait(1800);
  // this view already holds the picker, the run timeline and the top of the list: run in place
  await clip.click(page.locator(TRACK.findButton).first(), { label: "find", move: 800 });
  await page.waitForFunction(() => document.body.innerText.includes("Candidates"), null, { timeout: 5000, polling: 20 });
  await clip.moveTo(1730, 560, 700); // park the cursor in the right gutter, off the cards
  await clip.waitText("Top 8 creators", { label: "picked", timeout: 30000 });
  await clip.wait(11500); // the shortlist holds while two captions read
  // step 2: Invite on the top match, then redraft (the recorded invite streams again)
  await clip.click(page.locator('[class*="Reacher_row__"] [class*="Reacher_inviteLink__"]').first(), { label: "invite", move: 800 });
  await clip.wait(1300);
  await clip.scrollTo((await docTop(page, '#invite header')) - HEADER, 500);
  clip.mark("inviteView");
  await clip.wait(900);
  await clip.click(page.locator(TRACK.draftButton).first(), { label: "draft", move: 900 });
  await clip.moveTo(1730, 640, 700);
  await page.waitForSelector('[class*="Reacher_checks__"]', { timeout: 30000 });
  clip.mark("drafted");
  await clip.wait(5200);
  // step 3: the creator's reply (preset 1), Decide
  await clip.scrollTo((await docTop(page, '#reply header')) + 150 - HEADER, 1000);
  clip.mark("replyView");
  await clip.wait(1200);
  await clip.click(page.locator('[class*="Reacher_presets__"] button').first(), { label: "preset", move: 800 });
  await clip.wait(700);
  await clip.click(page.locator(TRACK.decideButton).first(), { label: "decide", move: 800 });
  await clip.moveTo(1730, 640, 700);
  await page.waitForFunction(() => !document.body.innerText.includes("Output check"), null, { timeout: 5000, polling: 20 }).catch(() => {});
  await clip.waitText("Output check", { label: "replied", timeout: 30000 });
  await clip.wait(7500);
  await clip.finish();
}

const clips = { top, main };
(async () => {
  const which = process.argv[2] || "main";
  if (!clips[which]) throw new Error("unknown clip " + which);
  await clips[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
