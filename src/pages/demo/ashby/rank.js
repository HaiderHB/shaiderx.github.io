// Ranking, guardrails and eval metrics for the Ashby demo, all in code (pure JS, no models).
// The page re-runs these on every override, so the shortlist moves the moment a recruiter
// changes a requirement. The API routes use the same checks on model output.
import { CANDIDATES, IGNORED_FIELDS, TODAY, candidateById, evidenceLines, lastApplication, monthsBetween, redactedProfile, yearsAt } from './data';

export const WEIGHT = { must: 3, nice: 1 };
const STRENGTH = { strong: 1, some: 0.5 };
export const SHORTLIST = 10;

// --- Requirements --------------------------------------------------------------------------

const PROXIES = [
  {
    test: /\b(top[- ]tier|top|elite|prestigious|ivy|name[- ]brand|well[- ]known)\b[^.\n]{0,40}\b(universit(y|ies)|schools?|colleges?|programs?)\b|\bdegree from a\b/i,
    why: 'School prestige is a proxy for background, not a skill',
  },
  { test: /\bdigital native\b|\bgrew up (online|with)\b|\byoung\b|\byouthful\b|\brecent grad(uate)?s? only\b/i, why: 'An age proxy' },
  { test: /\bnative (english )?speakers?\b|\bcitizens? only\b/i, why: 'A national-origin proxy' },
  { test: /\bculture fit\b/i, why: 'Vague, and a known way bias gets in' },
  { test: /\b(no|without) (employment |career )?gaps?\b|\bcontinuous(ly)? employ/i, why: 'Penalises caregivers and career breaks' },
  { test: /\b(male|female|gender|married|childless)\b/i, why: 'A protected characteristic' },
];

const squash = text =>
  String(text || '')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** The proxy rule a requirement trips, if any. */
export function proxyReason(requirement) {
  const text = `${requirement.label} ${requirement.quote}`;
  return PROXIES.find(proxy => proxy.test.test(text))?.why || null;
}

/**
 * Checks the requirements the LLM extracted: each must quote the job description verbatim and
 * must not be a protected or proxy attribute. Returns { items, dropped, minYears }.
 */
export function checkRequirements(raw, jd) {
  const body = squash(jd);
  const items = [];
  const dropped = [];
  const seen = new Set();
  for (const kind of ['must', 'nice']) {
    const list = Array.isArray(raw?.[kind]) ? raw[kind] : [];
    for (const entry of list) {
      const label = String(entry?.label || '').trim().slice(0, 48);
      const quote = String(entry?.quote || '').trim().slice(0, 200);
      if (!label) continue;
      const requirement = { label, quote, kind };
      const proxy = proxyReason(requirement);
      if (proxy) {
        dropped.push({ ...requirement, why: proxy, rule: 'proxy' });
        continue;
      }
      if (!quote || !body.includes(squash(quote))) {
        dropped.push({ ...requirement, why: 'Not stated in the job description', rule: 'quote' });
        continue;
      }
      const key = squash(label);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(requirement);
    }
  }
  // Years only count when the number is written in the job description; code computes them
  // from role dates, so a "5+ years" requirement leaves the list the models rate
  const years = Number(raw?.min_years);
  const minYears = Number.isFinite(years) && years > 0 && years < 30 && new RegExp(`\\b${years}\\s*\\+`).test(jd) ? years : null;
  // A line like "5+ years designing SaaS products" keeps its discipline as a rated requirement
  const isYears = item => minYears && /\b\d+\s*\+?\s*years?\b/i.test(`${item.label} ${item.quote}`);
  const yearsItem = items.find(isYears);
  const rated = items
    .map(item => {
      if (!isYears(item)) return item;
      const rest = item.label.replace(/\b\d+\s*\+?\s*(years?|yrs)\b\s*(of\s+)?/i, '').trim();
      return rest.length >= 4 && !seen.has(squash(rest)) ? { ...item, label: rest[0].toUpperCase() + rest.slice(1) } : null;
    })
    .filter(Boolean);
  const must = rated.filter(item => item.kind === 'must').slice(0, 6);
  const nice = rated.filter(item => item.kind === 'nice').slice(0, 5);
  const numbered = [
    ...must.map((item, index) => ({ ...item, id: `M${index + 1}` })),
    ...nice.map((item, index) => ({ ...item, id: `N${index + 1}` })),
  ];
  const yearsQuote = yearsItem?.quote || jd.match(new RegExp(`[^\\n.]*\\b${minYears}\\s*\\+\\s*years[^\\n.]*`, 'i'))?.[0]?.replace(/^[-•\s]+/, '').trim();
  return { items: numbered, dropped, minYears, years: minYears ? { label: `${minYears}+ years`, quote: yearsQuote || '' } : null };
}

