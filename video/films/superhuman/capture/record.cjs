// Superhuman capture script (launch format, kit 2). Run from video/: node films/superhuman/capture/record.cjs main
// Then: npm run footage -- films/superhuman main   (builds assets/footage/main.mp4 + data/clips/main.json)
//
// The demo runs from an isolated copy of the worktree (next build && next start -p 3162) with no demo key: the
// page is in preview mode and replays its recorded live runs (model turns and judge answers recorded on the
// Vercel preview on 2026-11-17; the page re-runs every tool call, gate decision, inbox change and eval check in
// the browser). No live calls. The film labels it "Example run, replayed faster".
//
// Kit 2 capture settings: viewport 1360x765 CSS px at deviceScaleFactor 2 (frames 2720x1530); cursor about
// 1.5x a system arrow, hidden when idle, resting 450 ms before every click.
//
// One continuous take, `main`, in page order. Every result is followed by a real hold on the page (kit 2.1,
// the result rule), so the film never freezes a frame:
//   run       the task card: "Run the agent" is pressed (triage task, full access, send asks you); holds 5.6 s
//   replay    the workspace (inbox | tool calls | approval gate): "Replay" replays the same recorded run; when
//             it ends the finished tool-call log and the held reply with its scores stay still for 7.4 s
//   approve   "Approve and send" on the held reply; the approved card holds 3.9 s
//   blocked   the "Archive newsletters" task: the grant is narrowed from full to read + draft (holds 5.8 s),
//             Run, then the workspace: every archive and label call is blocked; the finished log holds 7.4 s
//   tiles     the eval section from its heading: the summary tiles, held 7.8 s
//   evals     task 6 (the bank-details scam) is opened and held 7.6 s
//   wide      the eval section from its heading again, held 7.8 s (the proof)
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3162/demo/superhuman/";
const VIEW = { viewport: { width: 1360, height: 765 }, deviceScaleFactor: 2, cursor: { scale: 0.75, idleHide: 1200 }, clickPause: 450, quality: 92 };

const row = (id) => new Function("d", `return [...d.querySelectorAll('[class*="Superhuman_thread__"]')].find((li) => (li.querySelector('[class*="Superhuman_threadId__"]') || {}).textContent === ${JSON.stringify(id)})`);
const evalItem = (n) => `[class*="Superhuman_evalList__"] > li:nth-child(${n})`;

// component name -> CSS selector or (document) => Element. Track every component a shot or a spotlight uses.
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  hero: '[class*="DemoLayout_hero__"]',
  glance: '[class*="Superhuman_glance__"]',
  taskCard: '[class*="Superhuman_taskCard__"]',
  taskGrant: '[class*="Superhuman_taskGrant__"]',
  taskText: '[class*="Superhuman_taskText__"]',
  scopeList: '[class*="Superhuman_scopeList__"]',
  runRow: '[class*="Superhuman_runRow__"]',
  workspace: '[class*="Superhuman_workspace__"]',
  inboxCard: '[class*="Superhuman_inboxCard__"]',
  rowT02: { fn: row("t02"), clip: true },
  rowT13: { fn: row("t13"), clip: true },
  rowT08: { fn: row("t08"), clip: true },
  rowT03: { fn: row("t03"), clip: true },
  rowT19: { fn: row("t19"), clip: true },
  rowT04: { fn: row("t04"), clip: true },
  callsCard: '[class*="Superhuman_callsCard__"]',
  callLog: '[class*="Superhuman_callsCard__"] [class*="Mcp_log__"]',
  callTotals: '[class*="Superhuman_callTotals__"]',
  gateCard: "#gate",
  approval: "#gate article",
  summaryCard: '[class*="Superhuman_summaryCard__"]',
  evals: "#evals",
  evalAside: '[class*="Superhuman_evalAside__"]',
  evalStats: '[class*="Superhuman_evalStats__"]',
  evalList: '[class*="Superhuman_evalList__"]',
  eval5: evalItem(5),
  eval6: evalItem(6),
  eval7: evalItem(7),
};

const PARK = [1346, 420]; // the page's right gutter: nothing to hover
const seen = (page, re, timeout = 60000) =>
  page.waitForFunction((r) => new RegExp(r).test(document.body.innerText), re, { timeout, polling: 50 });
// the run is over when the glance's headline leaves "Working the inbox" / "Reading the task"
const runDone = (page, timeout = 90000) =>
  page.waitForFunction(
    () => {
      const el = document.querySelector('[class*="Superhuman_glanceHeadline__"]');
      return el && !/Working the inbox|Reading the task/.test(el.textContent);
    },
    null,
    { timeout, polling: 50 }
  );
const runStarted = (page) =>
  page.waitForFunction(
    () => /Working the inbox|Reading the task/.test((document.querySelector('[class*="Superhuman_glanceHeadline__"]') || {}).textContent || ""),
    null,
    { timeout: 10000, polling: 20 }
  );

async function park(clip) {
  await clip.page.mouse.move(PARK[0], PARK[1]);
  clip.setCursor(PARK[0], PARK[1]);
}

