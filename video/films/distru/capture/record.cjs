// Distru v3 capture script (kit 1.1, new demo UI). Run from video/:
//   DEMO_URL="<private link with ?k=..., host swapped for localhost:3160>" node films/distru/capture/record.cjs <clip>
// Clips: s2 (sample 2 live run, ~3 cents), s3 (sample 3 live run), evals (Run evals: sample 1 live, samples 2-3
// replay the same-day cache of the s2/s3 runs, so run it after them, without restarting the server), mcp (free:
// the MCP "call a tool" box runs in the browser). DRY=1 with s2 clicks the example's Replay instead of a live run
// (free; for checking selectors and scroll targets).
// Never commit or print the private link. Then: node kit/scripts/build-footage.mjs films/distru
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");

const FILM = path.join(__dirname, "..");
const BASE = process.env.DEMO_URL || "http://localhost:3160/demo/distru/";
const DRY = !!process.env.DRY;
const HEADER = 92; // the page's sticky bar covers y < 68: park components at y = 92

// component name -> CSS selector or (document) => Element (serialised into the page: keep each self-contained)
const TRACK = {
  bar: '[class*="DemoLayout_bar__"]',
  glance: '[class*="Distru_glance__"]',
  flow: '[class*="Timeline_flow__"]', // the pipeline strip (PipelineStrip lives in ui/Timeline)
  emailCard: '[class*="Distru_emailCard__"]',
  samples: '[class*="Distru_samples__"]',
  emailText: "#order-email",
  runRow: '[class*="Distru_emailCard__"] [class*="Distru_runRow__"]',
  runButton: '[class*="Distru_emailCard__"] button[type="submit"]',
  trace: (d) => [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) => /^Agent run/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())),
  traceHead: (d) => {
    const c = [...d.querySelectorAll('[class*="Panel_card__"]')].find((x) => /^Agent run/.test(((x.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim()));
    return c && c.querySelector('[class*="Panel_cardHead__"]');
  },
  timeline: '[class*="Timeline_timeline__"]',
  stepExtract: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[0],
  stepCheck: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[1],
  stepDecide: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[2],
  stepDraft: (d) => d.querySelectorAll('[class*="Timeline_timeline__"] > [class*="Timeline_step__"]')[3],
  extract: '[class*="Distru_extract__"]',
  vague: (d) => [...d.querySelectorAll('[class*="Distru_extractLines__"] li')].find((li) => /vague/i.test(li.textContent)),
  tools: '[class*="Distru_tools__"]',
  toolInv: (d) => [...d.querySelectorAll('[class*="Distru_tool__"]')].find((li) => li.textContent.includes("check_inventory")),
  toolSub: (d) => [...d.querySelectorAll('[class*="Distru_tool__"]')].find((li) => li.textContent.includes("propose_substitution")),
  toolLic: (d) => [...d.querySelectorAll('[class*="Distru_tool__"]')].find((li) => li.textContent.includes("check_license")),
  decideNote: (d) => [...d.querySelectorAll('[class*="Distru_stageNote__"]')].find((p) => /Jev picked|Routed by rules/.test(p.textContent)),
  times: '[class*="Distru_times__"]',
  decision: (d) => [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) => /^Decision/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())),
  gauge: '[class*="Distru_routeGauge__"]',
  routeBlock: '[class*="Distru_routeBlock__"]',
  finalRoute: '[class*="Distru_final__"]',
  finalBadge: '[class*="Distru_finalHead__"]',
  subBlock: '[class*="Distru_subBlock__"]',
  reply: (d) => [...d.querySelectorAll('[class*="Panel_card__"]')].find((c) => /^Reply to buyer/.test(((c.querySelector('[class*="Panel_cardTitle__"]') || {}).textContent || "").trim())),
  mail: '[class*="Distru_mail__"]',
  oneQuestion: '[class*="Distru_oneQuestion__"]',
  gridMid: '[class*="Distru_gridMid__"]',
  order: '[class*="Distru_orderCard__"]',
  orderTable: '[class*="Distru_orderTable__"]',
  orderFoot: '[class*="Distru_orderFoot__"]',
  mcpHead: (d) => {
    const h = d.querySelector("#mcp-heading");
    return h && h.parentElement;
  },
  callers: '[class*="Distru_callers__"]',
  mcpPanel: '[class*="Distru_mcpPanel__"]',
  toolList: '[class*="Mcp_toolList__"]',
  definition: '[class*="Mcp_definition__"]',
  tryBox: '[class*="Mcp_tryBox__"]',
  callButton: '[class*="Mcp_tryBox__"] button[type="submit"]',
  exchange: '[class*="Mcp_exchange__"]',
  mcpResult: '[class*="Mcp_exchange__"] > div:nth-child(2)',
  connect: '[class*="Distru_connect__"]',
  evalsHead: (d) => {
    const h = d.querySelector("#eval-heading");
    return h && h.parentElement;
  },
  evalBar: '[class*="Distru_evalBar__"]',
  evalScore: '[class*="Distru_evalScore__"]',
  evalGrid: '[class*="Distru_evalGrid__"]',
  eval1: (d) => d.querySelectorAll('[class*="Distru_evalCard__"]')[0],
  eval2: (d) => d.querySelectorAll('[class*="Distru_evalCard__"]')[1],
  eval3: (d) => d.querySelectorAll('[class*="Distru_evalCard__"]')[2],
};

