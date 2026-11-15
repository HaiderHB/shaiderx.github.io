// Prototype for AssemblyAI (Agent Experience): a reproducible "coding agent integrates
// real-time streaming" failure, a free in-browser checker for it, and the fix.
// Live at /demo/assemblyai/ (unlisted, noindex). Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import {
  Button,
  Card,
  CardTitle,
  Caret,
  CodeView,
  InlineCode,
  Kicker,
  Pill,
  RichText,
  SectionHead as KitSectionHead,
  SplitBar,
  Tabs,
} from 'demos/ui';
import { useState } from 'react';
import { FiArrowDown, FiArrowUpRight, FiCheck, FiX } from 'react-icons/fi';
import styles from './AssemblyAI.module.css';
import { Checker } from './Checker';
import { CHECK_COUNT, runChecks } from './checks';
import { ALSO_SEEN, GAPS, VERIFIED_ON } from './gaps';
import { LiveCaptions } from './LiveCaptions';
import { MCP_TOOLS, README_DIFF, REFERENCE_FILES, SAMPLES } from './reference';

export function getStaticProps() {
  // The live captions button only exists when the deployment has an AssemblyAI key.
  return { props: { liveCaptions: Boolean(process.env.ASSEMBLYAI_API_KEY) } };
}

const TASK = 'Add live mic captions to my Next.js app with AssemblyAI streaming.';

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const FIRST_TRY = runChecks(SAMPLES[0].code);
const FIRST_TRY_FAILS = FIRST_TRY.counts.fail;

// One-line consequences for the hero; the checker shows the full findings.
const HERO_REASONS = {
  syntax: "The SDK README's token snippet is a SyntaxError, so the route never builds.",
  'audio-format': "Chrome's MediaRecorder can't record Ogg: NotSupportedError, no audio.",
  terminate: 'close() right after Terminate drops the last sentence.',
};

// Section links for the bar, and the same sections as numbered tiles under the task.
const NAV = [
  { href: '#checker', label: 'Checker' },
  { href: '#gaps', label: 'Gaps' },
  { href: '#fix', label: 'Fix' },
  { href: '#proposal', label: 'Proposal' },
  { href: '#plan', label: 'First 30 days' },
];

const SECTIONS = [
  { id: 'checker', value: CHECK_COUNT, unit: 'rules', label: 'Checker' },
  { id: 'gaps', value: GAPS.length, unit: 'verified', label: 'Gaps' },
  { id: 'fix', value: REFERENCE_FILES.length, unit: 'files', label: 'Fix' },
  { id: 'proposal', value: MCP_TOOLS.length, unit: 'MCP tools', label: 'Proposal' },
  { id: 'plan', value: 30, unit: 'days', label: 'First 30 days' },
];

const EVAL_CONDITIONS = [
  ['Bare', 'The agent alone, no AssemblyAI context.'],
  ['Docs MCP', 'assemblyai-docs MCP server connected (docs search only).'],
  ['Skill', 'AssemblyAI/assemblyai-skill installed.'],
  ['Skill + fixes', 'Same, after the doc, skill and README fixes on this page. The delta is the point.'],
];

const EVAL_METRICS = [
  [
    'First-try success',
    'Agent says done, no human edits, and the app shows a final Turn for a scripted 16 kHz clip fed through Chrome\'s fake mic (--use-file-for-fake-audio-capture).',
  ],
  ['Time to first transcript', 'Agent start to the first Turn in the harness, wall clock.'],
  [`Checker failures`, `The ${CHECK_COUNT} rules on this page run on the final diff as graders; a key in the client bundle is an automatic fail.`],
  ['Cost per run', 'Agent tokens and AssemblyAI session seconds, so a fix that "works" by retrying shows up.'],
];

// The run matrix from the eval lede, as factors: 3 × 4 × 2 × 30 = 720.
const EVAL_FACTORS = [
  [3, 'agents'],
  [EVAL_CONDITIONS.length, 'conditions'],
  [2, 'Next.js versions'],
  [30, 'runs each'],
];
const EVAL_RUNS = EVAL_FACTORS.reduce((total, [count]) => total * count, 1);

