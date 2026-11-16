// Deterministic scheduling tools over the sample data: qualification, availability (calendar,
// working hours in each person's time zone, load caps, notice), loop rules (order, buffers,
// candidate hours) and the searches behind the three repair options and the candidate's
// requests. No model touches any of this: it is the part that must never be wrong.
// Plain JS: runs in the browser (the example run) and in the API routes.
import {
  CANDIDATE,
  INTERVIEWERS,
  NOW,
  RULES,
  SESSIONS,
  WEEK,
  firstName,
  fmtDay,
  fmtRange,
  fmtTime,
  interviewerById,
  localParts,
  minutesOf,
  sessionById,
  tzAbbr,
  zoned,
} from './data';

const MINUTE = 60000;
const HOUR = 60 * MINUTE;

const endOf = (sessionId, start) => start + sessionById(sessionId).minutes * MINUTE;
const overlaps = (a0, a1, b0, b1) => a0 < b1 && b0 < a1;
const clone = world => JSON.parse(JSON.stringify(world));

export const OPTION_IDS = ['swap', 'reschedule_one', 'reschedule_loop'];
export const OPTION_LABELS = {
  swap: 'Swap interviewer, same time',
  reschedule_one: 'Reschedule this interview',
  reschedule_loop: 'Reschedule the whole loop',
};
export const OPTION_SHORT = {
  swap: 'Swap',
  reschedule_one: 'Move one',
  reschedule_loop: 'Move loop',
};
export const SEVERITY = { swap: 0, reschedule_one: 1, reschedule_loop: 2 };

/** "Wed, Nov 18, 12:00–1:00 PM EST" in the candidate's time zone. */
export const candidateRange = (sessionId, start) =>
  fmtRange(start, endOf(sessionId, start), CANDIDATE.tz);

/** "10:00–11:00 AM MST" in the interviewer's time zone. */
export function localRange(person, sessionId, start) {
  const range = fmtRange(start, endOf(sessionId, start), person.tz);
  return range.slice(range.indexOf(',', 5) + 2);
}

// --- checks -------------------------------------------------------------------------------------

function inWorkingHours(person, start, end) {
  const a = localParts(start, person.tz);
  const b = localParts(end - 1, person.tz);
  const [open, close] = person.hours.map(minutesOf);
  return a.date === b.date && a.minutes >= open && b.minutes + 1 <= close;
}

function candidateWindow(date) {
  const window = CANDIDATE.windows[date];
  if (!window) return null;
  return [zoned(date, window[0], CANDIDATE.tz), zoned(date, window[1], CANDIDATE.tz)];
}

function inCandidateHours(start, end) {
  const window = candidateWindow(localParts(start, CANDIDATE.tz).date);
  return Boolean(window) && start >= window[0] && end <= window[1];
}

/** Interviews this person already has this week: outside the loop, plus their sessions in it. */
function loadWith(world, person, sessionId) {
  const inLoop = Object.entries(world.plan).filter(
    ([id, item]) => id !== sessionId && item.interviewer === person.id
  ).length;
  return person.load.booked + inLoop + 1;
}

function hoursLabel(person) {
  const [open, close] = person.hours;
  const at = hhmm => zoned('2026-11-18', hhmm, person.tz);
  return `${fmtTime(at(open), person.tz)}–${fmtTime(at(close), person.tz)}`;
}

/**
 * Every hard check for one interviewer in one session slot.
 * Returns [{ id, label, pass, detail }]. `changed`: the slot or person is new, so notice applies.
 */