const redact = (s) => String(s).replace(/([?&]k=)[^&\s"']+/g, "$1***");

async function open(name) {
  const clip = await cap.startClip({ film: FILM, name, url: BASE, track: TRACK });
  const { page } = clip;
  // the page autoplays its example run on load; let it finish so the page is still
  await page.waitForFunction(() => /Replay/.test(document.body.innerText), null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(600);
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

// sample 2: the live run, then decision + reply, the order, and the run at a glance at the top
async function s2() {
  const clip = await open("s2");
  const { page } = clip;
  await startAt(clip, (await docTop(page, TRACK.emailCard)) - HEADER, [1180, 560]);
  await clip.wait(2200);
  if (DRY) await clip.click(page.getByRole("button", { name: "Replay" }), { label: "run", move: 900 });
  else await clip.click(page.locator(TRACK.runButton).first(), { label: "run", move: 1000 });
  await clip.waitText("Structured output (JSON)", { label: "extracted", timeout: 120000 });
  await clip.wait(1600);
  await clip.scrollTo((await docTop(page, TRACK.tools)) - HEADER - 8, 800);
  clip.mark("tools");
  await clip.waitText("Reply drafted", { label: "drafted", timeout: 120000 });
  await page.waitForSelector(TRACK.times, { timeout: 30000 }).catch(() => {});
  await clip.wait(2400);
  await clip.scrollTo((await docTop(page, '[class*="Timeline_timeline__"] > [class*="Timeline_step__"]:nth-child(3)')) - HEADER - 8, 700);
  clip.mark("times");
  await clip.wait(2200);
  await clip.scrollTo((await docTop(page, TRACK.gridMid)) - HEADER, 900);
  clip.mark("decision");
  await clip.wait(4200);
  await clip.scrollTo((await docTop(page, TRACK.order)) - HEADER, 800);
  clip.mark("order");
  await clip.wait(3200);
  await clip.scrollTo(0, 1100);
  clip.mark("glance");
  await clip.wait(3600);
  await clip.finish();
}

// sample 3: pick it, run it live; the hard rule holds the order
async function s3() {
  const clip = await open("s3");
  const { page } = clip;
  await startAt(clip, (await docTop(page, TRACK.emailCard)) - HEADER, [1180, 560]);
  await clip.wait(1200);
  await clip.click(page.locator('[class*="Distru_samples__"] [class*="Choice_option__"]').nth(2), { label: "pick3", move: 900 });
  await clip.wait(1300);
  await clip.click(page.locator(TRACK.runButton).first(), { label: "run", move: 900 });
  await clip.waitText("Structured output (JSON)", { label: "extracted", timeout: 120000 });
  await clip.waitText("Reply drafted", { label: "drafted", timeout: 120000 });
  await clip.wait(1500);
  await clip.scrollTo((await docTop(page, TRACK.gridMid)) - HEADER, 900);
  clip.mark("decision");
  await clip.wait(5200);
  await clip.finish();
}

// Run evals: three emails through the live agent (sample 1 live; 2 and 3 from today's cache of s2 / s3)
async function evals() {
  const clip = await open("evals");
  const { page } = clip;
  await startAt(clip, (await docTop(page, "#evals")) - HEADER - 8, [1300, 700]);
  await clip.wait(1200);
  await clip.click(page.getByRole("button", { name: "Run evals" }), { label: "run", move: 900 });
  await page.waitForFunction(() => document.querySelectorAll('[class*="Distru_evalFoot__"] button').length >= 3, null, { timeout: 150000, polling: 50 });
  clip.mark("done");
  await clip.wait(4200);
  await clip.finish();
}

// MCP: the same tools as an MCP server; call check_license by hand (runs in the browser on sample data)
async function mcp() {
  const clip = await open("mcp");
  const { page } = clip;
  await startAt(clip, (await docTop(page, "#mcp")) - HEADER - 8, [1500, 640]);
  await clip.wait(3000);
  await clip.scrollTo((await docTop(page, TRACK.mcpPanel)) - HEADER - 8, 800);
  clip.mark("panel");
  await clip.wait(1600);
  await clip.click(page.locator(TRACK.callButton).first(), { label: "call", move: 900 });
  await page.waitForSelector(TRACK.exchange, { timeout: 10000 });
  await clip.wait(1500);
  await clip.scrollTo((await docTop(page, TRACK.tryBox)) - HEADER - 8, 800);
  clip.mark("result");
  await clip.wait(4200);
  await clip.finish();
}

const clips = { s2, s3, evals, mcp };
(async () => {
  const which = process.argv[2] || "s2";
  if (!clips[which]) throw new Error("unknown clip " + which);
  await clips[which]();
})().catch((e) => {
  console.error(redact(e && e.stack ? e.stack : e));
  process.exit(1);
});
