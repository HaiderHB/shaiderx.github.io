// Dev-only gallery of the demo UI kit (src/demos/ui): every component with sample props.
// `next dev` serves it at /demo/ui/; production builds return 404 (see getStaticProps).
import { DemoLayout } from 'demos/DemoLayout';
import * as kit from 'demos/ui';
import {
  BadgeMeta,
  BadgeRow,
  Button,
  Card,
  CardHead,
  CardTitle,
  Caret,
  ChoiceChips,
  Chip,
  CodeView,
  CopyButton,
  DecisionBadge,
  Dot,
  EmptyState,
  EvalTable,
  Eyebrow,
  Gauge,
  IndexBadge,
  InlineCode,
  Input,
  JsonDetails,
  JsonView,
  KeyValues,
  Kicker,
  MarkdownLite,
  McpConnectCommand,
  McpToolPanel,
  Meter,
  MiniBars,
  MiniLabel,
  Notice,
  NoteGrid,
  OptionList,
  Pill,
  PipelineStrip,
  ProbabilityBar,
  ProbabilityBars,
  RichText,
  Ring,
  RunStatus,
  ScoreBadge,
  SectionHead,
  SegmentedControl,
  Select,
  SkeletonGrid,
  Sparkline,
  Spinner,
  SplitBar,
  StatGrid,
  StatTile,
  StatusIcon,
  Tabs,
  Tag,
  TextArea,
  Timeline,
  TimelineStep,
  TypingDots,
  formatMs,
  formatTime,
  pct,
  percent,
  riskTone,
  seconds,
} from 'demos/ui';
import Head from 'next/head';
import { useState } from 'react';
import {
  FiClock,
  FiDroplet,
  FiGrid,
  FiLayers,
  FiMoon,
  FiTool,
  FiZap,
} from 'react-icons/fi';
import styles from './Gallery.module.css';

export function getStaticProps() {
  // Built pages 404: the gallery is a development tool, not part of the site.
  if (process.env.NODE_ENV === 'production') return { notFound: true };
  return { props: {} };
}

// --- sample data -------------------------------------------------------------------------

// Components are the capitalised exports; helpers and class names are not counted.
const COMPONENT_COUNT = Object.keys(kit).filter(name => /^[A-Z]/.test(name)).length;

const ACCENTS = [
  { value: 'iris', label: 'Iris' },
  { value: 'cobalt', label: 'Cobalt' },
  { value: 'coral', label: 'Coral' },
];

const NAV = [
  ['tokens', 'Tokens'],
  ['controls', 'Controls'],
  ['labels', 'Labels'],
  ['layout', 'Layout'],
  ['charts', 'Charts'],
  ['runs', 'Runs'],
  ['code', 'Code'],
  ['states', 'States'],
  ['mcp', 'MCP'],
].map(([id, label]) => ({ href: `#${id}`, label }));

// Layers, back to front
const LAYERS = [
  ['Canvas', '--uiRgbCanvas', 'The page'],
  ['Surface', '--uiRgbSurface', 'Cards'],
  ['Raised', '--uiRgbRaised', 'Things on cards'],
  ['Inset', '--uiRgbInset', 'Wells, fields, code'],
];

const SWATCHES = [
  ['--uiRgbAccent', 'rgb(var(--uiRgbAccent))'],
  ['--uiRgbAccentDeep', 'rgb(var(--uiRgbAccentDeep))'],
  ['--uiRgbAccent2', 'rgb(var(--uiRgbAccent2))'],
  ['--uiRgbOk', 'rgb(var(--uiRgbOk))'],
  ['--uiRgbWarn', 'rgb(var(--uiRgbWarn))'],
  ['--uiRgbBad', 'rgb(var(--uiRgbBad))'],
  ['--uiRgbInk', 'rgb(var(--uiRgbInk))'],
  ['--uiMuted', 'var(--uiMuted)'],
  ['--uiFaint', 'var(--uiFaint)'],
  ['--uiLineStrong', 'var(--uiLineStrong)'],
  ['--uiLine', 'var(--uiLine)'],
  ['--uiWellStrong', 'var(--uiWellStrong)'],
];

const FILLS = [
  ['--uiGradient', 'var(--uiGradient)', 'One feature card or mark per view'],
  ['--uiTint', 'var(--uiTint), rgb(var(--uiRgbSurface))', 'Stat tiles, the lead card'],
  [
    '--uiHatch',
    'var(--uiHatch), rgb(var(--rgbText) / 0.05)',
    'Empty, pending, the rest of a bar',
  ],
];

