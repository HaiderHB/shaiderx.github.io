// Sample data for the Vena demo: a standard chart of accounts, a messy trial-balance export from a
// fictional mid-size SaaS company's ERP, and a hand-made ground-truth mapping for the eval panel.
// Pure data, safe to import from API routes.

/** Statement sections in display order. */
export const TYPES = [
  { id: 'asset', label: 'Assets', statement: 'bs', normal: 'debit' },
  { id: 'liability', label: 'Liabilities', statement: 'bs', normal: 'credit' },
  { id: 'equity', label: 'Equity', statement: 'bs', normal: 'credit' },
  { id: 'revenue', label: 'Revenue', statement: 'pl', normal: 'credit' },
  { id: 'cogs', label: 'COGS', statement: 'pl', normal: 'debit' },
  { id: 'opex', label: 'OpEx', statement: 'pl', normal: 'debit' },
];

export const typeById = id => TYPES.find(type => type.id === id);

/**
 * The standard chart of accounts every row is mapped onto. `normal` is the side a balance
 * normally sits on (contra accounts flip it); `hint` is what the decision model reads.
 */
export const COA = [
  { id: 'A.cash', type: 'asset', group: 'Current assets', name: 'Cash and equivalents', normal: 'debit', hint: 'Bank accounts, money market funds, cash sweeps' },
  { id: 'A.ar', type: 'asset', group: 'Current assets', name: 'Accounts receivable', normal: 'debit', hint: 'Amounts customers owe, trade receivables, including old or aged balances' },
  { id: 'A.allow', type: 'asset', group: 'Current assets', name: 'Allowance for doubtful accounts', normal: 'credit', contra: true, hint: 'Contra asset: reserve against receivables that may not be collected' },
  { id: 'A.prepaid', type: 'asset', group: 'Current assets', name: 'Prepaid expenses', normal: 'debit', hint: 'Expenses paid in advance: insurance, software licences, rent' },
  { id: 'A.contract', type: 'asset', group: 'Current assets', name: 'Deferred contract costs', normal: 'debit', hint: 'Capitalised costs to obtain a contract, such as deferred sales commissions' },
  { id: 'A.ppe', type: 'asset', group: 'Non-current assets', name: 'Property and equipment', normal: 'debit', hint: 'Computers, furniture, leasehold improvements at cost' },
  { id: 'A.accdep', type: 'asset', group: 'Non-current assets', name: 'Accumulated depreciation', normal: 'credit', contra: true, hint: 'Contra asset: depreciation built up against property and equipment' },
  { id: 'A.software', type: 'asset', group: 'Non-current assets', name: 'Capitalized software', normal: 'debit', hint: 'Internal-use or product software development costs capitalised as an asset' },
  { id: 'L.ap', type: 'liability', group: 'Current liabilities', name: 'Accounts payable', normal: 'credit', hint: 'Amounts owed to vendors and suppliers' },
  { id: 'L.accrued', type: 'liability', group: 'Current liabilities', name: 'Accrued expenses', normal: 'credit', hint: 'Expenses incurred but not yet invoiced or paid, miscellaneous accruals' },
  { id: 'L.payroll', type: 'liability', group: 'Current liabilities', name: 'Accrued payroll and benefits', normal: 'credit', hint: 'Wages, bonuses, payroll taxes and benefits owed to employees' },
  { id: 'L.tax', type: 'liability', group: 'Current liabilities', name: 'Taxes payable', normal: 'credit', hint: 'Sales tax, VAT, income tax owed to governments' },
  { id: 'L.deferred', type: 'liability', group: 'Current liabilities', name: 'Deferred revenue', normal: 'credit', hint: 'Customer billings collected before the service is delivered: annual or multi-year prepaid subscriptions' },
  { id: 'L.related', type: 'liability', group: 'Non-current liabilities', name: 'Due to related parties', normal: 'credit', hint: 'Amounts owed to a parent company, affiliate or shareholder' },
  { id: 'L.debt', type: 'liability', group: 'Non-current liabilities', name: 'Debt and credit lines', normal: 'credit', hint: 'Bank loans, lines of credit, notes payable' },
  { id: 'E.capital', type: 'equity', group: 'Equity', name: 'Common stock and APIC', normal: 'credit', hint: 'Share capital and additional paid-in capital from investors' },
  { id: 'E.re', type: 'equity', group: 'Equity', name: 'Retained earnings (deficit)', normal: 'credit', hint: 'Accumulated profits or losses from prior periods' },
  { id: 'R.subs', type: 'revenue', group: 'Revenue', name: 'Subscription and usage revenue', normal: 'credit', hint: 'Recurring software subscription fees and usage or overage charges earned from customers' },
  { id: 'R.services', type: 'revenue', group: 'Revenue', name: 'Professional services revenue', normal: 'credit', hint: 'Implementation, consulting and training fees earned from customers' },
  { id: 'R.contra', type: 'revenue', group: 'Revenue', name: 'Discounts and refunds', normal: 'debit', contra: true, hint: 'Contra revenue: sales discounts, credits and refunds given to customers' },
  { id: 'R.other', type: 'revenue', group: 'Other income', name: 'Interest and other income', normal: 'credit', hint: 'Interest earned on cash, gains and other non-operating income' },
  { id: 'C.hosting', type: 'cogs', group: 'Cost of revenue', name: 'Hosting and data costs', normal: 'debit', hint: 'Cloud hosting, infrastructure and third-party data used to deliver the product' },
  { id: 'C.support', type: 'cogs', group: 'Cost of revenue', name: 'Support and delivery staff', normal: 'debit', hint: 'Customer support and services delivery salaries' },
  { id: 'O.sm', type: 'opex', group: 'Operating expenses', name: 'Sales and marketing', normal: 'debit', hint: 'Sales and marketing salaries, commissions expense, advertising' },
  { id: 'O.rd', type: 'opex', group: 'Operating expenses', name: 'Research and development', normal: 'debit', hint: 'Engineering and product salaries, research and development' },
  { id: 'O.ga', type: 'opex', group: 'Operating expenses', name: 'General and administrative', normal: 'debit', hint: 'Rent, facilities, legal, audit, finance, internal software tools the company pays for' },
  { id: 'O.da', type: 'opex', group: 'Operating expenses', name: 'Depreciation and amortization', normal: 'debit', hint: 'Depreciation and amortisation expense for the period' },
];

