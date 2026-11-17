#!/usr/bin/env node
// Renders the three sample subcontractor invoices for the Truss demo as PNGs (US Letter at 150 dpi,
// 1275x1650) into public/demo-assets/truss/. Not part of the site build; run by hand when the
// invoices change:  node scripts/demo-assets/truss-invoices.cjs
// Everything printed here is fictional: companies, licence and tax numbers, bank numbers, phone
// numbers (555-01xx). The demo's vision model reads these images; the GC's own records (vendor
// file, POs, paid ledger) live separately in src/pages/demo/truss/data.js.
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  for (const id of [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/npm-tools/node_modules/playwright'].filter(Boolean)) {
    try {
      return require(id);
    } catch {
      /* next */
    }
  }
  throw new Error('playwright not found: set PLAYWRIGHT_PATH');
}

const OUT = path.join(__dirname, '..', '..', 'public', 'demo-assets', 'truss');
const money = cents =>
  (cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const BILL_TO = ['Ridgeway Builders Ltd.', 'Attn: Accounts Payable', '400 Cityview Blvd, Unit 12', 'Vaughan ON  L4H 3V8'];
const PROJECT = ['Harbourview Residences, Phase 2', '2150 Harbourview Dr, Oakville ON'];

const INVOICES = [
  {
    file: 'northline-inv-ne-1187.png',
    theme: { font: "'Inter', sans-serif", ink: '#1b2433', accent: '#1d3a63', accent2: '#e2a12b', paper: '#fdfdfb' },
    logo: 'bolt',
    vendor: {
      name: 'NORTHLINE ELECTRIC LTD.',
      tagline: 'Electrical contractors · ECRA/ESA Licence 7003412',
      lines: ['88 Brockport Dr, Unit 4', 'Toronto ON  M9W 5C5'],
      phone: '905-555-0142',
      email: 'ar@northline-electric.example',
      tax: 'HST # 81234 5678 RT0001',
    },
    meta: [
      ['Invoice No.', 'INV-NE-1187'],
      ['Invoice Date', 'November 12, 2026'],
      ['Terms', 'Net 30'],
      ['Due Date', 'December 12, 2026'],
      ['PO No.', 'PO-2291'],
      ['Billing', 'Progress billing #4'],
    ],
    period: 'Work period: October 15 to November 10, 2026',
    lines: [
      ['26 05 19', 'Electrical rough-in, Level 3 (suites 301-318)', '1', 'LS', 1_840_000],
      ['26 24 16', 'Panelboards, supply and install, Level 3', '2', 'ea', 315_000],
      ['26 05 33', 'Conduit and boxes, corridors L3-L4', '640', 'm', 1_250],
      ['26 51 00', 'Temporary lighting, Levels 2-4', '1', 'LS', 260_000],
      ['28 31 00', 'Fire alarm device rough-in, Level 3', '48', 'ea', 6_875],
    ],
    subtotal: 3_860_000,
    tax: 501_800,
    total: 4_361_800,
    retainage: 386_000,
    due: 3_975_800,
    contract: [
      ['Contract value (PO-2291)', 18_600_000],
      ['Previously billed', 9_640_000],
      ['This invoice', 3_860_000],
      ['Billed to date (72.6%)', 13_500_000],
      ['Balance to finish', 5_100_000],
    ],
    remit: {
      title: 'Remit by EFT to',
      rows: [
        ['Account name', 'Northline Electric Ltd.'],
        ['Bank', 'Maple Shore Bank'],
        ['Institution', '612'],
        ['Transit', '10392'],
        ['Account', '5084471'],
      ],
    },
    notes: [
      'Conditional waiver and release on progress payment enclosed with this invoice.',
      'Please quote the invoice number on your remittance. Overdue balances bear interest at 1.5% per month.',
    ],
  },
  {
    file: 'keystone-inv-kd-0412.png',
    theme: { font: "'Carlito', 'Liberation Sans', sans-serif", ink: '#2a1f1f', accent: '#7a2330', accent2: '#c9a38b', paper: '#fffefc' },
    logo: 'keystone',
    noCode: true,
    stamp: 'REMINDER · PAST DUE',
    reminder: 'Reminder sent November 14, 2026. Our records show the balance below is outstanding. Please remit at your earliest convenience.',
    vendor: {
      name: 'Keystone Drywall Inc.',
      tagline: 'Drywall · Steel studs · Acoustic ceilings',
      lines: ['1450 Matheson Blvd E', 'Mississauga ON  L4W 3Z4'],
      phone: '905-555-0177',
      email: 'billing@keystonedrywall.example',
      tax: 'HST Reg. 79011 2334 RT0001',
    },
    meta: [
      ['Invoice #', 'INV-KD-0412'],
      ['Date', 'October 2, 2026'],
      ['Terms', 'Net 30'],
      ['Due', 'November 1, 2026'],
      ['Customer PO', 'PO-2304'],
      ['Draw', '#2'],
    ],
    period: 'Work completed: September 1 to September 30, 2026',
    lines: [
      ['', 'Gypsum board walls, Level 2', '1,850', 'm²', 940],
      ['', 'Ceiling bulkheads, Level 2 corridors', '1', 'LS', 420_000],
      ['', 'Taping, mudding and sanding, Level 2', '1', 'LS', 311_000],
    ],
    lineAmounts: [1_739_000, 420_000, 311_000],
    subtotal: 2_470_000,
    tax: 321_100,
    total: 2_791_100,
    retainage: 247_000,
    due: 2_544_100,
    remit: {
      title: 'Payment by EFT',
      rows: [
        ['Payee', 'Keystone Drywall Inc.'],
        ['Bank', 'Granite Federal Bank'],
        ['Inst. / Transit', '614 / 22870'],
        ['Account no.', '3319026'],
      ],
    },
    notes: ['Conditional lien waiver enclosed.', 'Thank you for your business.'],
  },
  {
    file: 'crestline-inv-cm-2290.png',
    theme: { font: "'Liberation Sans', 'Arial', sans-serif", ink: '#14231f', accent: '#11695a', accent2: '#8cc7b9', paper: '#fcfdfc' },
    logo: 'crest',
    vendor: {
      name: 'Crestline Mechanical Ltd.',
      tagline: 'Plumbing · HVAC · Hydronics',
      lines: ['31 Advance Rd', 'Toronto ON  M8Z 2S6'],
      phone: '647-555-0193',
      email: 'accounts@crestline-mech.example',
      tax: 'GST/HST 84551 0267 RT0001',
    },
    meta: [
      ['Invoice', 'INV-CM-2290'],
      ['Date', '2026-11-13'],
      ['Terms', 'Net 30 days'],
      ['Due', '2026-12-13'],
      ['Your PO', 'PO-2318'],
      ['Claim', 'Progress claim #5'],
    ],
    period: 'Period: 2026-10-16 to 2026-11-12',
    lines: [
      ['22 11 16', 'Domestic water piping, Level 4', '1', 'LS', 2_175_000],
      ['23 31 13', 'Ductwork, Level 4 corridors', '410', 'm', 3_800],
      ['23 82 19', 'Fan coil units, set in place', '12', 'ea', 64_000],
    ],
    subtotal: 4_501_000,
    tax: 585_130,
    total: 5_086_130,
    retainage: 450_100,
    due: 4_636_030,
    bankNotice:
      'IMPORTANT: our banking details have changed. Effective immediately, please send all payments to the new account below and update your records. Questions: call Daniel at 647-555-0193.',
    remit: {
      title: 'NEW remittance details (EFT)',
      rows: [
        ['Account name', 'Crestline Mechanical Ltd.'],
        ['Bank', 'Westgate Digital Bank'],
        ['Institution', '837'],
        ['Transit', '00011'],
        ['Account', '9917730195'],
      ],
    },
    notes: ['Conditional waiver and release on progress payment enclosed.'],
  },
];

const LOGOS = {
  bolt: (t) => `<svg width="74" height="74" viewBox="0 0 74 74"><rect width="74" height="74" rx="10" fill="${t.accent}"/><path d="M41 10 L20 42 H35 L30 64 L54 29 H38 Z" fill="${t.accent2}"/></svg>`,
  keystone: (t) => `<svg width="70" height="70" viewBox="0 0 70 70"><path d="M14 8 H56 L48 62 H22 Z" fill="${t.accent}"/><path d="M27 20 H43 L40 50 H30 Z" fill="${t.paper}"/></svg>`,
  crest: (t) => `<svg width="78" height="62" viewBox="0 0 78 62"><path d="M4 56 L28 14 L40 34 L50 20 L74 56 Z" fill="${t.accent}"/><path d="M28 14 L36 28 L30 26 L24 30 Z" fill="${t.accent2}"/></svg>`,
};

function html(inv) {
  const t = inv.theme;
  const lineRows = inv.lines
    .map((line, index) => {
      const [code, desc, qty, unit, rate] = line;
      const amount = inv.lineAmounts ? inv.lineAmounts[index] : Number(String(qty).replace(/,/g, '')) * rate;
      return `<tr><td class="num">${index + 1}</td>${inv.noCode ? '' : `<td class="code">${esc(code)}</td>`}<td>${esc(desc)}</td><td class="r">${esc(qty)}</td><td>${esc(unit)}</td><td class="r">${money(rate)}</td><td class="r">${money(amount)}</td></tr>`;
    })
    .join('');
  const contract = inv.contract
    ? `<div class="contract"><div class="boxtitle">Contract summary</div><table>${inv.contract
        .map(([label, value]) => `<tr><td>${esc(label)}</td><td class="r">${money(value)}</td></tr>`)
        .join('')}</table></div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1275px; height: 1650px; background: ${t.paper}; }
  body { font-family: ${t.font}; color: ${t.ink}; font-size: 19px; line-height: 1.38; padding: 78px 84px 70px; position: relative; overflow: hidden; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; }
  .brand { display: flex; gap: 20px; align-items: flex-start; }
  .brand h1 { font-size: 31px; letter-spacing: 0.5px; color: ${t.accent}; line-height: 1.1; }
  .brand .tag { font-size: 16px; color: #5b6470; margin: 4px 0 10px; }
  .brand .addr { font-size: 16.5px; color: #333; }
  .title { text-align: right; }
  .title h2 { font-size: 46px; letter-spacing: 6px; color: ${t.accent}; font-weight: 700; }
  .meta { margin-top: 12px; border-collapse: collapse; font-size: 17.5px; margin-left: auto; }
  .meta td { padding: 3px 0 3px 22px; }
  .meta td:first-child { color: #5b6470; text-align: right; }
  .meta td:last-child { font-weight: 700; text-align: right; }
  .rule { height: 4px; background: ${t.accent}; margin: 34px 0 26px; border-radius: 2px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .label { font-size: 14px; letter-spacing: 1.6px; text-transform: uppercase; color: ${t.accent}; font-weight: 700; margin-bottom: 6px; }
  .period { margin-top: 22px; font-size: 17px; color: #444; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 17.5px; }
  table.items th { background: ${t.accent}; color: #fff; text-align: left; font-weight: 700; padding: 10px 10px; font-size: 15.5px; letter-spacing: 0.4px; }
  table.items th.r { text-align: right; }
  table.items td { padding: 11px 10px; border-bottom: 1px solid #d9dde3; vertical-align: top; }
  table.items tr:nth-child(even) td { background: rgba(0,0,0,0.025); }
  .r { text-align: right; white-space: nowrap; }
  .num { color: #8a929c; width: 34px; }
  .code { font-family: 'DejaVu Sans Mono', monospace; font-size: 15px; color: #555; white-space: nowrap; }
  .lower { display: grid; grid-template-columns: 1fr 470px; gap: 40px; margin-top: 26px; align-items: start; }
  table.totals { width: 100%; border-collapse: collapse; font-size: 18px; }
  table.totals td { padding: 7px 4px; }
  table.totals tr.sep td { border-top: 1px solid #c9ced6; }
  table.totals tr.due td { border-top: 3px solid ${t.accent}; font-size: 23px; font-weight: 700; color: ${t.accent}; padding-top: 12px; }
  .box { border: 1.5px solid #cfd5dc; border-radius: 8px; padding: 16px 18px; font-size: 17px; }
  .boxtitle { font-size: 14px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 700; color: ${t.accent}; margin-bottom: 8px; }
  .box table { border-collapse: collapse; width: 100%; }
  .box td { padding: 2px 0; }
  .box td:first-child { color: #5b6470; width: 46%; }
  .box td:last-child { font-weight: 700; font-family: 'DejaVu Sans Mono', monospace; font-size: 16px; }
  .contract { margin-top: 18px; border: 1px dashed #c3c9d1; border-radius: 8px; padding: 12px 16px; font-size: 16px; }
  .contract table { width: 100%; border-collapse: collapse; }
  .contract td { padding: 2px 0; }
  .notes { margin-top: 30px; font-size: 16px; color: #3a414a; }
  .notes li { margin: 4px 0 0 20px; }
  .notice { border: 3px solid #b3261e; background: #fff3f1; color: #7d1a14; padding: 14px 18px; border-radius: 6px; font-weight: 700; font-size: 17.5px; margin-bottom: 14px; }
  .reminder { margin-top: 18px; padding: 12px 16px; background: #f7efe9; border-left: 6px solid ${t.accent}; font-size: 17px; }
  .stamp { position: absolute; top: 1215px; right: 130px; transform: rotate(-11deg); border: 6px solid rgba(180, 30, 40, 0.75); color: rgba(180, 30, 40, 0.78); font-size: 40px; font-weight: 700; letter-spacing: 3px; padding: 8px 22px; border-radius: 10px; font-family: 'Liberation Sans', sans-serif; }
  .foot { position: absolute; left: 84px; right: 84px; bottom: 46px; font-size: 14.5px; color: #7a828c; display: flex; justify-content: space-between; border-top: 1px solid #dde1e6; padding-top: 12px; }
  </style></head><body>
  ${inv.stamp ? `<div class="stamp">${esc(inv.stamp)}</div>` : ''}
  <div class="top">
    <div class="brand">${LOGOS[inv.logo](t)}<div>
      <h1>${esc(inv.vendor.name)}</h1>
      <div class="tag">${esc(inv.vendor.tagline)}</div>
      <div class="addr">${inv.vendor.lines.map(esc).join('<br>')}<br>Tel ${esc(inv.vendor.phone)} · ${esc(inv.vendor.email)}<br>${esc(inv.vendor.tax)}</div>
    </div></div>
    <div class="title"><h2>INVOICE</h2>
      <table class="meta">${inv.meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    </div>
  </div>
  <div class="rule"></div>
  <div class="parties">
    <div><div class="label">Bill to</div>${BILL_TO.map(esc).join('<br>')}</div>
    <div><div class="label">Project</div>${PROJECT.map(esc).join('<br>')}</div>
  </div>
  ${inv.reminder ? `<div class="reminder">${esc(inv.reminder)}</div>` : ''}
  <div class="period">${esc(inv.period)}</div>
  <table class="items"><thead><tr><th>#</th>${inv.noCode ? '' : '<th>Code</th>'}<th>Description</th><th class="r">Qty</th><th>Unit</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>${lineRows}</tbody></table>
  <div class="lower">
    <div>
      ${inv.bankNotice ? `<div class="notice">${esc(inv.bankNotice)}</div>` : ''}
      <div class="box"><div class="boxtitle">${esc(inv.remit.title)}</div><table>${inv.remit.rows
        .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
        .join('')}</table></div>
      ${contract}
    </div>
    <div>
      <table class="totals">
        <tr><td>Subtotal, work this period</td><td class="r">${money(inv.subtotal)}</td></tr>
        <tr><td>HST 13%</td><td class="r">${money(inv.tax)}</td></tr>
        <tr class="sep"><td>Total this invoice</td><td class="r">${money(inv.total)}</td></tr>
        <tr><td>Less holdback (retainage) 10%</td><td class="r">(${money(inv.retainage)})</td></tr>
        <tr class="due"><td>Amount due (CAD)</td><td class="r">$${money(inv.due)}</td></tr>
      </table>
    </div>
  </div>
  <div class="notes"><div class="label">Notes</div><ul>${inv.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>
  <div class="foot"><span>${esc(inv.vendor.name)} · ${esc(inv.vendor.tax)}</span><span>Page 1 of 1</span></div>
  </body></html>`;
}

(async () => {
  // keep the printed numbers honest: lines add up, tax, retainage and amount due follow
  for (const inv of INVOICES) {
    const amounts = inv.lineAmounts || inv.lines.map(([, , qty, , rate]) => Number(String(qty).replace(/,/g, '')) * rate);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const checks = [
      sum === inv.subtotal,
      Math.round(inv.subtotal * 0.13) === inv.tax,
      inv.subtotal + inv.tax === inv.total,
      Math.round(inv.subtotal * 0.1) === inv.retainage,
      inv.total - inv.retainage === inv.due,
    ];
    if (checks.includes(false)) throw new Error(`${inv.file}: printed totals do not add up ${JSON.stringify(checks)}`);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1275, height: 1650 }, deviceScaleFactor: 1 });
  for (const inv of INVOICES) {
    await page.setContent(html(inv), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(OUT, inv.file);
    await page.screenshot({ path: file, type: 'png' });
    console.log('wrote', path.relative(process.cwd(), file), fs.statSync(file).size, 'bytes');
  }
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
