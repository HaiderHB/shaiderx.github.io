// Great Question capture: ONE live voice interview take, then findings and an MCP get_quote call.
// Run from video/:  KEYFILE=/path/key-great-question.txt node films/great-question/capture/record.cjs take
//   KEYFILE holds the private demo URL (?k=...); only its path and query are used, the host becomes
//   DEMO_ORIGIN (default http://localhost:3180). The key is never printed.
// Then: node kit/scripts/build-footage.mjs films/great-question
//
// The demo runs locally (next start -p 3180, .env.local). Each take is a live run: the opening line
// (Fish TTS, cached after the first call), 3 voice turns (Fish ASR -> DeepSeek V3.2 via fal -> Fish TTS
// at 1.15x), one Jev guardrail check per moderator line, and one DeepSeek findings call. The MCP call is
// free (runs in the browser).
// The participant is SIMULATED: Fish stock voice "Selene" at 1.15x (capture/gen-answers.mjs,
// capture/tighten.py -> raw/answers/*.tight.wav), played into the page's getUserMedia stream by
// kit/scripts/fake-mic.cjs, so the page's real MediaRecorder + silence detector + upload path runs.
// Saved next to the frames (raw/<clip>/): mod<N>.mp3 + turn<N>.json (the moderator audio the page
// played, from /turn/), mic-take<N>.webm (what the page recorded and sent), guardrail.ndjson,
// findings.ndjson, audio.json (fake-mic: answer + playback times), net.json (request log).
const fs = require("fs");
const path = require("path");
const cap = require("../../../kit/scripts/capture.cjs");
const mic = require("../../../kit/scripts/fake-mic.cjs");

const FILM = path.join(__dirname, "..");
const ANSWERS = path.join(FILM, "raw", "answers");
const ORIGIN = process.env.DEMO_ORIGIN || "http://localhost:3180";
const keyUrl = new URL(fs.readFileSync(process.env.KEYFILE, "utf8").trim());
const URL_LIVE = `${ORIGIN}${keyUrl.pathname}${keyUrl.search}`;
const SCROLL_Y = 202; // the interview column sticks at top: 72px from here, so the whole card is in view

const q = (cls) => `[class*="GreatQuestion_${cls}__"]`;
const nth = (sel, i) => new Function("d", `return d.querySelectorAll(${JSON.stringify(sel)})[${i}] || null`);
const modLi = `ol${q("transcript")} > li[data-role="moderator"]`;
const partLi = `ol${q("transcript")} > li[data-role="participant"]`;

// component name -> selector / (document) => Element. Every shot focus comes from these boxes.
const TRACK = {
  card: q("interviewCard"),
  cardHead: `${q("interviewCard")} > ${q("cardHead")}`,
  controls: `section[aria-label="Interview"] ${q("controls")}`,
  status: q("statusRow"),
  transcript: `ol${q("transcript")}`,
  dock: q("voiceDock"),
  answerBtn: `${q("voiceDock")} button`,
  guide: 'section[aria-label="Discussion guide"]',
  questions: `ol${q("questions")}`,
  currentQ: `ol${q("questions")} > li[data-state="current"]`,
  exampleCheck: q("exampleCheck"),
  findingsSec: 'section[aria-label="Findings"]',
  findingsHead: `section[aria-label="Findings"] > ${q("sectionHead")}`,
  findingsGrid: `section[aria-label="Findings"] ${q("findings")}`,
  genButton: `section[aria-label="Findings"] ${q("sectionHead")} button`,
  mcpSec: 'section[aria-label="MCP tools"]',
  mcpHead: `section[aria-label="MCP tools"] > ${q("sectionHead")}`,
  mcpCol1: nth(q("mcpCol"), 0),
  mcpCol2: nth(q("mcpCol"), 1),
  callBox: q("callBox"),
  toolSeg: '[role="group"][aria-label="Tool"]',
};
for (let i = 0; i < 5; i++) {
  TRACK[`mod${i + 1}`] = nth(modLi, i);
  TRACK[`badges${i + 1}`] = new Function("d", `const li = d.querySelectorAll(${JSON.stringify(modLi)})[${i}]; return li ? li.querySelector(${JSON.stringify(q("badges"))}) : null`);
  TRACK[`timing${i + 1}`] = new Function("d", `const li = d.querySelectorAll(${JSON.stringify(modLi)})[${i}]; return li ? li.querySelector(${JSON.stringify(q("turnTiming"))}) : null`);
  TRACK[`part${i + 1}`] = nth(partLi, i);
}
for (let i = 0; i < 5; i++) TRACK[`finding${i + 1}`] = nth(`section[aria-label="Findings"] article${q("finding")}`, i);
for (let i = 0; i < 3; i++) TRACK[`mcpPre${i + 1}`] = new Function("d", `const c = d.querySelectorAll(${JSON.stringify(q("mcpCol"))})[1]; return c ? c.querySelectorAll("pre")[${i}] || null : null`);