// scroll the page so the element's top sits at viewport y
async function scrollEl(clip, sel, y, ms = 700) {
  const top = await clip.page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + window.scrollY, sel);
  await clip.scrollTo(Math.max(0, top - y), ms);
}
async function jumpEl(page, sel, y) {
  await page.evaluate(([s, y]) => {
    const top = document.querySelector(s).getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, top - y), behavior: "instant" });
  }, [sel, y]);
}

async function main() {
  const clip = await cap.startClip(Object.assign({ film: FILM, name: "main", url: BASE, track: TRACK }, VIEW));
  const { page } = clip;
  const inLog = (text, n = 1) =>
    page.waitForFunction(
      ([t, n]) => [...document.querySelectorAll('[class*="Superhuman_callsCard__"] [class*="Mcp_callStatus__"]')].filter((el) => el.textContent.trim() === t).length >= n,
      [text, n],
      { timeout: 60000, polling: 30 }
    );
  // pre-roll: the page replays its triage example on load; let it finish, then put the task card in view
  await runDone(page);
  await page.waitForTimeout(1500);
  await jumpEl(page, '[class*="Superhuman_taskCard__"]', 96);
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // run: still, then ONE action: Run the agent (triage task, full access). The card then holds (real hold).
  clip.mark("run-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: "Run the agent", exact: true }), { label: "run", move: 850 });
  await runStarted(page);
  clip.mark("run-started");
  await clip.wait(5600);
  await park(clip);

  // replay: the workspace in view (inbox | tool calls | approval gate), then the same recorded run again.
  // After the run ends the page is still for 7.4 s: the finished tool-call log and the held reply with its scores.
  await runDone(page);
  clip.mark("run-done");
  await scrollEl(clip, '[class*="Superhuman_workspace__"]', 100, 700);
  await clip.wait(1600);
  clip.mark("replay-still");
  await clip.click(page.getByRole("button", { name: "Replay", exact: true }), { label: "replay", move: 700 });
  await runStarted(page);
  clip.mark("replay-started");
  await park(clip);
  await inLog("awaiting approval");
  clip.mark("send-row");
  await seen(page, "Send waiting for your approval");
  clip.mark("held");
  await runDone(page);
  clip.mark("replay-done");
  await page.waitForFunction(() => document.querySelectorAll('#gate [class*="Badges_score__"]').length > 0, null, { timeout: 30000, polling: 50 });
  clip.mark("judged");
  await clip.wait(7400);

  // approve: still, then ONE action: Approve and send; the approved card holds
  clip.mark("approve-still");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: "Approve and send" }).first(), { label: "approve", move: 850 });
  await seen(page, "Approved");
  clip.mark("approved");
  await clip.wait(3900);
  await park(clip);

  // blocked: the archive task with read + draft access. Pick it and run it from the task card, then the workspace
  await scrollEl(clip, '[class*="Superhuman_taskCard__"]', 96, 700);
  await clip.wait(900);
  // set up (cut from the film): the archive task, then full access again, so the shot can narrow it
  clip.mark("blocked-pick");
  await clip.click(page.getByRole("button", { name: "Archive newsletters", exact: true }), { label: "pick-archive", move: 800 });
  await clip.wait(500);
  await clip.click(page.getByRole("button", { name: "Full, send asks me", exact: true }).first(), { label: "grant-full", move: 700 });
  await park(clip);
  await clip.wait(1500);
  // grant: still, then ONE action: narrow the grant to read + draft (the act tools lock); the card holds
  clip.mark("grant-still");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: "Read + draft", exact: true }).first(), { label: "grant-draft", move: 800 });
  await page.waitForFunction(() => document.querySelectorAll('[class*="Superhuman_scopeList__"] li:not([data-on])').length === 1, null, { timeout: 10000, polling: 20 });
  clip.mark("locked");
  await clip.wait(5800);
  await clip.click(page.getByRole("button", { name: "Run the agent", exact: true }), { label: "run-archive", move: 700 });
  await runStarted(page);
  clip.mark("blocked-started");
  await clip.wait(300);
  await scrollEl(clip, '[class*="Superhuman_workspace__"]', 100, 600);
  clip.mark("blocked-workspace");
  await park(clip);
  await inLog("blocked", 1);
  clip.mark("first-block");
  await inLog("blocked", 10);
  clip.mark("last-block");
  await runDone(page);
  clip.mark("blocked-done");
  await clip.wait(7400);

  // evals: the section from its heading (the summary tiles, wide), held
  await scrollEl(clip, "#evals", 96, 800);
  clip.mark("tiles");
  await clip.wait(7800);

  // task 6 (the bank-details scam) near the top, opened, held
  await scrollEl(clip, evalItem(5), 100, 900);
  clip.mark("evals");
  await clip.wait(1400);
  clip.mark("eval6-still");
  await clip.click(page.locator(evalItem(6) + " button").first(), { label: "open-eval6", move: 850 });
  clip.mark("eval6-open");
  await park(clip);
  await clip.wait(7600);

  // wide: back to the eval section's heading, held
  await scrollEl(clip, "#evals", 96, 800);
  clip.mark("wide");
  await clip.wait(7800);
  await clip.finish();
}

const takes = { main };
(async () => {
  const which = process.argv[2] || "main";
  if (!takes[which]) throw new Error("unknown take " + which + " (" + Object.keys(takes).join(", ") + ")");
  fs.mkdirSync(path.join(FILM, "raw"), { recursive: true });
  await takes[which]();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
