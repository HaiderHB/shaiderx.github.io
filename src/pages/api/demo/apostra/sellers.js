// Three sample seller agents for the Apostra demo, simulated server-side (not a route: only *.api.js
// files are). Each answers AdCP-style MCP tools: tools/list, get_products and create_media_buy, with
// shapes taken from the public AdCP media-buy task reference (products with format_options and
// pricing_options; create_media_buy with an idempotency_key, answering completed or input-required).
// availability and content_adjacency are demo fields the sellers add so the guardrails have
// something to check. The sellers, products and prices are fictional sample data.
import crypto from 'crypto';
import { getJSON, setJSONIfAbsent } from 'demos/store';

const hash = (...parts) => crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex');

const DEC = { start: '2026-12-01', end: '2026-12-31' };
const video = [
  { format_option_id: 'video_15s', format_kind: 'video_hosted', params: { duration_s: 15 } },
  { format_option_id: 'video_30s', format_kind: 'video_hosted', params: { duration_s: 30 } },
];
const audio = [{ format_option_id: 'audio_30s', format_kind: 'audio_hosted', params: { duration_s: 30 } }];
const hostRead = [{ format_option_id: 'host_read_60s', format_kind: 'audio_host_read', params: { duration_s: 60 } }];
const fixed = (id, price) => [{ pricing_option_id: id, pricing_model: 'cpm', currency: 'USD', fixed_price: price }];

export const SELLERS = {
  riverline: {
    id: 'riverline',
    name: 'Riverline TV',
    kind: 'CTV network',
    agent: 'https://agent.riverline-tv.example/mcp',
    prefix: 'rl',
    products: [
      {
        product_id: 'rl_prime_ctv',
        name: 'Prime-time CTV, entertainment',
        description: 'Non-skippable 15/30 s spots in prime-time series and films on the Riverline apps.',
        channels: ['ctv'],
        format_options: video,
        delivery_type: 'guaranteed',
        pricing_options: fixed('rl_po_prime', 34),
        audience: { geo: ['US'], age_min: 25, age_max: 54 },
        availability: { ...DEC, impressions: 900_000 },
        content_adjacency: ['entertainment'],
      },
      {
        product_id: 'rl_fast_channels',
        name: 'FAST channels, run of network',
        description: 'Free ad-supported channels across the network, auction-cleared.',
        channels: ['ctv'],
        format_options: video,
        delivery_type: 'non_guaranteed',
        pricing_options: fixed('rl_po_fast', 22),
        audience: { geo: ['US'], age_min: 18, age_max: 64 },
        availability: { ...DEC, impressions: 2_400_000 },
        content_adjacency: ['entertainment', 'reality'],
      },
      {
        product_id: 'rl_holiday_premieres',
        name: 'Holiday premieres takeover',
        description: 'Sole sponsor of the December premiere slate.',
        channels: ['ctv'],
        format_options: video,
        delivery_type: 'guaranteed',
        pricing_options: fixed('rl_po_premieres', 52),
        audience: { geo: ['US'], age_min: 18, age_max: 54 },
        availability: { ...DEC, impressions: 400_000 },
        content_adjacency: ['entertainment'],
      },
    ],
  },
  hollowpine: {
    id: 'hollowpine',
    name: 'Hollow Pine Audio',
    kind: 'Podcast network',
    agent: 'https://agent.hollowpine.example/mcp',
    prefix: 'hp',
    products: [
      {
        product_id: 'hp_top_shows',
        name: 'Top-20 shows, host-read',
        description: 'Host-read mid-rolls across the network’s twenty biggest shows.',
        channels: ['podcast'],
        format_options: hostRead,
        delivery_type: 'guaranteed',
        pricing_options: fixed('hp_po_top', 30),
        audience: { geo: ['US'], age_min: 25, age_max: 44 },
        availability: { ...DEC, impressions: 500_000 },
        content_adjacency: ['comedy', 'true_crime', 'culture'],
      },
      {
        product_id: 'hp_run_of_network',
        name: 'Run of network, dynamic audio',
        description: 'Dynamically inserted 30 s audio across all shows.',
        channels: ['podcast'],
        format_options: audio,
        delivery_type: 'non_guaranteed',
        pricing_options: fixed('hp_po_ron', 18),
        audience: { geo: ['US'], age_min: 18, age_max: 54 },
        availability: { ...DEC, impressions: 1_800_000 },
        content_adjacency: ['comedy', 'culture', 'sports'],
      },
      {
        product_id: 'hp_odds_pack',
        name: 'Sports & Odds pod pack',
        description: 'Daily picks and odds shows, sponsored by sportsbooks.',
        channels: ['podcast'],
        format_options: hostRead,
        delivery_type: 'guaranteed',
        pricing_options: fixed('hp_po_odds', 24),
        audience: { geo: ['US'], age_min: 21, age_max: 54 },
        availability: { ...DEC, impressions: 700_000 },
        content_adjacency: ['sports', 'gambling'],
      },
    ],
  },
  meridian: {
    id: 'meridian',
    name: 'The Meridian Post',
    kind: 'News publisher',
    agent: 'https://agent.meridianpost.example/mcp',
    prefix: 'mp',
    // News pre-roll is short on December inventory: a list-price order gets a counteroffer
    counterCpm: 44,
    products: [
      {
        product_id: 'mp_live_ctv',
        name: 'Meridian Live CTV app, news pre-roll',
        description: 'Pre-roll on the Meridian Live streaming app: news, business and culture.',
        channels: ['ctv'],
        format_options: video,
        delivery_type: 'guaranteed',
        pricing_options: fixed('mp_po_live', 36),
        audience: { geo: ['US'], age_min: 25, age_max: 54 },
        availability: { ...DEC, impressions: 600_000 },
        content_adjacency: ['news', 'business'],
      },
      {
        product_id: 'mp_year_review',
        name: 'Year in review video series',
        description: 'Video series published after Christmas.',
        channels: ['ctv', 'online_video'],
        format_options: video,
        delivery_type: 'guaranteed',
        pricing_options: fixed('mp_po_review', 28),
        audience: { geo: ['US'], age_min: 25, age_max: 64 },
        availability: { start: '2026-12-26', end: '2027-01-10', impressions: 300_000 },
        content_adjacency: ['news'],
      },
      {
        product_id: 'mp_morning_brief',
        name: 'Morning Brief podcast',
        description: 'Daily 20-minute news podcast, pre-roll.',
        channels: ['podcast'],
        format_options: audio,
        delivery_type: 'guaranteed',
        pricing_options: fixed('mp_po_brief', 41),
        audience: { geo: ['US'], age_min: 25, age_max: 54 },
        availability: { ...DEC, impressions: 250_000 },
        content_adjacency: ['news'],
      },
    ],
  },
};

