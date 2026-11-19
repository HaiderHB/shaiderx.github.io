// The Vena demo's code stages, shared by the page and the API route (pure JS, no React):
// parse and profile a trial-balance CSV, validate a mapping (balance, duplicates, sign conventions,
// period, currency), score trust per row, build the statements and grade a run against ground truth.
// Models only ever propose a mapping; everything here is deterministic and recomputed on override.
import { COA, GROUND_TRUTH, coaById, typeById } from './data';

export const MAX_ROWS = 60;
export const MAX_CHARS = 12_000;
/** Rows whose fast-model confidence is below this go to the LLM for a second look. */
export const THRESHOLD = 0.97;

// --- parsing ------------------------------------------------------------------------------------

/** RFC-4180-ish CSV: quoted fields, doubled quotes, CRLF. Returns rows of trimmed strings. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text || '');
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',' || char === '\t' || char === ';') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

/** "1,234.50", "$1,234.50", "(1,234.50)", "1234.50-", "" → number (0 when blank, NaN when not a number). */
export function parseAmount(value) {
  let text = String(value ?? '').trim();
  if (!text) return 0;
  let sign = 1;
  if (/^\(.*\)$/.test(text)) {
    sign = -1;
    text = text.slice(1, -1);
  }
  if (/-$/.test(text)) {
    sign = -sign;
    text = text.slice(0, -1);
  }
  text = text.replace(/[$€£\s,]/g, '').replace(/^(USD|CAD|EUR|GBP)/i, '');
  if (!/^-?\d*\.?\d+$/.test(text)) return NaN;
  return sign * Number(text);
}

