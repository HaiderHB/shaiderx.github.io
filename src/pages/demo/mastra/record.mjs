// Records the page's example run through the real API routes (not a page: Next only builds
// *.page.js here). Needs a running server and a demo key:
//   node src/pages/demo/mastra/record.mjs <demo key> [http://localhost:3202]
// Runs the baseline over all 40 cases (four requests of ten), asks for one suggestion per failure
// cluster, applies every suggestion that passed the checks, runs the candidate over the 40 cases
// and writes example.js. Grading and clustering are the same functions the page uses (bundled
// on the fly with esbuild so this file can import the page's modules).
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const bundle = path.join(root, '.next', 'mastra-record-lib.mjs');
fs.writeFileSync(
  path.join(root, '.next', 'mastra-record-entry.mjs'),
  `export * from ${JSON.stringify(path.join(here, 'agent.js'))};\nexport * from ${JSON.stringify(path.join(here, 'data.js'))};\n`
);
execFileSync(process.execPath, [
  path.join(root, 'node_modules/esbuild/bin/esbuild'),
  path.join(root, '.next', 'mastra-record-entry.mjs'),
  '--bundle',
  '--platform=node',
  '--format=esm',
  `--outfile=${bundle}`,
  '--log-level=warning',
]);
const lib = await import(pathToFileURL(bundle).href);
const { applyChanges, BASELINE_CONFIG, caseById, CASES, clusterResults, compareRuns, condense, workingCalls } = lib;

const URL_BASE = process.env.DEMO_URL || process.argv[3] || 'http://localhost:3202';
const KEY = process.env.DEMO_KEY || process.argv[2];
if (!KEY) throw new Error('Pass the demo key: node record.mjs <key> [url]');

async function post(route, body) {
  const response = await fetch(`${URL_BASE}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-demo-key': KEY },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${route} ${response.status}: ${await response.text()}`);
  return (await response.text())
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

async function bench(config, label) {
  const results = {};
  const ids = CASES.map(testCase => testCase.id);
  for (let start = 0; start < ids.length; start += 10) {
    const events = await post('/api/demo/mastra/bench/', { config, cases: ids.slice(start, start + 10) });
    for (const event of events) {
      if (event.t === 'result') results[event.caseId] = { trace: event.trace, grade: event.grade };
      if (event.t === 'error') throw new Error(`${label} ${event.caseId}: ${event.message}`);
    }
    console.log(label, `${Object.keys(results).length}/40`);
  }
  return results;
}

const baseline = await bench(BASELINE_CONFIG, 'baseline');
const clusters = clusterResults(baseline);
console.log('clusters', clusters.map(cluster => `${cluster.cause}:${cluster.caseIds.length}`).join(' '));

const events = await post('/api/demo/mastra/suggest/', {
  config: BASELINE_CONFIG,
  clusters: clusters.map(cluster => ({
    cause: cluster.cause,
    count: cluster.caseIds.length,
    examples: cluster.caseIds.slice(0, 3).map(id => condense(caseById(id), baseline[id])),
    working: workingCalls(baseline, cluster.caseIds),
  })),
});
const suggestions = {};
for (const event of events) {
  if (event.t === 'error') throw new Error(`suggest ${event.cause}: ${event.message}`);
  if (event.t === 'suggestion') {
    const { t, cached, ...rest } = event;
    suggestions[event.cause] = rest;
  }
}
const selected = clusters.map(cluster => cluster.cause).filter(cause => suggestions[cause]?.changes?.length);
let candidateConfig = { ...BASELINE_CONFIG, version: 'v2' };
for (const cause of selected) candidateConfig = applyChanges(candidateConfig, suggestions[cause].changes).config;

const candidate = await bench(candidateConfig, 'candidate');
const comparison = compareRuns(baseline, candidate);
console.log('pass', comparison.before.pass, '->', comparison.after.pass, 'regressions', comparison.regressions.length, comparison.verdict);

const example = {
  recordedOn: new Date().toLocaleDateString('en-CA'), // local date, YYYY-MM-DD
  baseline,
  suggestions,
  selected,
  candidate,
};
fs.writeFileSync(
  path.join(here, 'example.js'),
  `// Recorded by record.mjs through the live routes on ${example.recordedOn}. Not edited by hand.\n` +
    `// Baseline and candidate over all 40 cases, one suggestion per failure cluster.\n` +
    `export const EXAMPLE = ${JSON.stringify(example)};\n`
);
console.log('wrote example.js');
