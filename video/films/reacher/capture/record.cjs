// Reacher capture script (launch format, kit 2). Run from video/: node films/reacher/capture/record.cjs <take>
// Then: npm run footage -- films/reacher   (builds assets/footage/*.mp4 + data/clips/*.json)
//
// The demo runs from an isolated copy of the worktree (next build && next start -p 3171), with no demo key:
// the page is in preview mode and every model output on screen is the example run for the serum, recorded live
// on the Vercel preview on 2026-11-16 and replayed by the page (it labels it "Example run"). The filter, the
// ranking, the parsing of the ask and the commission guardrail re-run in the browser. No live calls.
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530), so the UI is
// 1.41x larger on the 1920 stage and 1.4-2x camera zooms stay sharp; cursor about 1.5x a system arrow, hidden
// when idle, resting 450 ms before every click.
//
// Takes
//   before  the candidates before any score. Find creators is pressed with the page's timers held (HOLD_INIT),
//           so the replay stops right after its filter step: 12 candidates with names, follower counts and
//           empty score bars. The list is scrolled slowly. Backdrop of the "problem" statement.
//   top     the top of the page (title + the run-at-a-glance card) while a replayed run lands: the hook.
//   main    one continuous take. Find creators is pressed on camera once (hero 1); the page replays the same
//           recorded run on every press, so it is pressed three more times off camera (no cursor) to film the
//           run from its first frame for hero 2 (the filter step) and hero 3 (the scores); the third replay is
//           not used in the film. Then: the top creator is selected -> Draft invite -> the creator's reply is
//           picked -> Decide (off camera; the button sits a screen below the thread) -> the thread and the
//           guardrail table -> the top of the page, wide. Every hold is real footage (no freeze frames).
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3171/demo/reacher/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };
const HEADER = 84; // the sticky bar covers y < 68: park cards at y = 84

// Holds every page timer that fires while window.__kitHold is true (the replay's pacing uses setTimeout), so
// the page can be filmed in a state it normally passes through in half a second. `before` take only.
const HOLD_INIT = `(() => {
  const st = window.setTimeout.bind(window);
  const held = [];
  window.__kitHold = false;
  window.setTimeout = (fn, ms, ...a) => st(() => { if (window.__kitHold) held.push(() => fn(...a)); else fn(...a); }, ms);
  window.__kitRelease = () => { window.__kitHold = false; held.splice(0).forEach((f) => f()); };
})()`;

const SEL = {
  findButton: '[class*="Reacher_picker__"] [class*="Reacher_runRow__"] button',
  listCard: '[class*="Reacher_listCard__"]',
  rowMain: '[class*="Reacher_rowMain__"]',
  why: '[class*="Reacher_why__"]',
  inviteCard: '[class*="Reacher_inviteCard__"]',
  draftButton: '[class*="Reacher_inviteCard__"] [class*="Reacher_runRow__"] button',
  checks: '[class*="Reacher_checks__"]',
  threadCard: '[class*="Reacher_threadCard__"]',
  composer: '[class*="Reacher_composer__"]',
  preset: '[class*="Reacher_presets__"] button',
  decideButton: '[class*="Reacher_composer__"] button[type="submit"]',
};

// component name -> CSS selector or (document) => Element (serialised into the page: keep each self-contained)
const row = (n, inner) =>
  new Function("d", `const r = d.querySelectorAll('[class*="Reacher_row__"]')[${n - 1}]; return r && ${inner ? `r.querySelector(${JSON.stringify(inner)})` : "r"}`);