export const columnLetter = index => {
  let letters = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

const HEADER_TESTS = {
  name: /desc|name|title|account\s*desc/i,
  code: /acct|account|gl|code|number|\bno\b|#/i,
  debit: /^\s*(debit|dr)\b/i,
  credit: /^\s*(credit|cr)\b/i,
  amount: /balance|amount|net|ending|total|value/i,
  period: /period|date|month|fiscal/i,
  currency: /curr|ccy|iso/i,
};

function detectColumns(header) {
  const columns = {};
  const taken = new Set();
  const take = (key, index) => {
    columns[key] = index;
    taken.add(index);
  };
  // Order matters: "Account Name" is a name, "Account" alone is a code
  for (const key of ['debit', 'credit', 'period', 'currency', 'name', 'code', 'amount']) {
    const index = header.findIndex((cell, i) => !taken.has(i) && HEADER_TESTS[key].test(cell));
    if (index !== -1) take(key, index);
  }
  return columns;
}

const round2 = value => Math.round(value * 100) / 100;

/**
 * Profiles an export: finds the header row, the columns, the period and currency, and reads every
 * account row. Returns { ok, error?, rows, columns, header, headerLine, preamble, period, currency,
 * rowCount, truncated, fileRows }. Row ids are "L<line>" (1-based line in the file), so every
 * mapped row points back to its source line and cells.
 */
export function profile(text) {
  const clipped = String(text || '').slice(0, MAX_CHARS);
  const all = parseCsv(clipped);
  const fileRows = all;
  const headerIndex = all.slice(0, 6).findIndex(row => {
    const cols = detectColumns(row);
    return cols.name != null && (cols.debit != null || cols.amount != null || cols.credit != null);
  });
  if (headerIndex === -1) {
    return {
      ok: false,
      error:
        'Could not find a header row with an account name and a debit / credit or balance column in the first six lines.',
      fileRows,
    };
  }
  const header = all[headerIndex];
  const columns = detectColumns(header);
  if (columns.code == null) columns.code = null;
  const preamble = all.slice(0, headerIndex).map(row => row.filter(Boolean).join(' '));
  const rows = [];
  const skipped = [];
  let truncated = false;
  for (let i = headerIndex + 1; i < all.length; i += 1) {
    const cells = all[i];
    if (!cells.some(cell => cell)) continue;
    const name = cells[columns.name] || '';
    if (!name || /^total/i.test(name) || /^total/i.test(cells[0] || '')) {
      skipped.push(i + 1);
      continue;
    }
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
    let debit = 0;
    let credit = 0;
    if (columns.debit != null || columns.credit != null) {
      debit = columns.debit != null ? parseAmount(cells[columns.debit]) : 0;
      credit = columns.credit != null ? parseAmount(cells[columns.credit]) : 0;
    } else {
      const amount = parseAmount(cells[columns.amount]);
      debit = amount > 0 ? amount : 0;
      credit = amount < 0 ? -amount : 0;
    }
    const bad = Number.isNaN(debit) || Number.isNaN(credit);
    const net = bad ? 0 : round2(debit - credit);
    rows.push({
      id: `L${i + 1}`,
      line: i + 1,
      cells,
      code: columns.code != null ? cells[columns.code] || '' : '',
      name: name.replace(/\s+/g, ' ').slice(0, 80),
      debit: bad ? 0 : round2(Math.max(0, debit)),
      credit: bad ? 0 : round2(Math.max(0, credit)),
      net,
      side: net < 0 ? 'credit' : 'debit',
      amount: Math.abs(net),
      period: columns.period != null ? cells[columns.period] || '' : '',
      currency: columns.currency != null ? (cells[columns.currency] || '').toUpperCase() : '',
      unreadable: bad,
    });
  }
  if (!rows.length) return { ok: false, error: 'No account rows under the header.', fileRows };

  const tally = key => {
    const counts = {};
    rows.forEach(row => {
      if (row[key]) counts[row[key]] = (counts[row[key]] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };
  const periods = tally('period');
  const currencies = tally('currency');
  const preambleText = preamble.join(' ');
  const currencyFromTitle = (preambleText.match(/\b(USD|CAD|EUR|GBP)\b/) || [])[1];
  const periodFromTitle = (preambleText.match(/period\s*([0-9/.-]+)/i) || [])[1];

  return {
    ok: true,
    header,
    headerLine: headerIndex + 1,
    columns,
    preamble,
    rows,
    skipped,
    truncated,
    rowCount: rows.length,
    period: periods[0]?.[0] || periodFromTitle || 'not stated',
    periods,
    currency: currencies[0]?.[0] || currencyFromTitle || 'not stated',
    currencies,
    fileRows,
  };
}

/** Cell references for a row: { code: "A3", name: "B3", debit: "D3", ... } */
export function cellRefs(prof, row) {
  const refs = {};
  for (const [key, index] of Object.entries(prof.columns)) {
    if (index != null) refs[key] = `${columnLetter(index)}${row.line}`;
  }
  return refs;
}

// --- validation ---------------------------------------------------------------------------------

export const money = (value, { cents = true } = {}) => {
  const abs = Math.abs(value);
  const text = abs.toLocaleString('en-US', {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  return value < 0 ? `(${text})` : text;
};

export const compactMoney = value => {
  const abs = Math.abs(value);
  const text =
    abs >= 1e6 ? `${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M` : abs >= 1e3 ? `${Math.round(abs / 1e3)}K` : `${Math.round(abs)}`;
  return `${value < 0 ? '−' : ''}$${text}`;
};

/**
 * Checks a mapping in code. mapping: { rowId: accountId }.
 * Returns { checks (CheckList items), rowIssues: { rowId: [{ status, text }] }, excluded: Set,
 * duplicateOf: { rowId: rowId }, totals }.
 */
export function validate(prof, mapping) {
  const rows = prof.rows;
  const rowIssues = {};
  const issue = (id, status, text) => {
    (rowIssues[id] = rowIssues[id] || []).push({ status, text });
  };
  const checks = [];

  // Duplicates: same code, name, amounts and period as an earlier row
  const seen = new Map();
  const duplicateOf = {};
  rows.forEach(row => {
    const key = [row.code, row.name.toLowerCase(), row.debit, row.credit, row.period].join('|');
    if (seen.has(key)) duplicateOf[row.id] = seen.get(key);
    else seen.set(key, row.id);
  });
  const excluded = new Set(Object.keys(duplicateOf));
  const byId = Object.fromEntries(rows.map(row => [row.id, row]));
  excluded.forEach(id => {
    issue(id, 'fixed', `Repeats line ${byId[duplicateOf[id]].line}: left out of every total`);
  });
  checks.push(
    excluded.size
      ? {
          id: 'duplicates',
          label: 'Duplicate rows',
          status: 'fixed',
          detail: `${[...excluded]
            .map(id => `Line ${byId[id].line} repeats line ${byId[duplicateOf[id]].line}`)
            .join('; ')}. Left out of the totals.`,
          removed: [...excluded].map(id => `Line ${byId[id].line} · ${byId[id].code} ${byId[id].name} · ${money(byId[id].amount)}`),
          rows: [...excluded],
        }
      : { id: 'duplicates', label: 'Duplicate rows', status: 'pass', detail: 'No row repeats another.' }
  );

  // Debits = credits, before and after dropping duplicates
  const sum = (list, key) => round2(list.reduce((total, row) => total + row[key], 0));
  const kept = rows.filter(row => !excluded.has(row.id));
  const totals = {
    rawDebit: sum(rows, 'debit'),
    rawCredit: sum(rows, 'credit'),
    debit: sum(kept, 'debit'),
    credit: sum(kept, 'credit'),
  };
  const rawDiff = round2(totals.rawDebit - totals.rawCredit);
  const diff = round2(totals.debit - totals.credit);
  checks.push(
    Math.abs(diff) < 0.005
      ? {
          id: 'balance',
          label: 'Debits equal credits',
          status: 'pass',
          detail:
            Math.abs(rawDiff) >= 0.005
              ? `${money(totals.debit)} on both sides once the duplicate is out. The raw export was off by ${money(Math.abs(rawDiff))}, exactly the repeated row.`
              : `${money(totals.debit)} on both sides.`,
        }
      : {
          id: 'balance',
          label: 'Debits equal credits',
          status: 'fail',
          detail: `Off by ${money(Math.abs(diff))}: debits ${money(totals.debit)}, credits ${money(totals.credit)}. A row is missing or mis-keyed in the export.`,
        }
  );

  // Every row mapped to a line of the chart
  const unmapped = kept.filter(row => !coaById(mapping[row.id]));
  unmapped.forEach(row => issue(row.id, 'fail', 'Not mapped to the chart of accounts'));
  checks.push(
    unmapped.length
      ? { id: 'mapped', label: 'Every row mapped', status: 'fail', detail: `${unmapped.length} row(s) have no account: lines ${unmapped.map(row => row.line).join(', ')}.` }
      : { id: 'mapped', label: 'Every row mapped', status: 'pass', detail: `${kept.length} rows onto ${new Set(kept.map(row => mapping[row.id])).size} lines of the chart.` }
  );

  // Sign conventions: the balance should sit on the mapped account's normal side
  let onSide = 0;
  const contraOk = [];
  const deficits = [];
  const wrong = [];
  kept.forEach(row => {
    const account = coaById(mapping[row.id]);
    if (!account || row.amount === 0) return;
    if (row.side === account.normal) {
      onSide += 1;
      if (account.contra) {
        contraOk.push(row);
        issue(row.id, 'pass', `Contra account: a ${row.side} balance is expected for ${account.name}`);
      }
      return;
    }
    if (account.type === 'equity' && row.side === 'debit') {
      deficits.push(row);
      issue(row.id, 'pass', 'A debit in equity: an accumulated deficit, normal for a company still investing in growth');
      return;
    }
    wrong.push(row);
    issue(
      row.id,
      'fail',
      `A ${row.side} balance, but ${account.name} normally carries a ${account.normal}. Check the mapping or the sign.`
    );
  });
  const signParts = [`${onSide} rows sit on their account's normal side`];
  if (contraOk.length) signParts.push(`${contraOk.length} contra accounts read correctly (${contraOk.map(row => row.name).join(', ')})`);
  if (deficits.length) signParts.push(`${deficits.map(row => row.name).join(', ')} is a debit: an accumulated deficit`);
  checks.push(
    wrong.length
      ? {
          id: 'signs',
          label: 'Sign conventions',
          status: 'fail',
          detail: `${wrong.map(row => `Line ${row.line} ${row.name} is a ${row.side} on a ${coaById(mapping[row.id]).normal}-normal account`).join('; ')}.`,
          rows: wrong.map(row => row.id),
        }
      : { id: 'signs', label: 'Sign conventions', status: 'pass', detail: `${signParts.join('; ')}.` }
  );

  // One period and one currency
  if (prof.periods.length > 1) {
    const main = prof.periods[0][0];
    const odd = kept.filter(row => row.period && row.period !== main);
    odd.forEach(row => issue(row.id, 'fail', `Period ${row.period}; the rest of the file is ${main}`));
    checks.push({
      id: 'period',
      label: 'One period',
      status: 'fail',
      detail: `${odd.length} row(s) are not in ${main}: lines ${odd.map(row => row.line).join(', ')}.`,
    });
  } else {
    checks.push({
      id: 'period',
      label: 'One period',
      status: prof.periods.length ? 'pass' : 'na',
      detail: prof.periods.length
        ? `${prof.period} on all ${rows.length} rows.`
        : `No period column; the title says ${prof.period}.`,
    });
  }
  checks.push(
    prof.currencies.length > 1
      ? { id: 'currency', label: 'One currency', status: 'fail', detail: `Mixed: ${prof.currencies.map(([code, n]) => `${code} (${n})`).join(', ')}. Translate before consolidating.` }
      : { id: 'currency', label: 'One currency', status: prof.currencies.length ? 'pass' : 'na', detail: prof.currencies.length ? `${prof.currency} throughout.` : `No currency column; assumed ${prof.currency}.` }
  );

  return { checks, rowIssues, excluded, duplicateOf, totals };
}

// --- trust --------------------------------------------------------------------------------------

/**
 * Model confidence for a mapped row. Fast route: the decision model's probability for its pick.
 * LLM route: 0.92 when the LLM agrees with the fast model's first choice, 0.85 when it picks
 * another of its top three, 0.75 outside them. A person's override is 1.
 */
export function confidenceFor(entry) {
  if (!entry) return 0;
  if (entry.override) return 1;
  if (entry.route === 'llm') {
    const rank = entry.candidates?.findIndex(candidate => candidate.id === entry.account) ?? -1;
    return rank === 0 ? 0.92 : rank > 0 && rank < 3 ? 0.85 : 0.75;
  }
  return entry.confidence ?? 0;
}

/** Trust 0-100 = confidence x what the checks found on the row (pass 1, fail 0.4, excluded 0). */
export function trustFor(entry, issues = [], excluded = false) {
  const confidence = confidenceFor(entry);
  const factor = excluded ? 0 : issues.some(item => item.status === 'fail') ? 0.4 : 1;
  return { confidence, factor, score: Math.round(confidence * factor * 100) };
}

export const trustTone = score => (score >= 85 ? 'ok' : score >= 60 ? 'warn' : 'bad');

// --- statements ---------------------------------------------------------------------------------

/**
 * Builds the clean trial balance (one line per chart account), a balance sheet and a P&L.
 * Section values are positive on the section's normal side; contra accounts subtract.
 */
export function statements(prof, mapping, excluded) {
  const lines = new Map();
  prof.rows.forEach(row => {
    if (excluded.has(row.id)) return;
    const account = coaById(mapping[row.id]);
    if (!account) return;
    const line = lines.get(account.id) || { account, rows: [], debit: 0, credit: 0, net: 0 };
    line.rows.push(row.id);
    line.debit = round2(line.debit + row.debit);
    line.credit = round2(line.credit + row.credit);
    line.net = round2(line.net + row.net);
    lines.set(account.id, line);
  });
  const ordered = COA.filter(account => lines.has(account.id)).map(account => lines.get(account.id));
  const value = line => (typeById(line.account.type).normal === 'debit' ? line.net : -line.net);
  const total = predicate => round2(ordered.filter(line => predicate(line.account)).reduce((sum, line) => sum + value(line), 0));

  const revenue = total(account => account.type === 'revenue' && account.group === 'Revenue');
  const other = total(account => account.id === 'R.other');
  const cogs = total(account => account.type === 'cogs');
  const opex = total(account => account.type === 'opex');
  const grossProfit = round2(revenue - cogs);
  const operatingIncome = round2(grossProfit - opex);
  const netIncome = round2(operatingIncome + other);
  const assets = total(account => account.type === 'asset');
  const liabilities = total(account => account.type === 'liability');
  const equity = total(account => account.type === 'equity');

  const debit = round2(ordered.reduce((sum, line) => sum + Math.max(0, line.net), 0));
  const credit = round2(ordered.reduce((sum, line) => sum + Math.max(0, -line.net), 0));

  return {
    lines: ordered.map(line => ({ ...line, value: value(line) })),
    trialBalance: { debit, credit },
    bs: {
      currentAssets: total(account => account.type === 'asset' && account.group === 'Current assets'),
      nonCurrentAssets: total(account => account.type === 'asset' && account.group === 'Non-current assets'),
      assets,
      liabilities,
      equity,
      netIncome,
      totalLE: round2(liabilities + equity + netIncome),
      balanced: Math.abs(assets - (liabilities + equity + netIncome)) < 0.005,
    },
    pl: {
      revenue,
      cogs,
      grossProfit,
      grossMargin: revenue ? grossProfit / revenue : 0,
      opex,
      opexLines: ordered.filter(line => line.account.type === 'opex').map(line => ({ name: line.account.name, value: value(line) })),
      operatingIncome,
      other,
      netIncome,
    },
  };
}

// --- eval ---------------------------------------------------------------------------------------

/** The ground-truth account for a sample row, or null for any other file. */
export function truthFor(row, isSample) {
  return isSample ? GROUND_TRUTH[row.code] || null : null;
}

/**
 * Grades a run against ground truth. entries: { rowId: { account, route, fastChoice } } (the
 * pipeline's answer, before overrides). Returns totals, per-route results, fast-only accuracy,
 * what the second look fixed, and the misses.
 */
export function evaluate(prof, entries, isSample, overrides = {}) {
  if (!isSample) return null;
  const result = {
    total: 0,
    correct: 0,
    fast: { n: 0, correct: 0 },
    llm: { n: 0, correct: 0, fixed: 0, broke: 0 },
    fastOnly: 0,
    withOverrides: 0,
    misses: [],
  };
  prof.rows.forEach(row => {
    const truth = truthFor(row, isSample);
    const entry = entries[row.id];
    if (!truth || !entry) return;
    result.total += 1;
    const ok = entry.account === truth;
    const fastOk = entry.fastChoice === truth;
    if (ok) result.correct += 1;
    if (fastOk) result.fastOnly += 1;
    if ((overrides[row.id] || entry.account) === truth) result.withOverrides += 1;
    const bucket = entry.route === 'llm' ? result.llm : result.fast;
    bucket.n += 1;
    if (ok) bucket.correct += 1;
    if (entry.route === 'llm') {
      if (ok && !fastOk) result.llm.fixed += 1;
      if (!ok && fastOk) result.llm.broke += 1;
    }
    if (!ok) result.misses.push({ row, expected: truth, actual: entry.account, route: entry.route });
  });
  return result;
}