const PLAN = [
  {
    title: 'Week 1–2: a baseline per agent.',
    body: `Stand up the harness above for five tasks (pre-recorded, browser streaming, voice agent on LiveKit or Pipecat, LLM Gateway, TTS), run Claude Code, Cursor and Codex through it, and publish first-try rates per surface. Every later change ships with a delta against it.`,
  },
  {
    title: 'Week 2–3: one source of truth for the risky calls.',
    body: 'Token minting, auth form, shutdown and audio capture written once and generated into the agent prompt, skill, SDK README and examples. Add a docs CI that compiles every JS and Python block (it would have caught the README typo) and flags rules that contradict across agent-facing files.',
  },
  {
    title: 'Week 3–4: let agents test, not guess.',
    body: 'Ship create_streaming_token and check_streaming_config on the MCP server, a first-party Next.js browser page in llms.txt, and a single-mic helper from the PCM16 worklet the SDK already ships. Re-run the eval and report the change.',
  },
];

const PLAN_WEEKS = [1, 2, 3, 4];

// "Week 1–2: a baseline per agent." → the weeks it covers and the headline after the colon.
function planParts(title) {
  const match = title.match(/^Week (\d)\D(\d):\s*(.*)$/);
  if (!match) return { when: null, from: 0, to: 0, headline: title };
  return {
    when: title.slice(0, title.indexOf(':')),
    from: Number(match[1]),
    to: Number(match[2]),
    headline: match[3].charAt(0).toUpperCase() + match[3].slice(1),
  };
}

function SectionHead({ n, title, kicker, children }) {
  return <KitSectionHead variant="numbered" index={n} kicker={kicker} title={title} lede={children} />;
}

const FILE_TABS = REFERENCE_FILES.map((item, i) => ({
  id: i,
  label: item.path.split('/').pop(),
  sub: <>{item.path.split('/').slice(0, -1).join('/')}/</>,
}));

/** The agent's first try: the one saturated card on the page, beside the title. */
function FirstTryVerdict() {
  const { fail, warn, pass } = FIRST_TRY.counts;
  return (
    <Card tone="accent" className={styles.verdictCard} aria-label="The agent's first try">
      <div className={styles.verdictHead}>
        <Kicker className={styles.verdictKicker}>The agent&apos;s first try</Kicker>
        <span className={styles.verdictChip}>{CHECK_COUNT} rules</span>
      </div>
      <div className={styles.verdictScore}>
        <p className={styles.verdictCount}>
          <strong>{fail}</strong>
          <span>failures</span>
        </p>
        <SplitBar
          className={styles.verdictSplit}
          label={`${fail} failures, ${warn} warnings, ${pass} pass`}
          parts={[
            { label: 'failures', value: fail, tone: 'ink' },
            { label: 'warnings', value: warn, tone: 'warn' },
            { label: 'pass', value: pass, tone: 'muted' },
          ]}
        />
      </div>
      <ul className={styles.verdictFails}>
        {FIRST_TRY.checks
          .filter(check => check.status === 'fail')
          .map(check => (
            <li key={check.id}>
              <span className={styles.verdictMark} aria-hidden>
                <FiX />
              </span>
              <span>{HERO_REASONS[check.id] || check.title}</span>
            </li>
          ))}
      </ul>
      <a className={styles.verdictLink} href="#checker">
        <span>Built only from AssemblyAI&apos;s own snippets. See every line</span>
        <FiArrowDown aria-hidden />
      </a>
    </Card>
  );
}

function Evidence({ item }) {
  return (
    <figure className={styles.evidence}>
      {item.code ? (
        <pre className={styles.evidenceCode}>{item.code}</pre>
      ) : (
        <blockquote className={styles.quote}>
          <RichText text={item.quote} />
        </blockquote>
      )}
      <figcaption className={styles.source}>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.label}
            <FiArrowUpRight aria-hidden />
          </a>
        ) : (
          item.label
        )}
      </figcaption>
    </figure>
  );
}

