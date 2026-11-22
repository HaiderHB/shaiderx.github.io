// Email templates as a React Email-style component tree, rendered in code: HTML for the preview
// (desktop / mobile, light / dark client), a plain-text part, JSX source for the code view, and
// the linter. Pure JS: the API routes and the page use the same functions.

export const COMPONENTS = ['Heading', 'Text', 'Button', 'Link', 'Img', 'List', 'Hr', 'Section'];

// Workspace placeholders, as broadcasts write them. The preview fills them with a sample contact.
export const UNSUBSCRIBE = '{{{RESEND_UNSUBSCRIBE_URL}}}';
const SAMPLE_CONTACT = { FIRST_NAME: 'Maya' };
const SAMPLE_UNSUBSCRIBE = 'https://lumen-labs.dev/unsubscribe?c=sample';
export const HERO_IMAGE = 'https://assets.lumen-labs.dev/launch/dashboard-hero.png';
export const POSTAL_ADDRESS = 'Lumen Labs, 548 Market St #4100, San Francisco, CA 94104';

const DARK_CANVAS = '#121212';
const DARK_TEXT = '#e6e6e6';
const LIGHT_CANVAS = '#ffffff';
const LIGHT_TEXT = '#1f2328';

const SPAM_PHRASES = [
  'act now',
  'click here',
  '100% free',
  'limited time',
  'risk-free',
  'risk free',
  'guaranteed',
  'buy now',
  'urgent',
  'winner',
  'no cost',
  'once in a lifetime',
  "don't miss out",
  'exclusive deal',
  '$$$',
  '!!!',
];

// ---- small helpers ---------------------------------------------------------------------------

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Fills {{{NAME|fallback}}} placeholders for the preview. */
export function fillPlaceholders(text) {
  return String(text ?? '').replace(/\{\{\{\s*([A-Z_]+)\s*(?:\|([^}]*))?\}\}\}/g, (match, name, fallback) => {
    if (name === 'RESEND_UNSUBSCRIBE_URL') return SAMPLE_UNSUBSCRIBE;
    return SAMPLE_CONTACT[name] ?? fallback ?? '';
  });
}

