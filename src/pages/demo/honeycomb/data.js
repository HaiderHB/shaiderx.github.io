// Sample telemetry for the Honeycomb demo: about 18,000 spans over two hours for a small
// e-commerce system, generated in code from a fixed seed (same spans on every machine).
// Five scenarios, each with one planted incident and at least one red herring. Nothing here
// is real data. Pure JS: used by the API routes and by scripts/demo-assets.

export const MINUTES = 120;
export const SLO = {
  name: 'Checkout latency',
  target: 0.99,
  thresholdMs: 1200,
  sli: 'POST /checkout answered under 1,200 ms without a 5xx',
};
export const END_CLOCK = 14 * 60 + 20; // the alert fires at 14:20 UTC, the last minute of data

export const REGIONS = [
  ['us-east-1', 0.4],
  ['us-west-2', 0.23],
  ['eu-west-1', 0.25],
  ['ap-southeast-2', 0.12],
];

const SERVICES = {
  'frontend': { build: '9.3.0', ms: 18 },
  'cart-svc': { build: '3.8.0', ms: 34 },
  'checkout-svc': { build: '5.1.2', ms: 38 },
  'payment-svc': { build: '2.14.2', ms: 175 },
  'inventory-svc': { build: '1.22.0', ms: 44 },
};
export const SERVICE_NAMES = Object.keys(SERVICES);

// The attributes attribute_diff compares when the caller names none
export const STANDARD_ATTRIBUTES = [
  'service.name',
  'http.route',
  'status_code',
  'region',
  'build.id',
  'k8s.pod.name',
  'tenant.id',
  'user.tier',
];
export const APP_ATTRIBUTES = [
  'app.feature_flag.new_tax_calc',
  'app.feature_flag.express_checkout',
  'app.feature_flag.saved_cards',
  'app.cart.items',
  'app.payment.method',
  'app.client.version',
];
export const ALL_ATTRIBUTES = [...STANDARD_ATTRIBUTES, ...APP_ATTRIBUTES];

const NAMED_TENANTS = [
  'globex-retail',
  'initech',
  'umbrella-eu',
  'hooli-shop',
  'stark-supply',
  'wonka-direct',
  'acme-outdoor',
  'tyrell-home',
  'soylent-foods',
  'vandelay-imports',
];

/**
 * The five planted incidents. `slow(span, minute)` returns a duration multiplier (and
 * optionally an error rate) for one span; `truth` is what the eval grades against:
 * the service, the attribute pairs a correct answer must name, and pairs it must not blame.
 */
export const SCENARIOS = [
  {
    id: 'flag-regression',
    title: 'Regression behind a flag',
    blurb: 'A payment deploy is slow only for one flag in one region. A load test starts minutes earlier.',
    seed: 4107,
    t0: 104,
    deploys: [{ service: 'payment-svc', build: '2.14.3', at: 103 }],
    extra: [{ tenant: 'load-test-eu-7', region: 'eu-west-1', from: 99, rate: 14, heavy: 3 }],
    slow: span =>
      span['service.name'] === 'payment-svc' &&
      span['build.id'] === '2.14.3' &&
      span['app.feature_flag.new_tax_calc'] === 'true' &&
      span.region === 'eu-west-1'
        ? { x: [9, 17] }
        : null,
    truth: {
      hypothesis: 'deploy',
      service: 'payment-svc',
      must: ['build.id=2.14.3', 'app.feature_flag.new_tax_calc=true'],
      detail: ['region=eu-west-1'],
      text: 'payment-svc build 2.14.3 is slow when new_tax_calc is on, in eu-west-1',
    },
  },
  {
    id: 'bad-pod',
    title: 'One bad pod',
    blurb: 'One inventory pod sits on a degraded node. A frontend deploy and a load test land near the same minute.',
    seed: 5521,
    t0: 104,
    deploys: [{ service: 'frontend', build: '9.3.1', at: 101 }],
    extra: [{ tenant: 'load-test-use-2', region: 'us-east-1', from: 100, rate: 14, heavy: 3 }],
    badPod: { service: 'inventory-svc', region: 'us-east-1', index: 1 },
    slow: (span, minute, ctx) =>
      span['k8s.pod.name'] === ctx.badPod && minute >= 104 ? { x: [9, 16], errors: 0.18 } : null,
    truth: {
      hypothesis: 'infra',
      service: 'inventory-svc',
      must: ['k8s.pod.name=$badPod'],
      detail: [],
      text: 'one inventory-svc pod is slow and failing; its siblings on the same build are healthy',
    },
  },
  {
    id: 'tenant-storm',
    title: 'A real noisy tenant',
    blurb: 'One enterprise tenant starts sending huge carts. A checkout deploy just before it is innocent.',
    seed: 6233,
    t0: 104,
    deploys: [{ service: 'checkout-svc', build: '5.1.3', at: 99 }],
    extra: [{ tenant: 'globex-retail', region: 'us-west-2', from: 104, rate: 12, heavy: 30, tier: 'enterprise' }],
    slow: () => null,
    truth: {
      hypothesis: 'tenant',
      service: 'cart-svc',
      anyService: true,
      must: ['tenant.id=globex-retail'],
      detail: [],
      text: 'tenant globex-retail sends very large carts that make its own cart-svc calls slow',
    },
  },
  {
    id: 'region-dependency',
    title: 'One region, innocent deploy',
    blurb: 'Payments are slow in one region on every build. A payment deploy minutes earlier looks guilty.',
    seed: 7349,
    t0: 104,
    deploys: [{ service: 'payment-svc', build: '2.14.3', at: 96 }],
    extra: [],
    slow: (span, minute) =>
      span['service.name'] === 'payment-svc' && span.region === 'ap-southeast-2' && minute >= 104
        ? { x: [7, 13] }
        : null,
    truth: {
      hypothesis: 'infra',
      service: 'payment-svc',
      must: ['region=ap-southeast-2'],
      detail: [],
      forbid: ['build.id=2.14.3'],
      text: 'payment-svc is slow only in ap-southeast-2; the same build is healthy elsewhere',
    },
  },
  {
    id: 'tier-regression',
    title: 'Regression for one tier',
    blurb: 'A cart deploy is slow for enterprise users only. A load test with heavy carts hits the same service.',
    seed: 8467,
    t0: 104,
    deploys: [{ service: 'cart-svc', build: '3.8.1', at: 103 }],
    extra: [{ tenant: 'load-test-use-4', region: 'us-east-1', from: 100, rate: 14, heavy: 3 }],
    slow: span =>
      span['service.name'] === 'cart-svc' && span['build.id'] === '3.8.1' && span['user.tier'] === 'enterprise'
        ? { x: [30, 55] }
        : null,
    truth: {
      hypothesis: 'deploy',
      service: 'cart-svc',
      must: ['build.id=3.8.1', 'user.tier=enterprise'],
      detail: [],
      text: 'cart-svc build 3.8.1 is slow for enterprise-tier users',
    },
  },
];