export function checkSlot(world, sessionId, personId, start, { changed = true } = {}) {
  const person = interviewerById(personId);
  const session = sessionById(sessionId);
  const end = endOf(sessionId, start);
  const checks = [];
  const add = (id, label, pass, detail) => checks.push({ id, label, pass, detail });

  const level = person.qualified[sessionId];
  add(
    'qualified',
    'Qualified',
    level === 'qualified',
    level === 'qualified'
      ? `Trained for ${session.title.toLowerCase()}`
      : level === 'shadow'
      ? `Still shadowing ${session.title.toLowerCase()}`
      : `Not trained for ${session.title.toLowerCase()}`
  );

  const out = world.unavailable.find(
    item => item.interviewer === personId && overlaps(start, end, item.from, item.to)
  );
  add('available', 'Available', !out, out ? `Out: ${out.reason}` : 'Not marked out');

  const hours = inWorkingHours(person, start, end);
  add(
    'working_hours',
    'Working hours',
    hours,
    `${localRange(person, sessionId, start)} vs ${hoursLabel(person)} ${tzAbbr(
      start,
      person.tz
    )}`
  );

  const clash = person.busy.find(block => overlaps(start, end, block.start, block.end));
  const loopClash = Object.entries(world.plan).find(
    ([id, item]) =>
      id !== sessionId &&
      item.interviewer === personId &&
      overlaps(start, end, item.start, endOf(id, item.start))
  );
  add(
    'calendar',
    'No double-booking',
    !clash && !loopClash,
    clash
      ? `Busy: ${clash.title} ${fmtTime(clash.start, person.tz)}–${fmtTime(
          clash.end,
          person.tz
        )}`
      : loopClash
      ? `Already in ${sessionById(loopClash[0]).title.toLowerCase()} then`
      : 'Free'
  );

  const onLoop = Object.entries(world.plan).find(
    ([id, item]) => id !== sessionId && item.interviewer === personId
  );
  add(
    'one_per_loop',
    'One interview per loop',
    !onLoop,
    onLoop
      ? `Already interviewing (${sessionById(onLoop[0]).title.toLowerCase()})`
      : 'Not on this loop yet'
  );

  const load = loadWith(world, person, sessionId);
  add(
    'load',
    'Weekly load cap',
    load <= person.load.cap,
    `${load} of ${person.load.cap} this week${
      load > person.load.cap ? ' (over cap)' : ''
    }`
  );

  const notice = Math.floor((start - NOW) / HOUR);
  const noticeOk = !changed || notice >= RULES.noticeHours;
  add(
    'notice',
    `${RULES.noticeHours} h notice`,
    noticeOk,
    changed ? `${notice} h from now` : 'Unchanged slot'
  );

  add(
    'candidate_hours',
    'Candidate hours',
    inCandidateHours(start, end),
    `${fmtTime(start, CANDIDATE.tz)} ${tzAbbr(
      start,
      CANDIDATE.tz
    )}, inside what ${firstName(CANDIDATE)} offered`
  );
  if (!checks[checks.length - 1].pass) {
    checks[checks.length - 1].detail = `${fmtTime(start, CANDIDATE.tz)} ${tzAbbr(
      start,
      CANDIDATE.tz
    )} is outside what ${firstName(CANDIDATE)} offered`;
  }
  return checks;
}

const passes = checks => checks.every(check => check.pass);
const firstFail = checks => checks.find(check => !check.pass);

/** Loop-level rules: order (first / last), buffers, no overlapping sessions for the candidate. */
export function loopChecks(world) {
  const items = SESSIONS.map(session => {
    const item = world.plan[session.id];
    return { ...session, start: item.start, end: endOf(session.id, item.start) };
  }).sort((a, b) => a.start - b.start);
  const checks = [];

  for (const session of SESSIONS) {
    if (session.order === 'any') continue;
    const self = items.find(item => item.id === session.id);
    const others = items.filter(item => item.id !== session.id);
    const ok =
      session.order === 'first'
        ? others.every(other => self.end <= other.start)
        : others.every(other => other.end <= self.start);
    checks.push({
      id: `order_${session.id}`,
      label: `${session.title} ${session.order}`,
      pass: ok,
      detail: ok
        ? `${session.title} is ${
            session.order === 'first' ? 'the first' : 'the last'
          } interview`
        : `${session.title} must be ${session.order === 'first' ? 'first' : 'last'}`,
    });
  }

  let buffersOk = true;
  let tightest = null;
  for (let index = 1; index < items.length; index += 1) {
    const prev = items[index - 1];
    const next = items[index];
    const sameDay =
      localParts(prev.start, CANDIDATE.tz).date ===
      localParts(next.start, CANDIDATE.tz).date;
    if (!sameDay) continue;
    const gap = (next.start - prev.end) / MINUTE;
    if (tightest == null || gap < tightest) tightest = gap;
    if (gap < RULES.bufferMinutes) buffersOk = false;
  }
  checks.push({
    id: 'buffers',
    label: `${RULES.bufferMinutes} min buffers`,
    pass: buffersOk,
    detail:
      tightest == null
        ? 'One interview per day'
        : buffersOk
        ? `Tightest gap ${tightest} min`
        : `A gap of ${tightest} min is under ${RULES.bufferMinutes}`,
  });
  return checks;
}

