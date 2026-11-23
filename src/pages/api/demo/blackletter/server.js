// Server-side pieces shared by the Blackletter routes: one review call per document
// (streamed LLM -> objects -> pinned flags), the confidence question for the fast decision
// model, and the per-day cache of baseline runs. Not a route (no .api.js suffix).
import crypto from 'crypto';
import { askJev, chat, chatStream, DEMO_LLM, jevQuestion } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { docById } from 'pages/demo/blackletter/data';
import {
  CLARIFY_SYSTEM,
  CONFIDENCE_QUESTION,
  EMPTY_HARNESS,
  MAX_CHECKS,
  MAX_FLAGS,
  SYSTEM_PROMPT,
  clarifyPrompt,
  confidenceState,
  createObjectStream,
  parseClarifications,
  pinFlags,
  reviewPrompt,
  toFlag,
} from 'pages/demo/blackletter/harness';

export const VERSION = 'blackletter-v1';
export const MODEL = DEMO_LLM.model();
const CACHE_SECONDS = 12 * 3600;

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 24);
const today = () => new Date().toISOString().slice(0, 10);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// At most three LLM calls at a time from this process, so a re-run of every document stays
// well under the provider's concurrency cap.
const MAX_PARALLEL = 3;
let active = 0;
const waiting = [];
async function withSlot(task) {
  if (active >= MAX_PARALLEL) await new Promise(resolve => waiting.push(resolve));
  active += 1;
  try {
    return await task();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

/**
 * Reviews one document with a harness. onFlag(flag) fires as each flag is pinned, while the
 * model is still writing. Returns { flags, dropped, cleared, ms }.
 */
export async function reviewDoc(docId, harness = EMPTY_HARNESS, { onFlag, onDropped, onCleared } = {}) {
  const doc = docById(docId);
  const started = Date.now();
  const raw = [];
  const flags = [];
  const dropped = [];
  const cleared = [];
  let objects = 0;
  const take = object => {
    const item = toFlag(object);
    objects += 1;
    if (!item || objects > MAX_CHECKS) return;
    if (item.kind === 'cleared') {
      const known = doc.clauses.some(clause => clause.n === item.clause);
      const repeat = cleared.some(entry => entry.rule === item.rule && entry.clause === item.clause);
      if (known && !repeat) {
        const entry = { doc: docId, rule: item.rule, clause: item.clause, finding: item.finding };
        cleared.push(entry);
        onCleared?.(entry);
      }
      return;
    }
    if (raw.length >= MAX_FLAGS) return;
    raw.push({ rule: item.rule, quote: item.quote, issue: item.issue, redline: item.redline });
    // Pin the whole list again so duplicates of a rule and clause merge the same way every time
    const pinned = pinFlags(docId, raw);
    for (const flag of pinned.flags) {
      if (flags.some(existing => existing.id === flag.id)) continue;
      flags.push(flag);
      onFlag?.(flag);
    }
    for (const flag of pinned.dropped) {
      if (dropped.some(existing => existing.quote === flag.quote && existing.rule === flag.rule)) continue;
      dropped.push(flag);
      onDropped?.(flag);
    }
  };
  await withSlot(async () => {
    for (let attempt = 0; ; attempt += 1) {
      const feed = createObjectStream(take);
      try {
        for await (const text of chatStream({
          provider: DEMO_LLM.provider,
          model: MODEL,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: reviewPrompt(doc, harness) }],
          maxTokens: 1100,
          temperature: 0,
        })) {
          feed(text);
        }
        return;
      } catch (error) {
        // The provider caps concurrent requests across everything on this key: wait and retry,
        // but only if nothing has been sent to the page yet
        const busy = /\b429\b/.test(String(error.message));
        if (!busy || attempt >= 3 || objects > 0) throw error;
        await sleep(1200 * (attempt + 1));
      }
    }
  });
  // A clause the model both cleared and flagged under one rule counts as flagged
  const kept = cleared.filter(entry => !flags.some(flag => flag.rule === entry.rule && flag.clause === entry.clause));
  return { flags, dropped, cleared: kept, ms: Date.now() - started };
}

/** The fast decision model's view of one flag: { choice, probabilities, ms } or { error }. */
export async function confidence(flag, harness = EMPTY_HARNESS) {
  const started = Date.now();
  try {
    const { answers } = await askJev(confidenceState(flag, harness), {
      verdict: jevQuestion.choice(CONFIDENCE_QUESTION.instructions, CONFIDENCE_QUESTION.criteria),
    });
    const answer = answers.verdict || {};
    if (!CONFIDENCE_QUESTION.criteria[answer.choice]) throw new Error('no valid choice');
    return { choice: answer.choice, probabilities: answer.probabilities || {}, ms: Date.now() - started };
  } catch (error) {
    console.error('[blackletter confidence]', error.message);
    return { error: true };
  }
}

/** Turns the lawyer's rejections into one clarification per rule. {} if the call fails. */
export async function clarify(rejections) {
  if (!rejections.length) return {};
  const ruleIds = [...new Set(rejections.map(item => item.rule))];
  try {
    const text = await chat({
      provider: DEMO_LLM.provider,
      model: MODEL,
      system: CLARIFY_SYSTEM,
      messages: [{ role: 'user', content: clarifyPrompt(rejections) }],
      maxTokens: 90 * ruleIds.length + 60,
      temperature: 0,
      json: true,
    });
    return parseClarifications(text, ruleIds);
  } catch (error) {
    console.error('[blackletter clarify]', error.message);
    return {};
  }
}

// Baseline (harness v1) runs are the same for everyone, so one run per document per day is
// kept and reused by the review route (replay) and the eval route (the "before" column).
// The store is per route bundle without Redis, so a process-wide map backs it up.
const local = (global.__blackletterBaselines = global.__blackletterBaselines || new Map());
const baselineKey = docId => `cache:blackletter:v1:${hash(VERSION, MODEL, today(), docId)}`;

export async function getBaseline(docId) {
  const key = baselineKey(docId);
  try {
    return (await getJSON(key)) || local.get(key) || null;
  } catch {
    return local.get(key) || null;
  }
}

export async function saveBaseline(docId, run) {
  const key = baselineKey(docId);
  local.set(key, run);
  try {
    await setJSON(key, run, CACHE_SECONDS);
  } catch {
    // caching is best effort
  }
}