// Which prepared answer fits the moderator's last question (the moderator is a live LLM).
// take 1 (2026-11-15) used an earlier rule set; these rules are k-aware (k = answer number).
function pick(k, text, used) {
  const t = text.toLowerCase();
  const rules =
    k === 2
      ? [
          [/last time|an example|a time when|tell me about|stall|stuck|mean by/, "a2_story"],
          [/what happens (next|then|after)|after that|and then/, "a2_mean"],
          [/\bwho\b/, "a2_who"],
          [/\bdone\b|count as/, "a2_done"],
          [/\bwhy\b/, "a2_mean"],
        ]
      : [
          [/find out|found out|notice|realiz|discover|learn (that|about)|spot|first (hear|know)|how did you know|catch|come up|came up/, "a3_found"],
          [/how long/, "a3_long"],
          [/what did you do|handle|did you try|tried|resolve|fix|unblock|what happened (next|after)/, "a3_next"],
          [/last time|tell me about|an example|stall|stuck|single sign/, "a2_story"],
          [/outside|on track|tools?\b|workaround|spreadsheet/, "a3_tools"],
          [/\bwhy\b/, "a3_found"],
        ];
  for (const [re, id] of rules) if (re.test(t) && !used.has(id)) return id;
  for (const id of k === 2 ? ["a2_story", "a2_mean"] : ["a3_found", "a3_next", "a3_tools"]) if (!used.has(id)) return id;
  return "a3_tools";
}