// [label, font-size, weight, tracking, sample]
const TYPE = [
  [
    'Display',
    'clamp(2rem, 1.1rem + 2.9vw, 3.5rem)',
    500,
    'var(--uiTrackDisplay)',
    'Order email to order',
  ],
  [
    'Section',
    'clamp(1.375rem, 1.2rem + 0.6vw, 1.75rem)',
    500,
    'var(--uiTrackTight)',
    'Same tools, served over MCP',
  ],
  ['Card title', '1.0625rem', 600, 'var(--uiTrackTight)', 'Draft sales order'],
  [
    'Body',
    'var(--fontSizeBodyS)',
    400,
    '0',
    'The agent extracts the order and checks it against the ERP.',
  ],
  [
    'Small',
    'var(--fontSizeBodyXS)',
    400,
    '0',
    'Quotes are verified word for word against the transcript.',
  ],
  ['Caption', 'var(--uiFontCaption)', 500, '0', 'Sentence case, quiet, medium weight'],
];

const RADII = [
  '--uiRadiusXS',
  '--uiRadiusS',
  '--uiRadiusM',
  '--uiRadiusL',
  '--uiRadiusXL',
  '--uiRadius2XL',
  '--uiRadius3XL',
  '--uiRadiusPill',
];

const SHADOWS = ['--uiShadowCard', '--uiShadowRaised', '--uiShadowPop'];

// Stage timings of one sample run, in ms
const STAGES = [
  { label: 'Extract', value: 1840, display: '1.84 s' },
  { label: 'Check', value: 240, display: '240 ms' },
  { label: 'Decide', value: 151, display: '151 ms' },
  { label: 'Draft', value: 1710, display: '1.71 s' },
];

// Sample: probability that each moderator question was leading, turn by turn
const LEADING = [0.1, 0.06, 0.22, 0.12, 0.41, 0.18, 0.09, 0.14];

const FLOW = [
  { label: 'Extract', what: 'LLM, JSON mode', cost: '1 call' },
  { label: 'Check', what: 'Tools against sample data', cost: 'code, free' },
  { label: 'Decide', what: 'Jev: route', cost: '1 call' },
  { label: 'Draft', what: 'Reply', cost: '1 call' },
];

const OPTIONS = [
  { value: 'clean', label: 'Clean request', hint: 'Everything checks out' },
  { value: 'vague', label: 'Vague quantities', hint: 'Needs a follow-up question' },
  { value: 'blocked', label: 'Blocked account', hint: 'Rules force a hold' },
];

const ROUTES = [
  { value: 'auto', label: 'Auto-confirm', tone: 'ok' },
  { value: 'review', label: 'Needs review', tone: 'warn' },
  { value: 'hold', label: 'Hold', tone: 'bad' },
];

const NOTES = [
  {
    title: 'The LLM never decides',
    text: 'It extracts and writes. Code checks facts; a decision model returns probabilities.',
  },
  {
    title: 'Rules only escalate',
    text: 'Hard checks run after the model, so a persuasive input cannot relax a route.',
  },
  {
    title: 'One tool layer',
    text: 'The agent and MCP clients call the same functions, so evals cover both.',
  },
  {
    title: 'Cheap and cached',
    text: 'A few small calls per run; repeats replay from cache.',
  },
];

const SAMPLE_JSON = {
  name: 'lookup_account',
  found: true,
  score: 0.92,
  limit: -3,
  tags: ['wholesale', 'net-15'],
  note: null,
  description:
    'A long string that the boxed variant can clip so a tool result with big text blocks stays readable in the panel. It keeps going for a while to show the clip note.',
};

const CODE = `// app/api/token/route.js
export async function POST() {
  const res = await fetch('https://example.com/v1/token', {
    method: 'POST',
    headers: { authorization: process.env.API_KEY },
  });
  return Response.json(await res.json()); // 60 s token
}`;

const DIFF = `   const token = await client.createToken({
-    expires_in_seconds = 60,
+    expires_in_seconds: 60,
   });`;

const MARKDOWN = `### What breaks

- **Token route**: the snippet is a \`SyntaxError\`, so the route never builds.
- **Audio**: \`MediaRecorder\` cannot record Ogg in Chrome.

The fix is one character:

\`\`\`diff
-    expires_in_seconds = 60,
+    expires_in_seconds: 60,
\`\`\``;

