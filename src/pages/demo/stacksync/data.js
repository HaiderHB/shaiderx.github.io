// Sample books for the Stacksync demo: one fictional company that sells sensors and monitoring,
// with deals closing in its CRM (HubSpot-shaped JSON) and an ERP (NetSuite-shaped records) that
// sales orders get written into. Everything here is made up. The ERP tables are the "system of
// record" both the LLM (to draft the plan) and the code checks (to verify it) read.

export const TODAY = '2026-11-18';

/** ERP subsidiaries: internal id -> name and base currency. */
export const SUBSIDIARIES = {
  1: { name: 'Fieldline Inc. (US)', currency: 'USD' },
  2: { name: 'Fieldline Ltd. (UK)', currency: 'GBP' },
};

/**
 * CRM company id -> ERP customer. `isNew`: created in the ERP by the sync this week, no order
 * history yet. `creditLimit` in the customer's currency.
 */
export const CUSTOMERS = {
  9001: {
    entity: '4182',
    name: 'Northwind Cold Storage Inc.',
    subsidiary: '1',
    currency: 'USD',
    isNew: false,
    since: '2023-06',
    ordersLast12m: 7,
    creditLimit: 60000,
  },
  9002: {
    entity: '5120',
    name: 'Brightline Health Systems',
    subsidiary: '1',
    currency: 'USD',
    isNew: true,
    since: '2026-11',
    ordersLast12m: 0,
    creditLimit: 50000,
  },
  9003: {
    entity: '4877',
    name: 'Kestrel Foods Ltd.',
    subsidiary: '2',
    currency: 'GBP',
    isNew: false,
    since: '2024-03',
    ordersLast12m: 2,
    creditLimit: 25000,
  },
};

/** CRM product SKU -> ERP item internal id. TS-300-PRE (a pre-order) is not set up in the ERP yet. */
export const ITEMS = {
  'TS-200': { item: '1204', name: 'Temperature sensor TS-200' },
  'GW-10': { item: '1188', name: 'Edge gateway GW-10' },
  'MON-ANN': { item: '2050', name: 'Monitoring, annual per site' },
  'INST-DAY': { item: '3011', name: 'Installation day' },
};

/** Business policy the checks enforce (soft rules: they send a deal to a person, not to block). */
export const POLICY = {
  maxDiscountPct: 30,
  newCustomerFirstOrder: 50000,
};

const deal = ({ id, name, company, contact, currency, closedate, owner, lines, stage = 'closedwon' }) => ({
  id,
  properties: {
    dealname: name,
    dealstage: stage,
    closedate,
    deal_currency_code: currency,
    amount: lines
      .reduce((sum, line) => sum + Math.round(line.quantity * line.price * (100 - line.discount)), 0)
      .toString()
      .replace(/(\d\d)$/, '.$1'),
    hubspot_owner: owner,
  },
  company,
  contact,
  line_items: lines.map(line => ({
    sku: line.sku,
    name: line.name,
    quantity: line.quantity,
    price: line.price,
    discount_percentage: line.discount,
  })),
});

export const SAMPLES = [
  {
    value: 'clean',
    label: 'Renewal + expansion',
    hint: 'Existing customer, list prices',
    expect: 'auto',
    deal: deal({
      id: '18842107',
      name: 'Northwind Cold Storage, 3 new sites',
      company: { id: '9001', name: 'Northwind Cold Storage', domain: 'northwind-cold.example' },
      contact: { name: 'Dana Whitfield', email: 'dana.whitfield@northwind-cold.example' },
      currency: 'USD',
      closedate: '2026-11-17',
      owner: 'Priya Raman',
      lines: [
        { sku: 'TS-200', name: 'Temperature sensor TS-200', quantity: 48, price: 89, discount: 0 },
        { sku: 'GW-10', name: 'Edge gateway GW-10', quantity: 3, price: 640, discount: 10 },
        { sku: 'MON-ANN', name: 'Monitoring, annual per site', quantity: 3, price: 1200, discount: 0 },
      ],
    }),
  },
  {
    value: 'risky',
    label: 'New logo, big discount',
    hint: 'First order, 45% off monitoring',
    expect: 'approval',
    deal: deal({
      id: '18842219',
      name: 'Brightline Health, 40-site rollout',
      company: { id: '9002', name: 'Brightline Health Systems', domain: 'brightline-health.example' },
      contact: { name: 'Marcus Oyelaran', email: 'm.oyelaran@brightline-health.example' },
      currency: 'USD',
      closedate: '2026-11-18',
      owner: 'Jordan Lake',
      lines: [
        { sku: 'TS-200', name: 'Temperature sensor TS-200', quantity: 600, price: 89, discount: 20 },
        { sku: 'GW-10', name: 'Edge gateway GW-10', quantity: 40, price: 640, discount: 20 },
        { sku: 'MON-ANN', name: 'Monitoring, annual per site', quantity: 40, price: 1200, discount: 45 },
        { sku: 'INST-DAY', name: 'Installation day', quantity: 12, price: 1450, discount: 0 },
      ],
    }),
  },
  {
    value: 'broken',
    label: 'Pilot with a pre-order',
    hint: 'Unmapped SKU, wrong currency',
    expect: 'block',
    deal: deal({
      id: '18842305',
      name: 'Kestrel Foods, Leeds pilot',
      company: { id: '9003', name: 'Kestrel Foods', domain: 'kestrel-foods.example' },
      contact: { name: 'Hannah Brooks', email: 'hannah.brooks@kestrel-foods.example' },
      currency: 'EUR',
      closedate: '2026-11-16',
      owner: 'Priya Raman',
      lines: [
        { sku: 'TS-200', name: 'Temperature sensor TS-200', quantity: 24, price: 82, discount: 0 },
        { sku: 'TS-300-PRE', name: 'Sensor TS-300 (pre-order)', quantity: 6, price: 120, discount: 0 },
        { sku: 'MON-ANN', name: 'Monitoring, annual per site', quantity: 1, price: 1100, discount: 0 },
      ],
    }),
  },
];

export const sampleById = id => SAMPLES.find(sample => sample.value === id);
