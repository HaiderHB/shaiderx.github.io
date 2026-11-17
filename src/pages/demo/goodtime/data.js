// Sample data for the GoodTime loop-rescue demo: one candidate, a four-interview virtual onsite at
// a fictional company, nine interviewers with qualifications, time zones, working hours, weekly
// load caps and a week of busy blocks. Everything is fictional. Plain JS: runs in the browser
// (the example run) and in the API routes.

// --- time zones without a library -----------------------------------------------------------

const formatters = new Map();

function formatter(tz, options) {
  const key = `${tz}|${JSON.stringify(options)}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.DateTimeFormat('en-US', { timeZone: tz, ...options }));
  }
  return formatters.get(key);
}

const PARTS = {
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
};

/** Wall-clock parts of an instant in a time zone: { date: 'YYYY-MM-DD', minutes, weekday }. */
export function localParts(ms, tz) {
  const parts = {};
  for (const part of formatter(tz, PARTS).formatToParts(new Date(ms)))
    parts[part.type] = part.value;
  const hour = Number(parts.hour) % 24;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
    weekday: parts.weekday,
  };
}

function offsetMinutes(ms, tz) {
  const { date, minutes } = localParts(ms, tz);
  const [y, m, d] = date.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000);
}

/** The instant (ms) of a wall-clock time ('YYYY-MM-DD', 'HH:MM') in a time zone. */
export function zoned(date, hhmm, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, h, min);
  const first = naive - offsetMinutes(naive, tz) * 60000;
  return naive - offsetMinutes(first, tz) * 60000;
}

export const minutesOf = hhmm => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** "12:00 PM" in a time zone. */
export const fmtTime = (ms, tz) =>
  formatter(tz, { hour: 'numeric', minute: '2-digit' }).format(new Date(ms));

/** "Wed, Nov 18" in a time zone. */
export const fmtDay = (ms, tz) =>
  formatter(tz, { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(ms)
  );

/** "EST", "PST", "GMT" for an instant in a time zone. */
export const tzAbbr = (ms, tz) =>
  formatter(tz, { timeZoneName: 'short' })
    .formatToParts(new Date(ms))
    .find(part => part.type === 'timeZoneName')?.value || tz;

/** "Wed 12:00 PM EST" */
export const fmtWhen = (ms, tz) =>
  `${fmtDay(ms, tz).split(',')[0]} ${fmtTime(ms, tz)} ${tzAbbr(ms, tz)}`;

/** "Wed, Nov 18, 12:00–1:00 PM EST" */
export function fmtRange(start, end, tz) {
  const a = fmtTime(start, tz);
  const b = fmtTime(end, tz);
  const sameHalf = a.slice(-2) === b.slice(-2);
  return `${fmtDay(start, tz)}, ${sameHalf ? a.slice(0, -3) : a}–${b} ${tzAbbr(
    start,
    tz
  )}`;
}

// --- the scenario ---------------------------------------------------------------------------

export const ET = 'America/New_York';

/** The demo's clock: Monday Nov 16, 2026, 4:05 PM in New York. Notice periods count from here. */
export const NOW = zoned('2026-11-16', '16:05', ET);

export const WEEK = [
  { date: '2026-11-16', label: 'Mon', sub: 'Nov 16' },
  { date: '2026-11-17', label: 'Tue', sub: 'Nov 17' },
  { date: '2026-11-18', label: 'Wed', sub: 'Nov 18' },
  { date: '2026-11-19', label: 'Thu', sub: 'Nov 19' },
  { date: '2026-11-20', label: 'Fri', sub: 'Nov 20' },
];

export const DAY_IDS = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 };

export const COMPANY = {
  name: 'Larkspur Labs',
  note: 'fictional',
  role: 'Senior Backend Engineer, Payments',
  loop: 'Virtual onsite',
};

export const RULES = {
  bufferMinutes: 15,
  noticeHours: 24,
  slotStep: 15,
  oneSessionPerInterviewer: true,
};

export const CANDIDATE = {
  id: 'candidate',
  name: 'Jordan Ellis',
  tz: ET,
  channels: ['Email', 'SMS'],
  // When the candidate said they can interview (their own time zone)
  windows: {
    '2026-11-17': ['10:00', '17:00'],
    '2026-11-18': ['10:00', '17:00'],
    '2026-11-19': ['12:00', '17:00'],
    '2026-11-20': ['10:00', '17:00'],
  },
  note: 'Has a competing offer that expires Fri, Nov 20',
};

export const RECRUITER = {
  id: 'recruiter',
  name: 'Sam Whitaker',
  role: 'Recruiter',
  channel: 'Slack',
};

export const SESSIONS = [
  {
    id: 'system_design',
    title: 'System design',
    short: 'Design',
    minutes: 60,
    order: 'first',
  },
  { id: 'coding', title: 'Coding', short: 'Coding', minutes: 60, order: 'any' },
  { id: 'values', title: 'Values', short: 'Values', minutes: 45, order: 'any' },
  {
    id: 'manager',
    title: 'Hiring manager',
    short: 'Manager',
    minutes: 45,
    order: 'last',
  },
];

export const sessionById = id => SESSIONS.find(session => session.id === id);

const busy = (tz, entries) =>
  entries.map(([date, start, end, title]) => ({
    start: zoned(date, start, tz),
    end: zoned(date, end, tz),
    title,
  }));

const LA = 'America/Los_Angeles';
const DENVER = 'America/Denver';
const LONDON = 'Europe/London';
const TORONTO = 'America/Toronto';
const CHICAGO = 'America/Chicago';

/**
 * qualified: interview types they are trained for ('shadow' = still shadowing, not bookable).
 * load: interviews already booked this week outside this loop, and their weekly cap.
 */
export const INTERVIEWERS = [
  {
    id: 'priya',
    name: 'Priya Raman',
    title: 'Senior Staff Engineer',
    tz: LA,
    hours: ['09:00', '17:00'],
    qualified: { system_design: 'qualified', coding: 'qualified' },
    load: { booked: 2, cap: 4 },
    channel: 'Slack',
    busy: busy(LA, [['2026-11-17', '13:00', '15:00', 'Design review']]),
  },
  {
    id: 'marcus',
    name: 'Marcus Chen',
    title: 'Staff Engineer',
    tz: LA,
    hours: ['08:30', '17:00'],
    qualified: { system_design: 'qualified', coding: 'qualified' },
    load: { booked: 3, cap: 3 },
    channel: 'Slack',
    busy: busy(LA, [['2026-11-18', '13:00', '14:00', 'Team sync']]),
  },
  {
    id: 'dana',
    name: 'Dana Brooks',
    title: 'Principal Engineer',
    tz: LONDON,
    hours: ['09:00', '17:30'],
    qualified: { system_design: 'qualified' },
    load: { booked: 1, cap: 4 },
    channel: 'Teams',
    busy: busy(LONDON, [['2026-11-18', '11:00', '12:30', 'Architecture forum']]),
  },
  {
    id: 'wei',
    name: 'Wei Zhang',
    title: 'Senior Engineer',
    tz: DENVER,
    hours: ['08:00', '16:30'],
    qualified: { system_design: 'qualified', coding: 'qualified' },
    load: { booked: 2, cap: 4 },
    channel: 'Slack',
    busy: busy(DENVER, [
      ['2026-11-18', '08:00', '09:30', 'Standup and 1:1s'],
      ['2026-11-18', '13:00', '14:00', 'Payments guild'],
      ['2026-11-19', '08:00', '09:00', 'Standup'],
    ]),
  },
  {
    id: 'elena',
    name: 'Elena Ruiz',
    title: 'Senior Engineer',
    tz: ET,
    hours: ['09:00', '17:30'],
    qualified: { coding: 'qualified', system_design: 'shadow' },
    load: { booked: 1, cap: 4 },
    channel: 'Teams',
    busy: busy(ET, [
      ['2026-11-18', '10:00', '11:00', 'Sprint planning'],
      ['2026-11-19', '12:00', '14:00', 'Incident review'],
    ]),
  },
  {
    id: 'tomas',
    name: 'Tomás García',
    title: 'Engineering Manager',
    tz: LA,
    hours: ['09:00', '17:00'],
    qualified: { system_design: 'qualified', coding: 'qualified', values: 'qualified' },
    load: { booked: 1, cap: 3 },
    channel: 'Slack',
    busy: busy(LA, [
      ['2026-11-18', '08:30', '10:30', 'Architecture review'],
      ['2026-11-19', '09:00', '09:30', 'Hiring sync'],
    ]),
  },
  {
    id: 'grace',
    name: 'Grace Okafor',
    title: 'Product Lead',
    tz: TORONTO,
    hours: ['09:00', '17:00'],
    qualified: { values: 'qualified' },
    load: { booked: 1, cap: 3 },
    channel: 'Teams',
    busy: busy(TORONTO, [['2026-11-18', '16:00', '17:00', 'Roadmap review']]),
  },
  {
    id: 'ravi',
    name: 'Ravi Iyer',
    title: 'Hiring Manager, Payments',
    tz: LA,
    hours: ['08:00', '17:00'],
    qualified: { manager: 'qualified' },
    load: { booked: 3, cap: 5 },
    channel: 'Slack',
    busy: busy(LA, [
      ['2026-11-18', '10:00', '11:00', 'Payments roadmap'],
      ['2026-11-19', '12:00', '13:00', 'Exec staff'],
    ]),
  },
  {
    id: 'lena',
    name: 'Lena Fischer',
    title: 'Director of Engineering',
    tz: CHICAGO,
    hours: ['08:30', '17:00'],
    qualified: { manager: 'qualified' },
    load: { booked: 2, cap: 2 },
    channel: 'Slack',
    busy: busy(CHICAGO, [['2026-11-19', '13:00', '15:00', 'Quarterly planning']]),
  },
];

export const interviewerById = id => INTERVIEWERS.find(person => person.id === id);
export const firstName = person => person?.name.split(' ')[0] || '';

/** The loop as booked before anything goes wrong (Wed Nov 18, candidate time). */
export const BASE_PLAN = {
  system_design: {
    interviewer: 'priya',
    start: zoned('2026-11-18', '12:00', ET),
    status: 'confirmed',
  },
  coding: {
    interviewer: 'elena',
    start: zoned('2026-11-18', '13:15', ET),
    status: 'confirmed',
  },
  values: {
    interviewer: 'grace',
    start: zoned('2026-11-18', '14:30', ET),
    status: 'confirmed',
  },
  manager: {
    interviewer: 'ravi',
    start: zoned('2026-11-18', '15:30', ET),
    status: 'confirmed',
  },
};

export const initialWorld = () => ({
  plan: JSON.parse(JSON.stringify(BASE_PLAN)),
  unavailable: [],
});

/** Interviewer ids by first name and full name, for matching a dropout message. */
export function findInterviewer(text) {
  const value = String(text || '')
    .trim()
    .toLowerCase();
  if (!value) return null;
  return (
    INTERVIEWERS.find(person => person.id === value) ||
    INTERVIEWERS.find(person => person.name.toLowerCase() === value) ||
    INTERVIEWERS.find(person =>
      value.includes(person.name.split(' ')[0].toLowerCase())
    ) ||
    null
  );
}