/** Every invariant over the whole loop. `changed`: session ids whose slot or person changed. */
export function validateWorld(world, changed = []) {
  const perSession = SESSIONS.flatMap(session => {
    const item = world.plan[session.id];
    return checkSlot(world, session.id, item.interviewer, item.start, {
      changed: changed.includes(session.id),
    }).map(check => ({ ...check, session: session.id }));
  });
  const loop = loopChecks(world);
  const all = [...perSession, ...loop];
  return {
    total: all.length,
    violations: all.filter(check => !check.pass),
    loop,
  };
}

// --- searches -----------------------------------------------------------------------------------

function slotsInWindow(date, from, to, minutes) {
  const window = candidateWindow(date);
  if (!window) return [];
  const start = Math.max(window[0], from ?? window[0]);
  const end = Math.min(window[1], to ?? window[1]);
  const slots = [];
  for (let t = start; t + minutes * MINUTE <= end; t += RULES.slotStep * MINUTE)
    slots.push(t);
  return slots;
}

/** Qualified people for a session, best first: most load headroom, then alphabetical. */
function rankPeople(world, sessionId, exclude = []) {
  return INTERVIEWERS.filter(
    person => person.qualified[sessionId] === 'qualified' && !exclude.includes(person.id)
  ).sort(
    (a, b) =>
      b.load.cap -
        loadWith(world, b, sessionId) -
        (a.load.cap - loadWith(world, a, sessionId)) || a.name.localeCompare(b.name)
  );
}

const withSession = (world, sessionId, patch) => {
  const next = clone(world);
  next.plan[sessionId] = { ...next.plan[sessionId], ...patch };
  return next;
};

function changedIds(before, after) {
  return SESSIONS.map(session => session.id).filter(id => {
    const a = before.plan[id];
    const b = after.plan[id];
    return a.start !== b.start || a.interviewer !== b.interviewer;
  });
}

/** A world is valid when every changed session passes and the loop rules hold. */
function valid(before, after) {
  const result = validateWorld(after, changedIds(before, after));
  return result.violations.length === 0;
}

export function describeChange(before, after, sessionId) {
  const a = before.plan[sessionId];
  const b = after.plan[sessionId];
  const person = interviewerById(b.interviewer);
  return {
    session: sessionId,
    title: sessionById(sessionId).title,
    from: candidateRange(sessionId, a.start),
    to: candidateRange(sessionId, b.start),
    from_interviewer: interviewerById(a.interviewer).name,
    interviewer: person.name,
    interviewer_local: localRange(person, sessionId, b.start),
    moved: a.start !== b.start,
    swapped: a.interviewer !== b.interviewer,
  };
}

export function diffWorlds(before, after) {
  return changedIds(before, after).map(id => describeChange(before, after, id));
}

function swapOption(world, sessionId, exclude) {
  const item = world.plan[sessionId];
  const candidates = rankPeople(world, sessionId, exclude).map(person => ({
    person,
    checks: checkSlot(world, sessionId, person.id, item.start, { changed: true }),
  }));
  const pick = candidates.find(candidate => passes(candidate.checks));
  if (!pick) return { valid: false, candidates };
  const next = withSession(world, sessionId, {
    interviewer: pick.person.id,
    status: 'held',
  });
  return { valid: valid(world, next), world: next, person: pick.person, candidates };
}

