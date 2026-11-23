// Sample data for the CoinTracker demo: one made-up household and its year-to-date tax documents.
// Pure JS, shared by the page and the API routes. Every name, number and account here is invented.
//
// It is November, so the file is built from year-to-date drafts (a W-2 projected from the last pay
// stub, year-to-date 1099 drafts from the broker, the crypto gains export). Final forms replace them in
// January; the point of starting now is the year-end moves that are only possible before Dec 31.

export const TAX_YEAR = 2026;
export const AS_OF = '2026-11-18';

/** 2026 limits and the rough rates the agent uses for estimates (not tax advice). */
export const LIMITS = { k401: 24500 };
export const RATES = { ordinary: 0.22, longTerm: 0.15 };

export const HOUSEHOLD = {
  name: 'The Reyes household',
  people: 'Maya and Daniel Reyes, two kids (9 and 6)',
  filingStatus: 'Married filing jointly',
  state: 'Colorado',
};

/** What the household told us at intake (not a document; the agent reads it as context). */
export const INTAKE = {
  filingStatus: 'Married filing jointly',
  dependents: 'Two kids, ages 9 and 6',
  job: 'Maya: product designer at Brightline Health (W-2). Daniel: at home, manages the rental and the crypto.',
  accounts: [
    'Harbor Brokerage taxable account',
    'Lakeside Bank high-yield savings (last year’s 1099-INT: $1,840 of interest)',
    'Crypto on two exchanges, exported to one gains file',
    'Brightline Health 401(k) (Maya)',
  ],
  home: 'Own their home, Lakeside Mortgage',
  rental: '412 Alder St, rented all year at $2,150 a month',
  note: 'Replaced the rental’s roof in June: $7,800, paid to Summit Roofing.',
};

/**
 * The figures behind every document. The documents are rendered from these, so code always knows
 * what the agent should have read (the extraction check compares against them). Visitors can edit
 * the four in EDITABLE and re-run the agent live.
 */
export const FIGURES = {
  w2: {
    employer: 'Brightline Health',
    employee: 'Maya Reyes',
    wagesYtd: 168000,
    federalWithheldYtd: 27300,
    k401DeferralYtd: 14700,
    k401PerPaycheck: 700,
    payPeriodsPaid: 21,
    payPeriodsYear: 24,
  },
  brokerage: { broker: 'Harbor Brokerage', proceeds: 48200, costBasis: 38840, shortTermGain: 1120, longTermGain: 8240 },
  dividends: { broker: 'Harbor Brokerage', ordinary: 2310, qualified: 1980, capitalGainDistributions: 410 },
  crypto: {
    realizedShortTerm: -1450,
    realizedLongTerm: 6800,
    lots: [
      { lotId: 'SOL-3', asset: 'SOL', quantity: 40, acquired: '2026-02-11', costBasis: 9800, marketValue: 5600 },
      { lotId: 'BTC-1', asset: 'BTC', quantity: 0.25, acquired: '2023-06-02', costBasis: 6650, marketValue: 23400 },
      { lotId: 'ETH-2', asset: 'ETH', quantity: 3, acquired: '2025-08-20', costBasis: 6300, marketValue: 9450 },
    ],
  },
  mortgage: { lender: 'Lakeside Mortgage', mortgageInterest: 13650, propertyTax: 5900 },
  roofCost: 7800,
};

/** The four figures a visitor can change before a live re-run. */
export const EDITABLE = [
  { id: 'solValue', label: 'SOL lot, value today', unit: '$', min: 0, max: 50000 },
  { id: 'solBasis', label: 'SOL lot, cost basis', unit: '$', min: 1, max: 50000 },
  { id: 'k401Ytd', label: '401(k) deferred so far', unit: '$', min: 0, max: 24500 },
  { id: 'roofCost', label: 'Rental roof, cost', unit: '$', min: 0, max: 60000 },
];

export const editableValues = figures => ({
  solValue: figures.crypto.lots[0].marketValue,
  solBasis: figures.crypto.lots[0].costBasis,
  k401Ytd: figures.w2.k401DeferralYtd,
  roofCost: figures.roofCost,
});

/** FIGURES with the visitor's edits applied (numbers clamped to their ranges). */
export function withEdits(edits) {
  const figures = JSON.parse(JSON.stringify(FIGURES));
  if (!edits) return figures;
  const num = (id, fallback) => {
    const spec = EDITABLE.find(entry => entry.id === id);
    const value = Math.round(Number(edits[id]));
    return Number.isFinite(value) ? Math.min(spec.max, Math.max(spec.min, value)) : fallback;
  };
  const sol = figures.crypto.lots[0];
  sol.marketValue = num('solValue', sol.marketValue);
  sol.costBasis = num('solBasis', sol.costBasis);
  figures.w2.k401DeferralYtd = num('k401Ytd', figures.w2.k401DeferralYtd);
  figures.roofCost = num('roofCost', figures.roofCost);
  return figures;
}

/** The interest form the household uploads at the handoff (the sample file). */
export const SAMPLE_1099INT = { payer: 'Lakeside Bank', recipient: 'Maya and Daniel Reyes', interest: 1912, earlyWithdrawalPenalty: 0 };