// --- Quotes ----------------------------------------------------------------------------------

/**
 * Checks one quoted piece of evidence against the lines the model was shown. A quote must
 * appear verbatim (spacing and curly quotes aside) in the line it cites, or in another line of
 * the same candidate (then it is re-pointed there). Returns the line, or null (dropped).
 */
export function verifyQuote(quote, lineId, lines) {
  const needle = squash(quote).replace(/^["']|["']$/g, '').replace(/[.]$/, '');
  if (needle.split(' ').length < 3) return null;
  const cited = lines.find(line => line.id === lineId);
  if (cited && squash(cited.text).includes(needle)) return cited;
  return lines.find(line => squash(line.text).includes(needle)) || null;
}

/** The exact span of a verified quote inside its line, for highlighting. */
export function quoteSpan(text, quote) {
  const needle = squash(quote).replace(/^["']|["']$/g, '').replace(/[.]$/, '');
  const index = squash(text).indexOf(needle);
  if (index < 0) return null;
  // squash() only shortens runs of whitespace; the lines here have none, so offsets match
  return [index, index + needle.length];
}

// --- Scoring ---------------------------------------------------------------------------------

/**
 * Score for one candidate from the verified evidence, the requirement modes the recruiter set,
 * years of experience and the decision model's view of the past concern. Reads nothing else.
 * Returns { total, parts: [{ id, label, kind, value, points, note }] }.
 */
export function scoreCandidate({ candidate, evidence, verdict, requirements, modes, minYears }) {
  const parts = [];
  const lines = evidenceLines(candidate);
  const fresh = new Set(lines.filter(line => line.fresh).map(line => line.id));
  for (const requirement of requirements) {
    const mode = modes?.[requirement.id] || requirement.kind;
    if (mode === 'off') continue;
    const items = (evidence?.items || []).filter(item => item.req === requirement.id);
    const positive = items.filter(item => STRENGTH[item.strength]);
    const against = items.filter(item => item.strength === 'against');
    const best = Math.max(0, ...positive.map(item => STRENGTH[item.strength]));
    let value = best;
    let note = best === 1 ? 'clear evidence' : best ? 'some evidence' : 'no evidence';
    if (against.length && best) {
      if (positive.some(item => fresh.has(item.line))) note = 'newer work outweighs an old concern';
      else {
        value = best - 0.5;
        note = 'mixed: evidence on both sides';
      }
    } else if (against.length) {
      value = -0.5;
      note = 'evidence against';
    }
    parts.push({ id: requirement.id, label: requirement.label, kind: mode, value, points: WEIGHT[mode] * value, note });
  }
  const years = yearsAt(candidate);
  if (minYears) {
    const points = years >= minYears ? 1.5 : -1.5 * Math.min(1, (minYears - years) / minYears) * 2;
    parts.push({ id: 'years', label: `${minYears}+ years`, kind: 'years', value: years, points, note: `${years} years now` });
  }
  if (verdict?.concern != null) {
    parts.push({
      id: 'concern',
      label: 'Past concern still applies',
      kind: 'concern',
      value: verdict.concern,
      points: -2 * verdict.concern,
      note: `${Math.round(verdict.concern * 100)}% likely`,
    });
  }
  const total = Math.round(parts.reduce((sum, part) => sum + part.points, 0) * 100) / 100;
  return { total, parts };
}

/** Screen score (the LLM's first pass over everyone): picks who gets read in full. */
export function screenScore(row, requirements) {
  let total = 0;
  for (const requirement of requirements) total += (WEIGHT[requirement.kind] * (Number(row?.[requirement.id]) || 0)) / 2;
  return total;
}

/**
 * The agent's full order: the pool (read in full, quotes checked) by score, then everyone else
 * by their screen score. people: the candidate objects to read (swap them to test invariance).
 */
export function rankRun(run, modes = {}, people = CANDIDATES) {
  if (!run?.requirements) return { pool: [], rest: [] };
  const { items: requirements, minYears } = run.requirements;
  const byId = new Map(people.map(person => [person.id, person]));
  const pool = (run.pool || [])
    .filter(id => run.evidence?.[id])
    .map(id => {
      const candidate = byId.get(id);
      const score = scoreCandidate({
        candidate,
        evidence: run.evidence[id],
        verdict: run.verdicts?.[id],
        requirements,
        modes,
        minYears,
      });
      return { id, ...score };
    })
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  const inPool = new Set(pool.map(row => row.id));
  const rest = Object.entries(run.screen || {})
    .filter(([id]) => !inPool.has(id))
    .map(([id, row]) => ({ id, total: screenScore(row, requirements) }))
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  return { pool, rest };
}

export const orderOf = ranked => [...ranked.pool, ...ranked.rest].map(row => row.id);

// --- Keyword baseline ------------------------------------------------------------------------

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What a keyword search does: distinct query terms found in resume and notes, then hit count. */
export function keywordRank(job, people = CANDIDATES) {
  const terms = job.keywords.map(term => ({ term, re: new RegExp(`(^|[^a-z])${escape(term.toLowerCase())}(?![a-z])`, 'g') }));
  return people
    .map(person => {
      const text = [
        ...person.roles.flatMap(role => [role.title, ...role.lines]),
        ...person.applications.flatMap(app => app.notes.map(note => note.text)),
      ]
        .join('\n')
        .toLowerCase();
      let distinct = 0;
      let hits = 0;
      const found = [];
      for (const { term, re } of terms) {
        const count = (text.match(re) || []).length;
        if (count) {
          distinct += 1;
          hits += count;
          found.push(term);
        }
      }
      return { id: person.id, distinct, hits, found, recency: -monthsBetween(lastApplication(person)?.date || TODAY) };
    })
    .sort((a, b) => b.distinct - a.distinct || b.hits - a.hits || b.recency - a.recency || a.id.localeCompare(b.id));
}

// --- Eval ------------------------------------------------------------------------------------

/** precision@k and recall@k of an order against the hand labels. */
export function metrics(order, labels, k = SHORTLIST) {
  const top = order.slice(0, k);
  const found = top.filter(id => labels.includes(id));
  return {
    precision: found.length / k,
    recall: labels.length ? found.length / labels.length : 0,
    found,
    missed: labels.filter(id => !top.includes(id)),
    top,
  };
}

// --- Guardrail checks ------------------------------------------------------------------------

const DATE = /\b(19|20)\d{2}\b/;

/** Scans every redacted profile the models read for names, schools, employers, places and dates. */
export function leakScan(people = CANDIDATES) {
  const leaks = { name: [], school: [], employer: [], location: [], date: [], pronoun: [] };
  for (const person of people) {
    const text = redactedProfile(person);
    const words = person.name.split(' ');
    if (words.some(word => word.length > 2 && new RegExp(`\\b${escape(word)}\\b`).test(text))) leaks.name.push(person.id);
    if (text.includes(person.school.name)) leaks.school.push(person.id);
    if (person.roles.some(role => text.includes(role.org))) leaks.employer.push(person.id);
    if (text.includes(person.location.split(',')[0])) leaks.location.push(person.id);
    if (DATE.test(text.replace(person.id, ''))) leaks.date.push(person.id);
    if (/\b(he|she|his|her|him|hers)\b/i.test(text)) leaks.pronoun.push(person.id);
  }
  return { people: people.length, leaks };
}

const rotate = (list, by) => list.map((_, index) => list[(index + by) % list.length]);

/** Copies of the pool with the ignored fields shuffled, or with every gap between jobs closed. */
export function counterfactuals(people = CANDIDATES) {
  const names = rotate(people.map(person => person.name), 17);
  const schools = rotate(people.map(person => person.school), 29);
  const places = rotate(people.map(person => person.location), 11);
  const shuffled = people.map((person, index) => ({ ...person, name: names[index], school: schools[index], location: places[index] }));
  const closed = people.map(person => {
    // Keep each role's length, slide older roles forward so each ends the month before the next starts
    const roles = person.roles.map(role => ({ ...role }));
    for (let index = 1; index < roles.length; index++) {
      const newer = roles[index - 1];
      const role = roles[index];
      const length = monthsBetween(role.start, role.end);
      const [year, month] = newer.start.split('-').map(Number);
      const endIndex = year * 12 + month - 2;
      const startIndex = endIndex - length;
      const toYm = value => `${Math.floor(value / 12)}-${String((value % 12) + 1).padStart(2, '0')}`;
      role.end = toYm(endIndex);
      role.start = toYm(startIndex);
    }
    return { ...person, roles };
  });
  return { shuffled, closed };
}

/** Runs the ranking on the counterfactual pools and compares the shortlist, in order. */
export function invariance(run, modes) {
  const base = orderOf(rankRun(run, modes)).slice(0, SHORTLIST);
  const { shuffled, closed } = counterfactuals();
  const same = people => {
    const order = orderOf(rankRun(run, modes, people)).slice(0, SHORTLIST);
    return order.length === base.length && order.every((id, index) => id === base[index]);
  };
  return { shuffled: same(shuffled), closed: same(closed), size: base.length };
}

// --- Re-engagement draft ---------------------------------------------------------------------

/** Checks a drafted note: its callback is in the notes word for word, it is short, pay only if pay was the reason. */
export function checkEmail(draft, candidate) {
  const notes = candidate.applications.flatMap(app => app.notes.map(note => note.text));
  const callback = squash(draft.callback).replace(/^["']|["']$/g, '').replace(/[.]$/, '');
  const words = String(draft.body || '').split(/\s+/).filter(Boolean).length;
  const found = callback.split(' ').length >= 4 && notes.some(note => squash(note).includes(callback));
  const payReason = lastApplication(candidate)?.reason === 'comp';
  const mentionsPay = /\$|\bsalary\b|\bcompensation\b|\bband\b|\bpay\b/i.test(draft.body || '');
  return [
    {
      id: 'callback',
      label: 'Refers back to the last conversation',
      status: found ? 'pass' : 'fail',
      detail: callback ? `“${draft.callback}” ${found ? 'found' : 'not found'} word for word in the notes` : 'no callback given',
    },
    {
      id: 'placeholder',
      label: 'No placeholders left in',
      status: /[[^]]{2,30}]/.test(`${draft.subject} ${draft.body}`) ? 'fail' : 'pass',
    },
    { id: 'length', label: 'Short enough to read on a phone', status: words <= 130 ? 'pass' : 'warn', detail: `${words} words` },
    {
      id: 'pay',
      label: payReason ? 'Mentions pay: it was the reason last time' : 'Leaves pay out',
      status: payReason || !mentionsPay ? 'pass' : 'warn',
    },
  ];
}

export { candidateById, IGNORED_FIELDS };
