// Live model calls, the run cache and the suggestion prompt shared by the Mastra routes (not a
// route itself: only *.api.js files are). One function-calling turn at a time through the
// OpenAI-compatible router the other demos use, keeping the provider's token counts for the
// trace spans. Calls are gated to three at once and retried on rate limits.
import crypto from 'crypto';
import { requireEnv } from 'demos/api';
import { chat, DEMO_LLM } from 'demos/models';
import { getJSON, setJSON } from 'demos/store';
import { CAUSES, normalizeConfig, renderConfig, runAgent, grade } from 'pages/demo/mastra/agent';

export const MODEL = DEMO_LLM.model();
export const VERSION = 'mastra-v3';
const CACHE_SECONDS = 24 * 3600;
const LLM_URL = () => process.env.FAL_LLM_URL || 'https://fal.run/openrouter/router/openai/v1';
const llmKey = () => process.env.FAL_KEY || requireEnv('FAL_API_KEY');

export const hash = (...parts) =>
  crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 32);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// The provider caps concurrent requests per account and other demos share it: three at once
const SLOTS = Number(process.env.DEMO_MASTRA_LLM_SLOTS) || 3;
let active = 0;
const waiting = [];
export async function withSlot(fn) {
  if (active >= SLOTS) await new Promise(resolve => waiting.push(resolve));
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

/** Retries with a growing pause; a 429 waits longer (the cap is per account and clears in seconds). */
export async function withRetry(fn, attempts = 6) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (/\b(400|401|403)\b/.test(String(error?.message))) break;
      const limited = /\b429\b/.test(String(error?.message));
      await sleep((limited ? 2000 : 700) + attempt * 1000 + Math.random() * 600);
    }
  }
  throw lastError;
}

/** One agent step: tools on offer, tool choice left to the model. */
async function callModel({ system, messages, tools }) {
  return withRetry(() =>
    withSlot(async () => {
      const response = await fetch(`${LLM_URL()}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Key ${llmKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: system }, ...messages],
          tools,
          tool_choice: 'auto',
          max_tokens: 400,
          temperature: 0,
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`llm ${response.status}: ${body.slice(0, 200)}`);
      }
      const data = await response.json();
      const message = data.choices?.[0]?.message || {};
      const toolCalls = (message.tool_calls || []).map(call => {
        let args = {};
        try {
          args = JSON.parse(call.function?.arguments || '{}');
        } catch {
          args = {};
        }
        return { id: call.id, name: call.function?.name, args };
      });
      return {
        content: message.content || '',
        toolCalls,
        finishReason: data.choices?.[0]?.finish_reason,
        usage: { input: data.usage?.prompt_tokens || 0, output: data.usage?.completion_tokens || 0 },
      };
    })
  );
}

export const configHash = config => hash(JSON.stringify(normalizeConfig(config)));
export const caseKey = (config, caseId) => `mastra:case:${hash(VERSION, MODEL, configHash(config), caseId)}`;

export async function cachedCase(config, caseId) {
  try {
    return await getJSON(`cache:${caseKey(config, caseId)}`);
  } catch {
    return null;
  }
}

/** Runs one benchmark case (or replays the cached run). Returns { trace, grade, cached }. */
export async function runCase(config, testCase) {
  const hit = await cachedCase(config, testCase.id);
  if (hit) return { ...hit, cached: true };
  const trace = await runAgent({ config, testCase, callModel, now: () => performance.now() });
  const result = { trace, grade: grade(testCase, trace) };
  // A run whose model call failed is not cached: the next try should be live
  if (trace.stop !== 'error') await setJSON(`cache:${caseKey(config, testCase.id)}`, result, CACHE_SECONDS).catch(() => {});
  return { ...result, cached: false };
}

const SUGGEST_SYSTEM = `You improve an AI agent's configuration using failing benchmark traces.
You get the agent's current config (Mastra-style TypeScript), one failure cause, and up to three failing traces with the checks they failed.
Propose the smallest config change that fixes this cause for these cases without breaking cases that already pass.

Reply with JSON only:
{"diagnosis": "<one sentence, under 30 words: what in the config causes these failures>", "changes": [<1 or 2 changes>], "risk": "<one short sentence: what could regress>"}

Change shapes:
{"kind": "instructions", "remove": "<an exact line of the current instructions to delete, or empty>", "add": "<one new instruction line, or empty>"}
{"kind": "tool_description", "tool": "<tool id>", "text": "<the full new description>"}
{"kind": "param", "tool": "<tool id>", "param": "<param name>", "description": "<new description>", "pattern": "<a regex the value must match, or empty>"}
{"kind": "memory", "lastMessages": <integer 2-20>}
{"kind": "max_steps", "value": <integer 2-8>}

Rules: change only what this cause needs. Do not copy values from the traces (emails, specific order numbers) into the config; a format example is fine. Instruction lines stay under 30 words.`;

export const suggestKey = (config, cluster) =>
  `mastra:suggest:${hash(VERSION, MODEL, configHash(config), JSON.stringify(cluster))}`;

/** One suggestion for one failure cluster: { diagnosis, changes, risk } (validated by the caller). */
export async function suggest(config, cluster) {
  const cause = CAUSES[cluster.cause];
  const user = [
    'Current config:',
    '```ts',
    renderConfig(normalizeConfig(config)),
    '```',
    `Failure cause: ${cause.label}. ${cause.signal}`,
    `Changes that usually fix this cause: ${cause.fix}.`,
    `Failing cases in this cluster: ${cluster.count}. Up to three of them:`,
    JSON.stringify(cluster.examples, null, 1),
    ...(cluster.working?.length
      ? ['Tool calls that worked in passing cases (for contrast):', ...cluster.working]
      : []),
  ].join('\n');
  const text = await withRetry(() =>
    withSlot(() =>
      chat({
        provider: DEMO_LLM.provider,
        model: MODEL,
        system: SUGGEST_SYSTEM,
        messages: [{ role: 'user', content: user }],
        maxTokens: 500,
        temperature: 0,
        json: true,
      })
    )
  );
  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  }
  return {
    diagnosis: String(parsed.diagnosis || '').slice(0, 300),
    changes: (Array.isArray(parsed.changes) ? parsed.changes : []).slice(0, 2),
    risk: String(parsed.risk || '').slice(0, 200),
  };
}

export async function cachedSuggestion(key) {
  try {
    return await getJSON(`cache:${key}`);
  } catch {
    return null;
  }
}

export async function saveSuggestion(key, value) {
  await setJSON(`cache:${key}`, value, CACHE_SECONDS).catch(() => {});
}