export const SELLER_IDS = Object.keys(SELLERS);
export const sellerSummary = () =>
  SELLER_IDS.map(id => ({ id, name: SELLERS[id].name, kind: SELLERS[id].kind, agent: SELLERS[id].agent }));

/** tools/list: the AdCP media-buy tools each sample seller exposes over MCP. */
export const TOOLS = [
  {
    name: 'get_products',
    description: 'Discover advertising products for a brief: formats, audiences, pricing and availability.',
    inputSchema: {
      type: 'object',
      properties: {
        buying_mode: { enum: ['brief', 'wholesale'] },
        brief: { type: 'string' },
        brand: { type: 'object' },
        filters: { type: 'object' },
      },
      required: ['buying_mode'],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'list_creative_formats',
    description: 'The creative formats this seller accepts.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'create_media_buy',
    description: 'Book packages from get_products. idempotency_key makes retries safe: the same key returns the same buy.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string', minLength: 16 },
        brand: { type: 'object' },
        packages: { type: 'array' },
        start_time: { type: 'string' },
        end_time: { type: 'string' },
      },
      required: ['idempotency_key', 'brand', 'packages', 'start_time', 'end_time'],
    },
  },
];

export function toolsList() {
  return { tools: TOOLS.map(({ name, description, annotations }) => ({ name, description, ...(annotations && { annotations }) })) };
}

/** get_products: the seller's products in the requested channels (AdCP-style response). */
export function getProducts(sellerId, args) {
  const seller = SELLERS[sellerId];
  const channels = args?.filters?.channels || [];
  const products = seller.products.filter(
    product => !channels.length || product.channels.some(channel => channels.includes(channel))
  );
  return {
    status: 'completed',
    message: products.length
      ? `${products.length} ${products.length === 1 ? 'product' : 'products'} for ${channels.join(' + ') || 'all channels'} in your flight.`
      : 'Nothing in those channels this month.',
    products,
    pagination: { has_more: false },
    cache_scope: 'public',
  };
}

export const productById = (sellerId, productId) =>
  SELLERS[sellerId]?.products.find(product => product.product_id === productId) || null;

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;
const BUY_TTL = 3 * 24 * 3600;

/** Same request → same fingerprint; a reused key with a different body is refused. */
const fingerprint = args =>
  hash(
    JSON.stringify({
      packages: (args.packages || []).map(p => [p.product_id, p.pricing_option_id, p.budget]),
      start: args.start_time,
      end: args.end_time,
    })
  ).slice(0, 16);

// The sample sellers keep their idempotency records in Redis when the site has it. Serverless
// instances without it do not share memory, so each record is also signed (HMAC) and handed back
// with the booking; a retry that lands on a cold instance brings the seller's own record with it.
// A real seller keeps this in its database; the signature means the page cannot forge one.
const SECRET = hash('apostra-seller-records', process.env.DEMO_SIGNING_SECRET || process.env.JEV_API_KEY || process.env.FAL_API_KEY || 'local');

export function signRecord(sellerId, key, record) {
  const body = Buffer.from(JSON.stringify({ s: sellerId, k: key, ...record })).toString('base64url');
  return `${body}.${crypto.createHmac('sha256', SECRET).update(body).digest('base64url')}`;
}

function readRecord(token, sellerId, key) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const record = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return record.s === sellerId && record.k === key ? record : null;
  } catch {
    return null;
  }
}

