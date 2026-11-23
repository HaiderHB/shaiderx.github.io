// The rediscovery agent for the Ashby demo: prompts, parsing and the run itself. Model calls
// are injected ({ llm, decide }), so this file stays pure and the routes own the network.
//   1. The LLM extracts must-haves and nice-to-haves; code keeps only those quoted verbatim
//      from the job description and drops protected or proxy attributes.
//   2. The LLM screens every past candidate (redacted profiles, in parallel batches).
//   3. The best 14 are read in full: the LLM cites evidence lines; code keeps a quote only if
//      it appears verbatim in the line it cites.
//   4. A fast decision model gives each a fit verdict and the chance that the old rejection
//      reason still applies, with probabilities. Code ranks (rank.js).
import {
  CANDIDATES,
  REASON_LABELS,
  candidateById,
  evidenceLines,
  lastApplication,
  monthsBetween,
  redactedProfile,
  redactText,
  yearsAt,
} from './data';
import { checkRequirements, screenScore, verifyQuote } from './rank';

export const POOL_SIZE = 14;
const SCREEN_BATCHES = 3;
const EVIDENCE_BATCH = 5;

const NOTE_COUNT = CANDIDATES.reduce((sum, person) => sum + person.applications.reduce((n, app) => n + app.notes.length, 0), 0);

export const FIT_OPTIONS = [
  { value: 'reach_out', label: 'Reach out' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'not_now', label: 'Not now' },
];

const chunk = (list, size) => {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
};

export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