function GapCard({ gap, n }) {
  return (
    <Card as="article" id={gap.id} className={styles.gap} style={{ order: n }}>
      <header className={styles.gapHead}>
        <span className={styles.gapNo}>{String(n).padStart(2, '0')}</span>
        <h3 className={styles.gapTitle}>{gap.title}</h3>
      </header>
      <dl className={styles.gapRows}>
        <div>
          <dt>Agent does</dt>
          <dd>
            <RichText text={gap.agent} />
          </dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd className={styles.evidenceList}>
            {gap.evidence.map((item, i) => (
              <Evidence key={i} item={item} />
            ))}
          </dd>
        </div>
        <div>
          <dt>Breaks</dt>
          <dd>
            <RichText text={gap.breaks} />
          </dd>
        </div>
        <div className={styles.gapFix}>
          <dt>
            <FiCheck aria-hidden />
            Fix
          </dt>
          <dd>
            <RichText text={gap.fix} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export default function AssemblyAIDemo({ liveCaptions = false }) {
  const [fileIndex, setFileIndex] = useState(0);
  const [checkRequest, setCheckRequest] = useState(null);
  const file = REFERENCE_FILES[fileIndex];

  function checkReference() {
    setCheckRequest({ id: 'reference', at: Date.now() });
    document.getElementById('checker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <DemoLayout
      company="AssemblyAI"
      accent="cobalt"
      nav={NAV}
      hero={<FirstTryVerdict />}
      title="First-try streaming: where coding agents trip on AssemblyAI"
      tagline="A reproducible failure and its fix. Eight gaps an agent hits on one common task, each verified against the live source, a free checker that catches them, and a reference integration that passes."
    >
      <div className={styles.page}>
        <section className={styles.intro} aria-label="The task">
          <Card className={styles.task}>
            <div className={styles.taskPrompt}>
              <Kicker>The task</Kicker>
              <p className={styles.prompt}>
                <span className={styles.promptMark} aria-hidden="true">
                  &gt;
                </span>
                <span>
                  {TASK}
                  <Caret className={styles.promptCaret} />
                </span>
              </p>
            </div>
            <p className={styles.taskNote}>
              I traced what a coding agent reads for this (the agent prompt, SDK README, skill, protocol pages, llms.txt
              and the examples it links), checked each problem against the live source on {VERIFIED_ON}, and turned the
              failures into rules you can run below.
            </p>
          </Card>

          <nav className={styles.jumps} aria-label="On this page">
            {SECTIONS.map((section, i) => (
              <a key={section.id} href={`#${section.id}`} className={styles.jump}>
                <span className={styles.jumpNo}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.jumpValue}>
                  {section.value}
                  <span>{section.unit}</span>
                </span>
                <span className={styles.jumpLabel}>
                  {section.label}
                  <FiArrowDown aria-hidden />
                </span>
              </a>
            ))}
          </nav>
        </section>

        <section id="checker" className={styles.section}>
          <SectionHead n="01" title="Integration checker" kicker="Live, free">
            Below is what an agent assembles from AssemblyAI&apos;s own current snippets. It looks right and fails{' '}
            {NUMBER_WORDS[FIRST_TRY_FAILS] || FIRST_TRY_FAILS} ways. Pick another sample or paste your own; each
            finding links to its line and its evidence.
          </SectionHead>
          <Checker request={checkRequest} />
        </section>

        <section id="gaps" className={styles.section}>
          <SectionHead n="02" title={`${GAPS.length} verified gaps`} kicker={`Checked ${VERIFIED_ON}`}>
            Each one: what the agent does, the source that leads it there, what breaks, and the smallest fix. Quotes
            are verbatim from the linked page, markdown emphasis dropped.
          </SectionHead>
          {/* Two independent columns so cards pack tightly; `order` restores 01..08 on one column */}
          <div className={styles.gapGrid}>
            {[0, 1].map(column => (
              <div key={column} className={styles.gapColumn}>
                {GAPS.map((gap, i) =>
                  i % 2 === column ? <GapCard key={gap.id} gap={gap} n={i + 1} /> : null
                )}
              </div>
            ))}
          </div>
          <Card tone="inset" className={styles.alsoSeen}>
            <h3 className={styles.alsoTitle}>Also seen while probing</h3>
            <ul>
              {ALSO_SEEN.map(item => (
                <li key={item}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section id="fix" className={styles.section}>
          <SectionHead n="03" title="The fix" kicker="Reference integration">
            Three files for a Next.js App Router project, written against the current v3 docs. Only the token route
            sees the key.
          </SectionHead>
          <Card className={styles.fixCard}>
            <div className={styles.fixHead}>
              <Tabs
                variant="files"
                label="Reference files"
                items={FILE_TABS}
                value={fileIndex}
                onChange={setFileIndex}
              />
              <p className={styles.fileNote}>{file.note}</p>
            </div>
            <CodeView code={file.code} title={file.path} maxHeight="560px" className={styles.nestedCode} />
            <div className={styles.fixActions}>
              <Button variant="secondary" size="s" onClick={checkReference}>
                Run the checker on these files
              </Button>
              <span className={styles.fixHint}>
                Needs <InlineCode>ASSEMBLYAI_API_KEY</InlineCode> on the server only. Not run live here unless this
                deployment has a key.
              </span>
            </div>
          </Card>
          {liveCaptions && <LiveCaptions />}
        </section>

        <section id="proposal" className={styles.section}>
          <SectionHead n="04" title="Agent-experience changes" kicker="Proposed, not shipped">
            Two MCP tools so an agent can test streaming instead of guessing, the one-line README fix, and how I would
            measure whether any of it helps.
          </SectionHead>

          <div className={styles.toolGrid}>
            {MCP_TOOLS.map((tool, i) => (
              <Card key={tool.name} className={styles.tool}>
                <div className={styles.toolHead}>
                  <span className={styles.toolNo}>Tool {i + 1}</span>
                  <h3 className={styles.toolName}>
                    <code>{tool.name}</code>
                  </h3>
                  <p className={styles.toolWhy}>{tool.why}</p>
                </div>
                <CodeView
                  code={JSON.stringify(tool.schema, null, 2)}
                  lang="js"
                  title="MCP tool definition"
                  numbers={false}
                  wrap
                  maxHeight="420px"
                  className={styles.nestedCode}
                />
              </Card>
            ))}
          </div>

          <Card className={styles.readmeFix}>
            <div className={styles.readmeText}>
              <CardTitle>The README fix</CardTitle>
              <p className={styles.readmeDelta} aria-hidden>
                <span data-kind="removed">−1</span>
                <span data-kind="added">+1</span>
              </p>
            </div>
            <CodeView
              code={README_DIFF}
              lang="diff"
              title="assemblyai-node-sdk/README.md"
              numbers={false}
              className={styles.nestedCode}
            />
          </Card>

          <Card className={styles.evalBox}>
            <div className={styles.evalHead}>
              <CardTitle>How I would measure it</CardTitle>
              <Pill caps tone="warn">
                Design only. No results yet.
              </Pill>
            </div>
            <p className={styles.evalLede}>
              The task above, N = 30 runs for each agent (Claude Code, Cursor, Codex), condition and Next.js version (14
              and 15), each from a fresh create-next-app repo: 3 × 4 × 2 × 30 = 720 runs. Rates reported with 95%
              intervals.
            </p>

            <div className={styles.evalMatrix} aria-hidden>
              {EVAL_FACTORS.map(([count, label], i) => (
                <span key={label} className={styles.evalFactor}>
                  {i > 0 && <i>×</i>}
                  <strong>{count}</strong>
                  <span>{label}</span>
                </span>
              ))}
              <span className={styles.evalFactor} data-total>
                <i>=</i>
                <strong>{EVAL_RUNS}</strong>
                <span>runs</span>
              </span>
            </div>

            {/* Conditions down, metrics across; every cell is empty until the eval has run */}
            <div className={styles.evalTable}>
              <h4 className={styles.evalCorner}>Conditions</h4>
              <h4 className={styles.evalScored}>Scored on</h4>
              {EVAL_METRICS.map(([name, text], column) => (
                <div key={name} className={styles.evalMetric} style={{ '--col': column + 2 }}>
                  <strong>{name}</strong>
                  <span>{text}</span>
                </div>
              ))}
              {EVAL_CONDITIONS.map(([name, text], row) => (
                <div key={name} className={styles.evalRow} style={{ '--row': row + 3 }}>
                  <div className={styles.evalCondition}>
                    <strong>{name}</strong>
                    <span>{text}</span>
                  </div>
                  {EVAL_METRICS.map(([metric]) => (
                    <span key={metric} className={styles.evalCell} aria-hidden title="No result yet" />
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section id="plan" className={styles.section}>
          <SectionHead n="05" title="What I'd do in the first 30 days" />
          <ol className={styles.plan}>
            {PLAN.map((item, i) => {
              const { when, from, to, headline } = planParts(item.title);
              return (
                <Card as="li" key={item.title} className={styles.planStep}>
                  <div className={styles.planHead}>
                    <span className={styles.planNo}>{String(i + 1).padStart(2, '0')}</span>
                    {when && <span className={styles.planWhen}>{when}</span>}
                  </div>
                  {when && (
                    <span className={styles.planWeeks} aria-hidden>
                      {PLAN_WEEKS.map(week => (
                        <i key={week} data-on={week >= from && week <= to ? '' : undefined} />
                      ))}
                    </span>
                  )}
                  <h3 className={styles.planTitle}>{headline}</h3>
                  <p className={styles.planBody}>{item.body}</p>
                </Card>
              );
            })}
          </ol>
        </section>
      </div>
    </DemoLayout>
  );
}