const TOOLS = [
  {
    name: 'lookup_order',
    title: 'Look up an order',
    description: 'Finds an order by number in the sample data.',
    inputSchema: {
      type: 'object',
      properties: { order: { type: 'string' } },
      required: ['order'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'refund_quote',
    title: 'Quote a refund',
    description: 'Works out the refund for a damaged line.',
    inputSchema: {
      type: 'object',
      properties: { order: { type: 'string' }, units: { type: 'number' } },
      required: ['order', 'units'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const ORDERS = { 4417: { order: '4417', status: 'shipped', lines: 3, unit_price: 18 } };

function callSampleTool(name, args) {
  const order = ORDERS[String(args.order || '').replace('#', '')];
  if (!order) throw new Error(`No order ${args.order}`);
  if (name === 'lookup_order') return order;
  return { order: order.order, refund: Number(args.units || 0) * order.unit_price };
}

const EVAL_ROWS = [
  {
    id: 'route',
    label: 'Route',
    expected: 'needs review',
    actual: 'needs review',
    pass: true,
  },
  { id: 'license', label: 'License', expected: 'clear', actual: 'flagged', pass: false },
  { id: 'sub', label: 'Substitution', expected: 'accept', actual: null, pass: null },
];

const FORMATS = [
  ['formatMs(0.004)', formatMs(0.004)],
  ['formatMs(0.42)', formatMs(0.42)],
  ['formatMs(38.4)', formatMs(38.4)],
  ['formatMs(1840)', formatMs(1840)],
  ['seconds(1840)', seconds(1840)],
  ['pct(0.956)', pct(0.956)],
  ['percent(0.004)', percent(0.004)],
  ['percent(null)', percent(null)],
  ['riskTone(0.45)', riskTone(0.45)],
  ['formatTime(75)', formatTime(75)],
];

// --- page --------------------------------------------------------------------------------

// bare: the component brings its own surface (cards, tiles), so it sits on the canvas.
function Specimen({ name, note, children, wide, bare }) {
  return (
    <div
      className={styles.specimen}
      data-wide={wide || undefined}
      data-bare={bare || undefined}
    >
      <div className={styles.specimenHead}>
        <code>{name}</code>
        {note && <span>{note}</span>}
      </div>
      <div className={styles.specimenBody}>{children}</div>
    </div>
  );
}

function Group({ id, title, lede, children }) {
  return (
    <section id={id} className={styles.group} aria-labelledby={`${id}-title`}>
      <div className={styles.groupHead}>
        <h2 id={`${id}-title`} className={styles.groupTitle}>
          {title}
        </h2>
        {lede && <p className={styles.groupLede}>{lede}</p>}
      </div>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}

export default function UiGallery() {
  const [accent, setAccent] = useState('iris');
  const [mode, setMode] = useState('voice');
  const [view, setView] = useState('example');
  const [option, setOption] = useState('vague');
  const [chip, setChip] = useState('first');
  const [file, setFile] = useState('route');
  const [tool, setTool] = useState('lookup');
  const [stage, setStage] = useState(0);
  const [focusLine, setFocusLine] = useState(null);

  const hero = (
    <div className={styles.glance}>
      <Card tone="accent" className={styles.accentCard}>
        <MiniLabel>Accent preset</MiniLabel>
        <p className={styles.accentTitle}>One kit, a different accent per demo.</p>
        <div className={styles.accentPicker} role="group" aria-label="Accent preset">
          {ACCENTS.map(item => (
            <button
              key={item.value}
              type="button"
              aria-pressed={accent === item.value}
              onClick={() => setAccent(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>
      <StatGrid columns={2}>
        <StatTile icon={<FiGrid />} label="Components" value={COMPONENT_COUNT} />
        <StatTile icon={<FiDroplet />} label="Accent presets" value={ACCENTS.length} />
        <StatTile icon={<FiMoon />} label="Themes" value="2" unit="dark, light" />
        <StatTile icon={<FiLayers />} label="Surface layers" value={LAYERS.length} />
      </StatGrid>
    </div>
  );

  return (
    <DemoLayout
      live={false}
      company="the demo kit"
      title="Demo UI kit"
      tagline="Every shared component in src/demos/ui with sample props, in both themes and all three accents. Development only: production builds return 404 for this page."
      accent={accent}
      nav={NAV}
      hero={hero}
    >
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className={styles.page}>
        <Group
          id="tokens"
          title="Tokens"
          lede="Defined once in tokens.module.css, for dark and light. Components never hard-code a colour, radius or shadow."
        >
          <Specimen
            name="layers"
            note="canvas, surface, raised; inset is cut into either"
            wide
            bare
          >
            <div className={styles.layers}>
              {LAYERS.map(([label, token, use]) => (
                <div key={token} style={{ background: `rgb(var(${token}))` }}>
                  <strong>{label}</strong>
                  <span>{use}</span>
                  <code>{token}</code>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen name="colours" note="channels, used as rgb(var(--uiRgbOk) / 0.2)" wide>
            <div className={styles.swatches}>
              {SWATCHES.map(([name, value]) => (
                <div key={name} className={styles.swatch}>
                  <span style={{ background: value }} />
                  <code>{name}</code>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen name="fills" note="gradient, tint, hatch" wide>
            <div className={styles.fills}>
              {FILLS.map(([name, value, use]) => (
                <div key={name}>
                  <span style={{ background: value }} />
                  <code>{name}</code>
                  <small>{use}</small>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen name="type" note="Host Grotesk and Geist Mono" wide>
            <div className={styles.typeList}>
              {TYPE.map(([label, size, weight, tracking, sample]) => (
                <div key={label} className={styles.typeRow}>
                  <code>{label}</code>
                  <p
                    style={{ fontSize: size, fontWeight: weight, letterSpacing: tracking }}
                  >
                    {sample}
                  </p>
                </div>
              ))}
              <div className={styles.typeRow}>
                <code>Mono</code>
                <p className={styles.typeMono}>SO-D82192 · 1.84 s · $2,712.00 · 96%</p>
              </div>
            </div>
          </Specimen>
          <Specimen name="radius">
            <div className={styles.radii}>
              {RADII.map(name => (
                <span key={name} style={{ borderRadius: `var(${name})` }}>
                  {name.replace('--uiRadius', '')}
                </span>
              ))}
            </div>
          </Specimen>
          <Specimen name="elevation" bare>
            <div className={styles.shadows}>
              {SHADOWS.map(name => (
                <span key={name} style={{ boxShadow: `var(${name})` }}>
                  {name.replace('--uiShadow', '')}
                </span>
              ))}
            </div>
          </Specimen>
        </Group>

        <Group
          id="controls"
          title="Controls"
          lede="Everything you can press or type into. Buttons are fully rounded; the primary is ink in the light theme and the accent in the dark."
        >
          <Specimen name="Button" note="primary, sizes m / s, pill" wide>
            <div className={styles.row}>
              <Button>Run agent</Button>
              <Button disabled>
                <Spinner /> Running
              </Button>
              <Button size="s">Run checks</Button>
              <Button size="s" disabled>
                Nothing to explain
              </Button>
              <Button pill>
                <FiZap /> Start voice interview
              </Button>
            </div>
          </Specimen>
          <Specimen name="Button" note="secondary, ghost, link" wide>
            <div className={styles.row}>
              <Button variant="secondary" size="s">
                Edit code
              </Button>
              <Button variant="secondary">Secondary m</Button>
              <Button variant="secondary" pill>
                End interview
              </Button>
              <Button variant="ghost">Copy</Button>
              <Button variant="link">Replay</Button>
            </div>
          </Specimen>
          <Specimen name="CopyButton" note="variant code | ghost">
            <div className={styles.row}>
              <CopyButton text="claude mcp add …" />
              <CopyButton variant="ghost" text="claude mcp add …" />
            </div>
          </Specimen>
          <Specimen name="Chip">
            <div className={styles.row}>
              {['payroll', 'spreadsheet', 'alert'].map(word => (
                <Chip key={word}>{word}</Chip>
              ))}
            </div>
          </Specimen>
          <Specimen name="SegmentedControl" note="variant pill | box">
            <div className={styles.row}>
              <SegmentedControl
                label="Mode"
                options={[
                  { value: 'voice', label: 'Voice' },
                  { value: 'text', label: 'Type instead' },
                ]}
                value={mode}
                onChange={setMode}
              />
              <SegmentedControl
                variant="box"
                label="Transcript"
                options={[
                  { value: 'live', label: 'Your interview' },
                  { value: 'example', label: 'Example run' },
                ]}
                value={view}
                onChange={setView}
              />
            </div>
          </Specimen>
          <Specimen name="ChoiceChips">
            <ChoiceChips
              label="Code to check"
              options={[
                { value: 'first', label: 'First try' },
                { value: 'stale', label: 'Stale v2' },
                { value: 'own', label: 'Paste your own' },
              ]}
              value={chip}
              onChange={setChip}
            />
          </Specimen>
          <Specimen name="OptionList">
            <OptionList
              label="Samples"
              options={OPTIONS}
              value={option}
              onChange={setOption}
            />
          </Specimen>
          <Specimen name="Tabs" note="variant files | list">
            <Tabs
              label="Files"
              items={[
                { id: 'route', label: 'route.js', sub: 'app/api/token/' },
                { id: 'worklet', label: 'pcm16-worklet.js', sub: 'public/' },
              ]}
              value={file}
              onChange={setFile}
            />
            <Tabs
              variant="list"
              label="Tools"
              items={[
                {
                  id: 'lookup',
                  label: 'lookup_account',
                  sub: 'Look up customer account',
                },
                {
                  id: 'match',
                  label: 'match_products',
                  sub: 'Match order lines to SKUs',
                },
              ]}
              value={tool}
              onChange={setTool}
            />
          </Specimen>
          <Specimen name="TextArea" note="variant plain, and code">
            <TextArea rows={3} defaultValue="Hi, my order #4417 arrived damaged." />
            <TextArea code rows={3} defaultValue={'{\n  "order": "4417"\n}'} />
          </Specimen>
          <Specimen name="Input + Select" note="variant ring">
            <div className={styles.row}>
              <Input defaultValue="payroll" aria-label="Query" />
              <Select aria-label="Goal" defaultValue="">
                <option value="">Any goal</option>
                <option value="G1">G1 Setup</option>
              </Select>
            </div>
          </Specimen>
        </Group>

        <Group
          id="labels"
          title="Labels and status"
          lede="Tone text is the status colour pulled towards the ink, so it reads on its own tint in both themes. Only the decision badge is a solid fill."
        >
          <Specimen name="Pill" note="tone, caps">
            <div className={styles.row}>
              <Pill>Example run</Pill>
              <Pill tone="live">Live · deepseek-v3.2</Pill>
              <Pill tone="ok">readOnlyHint</Pill>
              <Pill tone="warn">slow</Pill>
              <Pill tone="bad">error</Pill>
              <Pill caps tone="warn">
                Design only
              </Pill>
            </div>
          </Specimen>
          <Specimen name="Tag" note="tone, soft">
            <div className={styles.row}>
              <Tag tone="warn">vague</Tag>
              <Tag tone="ok">substitute</Tag>
              <Tag tone="bad">backorder</Tag>
              <Tag soft>G1</Tag>
              <Tag soft>G2 · Time to value</Tag>
            </div>
          </Specimen>
          <Specimen name="DecisionBadge" note="tone, size m / l">
            <div className={styles.row}>
              <DecisionBadge tone="ok">Auto-confirm</DecisionBadge>
              <DecisionBadge tone="warn">Needs review</DecisionBadge>
              <DecisionBadge tone="bad" size="l">
                Hold
              </DecisionBadge>
            </div>
          </Specimen>
          <Specimen name="StatusIcon" note="soft (rules), solid (evals)">
            <div className={styles.row}>
              {['fail', 'warn', 'pass', 'na'].map(status => (
                <StatusIcon key={status} status={status} />
              ))}
              {['pass', 'fail', 'warn', 'na'].map(status => (
                <StatusIcon key={status} variant="solid" status={status} />
              ))}
            </div>
          </Specimen>
          <Specimen name="ScoreBadge + BadgeRow + BadgeMeta" wide>
            <BadgeRow>
              <ScoreBadge label="Leading" value={percent(0.12)} tone={riskTone(0.12)} />
              <ScoreBadge
                label="Double-barreled"
                value={percent(0.41)}
                tone={riskTone(0.41)}
              />
              <ScoreBadge label="Off-guide" value={percent(0.72)} tone={riskTone(0.72)} />
              <ScoreBadge variant="neutral" label="On Q2" value={percent(0.88)} />
              <BadgeMeta>Jev · 112 ms</BadgeMeta>
            </BadgeRow>
            <BadgeRow>
              <ScoreBadge variant="pending">Checking with Jev…</ScoreBadge>
              <ScoreBadge variant="muted">Guardrail skipped (rate limit)</ScoreBadge>
            </BadgeRow>
          </Specimen>
          <Specimen name="RunStatus + Dot" note="example, wait, live, ended, idle">
            <div className={styles.stack}>
              <RunStatus state="example">
                Example run · 11 turns · recorded live
              </RunStatus>
              <RunStatus state="wait">Waiting for microphone permission…</RunStatus>
              <RunStatus state="live">Live · 2/10 answers</RunStatus>
              <RunStatus state="ended">Ended · Moderator wrapped up</RunStatus>
              <RunStatus>Ready</RunStatus>
            </div>
            <div className={styles.row}>
              <Dot tone="ok" /> <Dot tone="warn" /> <Dot tone="bad" /> <Dot tone="idle" />
              <Dot /> <Dot tone="warn" motion="pulse" /> <Dot tone="bad" motion="ring" />
            </div>
          </Specimen>
          <Specimen name="IndexBadge, MiniLabel, Kicker, Eyebrow">
            <div className={styles.stack}>
              <div className={styles.row}>
                <IndexBadge>1</IndexBadge>
                <IndexBadge>2</IndexBadge>
              </div>
              <MiniLabel>arguments</MiniLabel>
              <Kicker>The task</Kicker>
              <Eyebrow step={2}>Interview</Eyebrow>
            </div>
          </Specimen>
        </Group>

        <Group
          id="layout"
          title="Layout"
          lede="Cards are solid surfaces with a large radius. One card per view may take the accent; tint is for the card that leads a group."
        >
          <Specimen name="StatGrid + StatTile" note="icon, unit, note, tone" wide bare>
            <StatGrid>
              <StatTile
                tone="tint"
                icon={<FiClock />}
                label="Run time"
                value="3.94"
                unit="s"
              />
              <StatTile icon={<FiTool />} label="Tool calls" value="7" unit="all free" />
              <StatTile
                icon={<FiZap />}
                label="Model calls"
                value="3"
                note="Extract, decide, draft"
              />
              <StatTile tone="accent" label="Order total" value="$2,712.00">
                <Meter value={0.7} tone="ink" size="s" label="70% of credit limit" />
              </StatTile>
            </StatGrid>
          </Specimen>
          <Specimen name="Card + CardHead + CardTitle" note="aside, nowrap, size s" bare>
            <Card>
              <CardHead aside={<Button variant="link">Replay</Button>}>
                <CardTitle>Agent run</CardTitle>
                <Pill>Example run</Pill>
              </CardHead>
              <p className={styles.small}>Card padding follows --uiCardPad.</p>
            </Card>
            <Card style={{ '--uiCardPad': 'var(--spaceM)' }}>
              <CardHead nowrap aside={<Spinner />}>
                <IndexBadge>3</IndexBadge>
                <CardTitle size="s">License expires before delivery</CardTitle>
              </CardHead>
              <p className={styles.small}>Not run yet</p>
            </Card>
          </Specimen>
          <Specimen name="Card tone" note="tint | accent | inset" bare>
            <Card tone="tint">
              <CardTitle size="s">tint</CardTitle>
              <p className={styles.small}>A soft wash of the accent pair.</p>
            </Card>
            <Card tone="accent">
              <CardHead aside={<Pill>1 per view</Pill>}>
                <CardTitle size="s">accent</CardTitle>
              </CardHead>
              <p className={styles.small}>
                Text and line tokens flip, so kit components inside stay readable.
              </p>
            </Card>
            <Card tone="inset">
              <CardTitle size="s">inset</CardTitle>
              <p className={styles.small}>Sits in the page instead of on it.</p>
            </Card>
          </Specimen>
          <Specimen name="SectionHead variant=plain" wide>
            <SectionHead
              title="Same tools, served over MCP"
              lede={
                <>
                  The agent calls the <code>orders</code> tool layer, which is also an MCP
                  server.
                </>
              }
              flush
            />
          </Specimen>
          <Specimen name="SectionHead variant=eyebrow" wide>
            <SectionHead
              variant="eyebrow"
              step={3}
              kicker="Findings"
              title="What the example run found"
              lede="Quotes are verified word for word against the transcript."
              action={<Button pill>Generate findings</Button>}
            />
          </Specimen>
          <Specimen name="SectionHead variant=numbered" wide>
            <SectionHead
              variant="numbered"
              index="01"
              kicker="Live, free"
              title="Integration checker"
              lede="Pick a sample or paste your own; each finding links to its line."
            />
          </Specimen>
          <Specimen name="KeyValues" wide>
            <KeyValues
              items={[
                ['Customer', 'Copperleaf Collective · Marcus Reyes'],
                ['License', 'not in email'],
                ['Delivery', 'Wed, Dec 2'],
                ['PO', 'none'],
              ]}
            />
          </Specimen>
          <Specimen name="NoteGrid variant=accent" wide bare>
            <NoteGrid items={NOTES} />
          </Specimen>
          <Specimen name="NoteGrid variant=boxed" wide bare>
            <NoteGrid variant="boxed" items={NOTES.slice(0, 2)} />
          </Specimen>
        </Group>

        <Group
          id="charts"
          title="Charts"
          lede="Small, single-colour marks. A chart takes one tone; tracks and the remainder are hatched or faint, never a second hue."
        >
          <Specimen name="ProbabilityBars" note="options, probabilities, choice">
            <ProbabilityBars
              options={ROUTES}
              probabilities={{ auto: 0.06, review: 0.81, hold: 0.13 }}
              choice="review"
            />
          </Specimen>
          <Specimen name="ProbabilityBar" note="marks = thresholds, tone accent">
            <ProbabilityBar
              label="Yes"
              value={0.64}
              tone="ok"
              strong
              marks={[0.5, 0.8]}
            />
            <ProbabilityBar label="Confidence" value={0.81} tone="accent" strong />
          </Specimen>
          <Specimen name="Gauge" note="value 0..1, ticks, tone, caption">
            <Gauge value={0.81} caption="Needs review" label="Needs review, 81%">
              81%
            </Gauge>
          </Specimen>
          <Specimen name="Ring" note="value, tone, size, stroke">
            <div className={styles.row}>
              <Ring value={0.35} label="35%">
                35
              </Ring>
              <Ring value={0.85} tone="ok" label="85%">
                85
              </Ring>
              <Ring value={0.6} tone="warn" label="60%">
                60
              </Ring>
              <Ring value={0.2} tone="bad" label="20%">
                20
              </Ring>
              <Ring value={0.75} tone="ink" size={84} stroke={9} label="3 of 4 passed">
                3/4
              </Ring>
            </div>
          </Specimen>
          <Specimen name="MiniBars" note="data, active, height">
            <MiniBars
              data={STAGES}
              active={stage}
              height={110}
              label="Time per stage of a sample run"
            />
            <SegmentedControl
              variant="box"
              label="Active stage"
              options={STAGES.map((item, index) => ({ value: index, label: item.label }))}
              value={stage}
              onChange={setStage}
            />
          </Specimen>
          <Specimen name="SplitBar" note="parts, legend">
            <SplitBar
              label="Check results"
              parts={[
                { label: 'Failures', value: 3, tone: 'bad' },
                { label: 'Warnings', value: 5, tone: 'warn' },
                { label: 'Pass', value: 4, tone: 'ok' },
                { label: 'Not applicable', value: 2 },
              ]}
            />
          </Specimen>
          <Specimen name="Sparkline" note="values, threshold, tone">
            <Sparkline
              values={LEADING}
              min={0}
              max={0.6}
              threshold={0.35}
              label="Leading-question probability over eight turns, one above the 35% line"
            />
            <p className={styles.small}>
              Leading-question probability by turn. Dashed line: the 35% review threshold.
            </p>
          </Specimen>
          <Specimen name="Meter" note="value, segments, tone, size">
            <div className={styles.meters}>
              <Meter value={0.45} label="45%" />
              <Meter value={0.8} tone="ok" segments={5} label="4 of 5" />
              <Meter value={0.3} tone="warn" size="s" label="30%" />
              <Meter value={0.9} tone="bad" size="s" segments={20} label="90%" />
            </div>
          </Specimen>
        </Group>

        <Group
          id="runs"
          title="Runs"
          lede="How an agent run is explained: the plan, what happened stage by stage, and whether it matched what was expected."
        >
          <Specimen name="PipelineStrip" wide bare>
            <PipelineStrip steps={FLOW} />
          </Specimen>
          <Specimen name="Timeline + TimelineStep" note="done, running, pending, error">
            <Timeline>
              <TimelineStep
                index={0}
                status="done"
                title="Extract"
                detail="LLM, JSON mode"
                ms={1840}
              />
              <TimelineStep
                index={1}
                status="running"
                title="Check"
                detail="Tool calls"
              />
              <TimelineStep index={2} title="Decide" detail="Jev, typed decisions" />
              <TimelineStep index={3} status="error" title="Draft" detail="Reply">
                <p className={styles.small}>Step body goes here.</p>
              </TimelineStep>
            </Timeline>
          </Specimen>
          <Specimen name="EvalTable">
            <EvalTable rows={EVAL_ROWS} />
          </Specimen>
        </Group>

        <Group
          id="code"
          title="Code and data"
          lede="Monospace blocks are insets. Highlighting is a small tokenizer in the kit, with no innerHTML and no dependency."
        >
          <Specimen name="CodeView" note="marks, focusLine" wide>
            <div className={styles.row}>
              {[2, 5].map(line => (
                <Button
                  key={line}
                  variant="secondary"
                  size="s"
                  onClick={() => setFocusLine({ line, at: Date.now() })}
                >
                  Flash L{line}
                </Button>
              ))}
            </div>
            <CodeView
              code={CODE}
              title="app/api/token/route.js"
              marks={{ 2: 'pass', 4: 'fail', 5: 'warn' }}
              focusLine={focusLine}
            />
          </Specimen>
          <Specimen name="CodeView lang=diff, no numbers">
            <CodeView code={DIFF} lang="diff" title="README.md" numbers={false} />
          </Specimen>
          <Specimen name="CodeView wrap">
            <CodeView
              code={JSON.stringify(TOOLS[0], null, 2)}
              title="MCP tool definition"
              numbers={false}
              wrap
              maxHeight="200px"
            />
          </Specimen>
          <Specimen name="JsonView variant=well">
            <JsonView value={SAMPLE_JSON} />
          </Specimen>
          <Specimen name="JsonView variant=boxed clip colon=plain">
            <JsonView
              value={SAMPLE_JSON}
              variant="boxed"
              colon="plain"
              clip={60}
              clipNote={<p className={styles.small}>Long strings shortened here.</p>}
            />
          </Specimen>
          <Specimen name="JsonDetails">
            <JsonDetails summary="Structured output (JSON)" value={SAMPLE_JSON} />
          </Specimen>
          <Specimen name="RichText + InlineCode">
            <p className={styles.small}>
              <RichText text="Send `Terminate`, then wait for `Termination`." /> Needs{' '}
              <InlineCode>API_KEY</InlineCode> on the server only.
            </p>
          </Specimen>
          <Specimen name="MarkdownLite + Caret" wide>
            <MarkdownLite text={MARKDOWN}>
              <Caret variant="block" />
            </MarkdownLite>
          </Specimen>
          <Specimen name="TrackedText" note="state, activeId, onSelect, animate" wide>
            <TrackedTextSample />
          </Specimen>
          <Specimen name="demos/ui/format" note="pure helpers, safe in API routes" wide>
            <dl className={styles.formats}>
              {FORMATS.map(([call, result]) => (
                <div key={call}>
                  <dt>
                    <code>{call}</code>
                  </dt>
                  <dd>{result}</dd>
                </div>
              ))}
            </dl>
          </Specimen>
        </Group>

        <Group
          id="states"
          title="States"
          lede="Nothing yet, working on it, and something to tell you. Hatching is the kit's texture for anything not there yet."
        >
          <Specimen name="Spinner, Caret, TypingDots">
            <div className={styles.row}>
              <Spinner />
              <span>
                streaming
                <Caret />
              </span>
              <span>
                soft
                <Caret variant="soft" />
              </span>
              <TypingDots label="Thinking" />
            </div>
          </Specimen>
          <Specimen name="EmptyState size=s">
            <EmptyState size="s">The draft reply appears here.</EmptyState>
            <EmptyState size="s" loading>
              Waiting…
            </EmptyState>
          </Specimen>
          <Specimen name="EmptyState size=m + SkeletonGrid" wide>
            <EmptyState>
              Answer at least two questions, then generate findings.
            </EmptyState>
            <SkeletonGrid label="Generating findings" />
          </Specimen>
          <Specimen name="Notice" note="kind, size, flat" wide>
            <div className={styles.stack}>
              <Notice size="s">
                Preview mode: live runs need the private link from my email.
              </Notice>
              <Notice size="s" kind="error">
                The run ended early. Try again.
              </Notice>
              <Notice>
                Preview mode. The private link from my email turns on live interviews.
              </Notice>
              <Notice kind="error">Microphone access was blocked.</Notice>
              <Notice flat>Missing demo key. The rule checks above are free.</Notice>
            </div>
          </Specimen>
        </Group>

        <Group
          id="mcp"
          title="MCP"
          lede="A tool server you can poke at in the browser: pick a tool, read its definition, call it, see the JSON-RPC exchange."
        >
          <Specimen name="McpToolPanel" note="tools, examples, call" wide bare>
            <McpToolPanel
              tools={TOOLS}
              examples={{
                lookup_order: { order: '4417' },
                refund_quote: { order: '4417', units: 2 },
              }}
              call={callSampleTool}
              argsId="gallery-tool-args"
            />
          </Specimen>
          <Specimen name="McpConnectCommand" wide>
            <McpConnectCommand
              label="Connect from Claude Code"
              command="claude mcp add --transport http sample-orders https://haiderb.com/api/demo/sample/mcp/"
            />
          </Specimen>
        </Group>
      </div>
    </DemoLayout>
  );
}

// --- TrackedText sample --------------------------------------------------------------------

const REDLINE_TEXT =
  'Provider’s total liability will not exceed the Fees paid in the three (3) months before the claim. This Agreement is governed by the laws of the State of California.';

const REDLINE_CHANGES = [
  { id: 'c1', start: 64, end: 80, insert: 'twelve (12) months', title: 'R1 · Cap at 12 months of Fees' },
  { id: 'c2', start: 154, end: 164, insert: 'Delaware', title: 'R3 · Delaware law' },
];

function TrackedTextSample() {
  const [states, setStates] = useState({ c1: 'pending', c2: 'pending' });
  const [active, setActive] = useState('c1');
  const set = state => setStates(current => ({ ...current, [active]: state }));
  return (
    <div className={styles.stack}>
      <p className={styles.small}>
        <kit.TrackedText
          text={REDLINE_TEXT}
          changes={REDLINE_CHANGES.map(change => ({ ...change, state: states[change.id] }))}
          activeId={active}
          onSelect={setActive}
        />
      </p>
      <div className={styles.row}>
        <Button size="s" onClick={() => set('accepted')}>
          Accept {active}
        </Button>
        <Button size="s" variant="secondary" onClick={() => set('rejected')}>
          Reject {active}
        </Button>
        <Button size="s" variant="ghost" onClick={() => set('pending')}>
          Undo
        </Button>
      </div>
    </div>
  );
}
