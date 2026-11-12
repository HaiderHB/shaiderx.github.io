// Per-recipient demo keys. Only SHA-256 hashes live in keys.json (safe in a public repo);
// the raw key exists only in the link sent to the company. Mint one with:
//   node scripts/demo-key.js <slug> --label "Founder email" [--days 45]
import crypto from 'crypto';
import registry from './keys.json';

export function hashKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest('hex');
}

/** Checks a key from the x-demo-key header against keys.json for this demo. */
export function checkDemoKey(slug, key) {
  if (!key || typeof key !== 'string' || key.length > 100) return { ok: false, reason: 'missing' };

  const hash = Buffer.from(hashKey(key), 'hex');
  const entry = (registry[slug] || []).find(item => {
    const stored = Buffer.from(String(item.hash), 'hex');
    return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
  });

  if (!entry) return { ok: false, reason: 'invalid' };
  if (entry.expires && Date.parse(entry.expires) < Date.now()) return { ok: false, reason: 'expired' };

  return {
    ok: true,
    id: entry.hash.slice(0, 12),
    label: entry.label || null,
    unitsPerDay: entry.unitsPerDay,
  };
}
