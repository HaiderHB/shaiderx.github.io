#!/usr/bin/env node
// Mints a private demo link for one recipient and stores only its hash.
// Usage: node scripts/demo-key.js <slug> --label "Founder email, Nov 13" [--days 45] [--units 150]
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const slug = args[0];
const option = name => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};

if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: node scripts/demo-key.js <slug> --label "..." [--days 45] [--units 150]');
  process.exit(1);
}

const days = Number(option('days') || 45);
const units = option('units') ? Number(option('units')) : undefined;
const key = crypto.randomBytes(12).toString('base64url');
const file = path.join(__dirname, '..', 'src', 'demos', 'keys.json');
const registry = JSON.parse(fs.readFileSync(file, 'utf8'));

registry[slug] = registry[slug] || [];
registry[slug].push({
  hash: crypto.createHash('sha256').update(key).digest('hex'),
  label: option('label') || null,
  created: new Date().toISOString().slice(0, 10),
  expires: new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10),
  ...(units != null && { unitsPerDay: units }),
});

fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`https://haiderb.com/demo/${slug}/?k=${key}`);
