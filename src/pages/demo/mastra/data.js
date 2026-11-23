// Sample data for the Mastra demo: a small outdoor-gear store ("Fernway", invented), its
// orders and return policy, the support agent's starting config, and the 40-case benchmark.
// Pure data, shared by the page and the API routes. Nothing here is real customer data.

/** The store's "today": fixed, so dates in tool results and grading never drift. */
export const TODAY = '2026-11-21';
export const TODAY_LABEL = 'Saturday, 21 November 2026';

export const CUSTOMERS = {
  'dana.ortiz@example.com': 'Dana Ortiz',
  'sam.cho@example.com': 'Sam Cho',
  'priya.n@example.com': 'Priya Natarajan',
  'leo.marsh@example.com': 'Leo Marsh',
  'jun.park@example.com': 'Jun Park',
  'amara.okafor@example.com': 'Amara Okafor',
  'maya.r@example.com': 'Maya Reyes',
};

const item = (sku, name, category, price, extra = {}) => ({ sku, name, category, price, ...extra });

export const ORDERS = [
  {
    orderId: 'FW-10388',
    email: 'dana.ortiz@example.com',
    placedOn: '2026-10-28',
    status: 'delivered',
    items: [item('AL-TR-42', 'Alder trail runners', 'footwear', 139)],
    carrier: 'UPS',
    tracking: '1Z84A0F70342207715',
    shippedOn: '2026-10-29',
    deliveredOn: '2026-11-02',
  },
  {
    orderId: 'FW-10415',
    email: 'maya.r@example.com',
    placedOn: '2026-11-01',
    status: 'delivered',
    items: [item('SW-45-SL', 'Switchback 45L pack', 'packs', 199)],
    carrier: 'USPS',
    tracking: '9400111899223184720051',
    shippedOn: '2026-11-02',
    deliveredOn: '2026-11-05',
  },
  {
    orderId: 'FW-10423',
    email: 'dana.ortiz@example.com',
    placedOn: '2026-11-17',
    status: 'shipped',
    items: [item('RL-2P-OL', 'Ridgeline 2P tent', 'tents', 389)],
    carrier: 'UPS',
    tracking: '1Z84A0F70346120871',
    shippedOn: '2026-11-19',
    estimatedDelivery: '2026-11-24',
  },
  {
    orderId: 'FW-10431',
    email: 'sam.cho@example.com',
    placedOn: '2026-11-16',
    status: 'shipped',
    items: [item('CN-ST-01', 'Cinder camp stove', 'stoves', 129)],
    carrier: 'FedEx',
    tracking: '771984503316',
    shippedOn: '2026-11-18',
    estimatedDelivery: '2026-11-23',
  },
  {
    orderId: 'FW-10433',
    email: 'jun.park@example.com',
    placedOn: '2026-11-09',
    status: 'delivered',
    items: [item('CN-ST-01', 'Cinder camp stove', 'stoves', 129)],
    carrier: 'UPS',
    tracking: '1Z84A0F70344418302',
    shippedOn: '2026-11-11',
    deliveredOn: '2026-11-15',
  },
  {
    orderId: 'FW-10437',
    email: 'priya.n@example.com',
    placedOn: '2026-11-05',
    status: 'delivered',
    items: [item('TR-3P-SG', 'Tarn 3P tent', 'tents', 449)],
    carrier: 'FedEx',
    tracking: '771984487720',
    shippedOn: '2026-11-07',
    deliveredOn: '2026-11-12',
  },
  {
    orderId: 'FW-10440',
    email: 'leo.marsh@example.com',
    placedOn: '2026-10-19',
    status: 'delivered',
    items: [
      item('EM-DJ-M', 'Ember down jacket', 'apparel', 249),
      item('MW-SK-L', 'Merino hiking socks', 'apparel', 24, { finalSale: true }),
    ],
    carrier: 'UPS',
    tracking: '1Z84A0F70341185529',
    shippedOn: '2026-10-21',
    deliveredOn: '2026-10-25',
  },
  {
    orderId: 'FW-10445',
    email: 'amara.okafor@example.com',
    placedOn: '2026-09-24',
    status: 'delivered',
    items: [item('GR-HB-39', 'Granite hiking boots', 'footwear', 219)],
    carrier: 'USPS',
    tracking: '9400111899223101187744',
    shippedOn: '2026-09-26',
    deliveredOn: '2026-09-30',
  },
  {
    orderId: 'FW-10452',
    email: 'sam.cho@example.com',
    placedOn: '2026-11-19',
    status: 'processing',
    items: [item('EM-DJ-S', 'Ember down jacket', 'apparel', 249)],
    note: 'Waiting on stock from the supplier. No ship date yet.',
  },
  {
    orderId: 'FW-10458',
    email: 'leo.marsh@example.com',
    placedOn: '2026-11-18',
    status: 'processing',
    items: [item('KS-HL-400', 'Kestrel 400 headlamp', 'electronics', 59)],
    note: 'Waiting on stock from the supplier. No ship date yet.',
  },
  {
    orderId: 'FW-10462',
    email: 'maya.r@example.com',
    placedOn: '2026-11-18',
    status: 'shipped',
    items: [
      item('TR-3P-SG', 'Tarn 3P tent', 'tents', 449),
      item('FT-GT-3P', 'Tarn 3P footprint', 'tents', 59),
    ],
    carrier: 'UPS',
    tracking: '1Z84A0F70349902164',
    shippedOn: '2026-11-20',
    estimatedDelivery: '2026-11-25',
  },
  {
    orderId: 'FW-10466',
    email: 'priya.n@example.com',
    placedOn: '2026-11-20',
    status: 'processing',
    items: [item('SW-45-SL', 'Switchback 45L pack', 'packs', 199)],
    note: 'Payment cleared. Waiting to be picked at the warehouse. No ship date yet.',
  },
  {
    orderId: 'FW-10471',
    email: 'jun.park@example.com',
    placedOn: '2026-11-18',
    status: 'shipped',
    items: [item('AL-TR-44', 'Alder trail runners', 'footwear', 139)],
    carrier: 'USPS',
    tracking: '9400111899223197428490',
    shippedOn: '2026-11-19',
    estimatedDelivery: '2026-11-25',
  },
  {
    orderId: 'FW-10474',
    email: 'amara.okafor@example.com',
    placedOn: '2026-11-20',
    status: 'processing',
    items: [item('TR-3P-SG', 'Tarn 3P tent', 'tents', 449)],
    note: 'Waiting on stock from the supplier. No ship date yet.',
  },
];

