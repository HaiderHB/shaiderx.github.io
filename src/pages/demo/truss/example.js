// Example runs shown without a demo key (preview mode) and on first load.
// PLACEHOLDER: replaced by outputs recorded from live runs on the deployed preview (see README).
// Only model outputs are stored here: the vision model's JSON per invoice image, the decision
// model's answer per check state and the reviewer note. The checks, the rules floor and the
// payment endpoint re-run in the browser on the same code the API uses. Never edit by hand.

export const EXAMPLE_META = {
  recorded: '2026-11-17',
  vision: 'gemini-3.5-flash-lite',
  llm: 'deepseek/deepseek-v3.2',
  placeholder: true,
};

const northlineRaw = {
  vendorName: 'NORTHLINE ELECTRIC LTD.',
  vendorTaxId: '81234 5678 RT0001',
  vendorPhone: '905-555-0142',
  invoiceNumber: 'INV-NE-1187',
  invoiceDate: '2026-11-12',
  dueDate: '2026-12-12',
  terms: 'Net 30',
  poNumber: 'PO-2291',
  billingRef: 'Progress billing #4',
  currency: 'CAD',
  lines: [
    { description: 'Electrical rough-in, Level 3 (suites 301-318)', quantity: 1, unit: 'LS', unitPrice: 18400, amount: 18400 },
    { description: 'Panelboards, supply and install, Level 3', quantity: 2, unit: 'ea', unitPrice: 3150, amount: 6300 },
    { description: 'Conduit and boxes, corridors L3-L4', quantity: 640, unit: 'm', unitPrice: 12.5, amount: 8000 },
    { description: 'Temporary lighting, Levels 2-4', quantity: 1, unit: 'LS', unitPrice: 2600, amount: 2600 },
    { description: 'Fire alarm device rough-in, Level 3', quantity: 48, unit: 'ea', unitPrice: 68.75, amount: 3300 },
  ],
  subtotal: 38600,
  taxPercent: 13,
  taxAmount: 5018,
  total: 43618,
  retainagePercent: 10,
  retainageAmount: 3860,
  amountDue: 39758,
  remitTo: { accountName: 'Northline Electric Ltd.', bankName: 'Maple Shore Bank', institution: '612', transit: '10392', account: '5084471' },
  bankChangeNotice: false,
  lienWaiver: true,
};

const keystoneRaw = {
  vendorName: 'Keystone Drywall Inc.',
  vendorTaxId: '79011 2334 RT0001',
  vendorPhone: '905-555-0177',
  invoiceNumber: 'INV-KD-0412',
  invoiceDate: '2026-10-02',
  dueDate: '2026-11-01',
  terms: 'Net 30',
  poNumber: 'PO-2304',
  billingRef: 'Draw #2',
  currency: 'CAD',
  lines: [
    { description: 'Gypsum board walls, Level 2', quantity: 1850, unit: 'm²', unitPrice: 9.4, amount: 17390 },
    { description: 'Ceiling bulkheads, Level 2 corridors', quantity: 1, unit: 'LS', unitPrice: 4200, amount: 4200 },
    { description: 'Taping, mudding and sanding, Level 2', quantity: 1, unit: 'LS', unitPrice: 3110, amount: 3110 },
  ],
  subtotal: 24700,
  taxPercent: 13,
  taxAmount: 3211,
  total: 27911,
  retainagePercent: 10,
  retainageAmount: 2470,
  amountDue: 25441,
  remitTo: { accountName: 'Keystone Drywall Inc.', bankName: 'Granite Federal Bank', institution: '614', transit: '22870', account: '3319026' },
  bankChangeNotice: false,
  lienWaiver: true,
};

const crestlineRaw = {
  vendorName: 'Crestline Mechanical Ltd.',
  vendorTaxId: '84551 0267 RT0001',
  vendorPhone: '647-555-0193',
  invoiceNumber: 'INV-CM-2290',
  invoiceDate: '2026-11-13',
  dueDate: '2026-12-13',
  terms: 'Net 30 days',
  poNumber: 'PO-2318',
  billingRef: 'Progress claim #5',
  currency: 'CAD',
  lines: [
    { description: 'Domestic water piping, Level 4', quantity: 1, unit: 'LS', unitPrice: 21750, amount: 21750 },
    { description: 'Ductwork, Level 4 corridors', quantity: 410, unit: 'm', unitPrice: 38, amount: 15580 },
    { description: 'Fan coil units, set in place', quantity: 12, unit: 'ea', unitPrice: 640, amount: 7680 },
  ],
  subtotal: 45010,
  taxPercent: 13,
  taxAmount: 5851.3,
  total: 50861.3,
  retainagePercent: 10,
  retainageAmount: 4501,
  amountDue: 46360.3,
  remitTo: { accountName: 'Crestline Mechanical Ltd.', bankName: 'Westgate Digital Bank', institution: '837', transit: '00011', account: '9917730195' },
  bankChangeNotice: true,
  lienWaiver: true,
};

export const EXAMPLES = {
  northline: {
    extraction: { raw: northlineRaw, model: 'gemini-3.5-flash-lite', ms: 2400 },
    decisions: {
      clean: {
        decision: { choice: 'approve', probabilities: { approve: 0.95, hold: 0.04, reject: 0.01 }, confidence: 0.9, ms: 130 },
        note: 'Approve: INV-NE-1187 matches PO-2291 and every check passed. It pays $39,758.00 CAD on Dec 12, 2026 to Maple Shore Bank ••4471, the account on file.',
      },
      paid: {
        decision: { choice: 'reject', probabilities: { approve: 0.01, hold: 0.09, reject: 0.9 }, confidence: 0.85, ms: 120 },
        note: 'Reject: INV-NE-1187 was already paid today. Do not pay it again; reply to Northline with the earlier payment reference.',
      },
    },
  },
  keystone: {
    extraction: { raw: keystoneRaw, model: 'gemini-3.5-flash-lite', ms: 2200 },
    decisions: {
      clean: {
        decision: { choice: 'reject', probabilities: { approve: 0.01, hold: 0.12, reject: 0.87 }, confidence: 0.82, ms: 125 },
        note: 'Reject: INV-KD-0412 for $25,441.00 CAD was already paid on Oct 30, 2026 as PMT-88213. Do not pay it again; reply to Keystone with that payment reference.',
      },
    },
  },
  crestline: {
    extraction: { raw: crestlineRaw, model: 'gemini-3.5-flash-lite', ms: 2300 },
    decisions: {
      clean: {
        decision: { choice: 'hold', probabilities: { approve: 0.02, hold: 0.9, reject: 0.08 }, confidence: 0.86, ms: 118 },
        note: 'Hold: INV-CM-2290 asks to pay a new account at Westgate Digital Bank instead of the account on file. Call Crestline at 905-555-0148 from the vendor file, not the number on the invoice, before paying $46,360.30.',
      },
    },
  },
};
