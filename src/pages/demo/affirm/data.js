// Sample data for the Affirm demo: one fictional lender (Fernway Pay), one signed-in customer and her
// buy-now-pay-later loans, the servicing policy the tools enforce, and small formatting helpers.
// Nothing here is Affirm's data or Affirm's policy. Plain JS: the API routes and the page both use it.

export const LENDER = { name: 'Fernway Pay', short: 'Fernway' };

/** "Today" is fixed so eligibility windows and due dates are reproducible. */
export const TODAY = '2026-11-17';
export const TODAY_LABEL = 'Tuesday, November 17, 2026';
export const TZ_LABEL = 'Toronto time';

export const CUSTOMER = {
  id: 'C-20418',
  name: 'Maya Chen',
  first: 'Maya',
  city: 'Toronto, ON',
  since: '2024-03',
  email: 'maya.chen@example.com',
  // Full numbers live only here; every tool masks them before the model sees anything.
  accountNumber: 'FW-7731-0042-2041',
};

const monthly = (start, count, amount, paidCount) =>
  Array.from({ length: count }, (_, index) => {
    const [y, m, d] = start.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + index, d));
    return {
      n: index + 1,
      due: date.toISOString().slice(0, 10),
      amount,
      status: index < paidCount ? 'paid' : 'scheduled',
    };
  });

export const LOANS = [
  {
    id: 'L-4471',
    merchant: 'Northfield Fitness',
    item: 'Rowing machine',
    plan: 'monthly',
    planLabel: '12 monthly payments',
    total: 1440,
    installment: 120,
    count: 12,
    dueDay: 12,
    status: 'current',
    opened: '2026-07-12',
    autopay: true,
    method: { kind: 'Visa', number: '4000 1234 5678 4421' },
    missedLast6m: 0,
    dueDayChangesLast12m: 0,
    schedule: monthly('2026-08-12', 12, 120, 4),
    charges: [
      { id: 'CH-61204', date: '2026-08-12', time: '06:02', amount: 120, for: 'Payment 1 of 12', status: 'posted' },
      { id: 'CH-66518', date: '2026-09-12', time: '06:01', amount: 120, for: 'Payment 2 of 12', status: 'posted' },
      { id: 'CH-71833', date: '2026-10-12', time: '06:03', amount: 120, for: 'Payment 3 of 12', status: 'posted' },
      { id: 'CH-87420', date: '2026-11-12', time: '06:02', amount: 120, for: 'Payment 4 of 12', status: 'posted' },
    ],
  },
  {
    id: 'L-5108',
    merchant: 'Circuit & Co.',
    item: 'Laptop',
    plan: 'pay_in_4',
    planLabel: 'Pay in 4, every 2 weeks',
    total: 1299.96,
    installment: 324.99,
    count: 4,
    dueDay: null,
    status: 'current',
    opened: '2026-10-27',
    autopay: true,
    method: { kind: 'Debit', number: '4520 9910 3388 0937' },
    missedLast6m: 0,
    dueDayChangesLast12m: 0,
    schedule: [
      { n: 1, due: '2026-10-27', amount: 324.99, status: 'paid' },
      { n: 2, due: '2026-11-10', amount: 324.99, status: 'paid' },
      { n: 3, due: '2026-11-24', amount: 324.99, status: 'scheduled' },
      { n: 4, due: '2026-12-08', amount: 324.99, status: 'scheduled' },
    ],
    charges: [
      { id: 'CH-77310', date: '2026-10-27', time: '14:41', amount: 324.99, for: 'Payment 1 of 4 (at checkout)', status: 'posted' },
      { id: 'CH-88121', date: '2026-11-10', time: '09:14', amount: 324.99, for: 'Payment 2 of 4', status: 'posted' },
      { id: 'CH-88122', date: '2026-11-10', time: '09:15', amount: 324.99, for: 'Payment 2 of 4', status: 'posted' },
    ],
  },
  {
    id: 'L-3920',
    merchant: 'Hearth & Home',
    item: 'Sofa',
    plan: 'monthly',
    planLabel: '6 monthly payments',
    total: 900,
    installment: 150,
    count: 6,
    dueDay: 3,
    status: 'paid_off',
    opened: '2025-11-03',
    autopay: false,
    method: { kind: 'Visa', number: '4000 1234 5678 4421' },
    missedLast6m: 0,
    dueDayChangesLast12m: 0,
    schedule: monthly('2025-12-03', 6, 150, 6),
    charges: [],
  },
];

/**
 * Servicing policy, as the tools read it. check_policy returns these rules; the eligibility
 * checks in agent.js enforce the due-date ones in code.
 */
export const POLICY = {
  due_date_change: {
    title: 'Changing a due date',
    rules: [
      'Monthly plans only. Pay in 4 schedules are fixed at two weeks apart.',
      'The loan is current: no missed or late payment in the last 6 months.',
      'One due-date change per loan in any 12 months.',
      'The new due day is between the 1st and the 28th.',
      'The next payment moves at most 21 days later.',
      'No fee, and the number and amount of payments stay the same.',
      'If the customer names a payday, suggest a due day 1 or 2 days after it.',
      'The customer confirms before the change is applied.',
    ],
  },
  duplicate_charge: {
    title: 'A charge the customer thinks is wrong',
    rules: [
      'Two posted charges for the same payment can be disputed in chat with open_payment_dispute.',
      'Pending charges usually drop off in 3 to 5 business days and cannot be disputed yet.',
      'A disputes specialist reviews every dispute within 5 business days.',
      'The agent never promises a refund: the specialist decides.',
      'Always offer the customer a person for disputes.',
    ],
  },
  hardship: {
    title: 'Hardship (job loss, illness, lower income)',
    rules: [
      'Hardship requests always go to a hardship specialist.',
      'The agent can describe the options a specialist may offer, but cannot approve them or promise an outcome.',
      'Options, each subject to review: pause one payment for up to 30 days; spread the balance over more, smaller payments; move a due date (self-serve if eligible).',
      'Be kind and plain. No pressure to pay, no judgement.',
    ],
  },
  general: {
    title: 'Every conversation',
    rules: [
      'Use tools for every fact about the customer’s loans.',
      'Show the last 4 digits of any card or account number, never more.',
      'No credit, credit-score, APR or financial advice.',
      'No promises beyond what policy and tool results allow.',
    ],
  },
};

export const POLICY_TOPICS = Object.keys(POLICY);

// --- formatting ---------------------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-12-21' -> 'Dec 21' (or 'Dec 21, 2026' with year). */
export function fmtDate(iso, { year = false } = {}) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}${year ? `, ${y}` : ''}`;
}

/** 12 -> '12th', 21 -> '21st'. */
export function ordinal(day) {
  const n = Number(day);
  const suffix =
    n % 100 >= 11 && n % 100 <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
  return `${n}${suffix}`;
}

/** 324.99 -> '$324.99' (CAD). */
export function money(amount) {
  return `$${Number(amount).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** '4000 1234 5678 4421' -> '•••• 4421'. */
export function maskNumber(number) {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `•••• ${digits.slice(-4)}` : '';
}

export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86400000);
}

/** The same day of month in the month of `iso` (clamped to the 28th by policy). */
export function withDay(iso, day) {
  return `${iso.slice(0, 8)}${String(day).padStart(2, '0')}`;
}

export const loanById = id => LOANS.find(loan => loan.id === id);
export const activeLoans = () => LOANS.filter(loan => loan.status !== 'paid_off');