export const scenarioById = id => SCENARIOS.find(scenario => scenario.id === id) || null;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRandom(seed) {
  const next = mulberry32(seed);
  const api = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    pick: list => list[Math.floor(next() * list.length)],
    weighted(pairs) {
      let roll = next() * pairs.reduce((sum, pair) => sum + pair[1], 0);
      for (const [value, weight] of pairs) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return pairs[pairs.length - 1][0];
    },
    normal() {
      const u = Math.max(next(), 1e-9);
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
    lognormal: (median, sigma) => median * Math.exp(sigma * api.normal()),
    id(length) {
      let out = '';
      for (let i = 0; i < length; i++) out += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(next() * 36)];
      return out;
    },
  };
  return api;
}

export function clock(minute) {
  const total = END_CLOCK - (MINUTES - 1) + Math.floor(minute);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const cache = new Map();

/** Builds (once) the spans and context for a scenario. */
export function dataset(scenarioId) {
  if (cache.has(scenarioId)) return cache.get(scenarioId);
  const scenario = scenarioById(scenarioId);
  if (!scenario) return null;
  const built = build(scenario);
  cache.set(scenarioId, built);
  return built;
}

function build(scenario) {
  const random = makeRandom(scenario.seed);

  // Tenants: ten named accounts and a long tail, each with a home region, a tier and flags
  const tenants = [];
  for (let i = 0; i < 320; i++) {
    const tier = random.weighted([
      ['free', 0.5],
      ['pro', 0.35],
      ['enterprise', 0.15],
    ]);
    tenants.push({
      id: i < NAMED_TENANTS.length ? NAMED_TENANTS[i] : `tn-${random.id(5)}`,
      region: random.weighted(REGIONS),
      tier,
      weight: 1 / Math.pow(i + 3, 0.7),
      flags: {
        new_tax_calc: random.next() < 0.45,
        express_checkout: random.next() < 0.5,
        saved_cards: random.next() < 0.22,
      },
      client: random.weighted([
        ['web-4.2', 0.5],
        ['web-4.3', 0.2],
        ['ios-7.1', 0.18],
        ['android-7.0', 0.12],
      ]),
    });
  }
  const tenantPairs = tenants.map(tenant => [tenant, tenant.weight]);
  // The storm tenant exists before its storm, as a normal account
  for (const extra of scenario.extra) {
    const known = tenants.find(tenant => tenant.id === extra.tenant);
    if (known) Object.assign(known, { region: extra.region, tier: extra.tier || known.tier });
  }

  // Pods: two per service per region; a deploy replaces every pod of that service
  const pods = {};
  const podName = (service, build, region, index) => {
    const key = `${service}|${build}|${region}|${index}`;
    if (!pods[key]) {
      const rs = makeRandom(hashString(`${scenario.seed}|${service}|${build}`)).id(8);
      const short = service.replace('-svc', '');
      pods[key] = `${short}-${rs}-${makeRandom(hashString(key + scenario.seed)).id(5)}`;
    }
    return pods[key];
  };
  const ctx = {};
  if (scenario.badPod) {
    const { service, region, index } = scenario.badPod;
    ctx.badPod = podName(service, SERVICES[service].build, region, index);
  }

  const buildAt = (service, minute) => {
    const deploy = scenario.deploys.find(item => item.service === service);
    if (!deploy) return SERVICES[service].build;
    // Rolls out over about two minutes
    const progress = (minute - deploy.at) / 2;
    return progress >= 1 || (progress > 0 && random.next() < progress) ? deploy.build : SERVICES[service].build;
  };

  const spans = [];
  let traceCount = 0;

  function trace(minute, tenant, route, heavy) {
    traceCount += 1;
    const traceId = random.id(12);
    const shared = {
      'tenant.id': tenant.id,
      'region': tenant.region,
      'user.tier': tenant.tier,
      'app.feature_flag.new_tax_calc': String(tenant.flags.new_tax_calc),
      'app.feature_flag.express_checkout': String(tenant.flags.express_checkout),
      'app.feature_flag.saved_cards': String(tenant.flags.saved_cards),
      'app.cart.items': heavy ? random.int(heavy * 8, heavy * 14) : random.int(1, 9),
      'app.payment.method': random.weighted([
        ['card', 0.7],
        ['wallet', 0.2],
        ['invoice', 0.1],
      ]),
      'app.client.version': tenant.client,
    };

    function span(service, spanRoute, parent, children) {
      const buildId = buildAt(service, minute);
      const row = {
        'ts': minute,
        'trace.id': traceId,
        'span.id': random.id(8),
        'parent.id': parent,
        'service.name': service,
        'http.route': spanRoute,
        'build.id': buildId,
        'k8s.pod.name': podName(service, buildId, tenant.region, random.int(0, 1)),
        ...shared,
      };
      let self = random.lognormal(SERVICES[service].ms, 0.32);
      if (random.next() < 0.012) self *= random.range(2, 3.2); // ordinary tail
      // Heavy carts cost cart and inventory time whatever the build
      if (heavy && (service === 'cart-svc' || service === 'inventory-svc')) self *= heavy * random.range(0.8, 1.2);
      let status = random.next() < 0.002 ? 500 : 200;
      const effect = scenario.slow(row, minute, ctx);
      if (effect) {
        self *= random.range(effect.x[0], effect.x[1]);
        if (effect.errors && random.next() < effect.errors) status = 503;
      }
      const index = spans.push(row) - 1;
      let total = self;
      for (const child of children || []) {
        const done = child(row['span.id']);
        total += done.duration;
        if (done.status >= 500 && random.next() < 0.9) status = 502;
      }
      row.status_code = status;
      row.duration_ms = Math.round(total);
      row.self_ms = Math.round(self);
      spans[index] = row;
      return { duration: total, status };
    }

    const cart = parent => span('cart-svc', 'GET /cart', parent);
    const reserve = parent => span('inventory-svc', 'POST /reserve', parent);
    const stock = parent => span('inventory-svc', 'GET /stock', parent);
    const charge = parent => span('payment-svc', 'POST /charge', parent);

    if (route === 'POST /checkout') {
      span('frontend', route, null, [
        parent => span('checkout-svc', 'POST /checkout', parent, [cart, reserve, charge]),
      ]);
    } else if (route === 'POST /cart/add') {
      span('frontend', route, null, [parent => span('cart-svc', 'POST /cart/add', parent, [stock])]);
    } else if (route === 'GET /cart') {
      span('frontend', route, null, [cart]);
    } else {
      span('frontend', route, null);
    }
  }

  for (let minute = 0; minute < MINUTES; minute++) {
    const base = 52 + Math.round(5 * Math.sin(minute / 9)) + random.int(-3, 3);
    for (let i = 0; i < base; i++) {
      const tenant = random.weighted(tenantPairs);
      const route = random.weighted([
        ['GET /products', 0.3],
        ['GET /cart', 0.22],
        ['POST /cart/add', 0.22],
        ['POST /checkout', 0.26],
      ]);
      trace(minute + random.next(), tenant, route, 0);
    }
    for (const extra of scenario.extra) {
      if (minute < extra.from) continue;
      let tenant = tenants.find(item => item.id === extra.tenant);
      if (!tenant) {
        tenant = {
          id: extra.tenant,
          region: extra.region,
          tier: 'pro',
          flags: { new_tax_calc: false, express_checkout: false, saved_cards: false },
          client: 'loadgen-1.0',
        };
        tenants.push(tenant);
      }
      const count = extra.rate + random.int(-2, 2);
      for (let i = 0; i < count; i++) {
        trace(minute + random.next(), tenant, random.next() < 0.75 ? 'POST /checkout' : 'POST /cart/add', extra.heavy);
      }
    }
  }

  const truth = {
    ...scenario.truth,
    must: scenario.truth.must.map(pair => pair.replace('$badPod', ctx.badPod)),
  };
  const markers = scenario.deploys.map(deploy => ({
    id: `deploy:${deploy.service}@${deploy.build}`,
    service: deploy.service,
    build: deploy.build,
    from: SERVICES[deploy.service].build,
    minute: deploy.at,
    at: clock(deploy.at),
  }));

  return { scenario, spans, traceCount, truth, markers };
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
