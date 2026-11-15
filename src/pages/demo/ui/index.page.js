// Dev-only gallery of the demo UI kit (src/demos/ui): every component with sample props.
// `next dev` serves it at /demo/ui/; production builds return 404 (see getStaticProps).
import { DemoLayout } from 'demos/DemoLayout';
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
  MiniLabel,
  Notice,
  NoteGrid,
  OptionList,
  Pill,
  PipelineStrip,
  ProbabilityBar,
  ProbabilityBars,
  RichText,
  RunStatus,
  ScoreBadge,
  SectionHead,
  SegmentedControl,
  Select,
  SkeletonGrid,
  Spinner,
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
import styles from './Gallery.module.css';

export function getStaticProps() {
  // Built pages 404: the gallery is a development tool, not part of the site.
  if (process.env.NODE_ENV === 'production') return { notFound: true };
  return { props: {} };
}

// --- sample data -------------------------------------------------------------------------

const COLORS = [
  ['--uiRgbOk', 'rgb(var(--uiRgbOk))'],
  ['--uiRgbWarn', 'rgb(var(--uiRgbWarn))'],
  ['--uiRgbBad', 'rgb(var(--uiRgbBad))'],
  ['--uiRgbAccent', 'rgb(var(--uiRgbAccent))'],
  ['--uiLine', 'var(--uiLine)'],
  ['--uiLineStrong', 'var(--uiLineStrong)'],
  ['--uiPanel', 'var(--uiPanel)'],
  ['--uiWell', 'var(--uiWell)'],
  ['--uiWellStrong', 'var(--uiWellStrong)'],
  ['--uiMuted', 'var(--uiMuted)'],
];

const TYPE = [
  '--uiFontMicro',
  '--uiFontLabel',
  '--uiFontCaption',
  '--uiFontCode',
  '--uiFontSmall',
  '--uiFontNote',
  '--fontSizeBodyXS',
  '--fontSizeBodyS',
];

const RADII = [
  '--uiRadiusXS',
  '--uiRadiusS',
  '--uiRadiusM',
  '--uiRadiusL',
  '--uiRadiusXL',
  '--uiRadiusPill',
];

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

function Specimen({ name, note, children, wide }) {
  return (
    <div className={styles.specimen} data-wide={wide || undefined}>
      <div className={styles.specimenHead}>
        <code>{name}</code>
        {note && <span>{note}</span>}
      </div>
      <div className={styles.specimenBody}>{children}</div>
    </div>
  );
}

function Group({ id, title, children }) {
  return (
    <section id={id} className={styles.group} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.groupTitle}>
        {title}
      </h2>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}