function hexToRgb(hex) {
  const value = String(hex || '').trim().replace(/^#/, '');
  const full = value.length === 3 ? value.replace(/./g, ch => ch + ch) : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map(index => parseInt(full.slice(index, index + 2), 16));
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(channel => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two hex colours (null when either is not a hex colour). */
export function contrast(a, b) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  if (!x || !y) return null;
  const [hi, lo] = [luminance(x), luminance(y)].sort((m, n) => n - m);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 10) / 10;
}

const isColor = value => Boolean(hexToRgb(value));

/** Every node in the tree, depth first, with the nearest explicit background above it. */
function walk(nodes, visit, background = null, depth = 0) {
  for (const node of nodes || []) {
    visit(node, background, depth);
    if (node.type === 'Section') walk(node.children, visit, isColor(node.background) ? node.background : background, depth + 1);
  }
}

function allNodes(template) {
  const list = [];
  walk(template.body, (node, background) => list.push({ node, background }));
  return list;
}

// ---- normalise what an agent sends -----------------------------------------------------------

const str = (value, max) => (value == null ? '' : String(value).slice(0, max));

/**
 * Validates and normalises a component tree from a tool call. Returns { body, problems }:
 * problems are [{ path, message }] for nodes that cannot be rendered (unknown type, missing
 * required prop). Nodes with problems are dropped from the body.
 */
export function normaliseBody(input, path = 'body', depth = 0) {
  const problems = [];
  if (!Array.isArray(input)) return { body: [], problems: [{ path, message: `${path} must be an array of components` }] };
  const body = [];
  input.slice(0, 40).forEach((raw, index) => {
    const at = `${path}[${index}]`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      problems.push({ path: at, message: 'each component must be an object with a "type"' });
      return;
    }
    const type = COMPONENTS.find(name => name.toLowerCase() === String(raw.type || raw.component || '').toLowerCase());
    if (!type) {
      problems.push({ path: at, message: `unknown component type ${JSON.stringify(raw.type ?? null)}; use one of ${COMPONENTS.join(', ')}` });
      return;
    }
    const node = { type };
    if (raw.color && isColor(raw.color)) node.color = String(raw.color);
    if (raw.align && ['left', 'center'].includes(raw.align)) node.align = raw.align;
    switch (type) {
      case 'Heading':
        node.text = str(raw.text, 160);
        node.level = [1, 2, 3].includes(Number(raw.level)) ? Number(raw.level) : 1;
        if (!node.text) problems.push({ path: at, message: 'Heading needs "text"' });
        break;
      case 'Text':
        node.text = str(raw.text, 1200);
        if (raw.size === 'sm') node.size = 'sm';
        if (!node.text) problems.push({ path: at, message: 'Text needs "text"' });
        break;
      case 'Button':
      case 'Link':
        node.text = str(raw.text, 80);
        node.href = str(raw.href, 300);
        if (type === 'Button') {
          if (isColor(raw.background)) node.background = String(raw.background);
        }
        if (!node.text) problems.push({ path: at, message: `${type} needs "text"` });
        if (!node.href) problems.push({ path: at, message: `${type} needs "href"` });
        break;
      case 'Img':
        node.src = str(raw.src, 300);
        node.alt = raw.alt == null ? '' : str(raw.alt, 200);
        node.width = Math.min(600, Math.max(16, Number(raw.width) || 600));
        node.height = Math.min(900, Math.max(16, Number(raw.height) || Math.round(node.width / 2)));
        if (!node.src) problems.push({ path: at, message: 'Img needs "src"' });
        break;
      case 'List':
        node.items = (Array.isArray(raw.items) ? raw.items : []).map(item => str(item, 240)).filter(Boolean).slice(0, 8);
        if (!node.items.length) problems.push({ path: at, message: 'List needs "items", an array of strings' });
        break;
      case 'Hr':
        break;
      case 'Section': {
        if (isColor(raw.background)) node.background = String(raw.background);
        if (depth >= 2) {
          problems.push({ path: at, message: 'Sections nest at most two deep' });
          return;
        }
        const inner = normaliseBody(raw.children || [], `${at}.children`, depth + 1);
        node.children = inner.body;
        problems.push(...inner.problems);
        break;
      }
      default:
        break;
    }
    if (!problems.some(problem => problem.path === at)) body.push(node);
  });
  return { body, problems };
}

// ---- render ---------------------------------------------------------------------------------