export const coaById = id => COA.find(account => account.id === id);

export const SAMPLE_NAME = 'larkspur_tb_oct2026.csv';
export const SAMPLE_COMPANY = 'Larkspur Cloud Inc.';

// The export as the ERP wrote it: a title line, uneven spacing and case, amounts as text with and
// without thousands separators. Traps: line 39 duplicates line 38, two contra accounts sit on the
// "wrong" side for their section (lines 8 and 13), retained earnings carries a debit (an
// accumulated deficit) and "Consulting" could be revenue or a fee paid until the sign is read.
export const SAMPLE_CSV = `Larkspur Cloud Inc. - Trial Balance - Period 10/2026 (USD),,,,,
Acct,Description,Period,Debit,Credit,Curr
1000,Cash - Operating (SVB),10/2026,"4,812,330.17",,USD
1020,Money mkt sweep,10/2026,6250000.00,,USD
1100,AR - Trade,10/2026,"3,184,220.40",,USD
1105,AR - Trade (old),10/2026,"41,870.00",,USD
1110,Allow for doubtful accts,10/2026,,"96,400.00",USD
1200,Prepaid exp - insurance,10/2026,148300,,USD
1210,Prepd software lic,10/2026,"226,915.55",,USD
1250,Deferred commissions,10/2026,"1,120,480.00",,USD
1500,Computer equip,10/2026,"684,200.00",,USD
1590,Accum depr - equip,10/2026,,"402,615.00",USD
1700,Cap software dev costs,10/2026,"1,450,000.00",,USD
2000,AP - trade,10/2026,,"712,408.92",USD
2100,Accrued liab misc,10/2026,,"268,110.00",USD
2110,Accrued payroll & bonus,10/2026,,905000.00,USD
2150,Sales tax payable,10/2026,,"58,233.10",USD
2200,Deferred rev - annual,10/2026,,"5,940,000.00",USD
2210,Deferred rev - multi yr,10/2026,,"1,215,500.00",USD
2300,Due to Parent co,10/2026,,"2,500,000.00",USD
2500,LOC - SVB,10/2026,,"1,000,000.00",USD
3000,Common stock,10/2026,,"1,200.00",USD
3100,APIC,10/2026,,"18,400,000.00",USD
3900,Retained earnings,10/2026,"15,444,050.90",,USD
4000,SaaS subs rev,10/2026,,"16,850,000.00",USD
4010,Usage / overage rev,10/2026,,"1,240,000.00",USD
4100,Consulting,10/2026,,"920,000.00",USD
4900,Sales discounts & refunds,10/2026,"315,400.00",,USD
5000,AWS hosting,10/2026,"2,410,000.00",,USD
5100,Cust support salaries,10/2026,"1,380,000.00",,USD
5200,3rd party data feeds,10/2026,"465,000.00",,USD
6000,S&M salaries,10/2026,"3,950,000.00",,USD
6050,Commissions exp,10/2026,"1,140,000.00",,USD
6100,R&D salaries,10/2026,"5,620,000.00",,USD
6200,SaaS subs exp,10/2026,"612,300.00",,USD
6300,Rent & facilities,10/2026,"840,000.00",,USD
6400,Depr exp,10/2026,"186,400.00",,USD
6500,Prof fees - legal/audit,10/2026,"410,000.00",,USD
6500,Prof fees - legal/audit,10/2026,"410,000.00",,USD
7000,Interest inc,10/2026,,"182,000.00",USD
`;