export default function UiGallery() {
  const [mode, setMode] = useState('voice');
  const [view, setView] = useState('example');
  const [option, setOption] = useState('vague');
  const [chip, setChip] = useState('first');
  const [file, setFile] = useState('route');
  const [tool, setTool] = useState('lookup');
  const [focusLine, setFocusLine] = useState(null);

  return (
    <DemoLayout
      live={false}
      company="the demo kit"
      title="Demo UI kit"
      tagline="Every shared component in src/demos/ui with sample props. Development only: production builds return 404 for this page."
    >
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className={styles.page}>
        <nav className={styles.toc} aria-label="Groups">
          {[
            'tokens',
            'actions',
            'labels',
            'layout',
            'choices',
            'fields',
            'decisions',
            'runs',
            'data',
            'code',
            'states',
            'mcp',
            'format',
          ].map(id => (
            <a key={id} href={`#${id}`}>
              {id}
            </a>
          ))}
        </nav>

        <Group id="tokens" title="Tokens">
          <Specimen name="colours" note="tokens.module.css" wide>
            <div className={styles.swatches}>
              {COLORS.map(([name, value]) => (
                <div key={name} className={styles.swatch}>
                  <span style={{ background: value }} />
                  <code>{name}</code>
                </div>
              ))}
            </div>
          </Specimen>
          <Specimen name="type scale">
            {TYPE.map(name => (
              <p
                key={name}
                className={styles.typeRow}
                style={{ fontSize: `var(${name})` }}
              >
                <code>{name}</code> The quick brown fox
              </p>
            ))}
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
        </Group>

        <Group id="actions" title="Buttons">
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
              <Button pill>Start voice interview</Button>
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
        </Group>

        <Group id="labels" title="Pills, tags and badges">
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
          <Specimen name="Dot" note="tone, motion">
            <div className={styles.row}>
              <Dot tone="ok" /> <Dot tone="warn" /> <Dot tone="bad" /> <Dot tone="idle" />{' '}
              <Dot />
              <Dot tone="warn" motion="pulse" /> <Dot tone="bad" motion="ring" />
            </div>
          </Specimen>
          <Specimen name="RunStatus" note="example, wait, live, ended, idle">
            <div className={styles.stack}>
              <RunStatus state="example">
                Example run · 11 turns · recorded live
              </RunStatus>
              <RunStatus state="wait">Waiting for microphone permission…</RunStatus>
              <RunStatus state="live">Live · 2/10 answers</RunStatus>
              <RunStatus state="ended">Ended · Moderator wrapped up</RunStatus>
              <RunStatus>Ready</RunStatus>
            </div>
          </Specimen>
          <Specimen name="StatusIcon" note="soft (rules) and solid (evals)">
            <div className={styles.row}>
              {['fail', 'warn', 'pass', 'na'].map(status => (
                <StatusIcon key={status} status={status} />
              ))}
              {['pass', 'fail', 'warn', 'na'].map(status => (
                <StatusIcon key={status} variant="solid" status={status} />
              ))}
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

        <Group id="layout" title="Layout">
          <Specimen name="Card + CardHead + CardTitle" note="aside, nowrap, size s">
            <Card>
              <CardHead aside={<Button variant="link">Replay</Button>}>
                <CardTitle>Agent run</CardTitle>
                <Pill>Example run</Pill>
              </CardHead>
              <p className={styles.small}>Card padding follows --uiCardPad.</p>
            </Card>
          </Specimen>
          <Specimen name="Card (small)">
            <Card style={{ '--uiCardPad': 'var(--spaceM)' }}>
              <CardHead nowrap aside={<Spinner />}>
                <IndexBadge>3</IndexBadge>
                <CardTitle size="s">License expires before delivery</CardTitle>
              </CardHead>
              <p className={styles.small}>Not run yet</p>
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
          <Specimen name="NoteGrid variant=accent" wide>
            <NoteGrid items={NOTES} />
          </Specimen>
          <Specimen name="NoteGrid variant=boxed" wide>
            <NoteGrid variant="boxed" items={NOTES.slice(0, 2)} />
          </Specimen>
        </Group>

        <Group id="choices" title="Choices and tabs">
          <Specimen name="SegmentedControl variant=pill">
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
            </div>
          </Specimen>
          <Specimen name="SegmentedControl variant=box">
            <div className={styles.row}>
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
          <Specimen name="OptionList">
            <OptionList
              label="Samples"
              options={OPTIONS}
              value={option}
              onChange={setOption}
            />
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
          <Specimen name="Tabs variant=files">
            <Tabs
              label="Files"
              items={[
                { id: 'route', label: 'route.js', sub: 'app/api/token/' },
                { id: 'worklet', label: 'pcm16-worklet.js', sub: 'public/' },
              ]}
              value={file}
              onChange={setFile}
            />
          </Specimen>
          <Specimen name="Tabs variant=list">
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
        </Group>

        <Group id="fields" title="Fields">
          <Specimen name="TextArea variant=plain">
            <TextArea rows={3} defaultValue="Hi, my order #4417 arrived damaged." />
          </Specimen>
          <Specimen name="TextArea code">
            <TextArea code rows={3} defaultValue={'{\n  "order": "4417"\n}'} />
          </Specimen>
          <Specimen name="Input + Select (variant=ring)">
            <div className={styles.row}>
              <Input defaultValue="payroll" aria-label="Query" />
              <Select aria-label="Goal" defaultValue="">
                <option value="">Any goal</option>
                <option value="G1">G1 Setup</option>
              </Select>
            </div>
          </Specimen>
        </Group>

        <Group id="decisions" title="Decisions">
          <Specimen name="ProbabilityBars" note="options, probabilities, choice">
            <ProbabilityBars
              options={ROUTES}
              probabilities={{ auto: 0.06, review: 0.81, hold: 0.13 }}
              choice="review"
            />
          </Specimen>
          <Specimen name="ProbabilityBar" note="marks = thresholds">
            <ProbabilityBar
              label="Yes"
              value={0.64}
              tone="ok"
              strong
              marks={[0.5, 0.8]}
            />
          </Specimen>
        </Group>

        <Group id="runs" title="Runs and timelines">
          <Specimen name="PipelineStrip" wide>
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

        <Group id="data" title="JSON">
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
        </Group>

        <Group id="code" title="Code and text">
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
        </Group>

        <Group id="states" title="Empty, loading and notices">
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
            <EmptyState>
              <SkeletonGrid label="Generating findings" />
            </EmptyState>
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

        <Group id="mcp" title="MCP">
          <Specimen name="McpToolPanel" note="tools, examples, call" wide>
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

        <Group id="format" title="Format helpers">
          <Specimen name="demos/ui/format" wide>
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
      </div>
    </DemoLayout>
  );
}
