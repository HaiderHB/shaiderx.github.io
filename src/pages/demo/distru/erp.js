// Sample ERP data and the order tools for the Distru demo.
// Everything here is fictional: the distributor, brands, products, accounts, license numbers
// and package tags. The same functions back the agent route, the MCP route and the page's
// in-browser tool box, so the agent and an MCP client share one tool layer.
// Plain JS with no server imports: it also runs in the browser.

export const DISTRIBUTOR = {
  name: 'Riverbend Wholesale',
  license: 'C11-9000101-LIC',
  state: 'CA',
};

// prices are per unit by account tier: T1 list, T2 volume, T3 key account
export const PRODUCTS = [
  {
    sku: 'SUN-FL-BD35',
    name: 'Blue Dream 3.5g Flower',
    brand: 'Sunfold Farms',
    category: 'Flower',
    casePack: 24,
    available: 432,
    batch: 'SF-2610-BD',
    packageTag: '1A4FF0300009D1F000004812',
    prices: { T1: 18, T2: 17, T3: 16 },
  },
  {
    sku: 'SUN-FL-GG35',
    name: 'Garlic Glue 3.5g Flower',
    brand: 'Sunfold Farms',
    category: 'Flower',
    casePack: 24,
    available: 0,
    restockEta: '2026-12-10',
    batch: 'SF-2609-GG',
    packageTag: '1A4FF0300009D1F000004790',
    prices: { T1: 20, T2: 19, T3: 18 },
  },
  {
    sku: 'SUN-FL-WC35',
    name: 'Wedding Cake 3.5g Flower',
    brand: 'Sunfold Farms',
    category: 'Flower',
    casePack: 24,
    available: 264,
    batch: 'SF-2610-WC',
    packageTag: '1A4FF0300009D1F000004833',
    prices: { T1: 20, T2: 19, T3: 18 },
  },
  {
    sku: 'SUN-PR-GS5P',
    name: 'GSC Pre-Roll 5-Pack',
    brand: 'Sunfold Farms',
    category: 'Pre-roll',
    casePack: 20,
    available: 360,
    batch: 'SF-2610-GS',
    packageTag: '1A4FF0300009D1F000004851',
    prices: { T1: 15, T2: 14, T3: 13 },
  },
  {
    sku: 'TDW-PR-SD1G',
    name: 'Sour Diesel Pre-Roll 1g',
    brand: 'Tidewater',
    category: 'Pre-roll',
    casePack: 50,
    available: 900,
    batch: 'TW-2610-SD',
    packageTag: '1A4FF0300009D1F000005106',
    prices: { T1: 4.5, T2: 4.25, T3: 4 },
  },
  {
    sku: 'KES-VP-GC1G',
    name: 'Garlic Cookies Live Resin Cart 1g',
    brand: 'Kestrel Labs',
    category: 'Vape',
    casePack: 25,
    available: 0,
    restockEta: '2026-12-05',
    batch: 'KL-2609-GC',
    packageTag: '1A4FF0300009D1F000005230',
    prices: { T1: 24, T2: 22.5, T3: 21 },
  },
  {
    sku: 'KES-VP-IC1G',
    name: 'Ice Cream Cake Live Resin Cart 1g',
    brand: 'Kestrel Labs',
    category: 'Vape',
    casePack: 25,
    available: 175,
    batch: 'KL-2610-IC',
    packageTag: '1A4FF0300009D1F000005247',
    prices: { T1: 24, T2: 22.5, T3: 21 },
  },
  {
    sku: 'KES-VP-SD05',
    name: 'Sour Diesel Distillate Cart 0.5g',
    brand: 'Kestrel Labs',
    category: 'Vape',
    casePack: 25,
    available: 400,
    batch: 'KL-2610-SD',
    packageTag: '1A4FF0300009D1F000005262',
    prices: { T1: 12, T2: 11, T3: 10 },
  },
  {
    sku: 'KES-CN-BD1G',
    name: 'Blue Dream Live Badder 1g',
    brand: 'Kestrel Labs',
    category: 'Concentrate',
    casePack: 20,
    available: 80,
    batch: 'KL-2610-BD',
    packageTag: '1A4FF0300009D1F000005288',
    prices: { T1: 22, T2: 21, T3: 20 },
  },
  {
    sku: 'LBR-ED-WM10',
    name: 'Watermelon Gummies 100mg',
    brand: 'Little Bramble',
    category: 'Edible',
    casePack: 40,
    available: 640,
    batch: 'LB-2610-WM',
    packageTag: '1A4FF0300009D1F000005314',
    prices: { T1: 9, T2: 8.5, T3: 8 },
  },
  {
    sku: 'LBR-ED-MB10',
    name: 'Midnight Berry Sleep Gummies 100mg',
    brand: 'Little Bramble',
    category: 'Edible',
    casePack: 40,
    available: 36,
    restockEta: '2026-12-08',
    batch: 'LB-2610-MB',
    packageTag: '1A4FF0300009D1F000005329',
    prices: { T1: 10, T2: 9.5, T3: 9 },
  },
  {
    sku: 'QWD-TN-1130',
    name: '1:1 CBD:THC Tincture 30ml',
    brand: 'Quietwood',
    category: 'Tincture',
    casePack: 12,
    available: 48,
    batch: 'QW-2610-11',
    packageTag: '1A4FF0300009D1F000005355',
    prices: { T1: 21, T2: 20, T3: 19 },
  },
];