/**
 * create_media_buy with an idempotency key. The key is claimed atomically (SET NX) together with
 * the response, so a retry with the same key gets the stored response back and nothing is booked
 * twice. The media buy id is also derived from the key, a second lock for a store that forgot.
 * record: the signed record from an earlier reply (see above). Returns { response, replayed,
 * record, error }.
 */
export async function createMediaBuy(sellerId, args, { record } = {}) {
  const seller = SELLERS[sellerId];
  if (!seller) return { error: 'Unknown seller.' };
  const key = String(args?.idempotency_key || '');
  if (!KEY_PATTERN.test(key)) return { error: 'idempotency_key must be 16-80 letters, digits, _ or -.' };
  const packages = Array.isArray(args.packages) ? args.packages.slice(0, 6) : [];
  if (!packages.length) return { error: 'packages is empty.' };
  for (const pkg of packages) {
    const product = productById(sellerId, pkg.product_id);
    if (!product) return { error: `Unknown product ${String(pkg.product_id).slice(0, 40)}.` };
    const budget = Number(pkg.budget?.amount ?? pkg.budget);
    if (!Number.isFinite(budget) || budget < 500 || budget > 500_000) return { error: 'Package budget out of range.' };
  }

  const storeKey = `apostra:buy:${sellerId}:${key}`;
  const print = fingerprint(args);
  const existing = (await getJSON(storeKey)) || readRecord(record, sellerId, key);
  if (existing) {
    if (existing.fingerprint !== print) {
      return { error: 'IDEMPOTENCY_CONFLICT: this key was used for a different request.' };
    }
    return {
      response: existing.response,
      replayed: true,
      record: signRecord(sellerId, key, { fingerprint: existing.fingerprint, response: existing.response }),
    };
  }

  const response = respond(seller, key, packages);
  const claimed = await setJSONIfAbsent(storeKey, { fingerprint: print, response }, BUY_TTL);
  if (!claimed) {
    // Another request with the same key won the race: return what it stored
    const winner = await getJSON(storeKey);
    if (winner) {
      return { response: winner.response, replayed: true, record: signRecord(sellerId, key, winner) };
    }
  }
  return { response, replayed: false, record: signRecord(sellerId, key, { fingerprint: print, response }) };
}

function respond(seller, key, packages) {
  const id = hash(seller.id, key).slice(0, 6).toUpperCase();
  const counterOffer = seller.counterCpm
    ? packages.find(pkg => {
        const product = productById(seller.id, pkg.product_id);
        return product?.product_id === 'mp_live_ctv' && pkg.pricing_option_id === product.pricing_options[0].pricing_option_id;
      })
    : null;

  if (counterOffer) {
    const amount = Number(counterOffer.budget?.amount ?? counterOffer.budget);
    return {
      status: 'input-required',
      task_id: `${seller.prefix}_task_${id}`,
      message: `News pre-roll at $36 is sold out for Dec 1-14. We can run the full flight at $${seller.counterCpm} CPM for the same $${amount.toLocaleString('en-US')}. Accept?`,
      counter_offer: {
        product_id: counterOffer.product_id,
        pricing_option_id: `${seller.prefix}_po_counter`,
        pricing_model: 'cpm',
        currency: 'USD',
        fixed_price: seller.counterCpm,
        budget: { amount, currency: 'USD' },
        reason: 'first-half avails sold out at list price',
        valid_until: '2026-11-25T00:00:00Z',
      },
    };
  }

  return {
    status: 'completed',
    media_buy_id: `${seller.prefix}_mb_${id}`,
    media_buy_status: 'pending_creatives',
    confirmed_at: new Date().toISOString(),
    creative_deadline: '2026-11-27T00:00:00Z',
    revision: 1,
    message: `Booked ${packages.length} ${packages.length === 1 ? 'package' : 'packages'}. Send creatives by Nov 27.`,
    packages: packages.map((pkg, index) => ({
      package_id: `${seller.prefix}_pkg_${id}_${index + 1}`,
      product_id: pkg.product_id,
      budget: pkg.budget,
      formats_to_provide: productById(seller.id, pkg.product_id).format_options.map(f => f.format_option_id),
    })),
  };
}

/** The buyer accepts a counteroffer: the same package at the counter price, under its own key. */
export function counterAcceptArgs(sellerId, originalArgs, counter) {
  return {
    ...originalArgs,
    idempotency_key: `${originalArgs.idempotency_key}-acc`.slice(0, 80),
    packages: originalArgs.packages.map(pkg =>
      pkg.product_id === counter.product_id ? { ...pkg, pricing_option_id: counter.pricing_option_id } : pkg
    ),
  };
}

/** Price per package, including an accepted counter. */
export function packagePrice(sellerId, pkg) {
  const seller = SELLERS[sellerId];
  if (pkg.pricing_option_id === `${seller.prefix}_po_counter`) return seller.counterCpm;
  return productById(sellerId, pkg.product_id)?.pricing_options[0].fixed_price ?? null;
}
