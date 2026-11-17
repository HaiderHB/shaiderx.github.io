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
// One continuous take, `main`, in page order:
//   run       the task card: "Run the agent" is pressed (triage task, full access, send asks you)
//   replay    the workspace (inbox | tool calls | approval gate): "Replay" replays the same recorded run so
//             the reads, labels, the held send and the judge's scores land with all three cards in view
//   approve   "Approve and send" on the held reply
//   blocked   the "Archive newsletters" task: the grant is narrowed from full to read + draft, Run, then
//             the workspace: every archive and label call is blocked by the server
//   evals     the eval section: the summary tiles, then task 6 (the bank-details scam) is opened
//   wide      the eval section, wide, for the proof
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
  // pre-roll: the page replays its triage example on load; let it finish, then put the task card in view
  await runDone(page);
  await page.waitForTimeout(1500);
  await jumpEl(page, '[class*="Superhuman_taskCard__"]', 96);
  await park(clip);
  await page.waitForTimeout(1500);
  await clip.begin();

  // run: still, then ONE action: Run the agent (triage task, full access)
  clip.mark("run-still");
  await clip.wait(1500);
  await clip.click(page.getByRole("button", { name: "Run the agent", exact: true }), { label: "run", move: 850 });
  await runStarted(page);
  clip.mark("run-started");
  await clip.wait(2600);
  await park(clip);

  // replay: the workspace in view (inbox | tool calls | approval gate), then the same recorded run again
  await runDone(page);
  clip.mark("run-done");
  await scrollEl(clip, '[class*="Superhuman_workspace__"]', 100, 700);
  await clip.wait(1600);
  clip.mark("replay-still");
  await clip.click(page.getByRole("button", { name: "Replay", exact: true }), { label: "replay", move: 700 });
  await runStarted(page);
  clip.mark("replay-started");
  await park(clip);
  await seen(page, "Send waiting for your approval");
  clip.mark("held");
  await runDone(page);
  clip.mark("replay-done");
  await page.waitForFunction(() => document.querySelectorAll('#gate [class*="Badges_score__"]').length > 0, null, { timeout: 30000, polling: 50 });
  clip.mark("judged");
  await clip.wait(3200);

  // approve: still, then ONE action: Approve and send
  clip.mark("approve-still");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: "Approve and send" }).first(), { label: "approve", move: 850 });
  await seen(page, "Approved");
  clip.mark("approved");
  await clip.wait(3200);
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
  // grant: still, then ONE action: narrow the grant to read + draft (the act tools lock)
  clip.mark("grant-still");
  await clip.wait(1300);
  await clip.click(page.getByRole("button", { name: "Read + draft", exact: true }).first(), { label: "grant-draft", move: 800 });
  await clip.wait(2800);
  await clip.click(page.getByRole("button", { name: "Run the agent", exact: true }), { label: "run-archive", move: 700 });
  await runStarted(page);
  clip.mark("blocked-started");
  await clip.wait(300);
  await scrollEl(clip, '[class*="Superhuman_workspace__"]', 100, 600);
  clip.mark("blocked-workspace");
  await park(clip);
  await page.waitForFunction(
    () => [...document.querySelectorAll('[class*="Mcp_callStatus__"]')].some((el) => el.textContent.trim() === "blocked"),
    null,
    { timeout: 30000, polling: 30 }
  );
  clip.mark("first-block");
  await runDone(page);
  clip.mark("blocked-done");
  await clip.wait(4200);

  // evals: the section with task 6 near the top; the summary tiles stay beside it (sticky)
  await scrollEl(clip, evalItem(5), 100, 900);
  clip.mark("evals");
  await clip.wait(5200);
  clip.mark("eval6-still");
  await clip.click(page.locator(evalItem(6) + " button").first(), { label: "open-eval6", move: 850 });
  clip.mark("eval6-open");
  await clip.wait(4200);
  await park(clip);

  // wide: the eval section from its heading
  await scrollEl(clip, "#evals", 96, 800);
  clip.mark("wide");
  await clip.wait(7600);
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