/**
 * Hand-made ground truth for the sample, by account code (the duplicate shares its original's
 * answer). Written before any model run and never edited to match one.
 */
export const GROUND_TRUTH = {
  1000: 'A.cash',
  1020: 'A.cash',
  1100: 'A.ar',
  1105: 'A.ar',
  1110: 'A.allow',
  1200: 'A.prepaid',
  1210: 'A.prepaid',
  1250: 'A.contract',
  1500: 'A.ppe',
  1590: 'A.accdep',
  1700: 'A.software',
  2000: 'L.ap',
  2100: 'L.accrued',
  2110: 'L.payroll',
  2150: 'L.tax',
  2200: 'L.deferred',
  2210: 'L.deferred',
  2300: 'L.related',
  2500: 'L.debt',
  3000: 'E.capital',
  3100: 'E.capital',
  3900: 'E.re',
  4000: 'R.subs',
  4010: 'R.subs',
  4100: 'R.services',
  4900: 'R.contra',
  5000: 'C.hosting',
  5100: 'C.support',
  5200: 'C.hosting',
  6000: 'O.sm',
  6050: 'O.sm',
  6100: 'O.rd',
  6200: 'O.ga',
  6300: 'O.ga',
  6400: 'O.da',
  6500: 'O.ga',
  7000: 'R.other',
};

/** A second, smaller export in another ERP's shape (one signed balance column), for the paste box. */
export const PASTE_EXAMPLE = `GL Account,Account Name,Balance,Currency,Period
11000,Operating cash - Chase,1840220.15,USD,2026-10
12000,Trade receivables,962400.00,USD,2026-10
12900,Bad debt reserve,-38500.00,USD,2026-10
15000,Laptops & servers,212800.00,USD,2026-10
15900,Accum. depreciation,-97300.00,USD,2026-10
21000,Vendor payables,-284115.60,USD,2026-10
24000,Unearned subscription rev,-1504000.00,USD,2026-10
31000,Paid-in capital,-3000000.00,USD,2026-10
39000,Accumulated deficit,2100000.00,USD,2026-10
41000,Subscription revenue,-2216000.00,USD,2026-10
42000,Implementation fees,-188000.00,USD,2026-10
51000,Cloud infrastructure,402510.00,USD,2026-10
61000,Marketing programs,515700.00,USD,2026-10
62000,Engineering payroll,1188000.00,USD,2026-10
63000,Office lease,124900.00,USD,2026-10
71000,Bank interest,-18614.55,USD,2026-10
`;