// The brand kit's launch image, drawn in code (sample asset: no image is fetched). It is 2:1 whatever
// height the template asks for, as a real image file would be.
function heroImageSvg(width) {
  const height = Math.round(width / 2);
  const bars = [0.42, 0.58, 0.5, 0.74, 0.66, 0.88, 0.8]
    .map((value, index) => {
      const x = 330 + index * 34;
      const h = Math.round(value * 150);
      return `<rect x="${x}" y="${230 - h}" width="20" height="${h}" rx="4" fill="${index === 5 ? '#5b6cff' : '#c9cef5'}"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 300" width="${width}" height="${height}"><rect width="600" height="300" rx="14" fill="#eef0fb"/><rect x="24" y="24" width="552" height="252" rx="10" fill="#ffffff"/><rect x="24" y="24" width="552" height="34" rx="10" fill="#f5f6fc"/><circle cx="44" cy="41" r="5" fill="#ff8a80"/><circle cx="60" cy="41" r="5" fill="#ffd27f"/><circle cx="76" cy="41" r="5" fill="#8fe3a8"/><rect x="44" y="78" width="250" height="64" rx="8" fill="#5b6cff"/><text x="60" y="104" font-family="Arial" font-size="13" fill="#dfe3ff">Weekly active</text><text x="60" y="130" font-family="Arial" font-size="24" font-weight="700" fill="#ffffff">12,480</text><rect x="44" y="156" width="250" height="16" rx="4" fill="#eceefa"/><rect x="44" y="180" width="200" height="16" rx="4" fill="#eceefa"/><rect x="44" y="204" width="226" height="16" rx="4" fill="#eceefa"/><polyline points="44,256 100,244 150,250 200,232 250,236 294,222" fill="none" stroke="#5b6cff" stroke-width="3"/>${bars}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function placeholderSvg(width, height, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#e9eaee"/><text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="14" fill="#6b7080">${escapeHtml(label).slice(0, 40)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function nodeHtml(node, ctx) {
  const ink = node.color || ctx.text;
  const align = node.align ? `text-align:${node.align};` : '';
  switch (node.type) {
    case 'Heading': {
      const size = { 1: 28, 2: 22, 3: 18 }[node.level || 1];
      return `<h${node.level || 1} style="margin:0 0 14px;font-size:${size}px;line-height:1.25;font-weight:700;color:${ink};${align}">${escapeHtml(fillPlaceholders(node.text))}</h${node.level || 1}>`;
    }
    case 'Text':
      return `<p style="margin:0 0 14px;font-size:${node.size === 'sm' ? 12 : 16}px;line-height:1.6;color:${node.size === 'sm' && !node.color ? ctx.muted : ink};${align}">${escapeHtml(fillPlaceholders(node.text)).replace(/\n/g, '<br>')}</p>`;
    case 'Button': {
      const background = node.background || ctx.accent;
      const color = node.color || '#ffffff';
      return `<p style="margin:6px 0 20px;${align}"><a href="${escapeHtml(fillPlaceholders(node.href))}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${background};color:${color};font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(node.text)}</a></p>`;
    }
    case 'Link':
      return `<p style="margin:0 0 14px;font-size:14px;${align}"><a href="${escapeHtml(fillPlaceholders(node.href))}" style="color:${node.color || ctx.link};text-decoration:underline">${escapeHtml(node.text)}</a></p>`;
    case 'Img': {
      const src = node.src === HERO_IMAGE ? heroImageSvg(node.width) : placeholderSvg(node.width, node.height, node.alt || 'image');
      return `<img src="${src}" alt="${escapeHtml(node.alt)}" width="${node.width}" style="display:block;width:100%;max-width:${node.width}px;height:auto;border:0;margin:0 0 18px;border-radius:10px">`;
    }
    case 'List':
      return `<ul style="margin:0 0 16px;padding-left:20px;color:${ink};font-size:16px;line-height:1.6">${node.items
        .map(item => `<li style="margin:0 0 6px">${escapeHtml(fillPlaceholders(item))}</li>`)
        .join('')}</ul>`;
    case 'Hr':
      return `<hr style="border:0;border-top:1px solid ${ctx.rule};margin:22px 0">`;
    case 'Section': {
      const background = node.background || 'transparent';
      return `<div style="background:${background};padding:${node.background ? '18px 20px' : '0'};border-radius:${node.background ? 10 : 0}px;margin:0 0 16px">${(node.children || [])
        .map(child => nodeHtml(child, ctx))
        .join('')}</div>`;
    }
    default:
      return '';
  }
}

/**
 * Full HTML document for one template. mode: 'light' (a client that keeps the email as authored)
 * or 'dark' (a client that darkens unset backgrounds and lightens unset text, but keeps every
 * colour the template sets: the case the dark-mode check warns about).
 */