function rescheduleOneOption(world, sessionId) {
  const item = world.plan[sessionId];
  const session = sessionById(sessionId);
  const people = rankPeople(world, sessionId);
  const originalDate = localParts(item.start, CANDIDATE.tz).date;
  let best = null;
  for (const day of WEEK) {
    for (const start of slotsInWindow(day.date, null, null, session.minutes)) {
      if (start === item.start) continue;
      for (const person of [interviewerById(item.interviewer), ...people]) {
        const next = withSession(world, sessionId, {
          interviewer: person.id,
          start,
          status: 'held',
        });
        if (!passes(checkSlot(next, sessionId, person.id, start)) || !valid(world, next))
          continue;
        const cost =
          (day.date === originalDate ? 0 : 20) +
          Math.abs(start - item.start) / HOUR +
          (person.id === item.interviewer ? 0 : 3);
        if (!best || cost < best.cost) best = { cost, world: next, person, start };
      }
    }
  }
  return best ? { valid: true, ...best } : { valid: false };
}

/** Lays the loop out on one day, in order, with the given panel. Earliest valid start wins. */
function layoutDay(world, date, panel) {
  const window = candidateWindow(date);
  if (!window) return null;
  for (let first = window[0]; first < window[1]; first += RULES.slotStep * MINUTE) {
    let next = clone(world);
    let cursor = first;
    let ok = true;
    for (const session of SESSIONS) {
      const person = panel[session.id];
      let placed = false;
      for (const start of slotsInWindow(date, cursor, null, session.minutes)) {
        const trial = withSession(next, session.id, {
          interviewer: person,
          start,
          status: 'held',
        });
        if (passes(checkSlot(trial, session.id, person, start))) {
          next = trial;
          cursor = endOf(session.id, start) + RULES.bufferMinutes * MINUTE;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok && valid(world, next)) return next;
  }
  return null;
}

function rescheduleLoopOption(world, sessionId, dropout) {
  const originalDate = localParts(world.plan[sessionId].start, CANDIDATE.tz).date;
  const panel = Object.fromEntries(
    SESSIONS.map(session => [session.id, world.plan[session.id].interviewer])
  );
  if (dropout) panel[sessionId] = dropout;
  for (const day of WEEK) {
    if (day.date === originalDate) continue;
    const next = layoutDay(world, day.date, panel);
    if (next) return { valid: true, world: next, date: day.date };
  }
  return { valid: false };
}

function summarize(id, before, option) {
  if (!option.valid) return { valid: false, changes: [] };
  const changes = diffWorlds(before, option.world);
  const moved = changes.filter(change => change.moved).length;
  const swapped = changes.filter(change => change.swapped).length;
  const first = changes[0];
  const latest = Math.max(
    ...SESSIONS.map(session => option.world.plan[session.id].start)
  );
  const originalLatest = Math.max(
    ...SESSIONS.map(session => before.plan[session.id].start)
  );
  const delayDays = Math.max(
    0,
    Math.round(
      (Date.parse(localParts(latest, CANDIDATE.tz).date) -
        Date.parse(localParts(originalLatest, CANDIDATE.tz).date)) /
        86400000
    )
  );
  let text;
  if (id === 'swap') {
    text = `${first.interviewer} takes ${first.title.toLowerCase()} at the same time (${
      first.interviewer_local
    } for them).`;
  } else if (id === 'reschedule_one') {
    text = `${first.title} moves to ${first.to} with ${first.interviewer}.`;
  } else {
    text = `All ${changes.length} interviews move to ${fmtDay(
      latest,
      CANDIDATE.tz
    )} with the original panel.`;
  }
  return {
    valid: true,
    text,
    candidate_impact: moved
      ? `${moved} of ${SESSIONS.length} interviews change time`
      : 'Times unchanged for the candidate',
    interviewers_changed: swapped,
    delay_days: delayDays,
    changes,
  };
}

// --- the tools (what the agent's timeline shows) ------------------------------------------------

export const TOOL_INFO = {
  getLoop: 'Read the loop, the candidate and the rules',
  findQualifiedInterviewers: 'Who is trained for this interview',
  checkAvailability: 'Calendar, hours, load and notice per person',
  scoreOptions: 'Build and check the three repair options',
  holdSlot: 'Re-check, then hold the slot',
  draftMessages: 'Who to tell, on which channel',
  findSlots: 'Search slots for the candidate’s request',
  validateLoop: 'Every invariant over the whole loop',
};

export function getLoop(world) {
  return {
    candidate: {
      name: CANDIDATE.name,
      time_zone: CANDIDATE.tz,
      offered: Object.entries(CANDIDATE.windows).map(
        ([date, [from, to]]) =>
          `${fmtDay(zoned(date, '12:00', CANDIDATE.tz), CANDIDATE.tz)} ${fmtTime(
            zoned(date, from, CANDIDATE.tz),
            CANDIDATE.tz
          )}–${fmtTime(zoned(date, to, CANDIDATE.tz), CANDIDATE.tz)}`
      ),
      note: CANDIDATE.note,
    },
    sessions: SESSIONS.map(session => {
      const item = world.plan[session.id];
      const person = interviewerById(item.interviewer);
      return {
        id: session.id,
        when: candidateRange(session.id, item.start),
        interviewer: person.name,
        their_time: localRange(person, session.id, item.start),
        status: item.status,
      };
    }),
    rules: {
      order: 'System design first, hiring manager last',
      buffer: `${RULES.bufferMinutes} min between interviews`,
      notice: `${RULES.noticeHours} h for any new or moved slot`,
      one_interview_per_person: true,
    },
  };
}

export function findQualifiedInterviewers(world, sessionId, exclude = []) {
  const qualified = [];
  const filtered = [];
  for (const person of INTERVIEWERS) {
    const level = person.qualified[sessionId];
    const onLoop = Object.entries(world.plan).find(
      ([id, item]) => id !== sessionId && item.interviewer === person.id
    );
    if (exclude.includes(person.id))
      filtered.push({ name: person.name, reason: 'dropped out' });
    else if (!level) continue;
    else if (level === 'shadow')
      filtered.push({ name: person.name, reason: 'still shadowing' });
    else if (onLoop)
      filtered.push({
        name: person.name,
        reason: `already on this loop (${sessionById(onLoop[0]).title.toLowerCase()})`,
      });
    else qualified.push(person.id);
  }
  return {
    ids: qualified,
    result: {
      session: sessionById(sessionId).title,
      qualified: qualified.map(id => interviewerById(id).name),
      filtered_out: filtered,
    },
  };
}

export function checkAvailability(world, sessionId, ids, start) {
  const results = ids.map(id => {
    const person = interviewerById(id);
    const checks = checkSlot(world, sessionId, id, start, { changed: true });
    const fail = firstFail(checks);
    return { id, person, checks, pass: !fail, fail };
  });
  return {
    results,
    result: {
      slot: candidateRange(sessionId, start),
      results: results.map(item => ({
        interviewer: item.person.name,
        their_time: localRange(item.person, sessionId, start),
        pass: item.pass,
        ...(item.pass
          ? { load: item.checks.find(check => check.id === 'load').detail }
          : { failed: `${item.fail.label}: ${item.fail.detail}` }),
      })),
    },
  };
}

/** The three repair options, each built and checked against every rule. */
export function scoreOptions(world, sessionId, dropoutId) {
  const swap = swapOption(world, sessionId, [dropoutId]);
  const one = rescheduleOneOption(world, sessionId);
  const loop = rescheduleLoopOption(world, sessionId, dropoutId);
  const built = { swap, reschedule_one: one, reschedule_loop: loop };
  const options = Object.fromEntries(
    OPTION_IDS.map(id => [id, summarize(id, world, built[id])])
  );
  if (!swap.valid) {
    const reasons = swap.candidates.map(
      candidate => `${candidate.person.name}: ${firstFail(candidate.checks)?.detail}`
    );
    options.swap.text = reasons.length
      ? `No qualified interviewer passes every check at that time (${reasons.join(
          '; '
        )}).`
      : 'Nobody else is qualified for this interview.';
  }
  if (!one.valid)
    options.reschedule_one.text = 'No other slot keeps the loop valid this week.';
  if (!loop.valid)
    options.reschedule_loop.text = 'No day this week fits the whole loop with its panel.';

  const floor = OPTION_IDS.find(id => options[id].valid) || 'reschedule_loop';
  return {
    options,
    worlds: Object.fromEntries(
      OPTION_IDS.map(id => [id, built[id].valid ? built[id].world : null])
    ),
    floor,
    result: {
      options: Object.fromEntries(
        OPTION_IDS.map(id => [
          id,
          options[id].valid
            ? {
                valid: true,
                plan: options[id].text,
                candidate_impact: options[id].candidate_impact,
                interviewers_changed: options[id].interviewers_changed,
                delay_days: options[id].delay_days,
              }
            : { valid: false, why: options[id].text },
        ])
      ),
      rules_floor: floor,
    },
  };
}

/** Re-checks every invariant on the new world, then marks the changed slots as held. */
export function holdSlot(before, after) {
  const changes = diffWorlds(before, after);
  const validation = validateWorld(
    after,
    changes.map(change => change.session)
  );
  const ok = validation.violations.length === 0;
  const world = ok ? after : before;
  const holds = changes.map((change, index) => ({
    hold_id: `HOLD-${1180 + index + changes.length * 7}-${change.session
      .slice(0, 2)
      .toUpperCase()}`,
    calendar: change.interviewer,
    session: change.title,
    when: change.to,
    their_time: change.interviewer_local,
  }));
  return {
    ok,
    world,
    holds,
    validation,
    result: ok
      ? {
          status: 'held (tentative until accepted)',
          holds,
          invariants: `${validation.total} checks, 0 violations`,
        }
      : {
          status: 'refused',
          violations: validation.violations.map(
            check => `${check.label}: ${check.detail}`
          ),
        },
  };
}

/** Everyone whose day changes, and the channel each one uses. */
export function recipientsFor(changes, { candidate = true } = {}) {
  const people = new Map();
  for (const change of changes) {
    for (const name of [change.interviewer, change.from_interviewer]) {
      const person = INTERVIEWERS.find(item => item.name === name);
      if (person) people.set(person.id, person);
    }
  }
  return [
    ...(candidate
      ? [
          {
            id: 'candidate',
            name: CANDIDATE.name,
            role: 'Candidate',
            channel: 'Email + SMS',
          },
        ]
      : []),
    ...[...people.values()].map(person => ({
      id: person.id,
      name: person.name,
      role: 'Interviewer',
      channel: person.channel,
    })),
    { id: 'recruiter', name: 'Sam Whitaker', role: 'Recruiter', channel: 'Slack' },
  ];
}

// --- the candidate's requests ---------------------------------------------------------------------

const WINDOWS = {
  morning: ['09:00', '12:00'],
  afternoon: ['12:00', '17:00'],
  evening: ['17:00', '20:00'],
  any: ['00:00', '23:59'],
};

/**
 * Moves one session to a day and part of the day the candidate asked for, repairing the loop
 * order if it has to (the hiring manager stays last). Cheapest plan wins: fewest other sessions
 * moved, then the same interviewer, then the earliest time in the window.
 */
export function findSlots(
  world,
  { session: sessionId, date, window = 'any', after, before }
) {
  const session = sessionById(sessionId);
  const current = world.plan[sessionId];
  const [w0, w1] = WINDOWS[window] || WINDOWS.any;
  const from = zoned(date, after || w0, CANDIDATE.tz);
  const to = zoned(date, before || w1, CANDIDATE.tz);
  const people = [
    interviewerById(current.interviewer),
    ...rankPeople(world, sessionId, [current.interviewer]),
  ];
  const tried = { slots: 0, rejected: {} };
  const plans = [];

  for (const start of slotsInWindow(date, from, to, session.minutes)) {
    tried.slots += 1;
    for (const person of people) {
      let next = withSession(world, sessionId, {
        interviewer: person.id,
        start,
        status: 'held',
      });
      const checks = checkSlot(next, sessionId, person.id, start);
      const fail = firstFail(checks);
      if (fail) {
        tried.rejected[fail.label] = (tried.rejected[fail.label] || 0) + 1;
        continue;
      }
      // Repair the order: whoever must be last moves after the latest other session
      const moved = [];
      for (const other of SESSIONS.filter(
        item => item.order === 'last' && item.id !== sessionId
      )) {
        const others = SESSIONS.filter(item => item.id !== other.id).map(item => ({
          start: next.plan[item.id].start,
          end: endOf(item.id, next.plan[item.id].start),
        }));
        const latest = others.reduce((a, b) => (b.end > a.end ? b : a));
        if (next.plan[other.id].start >= latest.end) continue;
        const day = localParts(latest.start, CANDIDATE.tz).date;
        const owner = next.plan[other.id].interviewer;
        let placed = null;
        for (const slot of slotsInWindow(
          day,
          latest.end + RULES.bufferMinutes * MINUTE,
          null,
          other.minutes
        )) {
          for (const candidate of [
            owner,
            ...rankPeople(next, other.id, [owner]).map(p => p.id),
          ]) {
            const trial = withSession(next, other.id, {
              interviewer: candidate,
              start: slot,
              status: 'held',
            });
            if (passes(checkSlot(trial, other.id, candidate, slot))) {
              placed = trial;
              break;
            }
          }
          if (placed) break;
        }
        if (!placed) {
          next = null;
          break;
        }
        next = placed;
        moved.push(other.id);
      }
      if (!next) {
        tried.rejected['Loop order'] = (tried.rejected['Loop order'] || 0) + 1;
        continue;
      }
      if (!valid(world, next)) {
        tried.rejected['Loop rules'] = (tried.rejected['Loop rules'] || 0) + 1;
        continue;
      }
      const swaps = diffWorlds(world, next).filter(change => change.swapped).length;
      plans.push({
        world: next,
        cost: moved.length * 10 + swaps * 5 + (start - from) / HOUR,
        start,
        person,
        moved,
      });
    }
  }

  plans.sort((a, b) => a.cost - b.cost);
  const best = plans[0];
  const label = `${fmtDay(zoned(date, '12:00', CANDIDATE.tz), CANDIDATE.tz)} ${
    window === 'any' ? '' : window
  }`.trim();
  if (!best) {
    return {
      ok: false,
      world,
      changes: [],
      result: {
        request: `${session.title}, ${label}`,
        status: 'no valid slot',
        slots_tried: tried.slots,
        rejected_by: tried.rejected,
      },
    };
  }
  const changes = diffWorlds(world, best.world);
  return {
    ok: true,
    world: best.world,
    changes,
    alsoMoved: best.moved,
    result: {
      request: `${session.title}, ${label}`,
      slots_tried: tried.slots,
      plans_valid: plans.length,
      chosen: changes.map(change => ({
        session: change.title,
        to: change.to,
        interviewer: change.interviewer,
        their_time: change.interviewer_local,
      })),
      ...(best.moved.length && {
        why_others_moved: best.moved.map(
          id => `${sessionById(id).title} must stay ${sessionById(id).order}`
        ),
      }),
      rejected_by: tried.rejected,
    },
  };
}

/** Validation summary as a tool result. */
export function validateLoop(world, changed = []) {
  const validation = validateWorld(world, changed);
  return {
    validation,
    result: {
      checks: validation.total,
      violations: validation.violations.length,
      loop_rules: Object.fromEntries(
        validation.loop.map(check => [check.label, check.pass ? 'pass' : check.detail])
      ),
    },
  };
}

/** Short schedule text for prompts and replies (candidate time zone). */
export function scheduleText(world) {
  return SESSIONS.map(session => {
    const item = world.plan[session.id];
    const person = interviewerById(item.interviewer);
    return `${session.title}: ${candidateRange(session.id, item.start)} with ${
      person.name
    } (${localRange(person, session.id, item.start)} for them)${
      item.status === 'held' ? ', held' : ''
    }`;
  }).join('\n');
}
