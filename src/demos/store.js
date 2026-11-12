// Counters and small cached values for demo API routes.
// Durable when Upstash Redis is connected (Vercel Marketplace sets KV_REST_API_URL and
// KV_REST_API_TOKEN); otherwise an in-memory fallback that only lasts per serverless instance.

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasDurableStore = Boolean(url && token);

const memory = new Map(); // key -> { value, expiresAt }

function pruneMemory(now) {
  if (memory.size < 5000) return;
  for (const [key, item] of memory) if (item.expiresAt <= now) memory.delete(key);
}

async function pipeline(commands) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error(`Store request failed (${response.status})`);
  const results = await response.json();
  return results.map(item => {
    if (item.error) throw new Error(`Store error: ${item.error}`);
    return item.result;
  });
}

/** Adds `amount` to a counter that expires `ttlSeconds` after it was created; returns the new total. */
export async function incrementWindow(key, amount, ttlSeconds) {
  if (hasDurableStore) {
    const [, total] = await pipeline([
      ['SET', key, '0', 'EX', String(ttlSeconds), 'NX'],
      ['INCRBY', key, String(amount)],
    ]);
    return Number(total);
  }

  const now = Date.now();
  pruneMemory(now);
  let item = memory.get(key);
  if (!item || item.expiresAt <= now) item = { value: 0, expiresAt: now + ttlSeconds * 1000 };
  item.value += amount;
  memory.set(key, item);
  return item.value;
}

export async function getJSON(key) {
  if (hasDurableStore) {
    const [value] = await pipeline([['GET', key]]);
    return value == null ? null : JSON.parse(value);
  }
  const item = memory.get(key);
  return item && item.expiresAt > Date.now() ? item.value : null;
}

export async function setJSON(key, value, ttlSeconds) {
  if (hasDurableStore) {
    await pipeline([['SET', key, JSON.stringify(value), 'EX', String(ttlSeconds)]]);
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** Returns a cached result for `key`, or runs `compute` and caches it (saves credits on repeats). */
export async function cached(key, ttlSeconds, compute) {
  const hit = await getJSON(`cache:${key}`);
  if (hit != null) return hit;
  const value = await compute();
  await setJSON(`cache:${key}`, value, ttlSeconds);
  return value;
}