export function renderHtml(template, { mode = 'light' } = {}) {
  const dark = mode === 'dark';
  const explicit = isColor(template.background) ? template.background : null;
  const canvas = explicit || (dark ? DARK_CANVAS : LIGHT_CANVAS);
  const ctx = {
    text: dark && !explicit ? DARK_TEXT : LIGHT_TEXT,
    muted: dark && !explicit ? '#9a9ca3' : '#6b7080',
    rule: dark && !explicit ? '#33353b' : '#e4e5ea',
    link: dark && !explicit ? '#9fb0ff' : '#3446d6',
    accent: template.accent && isColor(template.accent) ? template.accent : '#3446d6',
  };
  const body = (template.body || []).map(node => nodeHtml(node, ctx)).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(
    template.subject
  )}</title><style>body{margin:0;-webkit-text-size-adjust:100%}a{word-break:break-word}</style></head><body style="margin:0;background:${canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(
    fillPlaceholders(template.preheader)
  )}</div><div style="max-width:600px;margin:0 auto;padding:32px 24px">${body}</div></body></html>`;
}

/** The plain-text part the template carries, with placeholders filled for the preview. */
export const previewText = template => fillPlaceholders(template.text || '');

/** Every link in a template: buttons and links in the tree. */
export function linksOf(template) {
  return allNodes(template)
    .map(({ node }) => node)
    .filter(node => node.type === 'Button' || node.type === 'Link')
    .map(node => ({ type: node.type, text: node.text, href: node.href }));
}

// ---- JSX source (what the template would be in React Email) ----------------------------------

// Text with braces or angle brackets becomes a string expression, as you would write it in JSX
const jsxText = text => (/[{}<>]/.test(String(text)) ? `{${JSON.stringify(String(text))}}` : String(text));
const styleProp = entries => {
  const parts = entries.filter(([, value]) => value != null);
  return parts.length ? ` style={{ ${parts.map(([key, value]) => `${key}: '${value}'`).join(', ')} }}` : '';
};

function nodeJsx(node, indent) {
  const pad = '  '.repeat(indent);
  switch (node.type) {
    case 'Heading':
      return `${pad}<Heading as="h${node.level || 1}"${styleProp([['color', node.color]])}>${jsxText(node.text)}</Heading>`;
    case 'Text':
      return `${pad}<Text${styleProp([
        ['color', node.color],
        ['fontSize', node.size === 'sm' ? '12px' : null],
      ])}>${jsxText(node.text)}</Text>`;
    case 'Button':
      return `${pad}<Button href="${node.href}"${styleProp([
        ['backgroundColor', node.background],
        ['color', node.color],
      ])}>${jsxText(node.text)}</Button>`;
    case 'Link':
      return `${pad}<Link href="${node.href}">${jsxText(node.text)}</Link>`;
    case 'Img':
      return `${pad}<Img src="${node.src}" alt="${node.alt}" width="${node.width}" />`;
    case 'List':
      return [`${pad}<ul>`, ...node.items.map(item => `${pad}  <li>${jsxText(item)}</li>`), `${pad}</ul>`].join('\n');
    case 'Hr':
      return `${pad}<Hr />`;
    case 'Section':
      return [
        `${pad}<Section${styleProp([['backgroundColor', node.background]])}>`,
        ...(node.children || []).map(child => nodeJsx(child, indent + 1)),
        `${pad}</Section>`,
      ].join('\n');
    default:
      return '';
  }
}

export function toJsx(template) {
  return [
    `export default function ${componentName(template.name)}() {`,
    '  return (',
    '    <Html>',
    '      <Head />',
    template.preheader ? `      <Preview>${jsxText(template.preheader)}</Preview>` : null,
    `      <Body${styleProp([['backgroundColor', template.background]])}>`,
    '        <Container>',
    ...(template.body || []).map(node => nodeJsx(node, 5)),
    '        </Container>',
    '      </Body>',
    '    </Html>',
    '  );',
    '}',
  ]
    .filter(line => line != null)
    .join('\n');
}

function componentName(name) {
  const words = String(name || 'email').split(/[^A-Za-z0-9]+/).filter(Boolean);
  const joined = words.map(word => word[0].toUpperCase() + word.slice(1)).join('') || 'Email';
  return /^[A-Za-z]/.test(joined) ? joined : `Email${joined}`;
}

// ---- lint -----------------------------------------------------------------------------------

export const LINT_RULES = [
  { id: 'plain_text', label: 'Plain-text part' },
  { id: 'img_alt', label: 'Images have alt text' },
  { id: 'unsubscribe', label: 'Unsubscribe link (marketing)' },
  { id: 'postal_address', label: 'Postal address (marketing)' },
  { id: 'links', label: 'Links' },
  { id: 'subject', label: 'Subject line' },
  { id: 'preheader', label: 'Preview text' },
  { id: 'dark_mode', label: 'Dark-mode contrast' },
  { id: 'spam', label: 'Spam-trigger phrases' },
];

const ruleLabel = id => LINT_RULES.find(rule => rule.id === id)?.label || id;

/**
 * Lints one template in code. Returns { errors, warnings, checks: [{ id, label, status, message,
 * fix }] } with status 'pass' | 'warn' | 'fail' | 'na'. Errors block test sends and broadcasts.
 */
export function lintEmail(template) {
  const checks = [];
  const add = (id, status, message, fix) => checks.push({ id, label: ruleLabel(id), status, message, ...(fix && { fix }) });
  const marketing = template.kind !== 'transactional';
  const nodes = allNodes(template);
  const links = linksOf(template);
  const textPart = String(template.text || '');
  const visible = [
    template.subject,
    template.preheader,
    ...nodes.flatMap(({ node }) => [node.text, ...(node.items || [])]),
  ]
    .filter(Boolean)
    .join(' \n ');

  // 1. Plain-text part
  const primary = links.find(link => link.type === 'Button') || links[0];
  if (textPart.trim().length < 60) {
    add('plain_text', 'fail', textPart ? `Plain-text part is only ${textPart.trim().length} characters.` : 'No plain-text part.', 'Pass "text": the whole message as plain text, with the links written out as URLs.');
  } else if (primary && !textPart.includes(primary.href)) {
    add('plain_text', 'warn', `Plain-text part does not include the main link (${primary.href}).`, 'Write the button URL into "text".');
  } else add('plain_text', 'pass', `${textPart.trim().length} characters, main link included.`);

  // 2. Image alt text
  const images = nodes.filter(({ node }) => node.type === 'Img');
  const missingAlt = images.filter(({ node }) => !String(node.alt || '').trim());
  if (!images.length) add('img_alt', 'na', 'No images.');
  else if (missingAlt.length) add('img_alt', 'fail', `${missingAlt.length} of ${images.length} images have no alt text.`, 'Give every Img an "alt" that says what it shows.');
  else add('img_alt', 'pass', `${images.length} image${images.length > 1 ? 's' : ''}, all with alt text.`);

  // 3. Unsubscribe (marketing): in the HTML and in the plain text
  if (!marketing) add('unsubscribe', 'na', 'Transactional email.');
  else {
    const inHtml = links.some(link => link.href.includes(UNSUBSCRIBE));
    const inText = textPart.includes(UNSUBSCRIBE);
    if (inHtml && inText) add('unsubscribe', 'pass', 'Unsubscribe link in the HTML and the plain text.');
    else
      add(
        'unsubscribe',
        'fail',
        `Marketing email without an unsubscribe link in the ${!inHtml && !inText ? 'HTML or the plain text' : inHtml ? 'plain text' : 'HTML'}.`,
        `Add a Link with href "${UNSUBSCRIBE}" and write the same placeholder into "text".`
      );
  }

  // 4. Postal address (marketing)
  if (!marketing) add('postal_address', 'na', 'Transactional email.');
  else {
    const addressLike = /\d{2,5}\s+\w+.*\b(st|street|ave|avenue|rd|road|blvd|way)\b/i;
    if (addressLike.test(visible)) add('postal_address', 'pass', 'Footer carries a postal address.');
    else add('postal_address', 'fail', 'Marketing email without a postal address in the footer.', `Add a small Text in the footer with "${POSTAL_ADDRESS}".`);
  }

  // 5. Links
  const broken = links.filter(link => !link.href || link.href === '#' || /example\.com/i.test(link.href));
  const insecure = links.filter(link => /^http:\/\//i.test(link.href));
  const vagueText = links.filter(link => /^(click here|here|link)$/i.test(link.text.trim()));
  if (!links.length) add('links', 'warn', 'No links: the email has no call to action.');
  else if (broken.length) add('links', 'fail', `${broken.length} link${broken.length > 1 ? 's go' : ' goes'} nowhere (${broken[0].href || 'empty'}).`, 'Point every Button and Link at a real https URL.');
  else if (insecure.length) add('links', 'warn', `${insecure.length} link${insecure.length > 1 ? 's use' : ' uses'} http://.`, 'Use https URLs.');
  else if (links.length > 8) add('links', 'warn', `${links.length} links: more than 8 reads as a newsletter and dilutes the call to action.`, 'Keep one main call to action and a few links.');
  else if (vagueText.length) add('links', 'warn', `Link text "${vagueText[0].text}" says nothing out of context.`, 'Name where the link goes.');
  else add('links', 'pass', `${links.length} link${links.length > 1 ? 's' : ''}, all https.`);

  // 6. Subject
  const subject = String(template.subject || '');
  const caps = (subject.match(/\b[A-Z]{4,}\b/g) || []).length;
  if (!subject.trim()) add('subject', 'fail', 'No subject line.', 'Write a subject under 60 characters.');
  else if (subject.length > 78) add('subject', 'fail', `Subject is ${subject.length} characters; most inboxes cut it at about 60.`, 'Shorten the subject to under 60 characters.');
  else if (subject.length > 60) add('subject', 'warn', `Subject is ${subject.length} characters; phones show about 40-60.`, 'Shorten the subject to under 60 characters.');
  else if (caps >= 2) add('subject', 'warn', 'Subject has words in capitals.', 'Write the subject in sentence case.');
  else add('subject', 'pass', `${subject.length} characters.`);

  // 7. Preview text
  const preheader = String(template.preheader || '').trim();
  if (!preheader) add('preheader', 'warn', 'No preview text: inboxes show the first line of the body instead.', 'Pass "preheader", one sentence under 90 characters.');
  else if (preheader.length > 110) add('preheader', 'warn', `Preview text is ${preheader.length} characters; inboxes show about 90.`, 'Shorten "preheader".');
  else add('preheader', 'pass', `${preheader.length} characters.`);

  // 8. Dark-mode contrast: a colour the template sets keeps its value in a dark client, while an
  // unset background turns dark. Dark text on an unset background is the risk.
  const explicitCanvas = isColor(template.background) ? template.background : null;
  const risky = [];
  const unreadable = [];
  for (const { node, background } of nodes) {
    if (node.type === 'Button') {
      const ratio = contrast(node.color || '#ffffff', node.background || template.accent || '#3446d6');
      if (ratio != null && ratio < 4.5) unreadable.push(`${node.type} "${node.text}" (${ratio}:1)`);
      continue;
    }
    if (!node.color) continue;
    const lightBg = background || explicitCanvas || LIGHT_CANVAS;
    const darkBg = background || explicitCanvas || DARK_CANVAS;
    const light = contrast(node.color, lightBg);
    const dark = contrast(node.color, darkBg);
    if (light != null && light < 4.5) unreadable.push(`${node.type} ${node.color} on ${lightBg} (${light}:1)`);
    else if (dark != null && dark < 3) risky.push({ node, ratio: dark });
  }
  if (unreadable.length) add('dark_mode', 'fail', `Low contrast even in light mode: ${unreadable[0]}.`, 'Use text at least 4.5:1 against its background.');
  else if (risky.length)
    add(
      'dark_mode',
      'warn',
      `${risky.length} element${risky.length > 1 ? 's set' : ' sets'} a dark text colour (${risky[0].node.color}) on an unset background: in a dark-mode client that is ${risky[0].ratio}:1.`,
      'Set "background" on the template (e.g. "#ffffff") or drop the hard-coded text colours.'
    );
  else add('dark_mode', 'pass', explicitCanvas ? `Background set (${explicitCanvas}); text colours hold up.` : 'No hard-coded dark text on unset backgrounds.');

  // 9. Spam-trigger phrases
  const haystack = `${visible}\n${textPart}`.toLowerCase();
  const found = SPAM_PHRASES.filter(phrase => haystack.includes(phrase));
  if (found.length >= 3) add('spam', 'fail', `Spam-trigger phrases: ${found.map(p => `"${p}"`).join(', ')}.`, 'Rewrite those phrases plainly.');
  else if (found.length) add('spam', 'warn', `Spam-trigger phrase${found.length > 1 ? 's' : ''}: ${found.map(p => `"${p}"`).join(', ')}.`, 'Rewrite it plainly.');
  else add('spam', 'pass', 'None found.');

  return {
    errors: checks.filter(check => check.status === 'fail').length,
    warnings: checks.filter(check => check.status === 'warn').length,
    checks,
  };
}
