// Sample documents, the firm playbook and the ground-truth labels for the Blackletter demo.
// Everything here was written for this demo: the companies, funds and people are fictional,
// and the playbook is a generic illustration, not legal advice. Pure data, shared by the page
// and the API routes.

export const SEVERITY = {
  high: { label: 'High', tone: 'bad' },
  medium: { label: 'Medium', tone: 'warn' },
  low: { label: 'Low', tone: 'ok' },
};

// The playbook as a firm might first write it down: short, and vague in places. The vague
// rules are where lawyer review earns its keep.
export const PLAYBOOK = [
  {
    id: 'POOL',
    title: 'Option pool',
    severity: 'medium',
    text: 'Flag an option pool that is counted in the pre-money valuation.',
  },
  {
    id: 'LP',
    title: 'Liquidation preference',
    severity: 'high',
    text: 'Flag liquidation preferences that return more than the amount invested.',
  },
  {
    id: 'AD',
    title: 'Anti-dilution',
    severity: 'high',
    text: 'Flag price-based anti-dilution protection that is harsh on founders.',
  },
  {
    id: 'BD',
    title: 'Board control',
    severity: 'high',
    text: 'Flag investor control or influence over the board at this stage.',
  },
  {
    id: 'NS',
    title: 'Exclusivity',
    severity: 'medium',
    text: 'Flag no-shop or exclusivity periods longer than 45 days.',
  },
  {
    id: 'PR',
    title: 'Pro-rata rights',
    severity: 'medium',
    text: 'Flag pro-rata or participation rights granted without a Major Investor threshold.',
  },
  {
    id: 'MFN',
    title: 'Most favoured nation',
    severity: 'medium',
    text: 'Flag most-favoured-nation clauses in SAFE side letters.',
  },
  {
    id: 'FEES',
    title: 'Investor legal fees',
    severity: 'low',
    text: 'Flag company-paid investor legal fees above US$30,000.',
  },
  {
    id: 'NC',
    title: 'Restrictive covenants',
    severity: 'high',
    text: 'Flag post-employment restrictions on Ontario employees.',
  },
  {
    id: 'IP',
    title: 'IP assignment',
    severity: 'medium',
    text: 'Flag broad assignments of employee inventions.',
  },
  {
    id: 'TERM',
    title: 'Termination',
    severity: 'high',
    text: 'Flag termination clauses that could fall below statutory minimums.',
  },
];

export const ruleById = id => PLAYBOOK.find(rule => rule.id === id);