/** First line of a job description, as its title. */
export const titleOf = jd =>
  String(jd || '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean)
    ?.split('·')[0]
    .trim()
    .slice(0, 80) || 'This role';

const bandOf = jd => String(jd || '').match(/CA\$\s?\d[\d,.]*K?\s?[–-]\s?\d[\d,.]*K/i)?.[0] || null;
const remoteOf = jd => /\bremote\b/i.test(String(jd || ''));

// --- 1. Requirements -------------------------------------------------------------------------

const EXTRACT_SYSTEM = `You read a job description and list what it asks of candidates. Return JSON only:
{"must": [{"label": "...", "quote": "..."}], "nice": [{"label": "...", "quote": "..."}], "min_years": 5}
- must: what the description says is required. nice: what it calls nice to have, a plus or ideal.
- label: 2 to 5 plain words, for example "TypeScript and React".
- quote: the exact words from the description that state it, copied character for character. Never paraphrase.
- List every requirement the text states, including education, background and personal traits. Do not judge or filter them.
- When a line combines years with a kind of work ("5+ years designing SaaS products"), label the kind of work ("Designing SaaS products") and put the number in min_years.
- At most 6 must and 5 nice. min_years: the minimum years of experience if a number is written, else null.`;

// --- 2. Screen everyone ----------------------------------------------------------------------

const SCREEN_SYSTEM = `You screen past candidates for a new role. For each candidate, rate each requirement from what the profile and the interview notes show:
2 = clear evidence, 1 = some or related evidence, -1 = a note or the profile shows they lack it.
Count equivalent tools and wording (Next.js counts as React, Postgres as PostgreSQL, Dagster as an orchestration tool). Judge substance, not keyword lists: a bare skills list, or a note saying they could not explain a tool, is weak or negative evidence. A newer role can outweigh an older interview note.
Rate in the context of the role: a requirement about the role's own craft (design for a designer, engineering for an engineer) needs that kind of work. Someone from another discipline gets at most 1 for it, however close the wording.
Answer with one line per candidate and nothing else, listing only the non-zero ratings:
C-012 M1:2 M2:1 N2:-1
A candidate with nothing relevant gets just the id.`;

const requirementList = requirements =>
  requirements.items.map(item => `${item.id} (${item.kind === 'must' ? 'must-have' : 'nice to have'}): ${item.label}`).join('\n') +
  (requirements.minYears ? `\nExperience: ${requirements.minYears}+ years (checked separately in code; do not rate it).` : '');

const screenUser = (requirements, batch, role) =>
  `Role: ${role}

Requirements:\n${requirementList(requirements)}\n\nCandidates:\n\n${batch.map(redactedProfile).join('\n\n')}`;

export function parseScreen(text, batch, requirements) {
  const ids = new Set(requirements.items.map(item => item.id));
  const rows = {};
  for (const person of batch) rows[person.id] = {};
  for (const line of String(text || '').split('\n')) {
    const id = line.match(/\bC-\d{3}\b/)?.[0];
    if (!id || !rows[id]) continue;
    for (const [, req, value] of line.matchAll(/\b([MN]\d)\s*[:=]\s*(-?\d)/g)) {
      const score = Number(value);
      if (ids.has(req) && [-1, 1, 2].includes(score)) rows[id][req] = score;
    }
  }
  return rows;
}

// --- 3. Evidence -----------------------------------------------------------------------------

const EVIDENCE_SYSTEM = `You cite evidence for a recruiter. For each candidate and each requirement, find up to two lines that show it, or that show the candidate lacks it.
Return JSON only: {"candidates": [{"id": "C-012", "evidence": [{"req": "M1", "line": "r1", "quote": "exact words", "strength": "strong"}], "summary": "..."}]}
- line: the id in square brackets. quote: 4 to 25 consecutive words copied exactly from that line. Never paraphrase and never join two lines.
- strength: "strong" (clearly shows it), "some" (partly, or a related tool) or "against" (shows they lack it, such as an interviewer note).
- Equivalent tools count (Next.js is React, Postgres is PostgreSQL). A bare skills list is at most "some".
- Read each requirement in the context of the role: evidence for the role's own craft must be that kind of work (an engineer's wireframes are at most "some" for a design requirement).
- Skip a requirement with no evidence. Never cite the "Last application" line.
- summary: one sentence of at most 20 words on why they are, or are not, worth a call now. Call the candidate "they".`;

const evidenceUser = (requirements, batch, role) =>
  `Role: ${role}

Requirements:\n${requirementList(requirements)}\n\nCandidates:\n\n${batch.map(id => redactedProfile(candidateById(id))).join('\n\n')}`;

/** Keeps the evidence that checks out; returns { [id]: { items, dropped, summary } }. */
export function parseEvidence(raw, batch, requirements) {
  const ids = new Set(requirements.items.map(item => item.id));
  const out = {};
  const entries = Array.isArray(raw?.candidates) ? raw.candidates : [];
  for (const id of batch) {
    const entry = entries.find(item => String(item?.id).trim() === id);
    if (!entry) continue;
    const lines = evidenceLines(candidateById(id));
    const items = [];
    const dropped = [];
    const perReq = {};
    for (const item of Array.isArray(entry.evidence) ? entry.evidence : []) {
      const req = String(item?.req || '').trim();
      const strength = ['strong', 'some', 'against'].includes(item?.strength) ? item.strength : null;
      const quote = String(item?.quote || '').trim().slice(0, 240);
      if (!ids.has(req) || !strength || !quote) continue;
      const line = verifyQuote(quote, String(item?.line || '').trim(), lines);
      if (!line) {
        dropped.push({ req, quote, why: 'not found word for word in the profile' });
        continue;
      }
      perReq[req] = (perReq[req] || 0) + 1;
      if (perReq[req] > 2) continue;
      items.push({ req, line: line.id, quote, strength });
    }
    const summary = String(entry.summary || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);
    out[id] = { items, dropped, summary };
  }
  return out;
}

// --- 4. Decision model -----------------------------------------------------------------------

const EVIDENCE_WORD = { strong: 'clear', some: 'some', against: 'against' };

/** What the decision model reads about one candidate: evidence and history, nothing personal. */
export function verdictState({ jd, requirements, id, evidence }) {
  const candidate = candidateById(id);
  const application = lastApplication(candidate);
  const lines = evidenceLines(candidate);
  const describe = kind =>
    requirements.items
      .filter(item => item.kind === kind)
      .map(item => {
        const found = (evidence?.items || []).filter(entry => entry.req === item.id);
        const best = found.find(entry => entry.strength === 'strong') || found.find(entry => entry.strength === 'some') || found[0];
        return {
          requirement: item.label,
          evidence: best ? EVIDENCE_WORD[best.strength] : 'none',
          ...(found.some(entry => entry.strength === 'against') && best?.strength !== 'against' && { also_against: true }),
          ...(best && { quote: best.quote }),
        };
      });
  const since = candidate.roles.filter(role => application && role.start > application.date);
  return {
    role: titleOf(jd),
    role_is_remote: remoteOf(jd),
    role_pay_band: bandOf(jd),
    must_haves: describe('must'),
    nice_to_haves: describe('nice'),
    experience: { years_now: yearsAt(candidate), required: requirements.minYears },
    past_application: application && {
      months_ago: monthsBetween(application.date),
      stage_reached: application.stage,
      passed_on_for: REASON_LABELS[application.reason] || application.reason,
      reason_detail: redactText(application.detail, candidate),
      years_experience_then: yearsAt(candidate, application.date),
      roles_started_since: since.map(role => role.title),
      new_evidence_since: lines.filter(line => line.fresh).map(line => line.text).slice(0, 3),
    },
  };
}

export const VERDICT_QUESTIONS = {
  fit: {
    type: 'choice',
    instructions:
      'Should a recruiter reach out to this past candidate about this role now? Judge only the evidence listed for the must-haves and nice-to-haves, and the past application.',
    criteria: {
      reach_out: 'Clear evidence for most must-haves and nothing current that rules them out',
      maybe: 'Some must-haves shown, or open questions a short call could clear up',
      not_now: 'Key must-haves missing, or evidence against them',
    },
  },
  concern: {
    type: 'noul',
    instructions:
      'The reason this candidate was passed on last time still applies to this role today. Weigh what changed since: years of experience then and now, roles and evidence since, the pay band, the role being remote, and how long ago it was.',
  },
};

// --- The run ---------------------------------------------------------------------------------

/**
 * One rediscovery run. deps: { llm({ system, user, maxTokens, json }) -> text,
 * decide(state) -> { fit: { choice, probabilities }, concern } }. emit(event) gets every step.
 */
export async function rediscover({ jd }, { llm, decide }, emit) {
  const started = Date.now();
  const calls = { llm: 0, decision: 0 };
  const quotes = { kept: 0, dropped: 0 };
  emit({ t: 'start', title: titleOf(jd), total: CANDIDATES.length, notes: NOTE_COUNT });

  calls.llm += 1;
  const requirements = checkRequirements(parseJson(await llm({ system: EXTRACT_SYSTEM, user: jd, maxTokens: 700, json: true })), jd);
  emit({ t: 'requirements', ...requirements, ms: Date.now() - started });
  if (!requirements.items.some(item => item.kind === 'must')) {
    emit({ t: 'error', message: 'No requirements could be checked against the job description. Try a longer description.' });
    return;
  }

  const screen = {};
  const size = Math.ceil(CANDIDATES.length / SCREEN_BATCHES);
  await Promise.all(
    chunk(CANDIDATES, size).map(async batch => {
      calls.llm += 1;
      const rows = parseScreen(await llm({ system: SCREEN_SYSTEM, user: screenUser(requirements, batch, titleOf(jd)), maxTokens: 1400 }), batch, requirements);
      Object.assign(screen, rows);
      emit({ t: 'screen', rows, done: Object.keys(screen).length, total: CANDIDATES.length, ms: Date.now() - started });
    })
  );

  const pool = Object.entries(screen)
    .map(([id, row]) => ({ id, score: screenScore(row, requirements.items) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, POOL_SIZE)
    .map(row => row.id);
  emit({ t: 'pool', ids: pool, ms: Date.now() - started });

  const readBatch = async batch => {
    calls.llm += 1;
    const raw = parseJson(await llm({ system: EVIDENCE_SYSTEM, user: evidenceUser(requirements, batch, titleOf(jd)), maxTokens: 2200, json: true }));
    return parseEvidence(raw, batch, requirements);
  };

  await Promise.all(
    chunk(pool, EVIDENCE_BATCH).map(async batch => {
      let found = await readBatch(batch);
      const missing = batch.filter(id => !found[id]);
      if (missing.length) found = { ...found, ...(await readBatch(missing)) };
      for (const id of batch) {
        const evidence = found[id] || { items: [], dropped: [], summary: '' };
        quotes.kept += evidence.items.length;
        quotes.dropped += evidence.dropped.length;
        emit({ t: 'evidence', id, ...evidence });
      }
      await Promise.all(
        batch.map(async id => {
          calls.decision += 1;
          const verdict = await decide(verdictState({ jd, requirements, id, evidence: found[id] }));
          emit({ t: 'verdict', id, ...verdict });
        })
      );
    })
  );

  emit({ t: 'done', ms: Date.now() - started, calls, quotes });
}

// --- Client-side fold of the events ----------------------------------------------------------

export const emptyRun = () => ({
  title: '',
  requirements: null,
  screen: {},
  screened: 0,
  total: CANDIDATES.length,
  notes: NOTE_COUNT,
  pool: [],
  evidence: {},
  verdicts: {},
  done: null,
  error: '',
  cached: false,
});

export function reduceRun(state, event) {
  switch (event.t) {
    case 'meta':
      return { ...state, cached: Boolean(event.cached) };
    case 'start':
      return { ...state, title: event.title, total: event.total, notes: event.notes };
    case 'requirements':
      return { ...state, requirements: { items: event.items, dropped: event.dropped, minYears: event.minYears, years: event.years } };
    case 'screen':
      return { ...state, screen: { ...state.screen, ...event.rows }, screened: event.done };
    case 'pool':
      return { ...state, pool: event.ids };
    case 'evidence':
      return { ...state, evidence: { ...state.evidence, [event.id]: { items: event.items, dropped: event.dropped, summary: event.summary } } };
    case 'verdict':
      return { ...state, verdicts: { ...state.verdicts, [event.id]: { fit: event.fit, concern: event.concern } } };
    case 'done':
      return { ...state, done: { ms: event.ms, calls: event.calls, quotes: event.quotes } };
    case 'error':
      return { ...state, error: event.message };
    default:
      return state;
  }
}

export const foldRun = events => events.reduce(reduceRun, emptyRun());