export const CATEGORIES = ['footwear', 'tents', 'apparel', 'stoves', 'packs', 'electronics'];

export const POLICY = {
  footwear: { windowDays: 30, condition: 'Unworn: indoor try-on only, in the original box.' },
  tents: { windowDays: 45, condition: 'Clean and dry, with all poles and stakes.' },
  apparel: { windowDays: 30, condition: 'Unwashed, tags attached.' },
  stoves: { windowDays: 30, condition: 'Unused, in the original packaging. Items damaged on arrival are always accepted.' },
  packs: { windowDays: 60, condition: 'Clean, no trail use beyond a test fit.' },
  electronics: { windowDays: 30, condition: 'In working order with all accessories.' },
};

/**
 * The agent's starting config: what the team had in production. Five mistakes of the kind real
 * configs pick up are planted in it (the benchmark is how you find them):
 * a "be confident" line that invites made-up dates, a "save the customer time" line that fires a
 * write tool on a question, an order-id parameter with no format, a memory window cut to one
 * message to save tokens, and a step budget too small for lookups that chain two tools.
 */
export const BASELINE_CONFIG = {
  version: 'v1',
  instructions: [
    'You are the support agent for Fernway, an outdoor gear store.',
    'Help customers with questions about their orders, shipping and returns.',
    'Always give the customer a specific delivery date so they feel confident.',
    'When a customer mentions returning something, start the return right away with startReturn so they do not have to wait.',
    'Keep replies short and friendly.',
  ].join('\n'),
  tools: {
    lookupOrder: {
      description: 'Look up an order.',
      params: {
        orderId: { type: 'string', description: 'The order number.' },
      },
      required: ['orderId'],
    },
    findOrders: {
      description: "Find a customer's orders by email, newest first.",
      params: {
        email: { type: 'string', description: "The customer's email address." },
      },
      required: ['email'],
    },
    returnPolicy: {
      description: 'Return policy for a product category. Pass deliveredOn to get the return-by date.',
      params: {
        category: { type: 'string', enum: CATEGORIES, description: 'Product category.' },
        deliveredOn: { type: 'string', description: 'Delivery date, YYYY-MM-DD (optional).' },
      },
      required: ['category'],
    },
    startReturn: {
      description: 'Start a return for one item and email the customer a prepaid label.',
      params: {
        orderId: { type: 'string', description: 'The order number.' },
        item: { type: 'string', description: 'Which item to return.' },
        reason: { type: 'string', description: 'Why it is coming back.' },
      },
      required: ['orderId', 'item', 'reason'],
    },
  },
  memory: { lastMessages: 1 },
  maxSteps: 2,
};