export const ACCOUNTS = [
  {
    id: 'ACC-1042',
    name: 'Juniper Lane Dispensary',
    city: 'Oakland, CA',
    buyer: 'Dana Okafor',
    emailDomain: 'juniperlane.example',
    license: 'C10-9000412-LIC',
    licenseExpires: '2027-06-30',
    tier: 'T2',
    terms: 'Net 30',
    creditLimit: 25000,
    openBalance: 6400,
    creditHold: false,
  },
  {
    id: 'ACC-1077',
    name: 'Copperleaf Collective',
    city: 'Sacramento, CA',
    buyer: 'Marcus Reyes',
    emailDomain: 'copperleaf.example',
    license: 'C10-9000587-LIC',
    licenseExpires: '2027-02-14',
    tier: 'T1',
    terms: 'Net 15',
    creditLimit: 15000,
    openBalance: 3100,
    creditHold: false,
  },
  {
    id: 'ACC-1103',
    name: 'Saltgrass Wellness',
    city: 'Long Beach, CA',
    buyer: 'Priya Natarajan',
    emailDomain: 'saltgrass.example',
    license: 'C10-9000233-LIC',
    licenseExpires: '2026-11-28',
    tier: 'T1',
    terms: 'Net 15',
    creditLimit: 10000,
    openBalance: 2100,
    creditHold: false,
  },
  {
    id: 'ACC-1120',
    name: 'Fernhill Remedies',
    city: 'Fresno, CA',
    buyer: 'Tom Becker',
    emailDomain: 'fernhill.example',
    license: 'C10-9000301-LIC',
    licenseExpires: '2027-04-01',
    tier: 'T1',
    terms: 'Net 30',
    creditLimit: 12000,
    openBalance: 12850,
    creditHold: true,
    holdReason: 'Invoice INV-30418 is 61 days past due',
  },
];

// --- helpers -------------------------------------------------------------------------