const step = (n) => new Function("d", `return d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[${n - 1}]`);
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  heroText: '[class*="DemoLayout_heroText__"]',
  glance: '[class*="Reacher_glance__"]',
  picker: '[class*="Reacher_picker__"]',
  product1: (d) => d.querySelectorAll('[class*="Reacher_product__"]')[0],
  runRow: '[class*="Reacher_picker__"] [class*="Reacher_runRow__"]',
  findButton: SEL.findButton,
  pickerNotice: '[class*="Reacher_picker__"] [class*="Reacher_notice__"]',
  runCard: '[class*="Reacher_runCard__"]',
  timeline: '[class*="Timeline_timeline__"]',
  stepFilter: step(1),
  stepFit: step(2),
  stepAccept: step(3),
  stepPick: step(4),
  listCard: SEL.listCard,
  listHead: (d) => {
    const c = d.querySelector('[class*="Reacher_listCard__"]');
    return c && c.querySelector('[class*="Panel_cardHead__"]');
  },
  rows: '[class*="Reacher_rows__"]',
  row1: row(1),
  row2: row(2),
  row3: row(3),
  row4: row(4),
  main1: row(1, '[class*="Reacher_rowMain__"]'),
  scores1: row(1, '[class*="Reacher_scores__"]'),
  why1: row(1, '[class*="Reacher_why__"]'),
  creatorCard: '[class*="Reacher_creatorCard__"]',
  styleNote: '[class*="Reacher_styleNote__"]',
  inviteCard: SEL.inviteCard,
  inviteBody: (d) => {
    const c = d.querySelector('[class*="Reacher_inviteCard__"]');
    return c && (c.querySelector('[class*="Reacher_inviteStream__"]') || c.querySelector("#invite-text") || c.querySelector('[class*="States_empty__"]'));
  },
  checks: SEL.checks,
  inviteRun: '[class*="Reacher_inviteCard__"] [class*="Reacher_runRow__"]',
  draftButton: SEL.draftButton,
  threadCard: SEL.threadCard,
  thread: '[class*="Reacher_thread__"]',
  bubbleInvite: (d) => d.querySelectorAll('[class*="Reacher_bubble__"]')[0],
  bubbleCreator: (d) => [...d.querySelectorAll('[class*="Reacher_bubble__"]')].find((b) => b.dataset.from === "creator"),
  bubbleDraft: (d) => [...d.querySelectorAll('[class*="Reacher_bubble__"]')].find((b) => b.hasAttribute("data-draft")),
  composer: SEL.composer,
  presets: '[class*="Reacher_presets__"]',
  preset1: (d) => d.querySelector('[class*="Reacher_presets__"] button'),
  replyInput: "#creator-reply",
  decideButton: SEL.decideButton,
  decisionCard: '[class*="Reacher_decisionCard__"]',
  actionBars: '[class*="Reacher_actionBars__"]',
  final: '[class*="Reacher_final__"]',
  guard: '[class*="Reacher_guard__"]',
  guardTable: '[class*="Reacher_guardTable__"]',
  guardCommission: (d) => d.querySelectorAll('[class*="Reacher_guardRow__"]')[1],
  replyTimes: '[class*="Reacher_replyTimes__"]',
};

async function open(name, extra) {
  const clip = await cap.startClip(Object.assign({ film: FILM, name, url: BASE, track: TRACK }, VIEW, extra || {}));
  const { page } = clip;
  // the page plays its example on load and then fills steps 2 and 3: let it finish (pre-roll)
  await page.waitForFunction(() => document.body.innerText.includes("Output check"), null, { timeout: 40000 });
  await page.waitForTimeout(600);
  return clip;
}

const park = (page, y) => page.evaluate((v) => window.scrollTo(0, Math.max(0, v)), y);
const jsClick = (page, sel, n = 0) => page.evaluate(([s, n]) => document.querySelectorAll(s)[n].click(), [sel, n]);
const ranked = (page) =>
  page.waitForFunction((s) => document.querySelectorAll(s).length === 8, SEL.why, { timeout: 30000 });
const scoring = (page) => page.waitForFunction((s) => document.querySelectorAll(s).length === 0, SEL.why, { timeout: 5000 });

// Presses Find creators without the cursor (the button is off screen): the page replays the recorded run again.
async function rerun(clip, label, hold) {
  await jsClick(clip.page, SEL.findButton);
  clip.mark(label);
  await scoring(clip.page);
  await ranked(clip.page);
  clip.mark(label + "-ranked");
  await clip.wait(hold);
}

// before: the candidates right after the filter step (timers held), scrolled slowly
async function before() {
  const clip = await open("before", { init: HOLD_INIT });
  const { page } = clip;
  await page.mouse.move(1346, 420);
  clip.setCursor(1346, 420);
  await page.waitForTimeout(1800); // the parked cursor fades before the timers are held
  await page.evaluate(() => {
    window.__kitHold = true;
  });
  await jsClick(page, SEL.findButton);
  await page.waitForFunction(() => /Candidates/.test(document.body.innerText));
  const y = (await clip.docY(SEL.listCard)) - HEADER + 60;
  await park(page, y);
  await page.waitForTimeout(500);
  await clip.begin();
  clip.mark("scroll");
  await page.evaluate(
    ([from, to, ms]) =>
      new Promise((res) => {
        const s = performance.now();
        const stepFn = (now) => {
          const p = Math.min(1, (now - s) / ms);
          window.scrollTo(0, from + (to - from) * p);
          if (p < 1) requestAnimationFrame(stepFn);
          else res();
        };
        requestAnimationFrame(stepFn);
      }),
    [y, y + 250, 8000]
  );
  await clip.wait(300);
  await clip.finish();
}