export const TOOL_ORDER = ['lookupOrder', 'findOrders', 'returnPolicy', 'startReturn'];

const user = content => ({ role: 'user', content });
const assistant = content => ({ role: 'assistant', content });

// Phrases that count as "says it has not shipped / has no date", for the processing orders
const NOT_YET = [
  'not shipped',
  "hasn't shipped",
  'has not shipped',
  'not yet shipped',
  "hasn't been shipped",
  'has not been shipped',
  'not been shipped',
  'processing',
  'waiting on stock',
  'waiting for stock',
  'awaiting stock',
  'no ship date',
  'no delivery date',
  'not available yet',
  "don't have a",
  'do not have a',
  'no tracking',
  'not have tracking',
  "doesn't have tracking",
  'not been picked',
  'waiting to be picked',
  'being processed',
  'yet to ship',
  'once it ships',
  'when it ships',
  'as soon as it ships',
  'back in stock',
  'still being prepared',
];

/**
 * The benchmark. Each case is a customer thread (the last message is the one to answer) with the
 * expected outcome, graded in code (agent.js grade()):
 *   tools: tools that must be called; args: arguments one of those calls must carry;
 *   forbid: tools that must not be called (startReturn on anything that is not a return request);
 *   facts: what the answer must state ({ any: [...] } phrases, { date } in any format, { money });
 *   recall: a value only an earlier message in the thread holds, which the tool call must use.
 * Every case is also checked for invented facts: dates, tracking numbers, amounts and day counts
 * that appear in no tool result and no message.
 */