async function take(name) {
  const clip = await cap.startClip({
    film: FILM,
    name,
    url: URL_LIVE,
    track: TRACK,
    launch: { args: mic.CHROME_ARGS },
    init: mic.init({ watch: { dock: [q("voiceDock"), "data-phase"] } }),
  });
  const { page } = clip;
  const OUT = clip.outDir;
  const net = [];
  const log = (type, data = {}) => {
    const e = Object.assign({ type, t: clip.t }, data);
    net.push(e);
    console.log(`${e.t.toFixed(2).padStart(7)} ${type} ${JSON.stringify(data).slice(0, 170)}`);
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  let modN = 0, recN = 0;
  page.on("request", (req) => {
    const u = req.url();
    if (!u.includes("/api/demo/great-question/")) return;
    const route = u.split("/great-question/")[1].replace(/\/.*/, "");
    if (route === "turn") {
      try {
        const body = JSON.parse(req.postData() || "{}");
        if (body.audio) {
          recN++;
          fs.writeFileSync(path.join(OUT, `mic-take${recN}.webm`), Buffer.from(body.audio, "base64"));
          log("req-turn", { take: recN, mime: body.mimeType, history: (body.turns || []).length });
        } else log("req-turn", { opening: true });
      } catch (e) {
        log("req-turn-parse-error", { e: String(e) });
      }
    } else log("req-" + route);
  });
  page.on("response", async (res) => {
    const u = res.url();
    if (!u.includes("/api/demo/great-question/")) return;
    const route = u.split("/great-question/")[1].replace(/\/.*/, "");
    let text = "";
    try {
      text = (await res.body()).toString("utf8");
    } catch (e) {
      log("res-body-error", { route, e: String(e) });
      return;
    }
    if (route === "turn") {
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        const lines = text.trim().split("\n").map((l) => JSON.parse(l));
        data = lines.find((l) => l.type === "result") || lines.find((l) => l.type === "error");
      }
      if (data && data.moderator && data.moderator.audio) {
        modN++;
        fs.writeFileSync(path.join(OUT, `mod${modN}.mp3`), Buffer.from(data.moderator.audio, "base64"));
        const copy = Object.assign({}, data, { moderator: Object.assign({}, data.moderator, { audio: `[mod${modN}.mp3]` }) });
        fs.writeFileSync(path.join(OUT, `turn${modN}.json`), JSON.stringify(copy, null, 2));
        log("res-turn", { mod: modN, status: res.status(), text: data.moderator.text, participant: data.participant && data.participant.text, timing: data.timing, done: data.done });
      } else log("res-turn", { status: res.status(), body: text.slice(0, 300) });
    } else {
      fs.appendFileSync(path.join(OUT, `${route}.ndjson`), JSON.stringify({ t: clip.t, status: res.status(), body: text }) + "\n");
      log("res-" + route, { status: res.status(), body: text.slice(0, 160) });
    }
  });

  await mic.attach(clip, { dir: ANSWERS, suffix: ".tight.wav" });
  const ids = ["a1", "a2_story", "a2_who", "a2_done", "a2_mean", "a3_found", "a3_next", "a3_tools", "a3_long"];
  console.log("answers", JSON.stringify(await mic.load(clip, ids)));
  // pre-roll (not in the footage): stick the interview column, park the cursor
  await page.evaluate((y) => window.scrollTo(0, y), SCROLL_Y);
  await page.mouse.move(1700, 1000);
  clip.setCursor(1700, 1000);
  await page.waitForTimeout(800);

  const phase = () => page.evaluate((sel) => document.querySelector(sel)?.getAttribute("data-phase") ?? null, q("voiceDock"));
  async function waitPhase(states, ms) {
    const end = Date.now() + ms;
    let s;
    while (Date.now() < end) {
      s = await phase();
      if (states.includes(s)) return s;
      await page.waitForTimeout(40);
    }
    throw new Error(`timeout waiting for ${states} (last ${s})`);
  }
  const rest = () => clip.moveTo(1640, 640, 700); // park the cursor right of the card, off the text

  await clip.begin();
  if (process.env.DRY) {
    // harness check without any API call: speak an answer into the fake mic with no recorder running
    await mic.speak(clip, "a1");
    await clip.wait(1500);
    await mic.collect(clip);
    await clip.finish();
    return;
  }
  await clip.wait(700);
  await clip.click(page.getByRole("button", { name: "Start voice interview" }), { label: "start", move: 750 });
  await rest();
  let s = await waitPhase(["speaking", "blocked"], 40000);
  if (s === "blocked") await clip.click(page.getByRole("button", { name: "Play reply" }), { label: "play" });
  clip.mark("mod1-speaking");
  await waitPhase(["ready"], 60000);
  clip.mark("ready1");
  const used = new Set();
  for (let k = 1; k <= 3; k++) {
    const lastMod = await page.evaluate((sel) => [...document.querySelectorAll(sel)].at(-1)?.innerText || "", modLi);
    const id = k === 1 ? "a1" : pick(k, lastMod.split("\n").slice(3).join(" "), used);
    used.add(id);
    log("pick", { k, id });
    await clip.wait(500);
    await clip.click(page.getByRole("button", { name: "Answer" }), { label: `answer${k}`, move: 650 });
    await clip.wait(350);
    await mic.speak(clip, id);
    await rest();
    await waitPhase(["transcribing"], 45000);
    clip.mark(`transcribing${k}`);
    s = await waitPhase(["thinking", "speaking", "closing", "blocked", "ready"], 40000);
    s = await waitPhase(["speaking", "closing", "blocked", "ready", null], 40000);
    if (s === "ready" || s === null) throw new Error(`turn ${k} failed (phase ${s})`);
    if (s === "blocked") await clip.click(page.getByRole("button", { name: "Play reply" }), { label: "play" });
    clip.mark(`mod${k + 1}-speaking`);
    s = await waitPhase(["ready", null], 60000);
    clip.mark(`ready${k + 1}`);
    if (s === null) break;
  }
  await clip.wait(900);
  const endBtn = page.getByRole("button", { name: "End interview" });
  if (await endBtn.isVisible().catch(() => false)) await clip.click(endBtn, { label: "end", move: 800 });
  await clip.wait(900);

  // findings
  const fy = await clip.docY('section[aria-label="Findings"]');
  await clip.scrollTo(fy - 70, 1000);
  clip.mark("at-findings");
  await clip.wait(400);
  await clip.click(page.getByRole("button", { name: "Generate findings" }), { label: "findings", move: 750 });
  await page.waitForSelector(`section[aria-label="Findings"] article${q("finding")}`, { timeout: 60000 });
  clip.mark("findings-shown");
  await clip.wait(2200);

  // MCP: get_quote
  const my = await clip.docY('section[aria-label="MCP tools"]');
  await clip.scrollTo(my - 70, 1000);
  clip.mark("at-mcp");
  await clip.wait(700);
  await clip.click(page.getByRole("button", { name: "get_quote" }), { label: "tool-get_quote", move: 750 });
  await clip.wait(700);
  await clip.click(page.getByRole("button", { name: "Run tool" }), { label: "run-get_quote", move: 700 });
  clip.mark("quote-shown");
  await clip.wait(2500);

  const transcript = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((li) => li.innerText).join("\n\n"), `ol${q("transcript")} > li`);
  fs.writeFileSync(path.join(OUT, "transcript.txt"), transcript);
  await page.screenshot({ path: path.join(OUT, "final-full.png"), fullPage: true });
  await mic.collect(clip);
  fs.writeFileSync(path.join(OUT, "net.json"), JSON.stringify({ net, errors }, null, 1));
  console.log("errors", JSON.stringify(errors));
  await clip.finish();
}

// The guide's static "Guardrail, example check" (real Jev scores the page ships with; no API call).
async function check(name) {
  const track = {
    exampleCheck: q("exampleCheck"),
    exampleBad: nth(q("exampleItem"), 0),
    exampleGood: nth(q("exampleItem"), 1),
    badBadges: new Function("d", `const it = d.querySelectorAll(${JSON.stringify(q("exampleItem"))})[0]; return it ? it.querySelector(${JSON.stringify(q("badges"))}) : null`),
    guide: 'section[aria-label="Discussion guide"]',
  };
  const clip = await cap.startClip({ film: FILM, name, url: URL_LIVE, track });
  const { page } = clip;
  await page.evaluate((y) => window.scrollTo(0, y), SCROLL_Y + 520);
  await page.mouse.move(1700, 1000);
  clip.setCursor(1700, 1000);
  await page.waitForTimeout(800);
  await clip.begin();
  await clip.wait(300);
  await clip.scrollTo(SCROLL_Y + 760, 900);
  clip.mark("check-in-view");
  await clip.wait(3500);
  await clip.finish();
}

const which = process.argv[2] || "take";
(which === "check" ? check(which) : take(which)).catch((e) => {
  console.error(e);
  process.exit(1);
});