export const DOCS = [
  {
    id: 'seed',
    label: 'Seed term sheet',
    kind: 'Term sheet',
    title: 'Summary of terms: Series Seed Preferred Shares',
    parties: 'Larkspur Robotics Inc. (the Company) and Fernhill Ventures LP (the Lead Investor)',
    clauses: [
      {
        n: '1',
        heading: 'Offering',
        text: 'The Company will issue Series Seed Preferred Shares for aggregate proceeds of US$3,000,000 at a pre-money valuation of US$12,000,000, including an unallocated option pool equal to 10% of the post-closing fully diluted capitalization.',
      },
      {
        n: '2',
        heading: 'Liquidation preference',
        text: 'On a liquidation or sale of the Company, holders of Series Seed Preferred Shares will receive, in preference to the Common Shares, an amount equal to 1x the original purchase price plus declared but unpaid dividends. The Series Seed Preferred Shares are non-participating.',
      },
      {
        n: '3',
        heading: 'Anti-dilution',
        text: 'The conversion price of the Series Seed Preferred Shares will be adjusted on a broad-based weighted average basis if the Company issues shares at a price below the original purchase price, subject to customary exceptions.',
      },
      {
        n: '4',
        heading: 'Board of directors',
        text: 'The Board will have three directors: two elected by the holders of Common Shares and one elected by the holders of Series Seed Preferred Shares.',
      },
      {
        n: '5',
        heading: 'Pro-rata rights',
        text: 'Each Investor, regardless of the size of its investment, will have the right to purchase its pro rata share of any future equity financing of the Company.',
      },
      {
        n: '6',
        heading: 'Information rights',
        text: 'The Company will deliver annual and quarterly unaudited financial statements to each Investor holding at least 5% of the Series Seed Preferred Shares.',
      },
      {
        n: '7',
        heading: 'Expenses',
        text: 'The Company will pay the reasonable legal fees and expenses of counsel to the Lead Investor, up to a maximum of US$75,000, whether or not the financing closes.',
      },
      {
        n: '8',
        heading: 'Exclusivity',
        text: 'For 60 days from the date this term sheet is signed, the Company and the Founders will not solicit, encourage or negotiate any other offer to purchase shares or assets of the Company.',
      },
      {
        n: '9',
        heading: 'Non-binding',
        text: 'Except for the Exclusivity and Expenses sections, this term sheet is not legally binding and creates no obligation to complete the financing.',
      },
    ],
  },
  {
    id: 'series-a',
    label: 'Series A term sheet',
    kind: 'Term sheet',
    title: 'Summary of terms: Series A Preferred Shares',
    parties: 'Quillon Health Inc. (the Company) and Marrow Peak Capital (the Lead Investor)',
    clauses: [
      {
        n: '1',
        heading: 'Offering',
        text: 'The Company will issue Series A Preferred Shares for aggregate proceeds of US$9,000,000 at a pre-money valuation of US$36,000,000, including an unallocated option pool equal to 20% of the post-closing fully diluted capitalization.',
      },
      {
        n: '2',
        heading: 'Liquidation preference',
        text: 'On a liquidation or sale of the Company, holders of Series A Preferred Shares will first receive 2x the original purchase price plus accrued dividends, and will then participate with the Common Shares on an as-converted basis in the remaining proceeds.',
      },
      {
        n: '3',
        heading: 'Anti-dilution',
        text: 'If the Company issues shares below the Series A purchase price, the Series A conversion price will be reduced using a weighted average formula that counts all outstanding shares, options and convertible securities (broad-based).',
      },
      {
        n: '4',
        heading: 'Board of directors',
        text: 'The Board will have five directors: three appointed by the Lead Investor, one elected by the holders of Common Shares and one independent director chosen by the Lead Investor.',
      },
      {
        n: '5',
        heading: 'Pro-rata rights',
        text: 'Each Major Investor, being an Investor holding at least 500,000 Series A Preferred Shares, will have the right to purchase its pro rata share of future equity financings.',
      },
      {
        n: '6',
        heading: 'Expenses',
        text: 'On closing, the Company will reimburse the Lead Investor for reasonable legal fees up to US$25,000.',
      },
      {
        n: '7',
        heading: 'Exclusivity',
        text: 'For 30 days from signing, the Company will not solicit or negotiate any competing financing proposal.',
      },
      {
        n: '8',
        heading: 'Closing conditions',
        text: 'Closing is subject to satisfactory legal and financial due diligence, definitive agreements and approval of the Lead Investor\'s investment committee.',
      },
    ],
  },
  {
    id: 'safe-letter',
    label: 'SAFE side letter',
    kind: 'Side letter',
    title: 'Side letter to post-money SAFE',
    parties: 'Tidewater Labs Inc. (the Company) and Osprey Angel Fund (the Investor)',
    clauses: [
      {
        n: '1',
        heading: 'Background',
        text: 'The Investor is purchasing a post-money SAFE from the Company for US$150,000 with a post-money valuation cap of US$8,000,000 (the SAFE). This letter grants the Investor the additional rights below.',
      },
      {
        n: '2',
        heading: 'Most favoured nation',
        text: 'If the Company issues any SAFE or convertible security with terms more favourable to its holder than the SAFE, the Company will promptly notify the Investor and, at the Investor\'s election, amend the SAFE to include those terms.',
      },
      {
        n: '3',
        heading: 'Pro-rata rights',
        text: 'The Investor will have the right to purchase its pro rata share of securities sold in the Company\'s next equity financing and in every later equity financing.',
      },
      {
        n: '4',
        heading: 'Information rights',
        text: 'The Company will provide the Investor with annual financial statements and a short quarterly update on the business.',
      },
      {
        n: '5',
        heading: 'Board observer',
        text: 'The Investor may appoint one representative to attend meetings of the Board as a non-voting observer, subject to customary confidentiality and conflict exclusions.',
      },
      {
        n: '6',
        heading: 'Expenses',
        text: 'Each party will bear its own legal fees and expenses in connection with this letter and the SAFE.',
      },
      {
        n: '7',
        heading: 'Assignment',
        text: 'The Investor may not assign its rights under this letter without the Company\'s consent, except to an affiliated fund.',
      },
    ],
  },
  {
    id: 'offer-dev',
    label: 'Offer letter: developer',
    kind: 'Offer letter',
    title: 'Offer of employment: Senior Software Developer',
    parties: 'Juniper Freight Systems Inc., Toronto, Ontario (the Company) and Maya Thibault',
    clauses: [
      {
        n: '1',
        heading: 'Position',
        text: 'You will be employed as a Senior Software Developer, reporting to the Vice President, Engineering, working from the Company\'s Toronto, Ontario office.',
      },
      {
        n: '2',
        heading: 'Compensation',
        text: 'Your base salary will be CAD$145,000 per year. Subject to Board approval, you will be granted options to purchase 12,000 Common Shares vesting over four years with a one-year cliff.',
      },
      {
        n: '3',
        heading: 'Intellectual property',
        text: 'You assign to the Company all inventions, works and ideas that you create during your employment, whether or not created during working hours, using Company resources or related to the Company\'s business.',
      },
      {
        n: '4',
        heading: 'Confidentiality',
        text: 'You will keep the Company\'s confidential information confidential during and after your employment.',
      },
      {
        n: '5',
        heading: 'Non-competition',
        text: 'For 12 months after your employment ends, you will not work for or hold an interest in any business in Canada that competes with the Company.',
      },
      {
        n: '6',
        heading: 'Non-solicitation',
        text: 'For 12 months after your employment ends, you will not solicit the Company\'s employees, or the customers you dealt with in your last year of employment.',
      },
      {
        n: '7',
        heading: 'Termination',
        text: 'The Company may terminate your employment at any time without cause by providing two weeks\' notice or pay in lieu of notice, which you agree is your full entitlement.',
      },
    ],
  },
  {
    id: 'offer-exec',
    label: 'Offer letter: executive',
    kind: 'Offer letter',
    title: 'Offer of employment: Chief Operating Officer',
    parties: 'Harrowgate Energy Software Inc., Toronto, Ontario (the Company) and Daniel Whitcombe',
    clauses: [
      {
        n: '1',
        heading: 'Position',
        text: 'You will be employed as Chief Operating Officer, an executive officer of the Company reporting to the Chief Executive Officer, based in Toronto, Ontario.',
      },
      {
        n: '2',
        heading: 'Compensation',
        text: 'Your base salary will be CAD$260,000 per year with a target annual bonus of 30% of base salary. You will be granted options to purchase 180,000 Common Shares vesting over four years.',
      },
      {
        n: '3',
        heading: 'Intellectual property',
        text: 'You assign to the Company all inventions and works that you create in the course of your employment or that relate to the Company\'s business.',
      },
      {
        n: '4',
        heading: 'Non-competition',
        text: 'For 12 months after your employment ends, you will not act as an executive of a business in Canada that competes directly with the Company.',
      },
      {
        n: '5',
        heading: 'Termination',
        text: 'The Company may terminate your employment without cause by providing the greater of six months\' notice or pay in lieu, and your minimum entitlements under the Employment Standards Act, 2000.',
      },
      {
        n: '6',
        heading: 'Outside activities',
        text: 'You will devote your full working time to the Company and will not join an outside board without the consent of the Chief Executive Officer.',
      },
    ],
  },
];