export const CASES = [
  // Plain lookups: the baseline handles these
  { id: 'c01', group: 'lookup', thread: [user('Where is my order FW-10423?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10423' } }, facts: [{ any: ['UPS'] }, { date: '2026-11-24' }] } },
  { id: 'c02', group: 'lookup', thread: [user('Has FW-10431 shipped yet?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10431' } }, facts: [{ any: ['FedEx'] }] } },
  { id: 'c03', group: 'lookup', thread: [user('Can you give me the tracking number for FW-10471?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10471' } }, facts: [{ any: ['9400111899223197428490'] }] } },
  { id: 'c04', group: 'lookup', thread: [user('What did I order in FW-10437?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10437' } }, facts: [{ any: ['Tarn'] }] } },
  { id: 'c05', group: 'lookup', thread: [user('When did FW-10388 arrive?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10388' } }, facts: [{ date: '2026-11-02' }] } },
  { id: 'c06', group: 'lookup', thread: [user('How much was order FW-10462 in total?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10462' } }, facts: [{ money: 508 }] } },
  { id: 'c07', group: 'lookup', thread: [user('Which carrier is shipping FW-10462?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10462' } }, facts: [{ any: ['UPS'] }] } },

  // Order numbers as customers type them
  { id: 'c08', group: 'ids', thread: [user('Where is order 10431?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10431' } }, facts: [{ any: ['FedEx'] }] } },
  { id: 'c09', group: 'ids', thread: [user('Can you check on #10462 for me?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10462' } }, facts: [{ any: ['UPS'] }] } },
  { id: 'c10', group: 'ids', thread: [user('status of order number 10423 please')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10423' } }, facts: [{ any: ['UPS'] }] } },
  { id: 'c11', group: 'ids', thread: [user("What's in order 10466?")], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10466' } }, facts: [{ any: ['Switchback'] }] } },
  { id: 'c12', group: 'ids', thread: [user('Did 10388 get delivered?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10388' } }, facts: [{ date: '2026-11-02' }] } },
  { id: 'c13', group: 'ids', thread: [user('tracking for fw10471?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10471' } }, facts: [{ any: ['9400111899223197428490'] }] } },
  { id: 'c14', group: 'ids', thread: [user('My order is FW 10437, what was in it?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10437' } }, facts: [{ any: ['Tarn'] }] } },

  // Policy questions that mention a return (a question, not a request)
  { id: 'c15', group: 'policy', thread: [user("Before I decide whether to send back the tent from FW-10437, what's your return policy on tents?")], expect: { tools: ['returnPolicy'], forbid: ['startReturn'], facts: [{ any: ['45'] }] } },
  { id: 'c16', group: 'policy', thread: [user('What is the return window for footwear? I may return the trail runners from FW-10388.')], expect: { tools: ['returnPolicy'], forbid: ['startReturn'], facts: [{ any: ['30'] }] } },
  { id: 'c17', group: 'policy', thread: [user("I'm thinking about returning the pack from FW-10415. Do packs have a longer return window?")], expect: { tools: ['returnPolicy'], forbid: ['startReturn'], facts: [{ any: ['60'] }] } },
  { id: 'c18', group: 'policy', thread: [user('If I return the stove from FW-10433, does it have to be unused?')], expect: { tools: ['returnPolicy'], forbid: ['startReturn'], facts: [{ any: ['unused', 'damaged'] }] } },
  { id: 'c19', group: 'policy', thread: [user('Can worn boots be returned? Asking about the Granite boots from FW-10445 before I decide.')], expect: { tools: ['returnPolicy'], forbid: ['startReturn'], facts: [{ any: ['unworn', 'indoor', 'not worn', 'not been worn'] }] } },
  { id: 'c20', group: 'policy', thread: [user('Do headlamps get the same return window as everything else? I might return the one in FW-10458.')], expect: { tools: ['returnPolicy'], forbid: ['startReturn'], facts: [{ any: ['30'] }] } },

  // Orders that have not shipped: there is no date or tracking number to give
  { id: 'c21', group: 'unshipped', thread: [user('When will FW-10452 arrive?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10452' } }, facts: [{ any: NOT_YET }] } },
  { id: 'c22', group: 'unshipped', thread: [user("What's the tracking number for FW-10458?")], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10458' } }, facts: [{ any: NOT_YET }] } },
  { id: 'c23', group: 'unshipped', thread: [user('Give me a delivery date for FW-10466.')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10466' } }, facts: [{ any: NOT_YET }] } },
  { id: 'c24', group: 'unshipped', thread: [user('FW-10474: what day will it be delivered?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10474' } }, facts: [{ any: NOT_YET }] } },
  { id: 'c25', group: 'unshipped', thread: [user('When does FW-10452 ship?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10452' } }, facts: [{ any: NOT_YET }] } },
  { id: 'c26', group: 'unshipped', thread: [user('Can you tell me when FW-10458 will get here?')], expect: { tools: ['lookupOrder'], args: { lookupOrder: { orderId: 'FW-10458' } }, facts: [{ any: NOT_YET }] } },

  // Follow-ups: the email or order number is in an earlier message of the thread
  {
    id: 'c27',
    group: 'thread',
    thread: [user('Hi! My email is dana.ortiz@example.com.'), assistant('Thanks, Dana. What can I help you with?'), user('Which orders do I have with you?')],
    expect: { tools: ['findOrders'], recall: 'dana.ortiz@example.com', facts: [{ any: ['FW-10423'] }, { any: ['FW-10388'] }] },
  },
  {
    id: 'c28',
    group: 'thread',
    thread: [user('My order number is FW-10431.'), assistant('Got it. What would you like to know about FW-10431?'), user('Has it shipped?')],
    expect: { tools: ['lookupOrder'], recall: 'FW-10431', facts: [{ any: ['FedEx'] }] },
  },
  {
    id: 'c29',
    group: 'thread',
    thread: [user("I'm writing about FW-10462."), assistant('Sure, what do you need?'), user('Who is the carrier, and when will it arrive?')],
    expect: { tools: ['lookupOrder'], recall: 'FW-10462', facts: [{ any: ['UPS'] }, { date: '2026-11-25' }] },
  },
  {
    id: 'c30',
    group: 'thread',
    thread: [user('Hello, this is Priya, priya.n@example.com.'), assistant('Hi Priya! How can I help today?'), user('Can you list the orders I have placed?')],
    expect: { tools: ['findOrders'], recall: 'priya.n@example.com', facts: [{ any: ['FW-10437'] }, { any: ['FW-10466'] }] },
  },
  {
    id: 'c31',
    group: 'thread',
    thread: [user('Question about order FW-10440.'), assistant('Happy to help. What would you like to know?'), user('What did I buy in it?')],
    expect: { tools: ['lookupOrder'], recall: 'FW-10440', facts: [{ any: ['Ember'] }] },
  },
  {
    id: 'c32',
    group: 'thread',
    thread: [user('My account email is jun.park@example.com'), assistant('Thanks, Jun. What do you need?'), user('List my orders please.')],
    expect: { tools: ['findOrders'], recall: 'jun.park@example.com', facts: [{ any: ['FW-10433'] }, { any: ['FW-10471'] }] },
  },

  // Two lookups in a row: find the orders, then open the newest
  { id: 'c33', group: 'chain', thread: [user('My email is dana.ortiz@example.com. Where is my most recent order?')], expect: { tools: ['findOrders', 'lookupOrder'], args: { lookupOrder: { orderId: 'FW-10423' } }, facts: [{ any: ['UPS'] }] } },
  { id: 'c34', group: 'chain', thread: [user("I'm jun.park@example.com. Has my latest order shipped, and with which carrier?")], expect: { tools: ['findOrders', 'lookupOrder'], args: { lookupOrder: { orderId: 'FW-10471' } }, facts: [{ any: ['USPS'] }] } },
  { id: 'c35', group: 'chain', thread: [user('Email: maya.r@example.com. What is the tracking number on my newest order?')], expect: { tools: ['findOrders', 'lookupOrder'], args: { lookupOrder: { orderId: 'FW-10462' } }, facts: [{ any: ['1Z84A0F70349902164'] }] } },
  { id: 'c36', group: 'chain', thread: [user('This is amara.okafor@example.com. When was my oldest order delivered?')], expect: { tools: ['findOrders', 'lookupOrder'], args: { lookupOrder: { orderId: 'FW-10445' } }, facts: [{ date: '2026-09-30' }] } },

  // Real return requests: the write tool is the right call (guards against over-correcting)
  { id: 'c37', group: 'returns', thread: [user('Please start a return for the stove in FW-10433, it arrived dented.')], expect: { tools: ['startReturn'], args: { startReturn: { orderId: 'FW-10433' } }, facts: [{ any: ['RMA-'] }] } },
  { id: 'c38', group: 'returns', thread: [user('The zipper broke on the Ember jacket from FW-10440. Please send me a return label.')], expect: { tools: ['startReturn'], args: { startReturn: { orderId: 'FW-10440' } }, facts: [{ any: ['RMA-'] }] } },
  { id: 'c39', group: 'returns', thread: [user("I want to return the Granite boots from FW-10445, they don't fit. Please start it.")], expect: { tools: ['startReturn'], args: { startReturn: { orderId: 'FW-10445' } }, facts: [{ any: ['window', 'October 30', 'Oct 30', '2026-10-30', '30 days', '30-day'] }] } },
  { id: 'c40', group: 'returns', thread: [user('Return the merino socks from FW-10440 please, wrong size.')], expect: { tools: ['startReturn'], args: { startReturn: { orderId: 'FW-10440' } }, facts: [{ any: ['final sale', 'final-sale'] }] } },
];

export const GROUPS = {
  lookup: 'Plain lookups',
  ids: 'Order numbers as typed',
  policy: 'Policy questions',
  unshipped: 'Not shipped yet',
  thread: 'Follow-ups',
  chain: 'Two lookups',
  returns: 'Return requests',
};

/** The live subset: ten cases that cover every group, run three at a time. */
export const SUBSET = ['c01', 'c08', 'c13', 'c15', 'c18', 'c21', 'c22', 'c27', 'c33', 'c37'];

export const caseById = id => CASES.find(testCase => testCase.id === id);
