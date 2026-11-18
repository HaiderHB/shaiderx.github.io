// Sample books for the Truss demo: one general contractor's vendor file, purchase orders and the
// payments it has already made. Everything is fictional (companies, people, bank numbers, phone
// numbers in the 555-01xx range). This is the "system of record" the checks read; the invoices
// themselves are images (public/demo-assets/truss/), and nothing here is passed to the vision model.
// Money is in cents everywhere in code.

export const TODAY = '2026-11-17';

export const PAYER = {
  name: 'Ridgeway Builders Ltd.',
  short: 'Ridgeway Builders',
  currency: 'CAD',
};

export const PROJECT = {
  id: 'HR-2',
  name: 'Harbourview Residences, Phase 2',
  address: '2150 Harbourview Dr, Oakville ON',
};

/** Ontario HST on construction services, and the holdback (retainage) every PO here carries. */
export const TAX_PERCENT = 13;
export const RETAINAGE_PERCENT = 10;

export const VENDORS = [
  {
    id: 'V-1042',
    name: 'Northline Electric Ltd.',
    taxId: '812345678RT0001',
    phone: '905-555-0142',
    trade: 'Electrical',
    since: '2023-04',
    bank: { name: 'Maple Shore Bank', institution: '612', transit: '10392', account: '5084471' },
  },
  {
    id: 'V-1077',
    name: 'Keystone Drywall Inc.',
    taxId: '790112334RT0001',
    phone: '905-555-0177',
    trade: 'Drywall and ceilings',
    since: '2022-09',
    bank: { name: 'Granite Federal Bank', institution: '614', transit: '22870', account: '3319026' },
  },
  {
    id: 'V-1103',
    name: 'Crestline Mechanical Ltd.',
    taxId: '845510267RT0001',
    phone: '905-555-0148',
    trade: 'Plumbing and HVAC',
    since: '2024-02',
    bank: { name: 'Maple Shore Bank', institution: '612', transit: '02214', account: '1008820' },
  },
];

export const PURCHASE_ORDERS = [
  {
    number: 'PO-2291',
    vendorId: 'V-1042',
    project: 'HR-2',
    scope: 'Electrical, Levels 2-4',
    amount: 18_600_000,
    billedToDate: 9_640_000,
    retainagePercent: RETAINAGE_PERCENT,
  },
  {
    number: 'PO-2304',
    vendorId: 'V-1077',
    project: 'HR-2',
    scope: 'Drywall and ceilings, Levels 1-4',
    amount: 14_200_000,
    billedToDate: 4_940_000,
    retainagePercent: RETAINAGE_PERCENT,
  },
  {
    number: 'PO-2318',
    vendorId: 'V-1103',
    project: 'HR-2',
    scope: 'Plumbing and HVAC rough-in, Levels 3-4',
    amount: 21_250_000,
    billedToDate: 8_824_000,
    retainagePercent: RETAINAGE_PERCENT,
  },
];

/** Payments already sent (the last 60 days). The duplicate check reads these plus this session's. */
export const PAID_LEDGER = [
  { paymentId: 'PMT-88140', vendorId: 'V-1103', invoiceNumber: 'INV-CM-2241', invoiceDate: '2026-09-29', amount: 3_870_300, paidOn: '2026-10-21', to: '••8820' },
  { paymentId: 'PMT-88172', vendorId: 'V-1042', invoiceNumber: 'INV-NE-1163', invoiceDate: '2026-10-06', amount: 3_212_500, paidOn: '2026-10-28', to: '••4471' },
  { paymentId: 'PMT-88213', vendorId: 'V-1077', invoiceNumber: 'INV-KD-0412', invoiceDate: '2026-10-02', amount: 2_544_100, paidOn: '2026-10-30', to: '••9026' },
  { paymentId: 'PMT-88199', vendorId: 'V-1077', invoiceNumber: 'INV-KD-0388', invoiceDate: '2026-09-04', amount: 2_544_100, paidOn: '2026-10-02', to: '••9026' },
  { paymentId: 'PMT-88051', vendorId: 'V-1042', invoiceNumber: 'INV-NE-1140', invoiceDate: '2026-09-08', amount: 2_970_400, paidOn: '2026-09-30', to: '••4471' },
  { paymentId: 'PMT-87988', vendorId: 'V-1103', invoiceNumber: 'INV-CM-2207', invoiceDate: '2026-08-31', amount: 4_104_000, paidOn: '2026-09-25', to: '••8820' },
];

/**
 * The three sample invoices on the page. `image` is the picture the vision model reads; the
 * label and hint are page copy only. Expected outcomes are for the README and tests.
 */
export const SAMPLES = [
  {
    id: 'northline',
    label: 'Northline Electric',
    hint: 'Progress bill #4 · PO-2291',
    tag: 'Clean',
    image: '/demo-assets/truss/northline-inv-ne-1187.png',
    width: 1275,
    height: 1650,
    expect: 'approve',
  },
  {
    id: 'keystone',
    label: 'Keystone Drywall',
    hint: 'Resent “reminder” · PO-2304',
    tag: 'Already paid',
    image: '/demo-assets/truss/keystone-inv-kd-0412.png',
    width: 1275,
    height: 1650,
    expect: 'reject',
  },
  {
    id: 'crestline',
    label: 'Crestline Mechanical',
    hint: 'New bank details · PO-2318',
    tag: 'Bank changed',
    image: '/demo-assets/truss/crestline-inv-cm-2290.png',
    width: 1275,
    height: 1650,
    expect: 'hold',
  },
];

export const sampleById = id => SAMPLES.find(sample => sample.id === id) || null;
export const vendorById = id => VENDORS.find(vendor => vendor.id === id) || null;
export const poByNumber = number =>
  PURCHASE_ORDERS.find(po => po.number === String(number || '').toUpperCase().replace(/\s+/g, '')) ||
  null;