export const docById = id => DOCS.find(doc => doc.id === id);

// Ground truth: the (rule, clause) pairs a careful lawyer applying the firm's real position
// would flag. Anything else the agent flags counts as a false positive. Written before any
// model run and not tuned to model output.
export const LABELS = {
  seed: [
    { rule: 'PR', clause: '5', why: 'Pro-rata to every investor, no Major Investor threshold' },
    { rule: 'FEES', clause: '7', why: 'US$75,000 fee cap, payable even if the deal does not close' },
    { rule: 'NS', clause: '8', why: '60-day no-shop' },
  ],
  'series-a': [
    { rule: 'POOL', clause: '1', why: '20% pool in the pre-money, above the 15% the firm accepts' },
    { rule: 'LP', clause: '2', why: '2x participating preference' },
    { rule: 'BD', clause: '4', why: 'Lead investor appoints or chooses four of five directors' },
  ],
  'safe-letter': [
    { rule: 'MFN', clause: '2', why: 'Open-ended MFN on any later convertible' },
    { rule: 'PR', clause: '3', why: 'Perpetual pro-rata on a US$150,000 cheque' },
  ],
  'offer-dev': [
    { rule: 'IP', clause: '3', why: 'Captures inventions unrelated to the business, on own time' },
    { rule: 'NC', clause: '5', why: 'Non-compete for a non-executive Ontario employee' },
    { rule: 'TERM', clause: '7', why: 'Two weeks as full entitlement can fall below the statutory minimum' },
  ],
  'offer-exec': [],
};

export const LABEL_COUNT = Object.values(LABELS).reduce((sum, list) => sum + list.length, 0);

// One-line reasons a lawyer might give when rejecting a common false positive. Offered as a
// "sample reason" shortcut next to the reason field; the visitor can type their own.
export const SAMPLE_REASONS = {
  'seed:POOL:1': 'A 10% pool in the pre-money is market at seed. Flag only above 15%.',
  'seed:LP:2': '1x plus declared dividends, non-participating, is market. Flag only above 1x or any participation.',
  'seed:AD:3': 'Broad-based weighted average is market. Flag only full ratchet or narrow-based.',
  'seed:BD:4': 'One investor seat on a founder-controlled board is not investor control.',
  'series-a:AD:3': 'Broad-based weighted average is market. Flag only full ratchet or narrow-based.',
  'series-a:PR:5': 'This clause has a Major Investor threshold. Nothing to flag.',
  'offer-exec:TERM:5': 'The greater of six months and the statutory minimums cannot fall below the statute.',
  'safe-letter:BD:5': 'A non-voting observer seat is not board control.',
  'offer-dev:NC:6': 'A non-solicit is fine. Flag only non-competition covenants.',
  'offer-exec:NC:4': 'Ontario exempts C-suite executives from the non-compete ban. Do not flag for executive officers.',
  'offer-exec:IP:3': 'Limited to work in the course of employment or the business: that is our standard.',
};

export const GENERIC_REASONS = [
  'Market standard, not an issue for this client.',
  'The rule does not apply to this clause.',
];

export const DISCLAIMER = 'Sample documents written for this demo. Fictional parties. Not legal advice.';
