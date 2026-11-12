// Guard for every demo API route (src/pages/api/demo/<slug>/*.api.js).
// Layers, cheapest first: kill switch -> method -> per-recipient key -> per-IP request rate
// -> daily cost budgets (per IP, per key, per demo, all demos). Provider spend caps are the backstop.
import { checkDemoKey } from './keys';
import { hasDurableStore, incrementWindow } from './store';

/** Rough cost units per call (about 1 US cent each). Pass one as `cost`, or a function of req. */
export const COST = {
  free: 0,
  decision: 1,
  llm: 1,
  voice: 3,
  image: 4,
  realtimeMinute: 10,
  video: 40,
};

function limit(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const LIMITS = {
  ipPerMinute: limit('DEMO_IP_REQUESTS_PER_MINUTE', 12),
  ipUnitsPerDay: limit('DEMO_IP_UNITS_PER_DAY', 60),
  keyUnitsPerDay: limit('DEMO_KEY_UNITS_PER_DAY', 150),
  demoUnitsPerDay: limit('DEMO_UNITS_PER_DAY', 300),
  totalUnitsPerDay: limit('DEMOS_TOTAL_UNITS_PER_DAY', 1000),
};

let warnedNoStore = false;

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function slugFromUrl(url) {
  // /api/demo/<slug>/... -> <slug>
  return String(url).split('?')[0].split('/')[3] || 'unknown';
}

function refuse(res, status, error, code) {
  return res.status(status).json({ error, code });
}

const KEY_MESSAGES = {
  missing: 'Live mode needs the private link from my email.',
  invalid: 'This demo link is not valid. Use the link from my email.',
  expired: 'This demo link has expired. Email me and I will send a fresh one.',
};

/**
 * Wraps a demo API route.
 * - cost: units per call (COST.*), or (req) => units for variable work (e.g. video seconds).
 * - requireKey: defaults to true for any call that costs something.
 * The handler gets (req, res, { slug, ip, key, units }).
 */
export function demoApi(handler, { cost = COST.llm, methods = ['POST'], requireKey } = {}) {
  return async (req, res) => {
    try {
      if (process.env.DEMOS_DISABLED === 'true') {
        return refuse(res, 503, 'Live demos are paused right now.', 'demos_paused');
      }

      if (!methods.includes(req.method)) {
        res.setHeader('Allow', methods.join(', '));
        return refuse(res, 405, 'Method not allowed', 'method');
      }

      if (!hasDurableStore && process.env.NODE_ENV === 'production' && !warnedNoStore) {
        warnedNoStore = true;
        console.warn('[demo api] No Upstash Redis connected: limits are per instance only.');
      }

      const slug = slugFromUrl(req.url);
      const units = Math.max(0, Math.ceil(typeof cost === 'function' ? await cost(req) : cost));
      const needsKey = requireKey ?? units > 0;

      let key = null;
      if (needsKey) {
        const check = checkDemoKey(slug, req.headers['x-demo-key']);
        if (!check.ok) return refuse(res, 401, KEY_MESSAGES[check.reason], `key_${check.reason}`);
        key = check;
      }

      const ip = clientIp(req);
      const minute = Math.floor(Date.now() / 60_000);
      const day = new Date().toISOString().slice(0, 10);

      if ((await incrementWindow(`rl:${ip}:${minute}`, 1, 70)) > LIMITS.ipPerMinute) {
        return refuse(res, 429, 'Too many requests. Try again in a minute.', 'rate');
      }

      if (units > 0) {
        const budgets = [
          [`u:ip:${ip}:${day}`, LIMITS.ipUnitsPerDay],
          key && [`u:key:${key.id}:${day}`, key.unitsPerDay ?? LIMITS.keyUnitsPerDay],
          [`u:demo:${slug}:${day}`, LIMITS.demoUnitsPerDay],
          [`u:all:${day}`, LIMITS.totalUnitsPerDay],
        ].filter(Boolean);

        for (const [counter, max] of budgets) {
          if ((await incrementWindow(counter, units, 90_000)) > max) {
            return refuse(
              res,
              429,
              "Today's live budget for this demo is used up. It resets at midnight UTC.",
              'budget'
            );
          }
        }
      }

      await handler(req, res, { slug, ip, key, units });
    } catch (error) {
      console.error('[demo api]', req.url, error);
      if (!res.headersSent) refuse(res, 500, 'Something went wrong.', 'error');
      else res.end();
    }
  };
}

/** Trims user input to a safe length before it reaches a paid model. */
export function clampText(value, max = 2000) {
  return String(value ?? '').slice(0, max);
}

/** Reads a required env var, failing with a clear message instead of a vague 500. */
export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} (set it in Vercel)`);
  return value;
}

/** Starts a plain-text streaming response; write() chunks, then end(). */
export function startStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  return {
    write: text => res.write(text),
    end: () => res.end(),
  };
}