async function main() {
  const clip = await open("main");
  const { page } = clip;
  await park(page, (await clip.docY('[class*="Reacher_product__"]')) - 110);
  await page.mouse.move(1346, 560);
  clip.setCursor(1346, 560);
  await page.waitForTimeout(1800); // the parked cursor fades
  await clip.begin();

  // H1: still, then ONE action: press Find creators (the page's preview notice appears; the run starts below)
  await clip.wait(1500);
  await clip.click(page.locator(SEL.findButton).first(), { label: "find", move: 900 });
  await scoring(page);
  await ranked(page);
  clip.mark("find-ranked");
  await clip.wait(2600);

  // the agent run and the list: one scroll position for hero 2, hero 3, the hook and hero 4
  clip.mark("to-list");
  await clip.moveTo(1346, 520, 500);
  await clip.scrollTo((await clip.docY(SEL.listCard)) - HEADER, 600);
  clip.mark("at-list");
  await clip.wait(2000);

  // H2 (the filter step), H3 (the scores): the same recorded run, replayed (run4 is spare)
  await rerun(clip, "run2", 4200);
  await rerun(clip, "run3", 4200);
  await rerun(clip, "run4", 5200);

  // H4: the top row is selected (another row is selected first, off camera, so the click shows)
  await jsClick(page, SEL.rowMain, 4);
  clip.mark("h4-still");
  await clip.wait(1500);
  await clip.click(page.locator('[class*="Reacher_row__"] [class*="Avatar"]').first(), { label: "select-1", move: 900 });
  await clip.wait(3600);

  // F2: the invite for the top match (selecting her cleared the example's invite, so the card is empty)
  clip.mark("to-invite");
  await clip.moveTo(1346, 430, 500);
  await clip.scrollTo((await clip.docY(SEL.inviteCard)) - HEADER, 700);
  clip.mark("at-invite");
  await clip.wait(2000);
  await clip.click(page.locator(SEL.draftButton).first(), { label: "draft", move: 900 });
  await clip.moveTo(1322, 700, 550); // off the card while the text streams in
  await page.waitForSelector(SEL.checks, { timeout: 30000 });
  clip.mark("drafted");
  await clip.wait(4200);

  // F3a: the creator's reply. The box is emptied off camera, then the first sample reply is picked.
  await page.fill("#creator-reply", "");
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  clip.mark("to-composer");
  await clip.moveTo(1346, 430, 400);
  await clip.scrollTo((await clip.docY(SEL.composer)) - 110, 700);
  clip.mark("at-composer");
  await clip.wait(2000);
  await clip.click(page.locator(SEL.preset).first(), { label: "preset", move: 900 });
  await clip.wait(3800);

  // F3b / F3c: the thread and the guardrail. Decide is pressed off camera (it sits a screen below the thread).
  clip.mark("to-thread");
  await clip.moveTo(1346, 430, 400);
  await clip.scrollTo((await clip.docY(SEL.threadCard)) - HEADER, 700);
  clip.mark("at-thread");
  await clip.wait(2000);
  await jsClick(page, SEL.decideButton);
  clip.mark("decide");
  await clip.waitText("Output check", { label: "replied", timeout: 30000 });
  await clip.wait(11000);

  // proof: the top of the page, wide
  clip.mark("to-top");
  await clip.scrollTo(0, 800);
  clip.mark("wide");
  await clip.wait(9000);
  await clip.finish();
}

// top: the top of the page while the run lands on the run-at-a-glance card (funnel 40, 12, 10, 8; the top match;
// the live run's total time). Find creators is pressed off camera (no cursor): the page replays the recorded run.
// The hook is cut from the moment the result lands.
async function top() {
  const clip = await open("top");
  const { page } = clip;
  await park(page, 0);
  await page.mouse.move(1346, 700);
  clip.setCursor(1346, 700);
  await page.waitForTimeout(1800); // the parked cursor fades
  await clip.begin();
  await clip.wait(1200);
  await rerun(clip, "run", 6000);
  await clip.finish();
}

const takes = { before, main, top };
(async () => {
  const which = process.argv[2] || "main";
  if (!takes[which]) throw new Error("unknown take " + which + " (" + Object.keys(takes).join(", ") + ")");
  fs.mkdirSync(path.join(FILM, "raw"), { recursive: true });
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