const usd = value =>
  `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Documents on file, rendered as the text the agent reads. */
export const DOCUMENTS = [
  { id: 'w2', form: 'W-2', title: 'Brightline Health', sub: 'Projected from the Nov 14 pay stub' },
  { id: 'b1099', form: '1099-B', title: 'Harbor Brokerage', sub: 'Year-to-date draft' },
  { id: 'div1099', form: '1099-DIV', title: 'Harbor Brokerage', sub: 'Year-to-date draft' },
  { id: 'crypto', form: 'Gains export', title: 'Crypto, two exchanges', sub: 'Through Nov 18' },
  { id: 'm1098', form: '1098', title: 'Lakeside Mortgage', sub: 'Lender’s year-to-date statement' },
];

export function documentText(id, figures = FIGURES) {
  const { w2, brokerage: b, dividends: d, crypto: c, mortgage: m } = figures;
  switch (id) {
    case 'w2':
      return [
        `FORM W-2 (PROJECTED FROM PAY STUB) · TAX YEAR ${TAX_YEAR}`,
        `Employer: ${w2.employer}   Employee: ${w2.employee}`,
        `Pay periods paid: ${w2.payPeriodsPaid} of ${w2.payPeriodsYear} (semi-monthly)`,
        `Box 1  Wages, tips, other comp (YTD) ........ ${usd(w2.wagesYtd)}`,
        `Box 2  Federal income tax withheld (YTD) .... ${usd(w2.federalWithheldYtd)}`,
        `Box 12 D  401(k) elective deferrals (YTD) ... ${usd(w2.k401DeferralYtd)}`,
        `401(k) election per paycheck ................ ${usd(w2.k401PerPaycheck)}`,
      ].join('\n');
    case 'b1099':
      return [
        `FORM 1099-B · YEAR-TO-DATE DRAFT · ${b.broker}`,
        `1d Proceeds ................................ ${usd(b.proceeds)}`,
        `1e Cost basis .............................. ${usd(b.costBasis)}`,
        `Short-term gain (box A) .................... ${usd(b.shortTermGain)}`,
        `Long-term gain (box D) ..................... ${usd(b.longTermGain)}`,
      ].join('\n');
    case 'div1099':
      return [
        `FORM 1099-DIV · YEAR-TO-DATE DRAFT · ${d.broker}`,
        `1a Total ordinary dividends ................ ${usd(d.ordinary)}`,
        `1b Qualified dividends ..................... ${usd(d.qualified)}`,
        `2a Total capital gain distributions ........ ${usd(d.capitalGainDistributions)}`,
      ].join('\n');
    case 'crypto':
      return [
        `CRYPTO GAINS EXPORT · ${TAX_YEAR} THROUGH ${AS_OF}`,
        `Realized short-term gain/loss .............. ${usd(c.realizedShortTerm)}`,
        `Realized long-term gain/loss ............... ${usd(c.realizedLongTerm)}`,
        'Open lots:',
        ...c.lots.map(
          lot =>
            `  ${lot.lotId}  ${lot.quantity} ${lot.asset}  acquired ${lot.acquired}  basis ${usd(lot.costBasis)}  value today ${usd(
              lot.marketValue
            )}`
        ),
      ].join('\n');
    case 'm1098':
      return [
        `FORM 1098 · LENDER YEAR-TO-DATE STATEMENT · ${m.lender}`,
        'Property: primary residence',
        `1  Mortgage interest received ............. ${usd(m.mortgageInterest)}`,
        `10 Property tax paid from escrow .......... ${usd(m.propertyTax)}`,
      ].join('\n');
    case 'int1099':
      return [
        `FORM 1099-INT · ${SAMPLE_1099INT.payer}`,
        `Recipient: ${SAMPLE_1099INT.recipient}`,
        `1  Interest income ........................ ${usd(SAMPLE_1099INT.interest)}`,
        `2  Early withdrawal penalty ............... ${usd(SAMPLE_1099INT.earlyWithdrawalPenalty)}`,
      ].join('\n');
    default:
      return '';
  }
}

/** What a complete file needs for this household, and why each item is on the list. */
export const CHECKLIST = [
  { id: 'w2', label: 'W-2 for each job', because: 'Maya works at Brightline Health' },
  { id: 'b1099', label: '1099-B for the brokerage', because: 'Sales in the Harbor account' },
  { id: 'div1099', label: '1099-DIV for the brokerage', because: 'Dividends in the Harbor account' },
  { id: 'crypto', label: 'Crypto gains export', because: 'Trades on two exchanges' },
  { id: 'm1098', label: '1098 mortgage interest', because: 'They own their home' },
  { id: 'int1099', label: '1099-INT from Lakeside Bank', because: 'Last year’s return had $1,840 of interest' },
  { id: 'rental', label: 'Rental expense summary', because: '412 Alder St was rented all year' },
];

/** The simulated broker account the harvest sells from (cash and the three crypto lots). */
export const BROKER_START = {
  cash: 1250,
  lots: Object.fromEntries(FIGURES.crypto.lots.map(lot => [lot.lotId, { asset: lot.asset, quantity: lot.quantity }])),
};

export const PAYROLL_START = { k401PerPaycheck: FIGURES.w2.k401PerPaycheck };