const round2 = value => Math.round(value * 100) / 100;
const usd = value =>
  `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const isoToday = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from, to) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const validDate = value =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value));

export const productBySku = sku =>
  PRODUCTS.find(
    product =>
      product.sku ===
      String(sku || '')
        .trim()
        .toUpperCase()
  ) || null;
export const accountById = id =>
  ACCOUNTS.find(
    account =>
      account.id ===
      String(id || '')
        .trim()
        .toUpperCase()
  ) || null;

function toolError(message) {
  const error = new Error(message);
  error.toolError = true;
  return error;
}

// --- fuzzy product matching ----------------------------------------------------------
// Buyers write "the blue dream eighths" or "GG carts", not SKUs. Normalise wholesale slang,
// then score catalog items by IDF-weighted token overlap (rare words like strain names count most).

const SYNONYMS = [
  [/\b1\/8(th)?s?\b|\beighths?\b|\b3\.5\s?g(rams?)?\b|\b3\.5\b/g, ' size3_5g '],
  [/\b0?\.5\s?g(rams?)?\b|\bhalf\s?grams?\b/g, ' size0_5g '],
  [/\b1\s?g(rams?)?\b|\bone\s?grams?\b/g, ' size1g '],
  [/\b100\s?mg\b/g, ' 100mg '],
  [/\b30\s?ml\b/g, ' 30ml '],
  [/\b1:1\b|\bone to one\b/g, ' ratio1to1 '],
  [/\bgirl scout cookies\b/g, ' gsc '],
  [/\bpre[\s-]?rolls?\b|\bprerolls?\b|\bjoints?\b/g, ' preroll '],
  [/\bcart(ridge)?s?\b|\bvapes?\b|\bpens?\b/g, ' cart '],
  [/\bgumm(y|ies)\b|\bchews?\b/g, ' gummy '],
  [/\b(5|five)[\s-]?(pk|packs?)\b/g, ' fivepack '],
  [/\blr\b/g, ' live resin '],
  [/\bbatter\b/g, ' badder '],
  [/\btinctures?\b|\bdrops\b/g, ' tincture '],
];

const STOPWORDS = new Set(
  'a about also an and any are around as at be box bag but by can case could each ea few for from get have i if in is it jar just like maybe me more my need of on one or order our pack pc pcs please reorder same so some the them these this those to too unit us usual want we what whatever with would x you couple several bunch'.split(
    ' '
  )
);

function stem(token) {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss'))
    return token.slice(0, -1);
  return token;
}

export function tokenize(text) {
  let value = ` ${String(text || '').toLowerCase()} `;
  for (const [pattern, replacement] of SYNONYMS)
    value = value.replace(pattern, replacement);
  return value
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(' ')
    .filter(token => token && !/^\d+$/.test(token))
    .map(stem)
    .filter(token => !STOPWORDS.has(token));
}

const CATALOG = PRODUCTS.map(product => ({
  product,
  nameTokens: new Set(tokenize(product.name)),
  allTokens: new Set(tokenize(`${product.name} ${product.brand} ${product.category}`)),
}));

const DOC_FREQ = new Map();
for (const item of CATALOG)
  for (const token of item.allTokens) DOC_FREQ.set(token, (DOC_FREQ.get(token) || 0) + 1);

const weight = token => Math.log(1 + PRODUCTS.length / (DOC_FREQ.get(token) || 1));

function scoreProduct(queryTokens, item) {
  let queryTotal = 0;
  let queryHit = 0;
  for (const token of queryTokens) {
    queryTotal += weight(token);
    if (item.allTokens.has(token)) queryHit += weight(token);
  }
  let nameTotal = 0;
  let nameHit = 0;
  for (const token of item.nameTokens) {
    nameTotal += weight(token);
    if (queryTokens.has(token)) nameHit += weight(token);
  }
  if (!queryTotal || !nameTotal) return 0;
  return 0.75 * (queryHit / queryTotal) + 0.25 * (nameHit / nameTotal);
}

const SKU_PATTERN = /\b[A-Z]{3}-[A-Z]{2}-[A-Z0-9]{4}\b/i;

function matchLine(line) {
  const text = String(line?.text || '').slice(0, 300);
  const explicit =
    productBySku(line?.sku_guess) || productBySku(text.match(SKU_PATTERN)?.[0]);
  if (explicit) {
    return {
      text,
      sku: explicit.sku,
      name: explicit.name,
      confidence: 1,
      method: 'sku',
      alternatives: [],
    };
  }

  const queryTokens = new Set(tokenize(text));
  const ranked = CATALOG.map(item => ({ item, score: scoreProduct(queryTokens, item) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const runnerUp = ranked[1];
  // A near tie between two products is not a confident match, however high the raw score
  const margin = best && runnerUp ? best.score - runnerUp.score : 1;
  const confidence = best
    ? round2(margin < 0.1 ? Math.min(best.score, 0.6) : best.score)
    : 0;

  return {
    text,
    sku: best && confidence >= 0.5 ? best.item.product.sku : null,
    name: best && confidence >= 0.5 ? best.item.product.name : null,
    confidence,
    method: 'fuzzy',
    ...(best && margin < 0.1 && { ambiguous: true }),
    alternatives: ranked.slice(best && confidence >= 0.5 ? 1 : 0, 3).map(entry => ({
      sku: entry.item.product.sku,
      name: entry.item.product.name,
      score: round2(entry.score),
    })),
  };
}

// --- tools ---------------------------------------------------------------------------

function lookupAccount({ name, license_number, email } = {}) {
  const license = String(license_number || '')
    .trim()
    .toUpperCase();
  const domain = String(email || '')
    .toLowerCase()
    .split('@')[1]
    ?.trim();

  let account = license && ACCOUNTS.find(item => item.license === license);
  let matchedBy = account ? 'license_number' : null;
  if (!account && domain) {
    account = ACCOUNTS.find(item => item.emailDomain === domain);
    matchedBy = account ? 'email_domain' : null;
  }

  let confidence = account ? 1 : 0;
  if (!account && name) {
    const query = new Set(tokenize(name));
    const scored = ACCOUNTS.map(item => {
      const tokens = tokenize(item.name);
      const hits = tokens.filter(token => query.has(token)).length;
      return { item, score: hits / Math.max(tokens.length, query.size || 1) };
    }).sort((a, b) => b.score - a.score);
    if (scored[0]?.score >= 0.5) {
      account = scored[0].item;
      matchedBy = 'name';
      confidence = round2(scored[0].score);
    }
  }

  if (!account) {
    return {
      found: false,
      query: {
        name: name || null,
        license_number: license || null,
        email: email || null,
      },
      known_accounts: ACCOUNTS.map(item => item.name),
    };
  }

  return {
    found: true,
    account_id: account.id,
    name: account.name,
    city: account.city,
    buyer: account.buyer,
    matched_by: matchedBy,
    confidence,
    price_tier: account.tier,
    terms: account.terms,
    license_on_file: account.license,
    license_in_email: license || null,
  };
}

function matchProducts({ lines } = {}) {
  if (!Array.isArray(lines) || !lines.length)
    throw toolError('lines must be a non-empty array');
  return { matches: lines.slice(0, 25).map(matchLine) };
}

function checkInventory({ items } = {}) {
  if (!Array.isArray(items) || !items.length)
    throw toolError('items must be a non-empty array');
  return {
    items: items.slice(0, 25).map(item => {
      const { sku, qty } = item && typeof item === 'object' ? item : {};
      const product = productBySku(sku);
      if (!product) return { sku: sku || null, status: 'unknown_sku' };
      const requested = Math.max(0, Math.round(Number(qty) || 0));
      const status =
        product.available === 0
          ? 'out_of_stock'
          : product.available >= requested
          ? 'in_stock'
          : 'partial';
      return {
        sku: product.sku,
        name: product.name,
        requested,
        available: product.available,
        status,
        batch: product.batch,
        package_tag: product.packageTag,
        ...(status !== 'in_stock' &&
          product.restockEta && { restock_eta: product.restockEta }),
      };
    }),
  };
}

function proposeSubstitution({ sku, qty } = {}) {
  const original = productBySku(sku);
  if (!original) throw toolError(`Unknown SKU ${sku}`);
  const needed = Math.max(1, Math.round(Number(qty) || original.casePack));

  const candidates = PRODUCTS.filter(
    product =>
      product.sku !== original.sku &&
      product.category === original.category &&
      product.available > 0
  )
    .map(product => {
      const priceDelta = (product.prices.T1 - original.prices.T1) / original.prices.T1;
      const score =
        (product.brand === original.brand ? 0.45 : 0) +
        0.3 * Math.max(0, 1 - Math.abs(priceDelta) / 0.3) +
        (product.available >= needed ? 0.25 : 0.25 * (product.available / needed));
      const reasons = [
        product.brand === original.brand ? 'same brand' : 'same category',
        priceDelta === 0
          ? 'same price'
          : `${priceDelta > 0 ? '+' : ''}${Math.round(priceDelta * 100)}% price`,
        product.available >= needed
          ? `${product.available} in stock`
          : `only ${product.available} in stock`,
      ];
      return {
        sku: product.sku,
        name: product.name,
        available: product.available,
        price_delta_pct: Math.round(priceDelta * 100),
        score: round2(score),
        reason: reasons.join(', '),
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    for_sku: original.sku,
    for_name: original.name,
    qty: needed,
    substitute: candidates[0] || null,
    alternatives: candidates.slice(1, 3),
    note: 'Proposal only. Whether the buyer accepts a swap is decided separately.',
  };
}

function checkLicense({ account_id, license_number, delivery_date } = {}) {
  const account =
    accountById(account_id) ||
    ACCOUNTS.find(item => item.license === String(license_number || '').toUpperCase());
  const today = isoToday();
  const onDate = validDate(delivery_date) ? delivery_date : today;

  if (!account) {
    return {
      status: 'not_found',
      ok: false,
      license_number: license_number || null,
      checked_for: onDate,
    };
  }

  const given = String(license_number || '')
    .trim()
    .toUpperCase();
  const mismatch = Boolean(given) && given !== account.license;
  const daysLeft = daysBetween(onDate, account.licenseExpires);
  let status = 'active';
  if (account.licenseExpires < today) status = 'expired';
  else if (account.licenseExpires < onDate) status = 'expires_before_delivery';
  else if (mismatch) status = 'number_mismatch';

  return {
    licensee: account.name,
    license_number: account.license,
    ...(mismatch && { license_in_email: given }),
    type: 'Retailer (sample registry)',
    expires: account.licenseExpires,
    checked_for: onDate,
    checked_for_source: validDate(delivery_date)
      ? 'requested delivery date'
      : 'today (no delivery date)',
    days_valid_after: daysLeft,
    status,
    ok: status === 'active',
  };
}

export function priceLines(account, lines) {
  const tier = account?.tier || 'T1';
  return lines.map(line => {
    const product = productBySku(line.sku);
    const qty = Math.max(0, Math.round(Number(line.qty) || 0));
    const unitPrice = product ? product.prices[tier] : 0;
    return { ...line, qty, unit_price: unitPrice, line_total: round2(unitPrice * qty) };
  });
}

function checkCredit({ account_id, order_total } = {}) {
  const account = accountById(account_id);
  if (!account) throw toolError(`Unknown account ${account_id}`);
  const total = round2(Math.max(0, Number(order_total) || 0));
  const available = round2(account.creditLimit - account.openBalance);
  const withinLimit = total <= available;
  return {
    account_id: account.id,
    terms: account.terms,
    credit_limit: account.creditLimit,
    open_balance: account.openBalance,
    available_credit: available,
    order_total: total,
    on_hold: account.creditHold,
    ...(account.creditHold && { hold_reason: account.holdReason }),
    within_limit: withinLimit,
    ok: !account.creditHold && withinLimit,
  };
}

function draftSalesOrder({ account_id, delivery_date, lines } = {}) {
  const account = accountById(account_id);
  if (!account) throw toolError(`Unknown account ${account_id}`);
  if (!Array.isArray(lines) || !lines.length)
    throw toolError('lines must be a non-empty array');

  const priced = priceLines(
    account,
    lines.slice(0, 25).map(line => {
      if (!line || typeof line !== 'object')
        throw toolError('each line needs a sku and qty');
      const product = productBySku(line.sku);
      if (!product) throw toolError(`Unknown SKU ${line.sku}`);
      return {
        sku: product.sku,
        name: product.name,
        qty: line.backorder ? 0 : line.qty,
        requested: Math.round(Number(line.requested ?? line.qty) || 0),
        batch: product.batch,
        package_tag: product.packageTag,
        ...(line.note && { note: String(line.note).slice(0, 120) }),
        ...(line.substitute_for && { substitute_for: line.substitute_for }),
        ...(line.backorder && { backorder: true }),
      };
    })
  );

  const subtotal = round2(priced.reduce((sum, line) => sum + line.line_total, 0));
  const signature = priced.map(line => `${line.sku}:${line.qty}`).join('|') + account.id;
  let hash = 0;
  for (const char of signature) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  return {
    order_id: `SO-D${String(hash % 100000).padStart(5, '0')}`,
    status: 'draft',
    account_id: account.id,
    customer: account.name,
    price_tier: account.tier,
    terms: account.terms,
    delivery_date: validDate(delivery_date) ? delivery_date : null,
    lines: priced,
    subtotal,
    total: subtotal,
    note: 'Draft only. Nothing is submitted, allocated or reported to track-and-trace.',
  };
}

// --- tool registry: one definition serves the agent, the MCP server and the tool box -----

const str = description => ({ type: 'string', description });
const int = description => ({ type: 'integer', minimum: 0, description });

export const TOOLS = [
  {
    name: 'lookup_account',
    title: 'Look up customer account',
    description:
      'Find a retail customer account (CRM) by state license number, email address or store name. Returns tier, terms and the license on file.',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        name: str('Store or company name as written by the buyer'),
        license_number: str('State cannabis license number, e.g. C10-9000412-LIC'),
        email: str("Buyer's email address"),
      },
    },
    example: { name: 'Copperleaf Collective', email: 'marcus@copperleaf.example' },
    run: lookupAccount,
  },
  {
    name: 'match_products',
    title: 'Match order lines to SKUs',
    description:
      'Fuzzy-match free-text order lines ("the blue dream eighths", "GSC 5 packs") to catalog SKUs. Returns the best SKU, a 0-1 confidence and alternatives.',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        lines: {
          type: 'array',
          maxItems: 25,
          items: {
            type: 'object',
            properties: {
              text: str("The buyer's words for one item"),
              sku_guess: str('A SKU if the buyer gave one'),
            },
            required: ['text'],
          },
        },
      },
      required: ['lines'],
    },
    example: {
      lines: [
        { text: 'a case of the blue dream eighths' },
        { text: 'GG live resin carts' },
      ],
    },
    run: matchProducts,
  },
  {
    name: 'check_inventory',
    title: 'Check inventory',
    description:
      'Available units per SKU with batch and package tag. Status is in_stock, partial or out_of_stock, with a restock ETA when short.',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          maxItems: 25,
          items: {
            type: 'object',
            properties: { sku: str('Catalog SKU'), qty: int('Units requested') },
            required: ['sku', 'qty'],
          },
        },
      },
      required: ['items'],
    },
    example: {
      items: [
        { sku: 'KES-VP-GC1G', qty: 50 },
        { sku: 'LBR-ED-MB10', qty: 40 },
      ],
    },
    run: checkInventory,
  },
  {
    name: 'propose_substitution',
    title: 'Propose a substitute',
    description:
      'For a short or out-of-stock SKU, rank in-stock products in the same category by brand, price and stock. Proposes only; it never changes an order.',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        sku: str('SKU that is short or out of stock'),
        qty: int('Units needed'),
      },
      required: ['sku'],
    },
    example: { sku: 'KES-VP-GC1G', qty: 50 },
    run: proposeSubstitution,
  },
  {
    name: 'check_license',
    title: 'Check state license',
    description:
      "Check the buyer's state license against the sample registry on the requested delivery date: active, expired, expires_before_delivery, number_mismatch or not_found.",
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        account_id: str('Account id from lookup_account'),
        license_number: str('License number from the email, if any'),
        delivery_date: {
          type: 'string',
          format: 'date',
          description: 'Requested delivery date, YYYY-MM-DD',
        },
      },
    },
    example: { account_id: 'ACC-1103', delivery_date: '2026-12-03' },
    run: checkLicense,
  },
  {
    name: 'check_credit',
    title: 'Check credit',
    description:
      'Terms, open balance, available credit and credit-hold status for an account against an order total.',
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        account_id: str('Account id from lookup_account'),
        order_total: { type: 'number', minimum: 0, description: 'Order total in USD' },
      },
      required: ['account_id', 'order_total'],
    },
    example: { account_id: 'ACC-1120', order_total: 1800 },
    run: checkCredit,
  },
  {
    name: 'draft_sales_order',
    title: 'Draft sales order',
    description:
      "Price lines at the account's tier and return a draft sales order with batches and package tags. Drafts only: nothing is submitted or reported.",
    readOnly: true,
    inputSchema: {
      type: 'object',
      properties: {
        account_id: str('Account id from lookup_account'),
        delivery_date: { type: 'string', format: 'date', description: 'YYYY-MM-DD' },
        lines: {
          type: 'array',
          maxItems: 25,
          items: {
            type: 'object',
            properties: {
              sku: str('Catalog SKU'),
              qty: int('Units to ship'),
              substitute_for: str('Original SKU, when this line is a substitute'),
              backorder: {
                type: 'boolean',
                description: 'Keep the line on the order with nothing shipped now',
              },
              note: str('Short line note'),
            },
            required: ['sku', 'qty'],
          },
        },
      },
      required: ['account_id', 'lines'],
    },
    example: {
      account_id: 'ACC-1042',
      delivery_date: '2026-12-01',
      lines: [
        { sku: 'SUN-FL-BD35', qty: 48 },
        { sku: 'TDW-PR-SD1G', qty: 50 },
      ],
    },
    run: draftSalesOrder,
  },
];

export const MCP_SERVER = { name: 'distru-orders', version: '0.1.0' };

/** The tools as an MCP server lists them (tools/list). */
export const MCP_TOOLS = TOOLS.map(
  ({ name, title, description, inputSchema, readOnly }) => ({
    name,
    title,
    description,
    inputSchema,
    annotations: { readOnlyHint: readOnly, openWorldHint: false },
  })
);

/** Runs one tool by name. Throws an error with `toolError: true` for bad arguments. */
export function callTool(name, args) {
  const tool = TOOLS.find(item => item.name === name);
  if (!tool) throw toolError(`Unknown tool ${name}`);
  if (args != null && (typeof args !== 'object' || Array.isArray(args)))
    throw toolError('arguments must be an object');
  return tool.run(args || {});
}

/** One-line, human summary of a tool result for the trace, with a level for colour. */
export function summarizeTool(name, result) {
  if (!result) return { level: 'fail', text: 'No result' };
  switch (name) {
    case 'lookup_account':
      return result.found
        ? {
            level: 'ok',
            text: `${result.name} (${result.account_id}), by ${result.matched_by.replace(
              '_',
              ' '
            )}`,
          }
        : { level: 'fail', text: 'No matching account' };
    case 'match_products': {
      const matched = result.matches.filter(match => match.sku);
      const unsure = matched.filter(match => match.confidence < 0.75).length;
      const missing = result.matches.length - matched.length;
      const level = missing ? 'fail' : unsure ? 'warn' : 'ok';
      return {
        level,
        text: `${matched.length}/${result.matches.length} matched${
          unsure ? `, ${unsure} uncertain` : ''
        }${missing ? `, ${missing} unknown` : ''}`,
      };
    }
    case 'check_inventory': {
      const out = result.items.filter(item => item.status === 'out_of_stock').length;
      const partial = result.items.filter(item => item.status === 'partial').length;
      if (!out && !partial)
        return { level: 'ok', text: `All ${result.items.length} lines in stock` };
      return {
        level: 'warn',
        text: [out && `${out} out of stock`, partial && `${partial} short`]
          .filter(Boolean)
          .join(', '),
      };
    }
    case 'propose_substitution':
      return result.substitute
        ? { level: 'ok', text: `${result.substitute.name} (${result.substitute.reason})` }
        : { level: 'warn', text: 'No in-stock substitute' };
    case 'check_license':
      if (result.ok) return { level: 'ok', text: `Active until ${result.expires}` };
      if (result.status === 'expires_before_delivery')
        return {
          level: 'fail',
          text: `Expires ${result.expires}, before ${result.checked_for} delivery`,
        };
      if (result.status === 'expired')
        return { level: 'fail', text: `Expired ${result.expires}` };
      if (result.status === 'number_mismatch')
        return { level: 'fail', text: 'License number does not match file' };
      return { level: 'fail', text: 'No license on file' };
    case 'check_credit':
      if (result.on_hold)
        return { level: 'fail', text: `Credit hold: ${result.hold_reason}` };
      return result.within_limit
        ? {
            level: 'ok',
            text: `${usd(result.order_total)} within ${usd(
              result.available_credit
            )} available`,
          }
        : {
            level: 'fail',
            text: `Over limit by ${usd(result.order_total - result.available_credit)}`,
          };
    case 'draft_sales_order':
      return {
        level: 'ok',
        text: `${result.order_id}, ${result.lines.length} lines, ${usd(result.total)}`,
      };
    default:
      return { level: 'ok', text: 'Done' };
  }
}
