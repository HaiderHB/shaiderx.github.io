// Prototype for AssemblyAI (Agent Experience): a reproducible "coding agent integrates
// real-time streaming" failure, a free in-browser checker for it, and the fix.
// Live at /demo/assemblyai/ (unlisted, noindex). Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { useState } from 'react';
import styles from './AssemblyAI.module.css';
import { Checker, StatusIcon } from './Checker';
import { CHECK_COUNT, runChecks } from './checks';
import { CodeView, Rich } from './CodeView';
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

const SECTIONS = [
  ['checker', `Checker · ${CHECK_COUNT} rules`],
  ['gaps', `Gaps · ${GAPS.length}`],
  ['fix', 'Fix · 3 files'],
  ['proposal', 'Proposal'],
  ['plan', 'First 30 days'],
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

function SectionHead({ n, title, kicker, children }) {
  return (
    <header className={styles.sectionHead}>
      <span className={styles.sectionNo}>{n}</span>
      <div>
        {kicker && <p className={styles.kicker}>{kicker}</p>}
        <h2 className={styles.sectionTitle}>{title}</h2>
        {children && <p className={styles.sectionLede}>{children}</p>}
      </div>
    </header>
  );
}

function Evidence({ item }) {
  return (
    <figure className={styles.evidence}>
      {item.code ? (
        <pre className={styles.evidenceCode}>{item.code}</pre>
      ) : (
        <blockquote className={styles.quote}>
          <Rich text={item.quote} />
        </blockquote>
      )}
      <figcaption className={styles.source}>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer">
            {item.label}
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
    <article id={gap.id} className={styles.gap}>
      <header className={styles.gapHead}>
        <span className={styles.gapNo}>{String(n).padStart(2, '0')}</span>
        <h3 className={styles.gapTitle}>{gap.title}</h3>
      </header>
      <dl className={styles.gapRows}>
        <dt>Agent does</dt>
        <dd>
          <Rich text={gap.agent} />
        </dd>
        <dt>Evidence</dt>
        <dd className={styles.evidenceList}>
          {gap.evidence.map((item, i) => (
            <Evidence key={i} item={item} />
          ))}
        </dd>
        <dt>Breaks</dt>
        <dd>
          <Rich text={gap.breaks} />
        </dd>
        <dt className={styles.fixLabel}>Fix</dt>
        <dd className={styles.fixText}>
          <Rich text={gap.fix} />
        </dd>
      </dl>
    </article>
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
      title="First-try streaming: where coding agents trip on AssemblyAI"
      tagline="A reproducible failure and its fix. Eight gaps an agent hits on one common task, each verified against the live source, a free checker that catches them, and a reference integration that passes."
    >
      <div className={styles.page}>
      <section className={styles.hero} aria-label="The task">
        <div className={styles.task}>
          <p className={styles.kicker}>The task</p>
          <p className={styles.prompt}>
            <span className={styles.promptMark} aria-hidden="true">
              &gt;
            </span>
            {TASK}
          </p>
          <p className={styles.taskNote}>
            I traced what a coding agent reads for this (the agent prompt, SDK README, skill, protocol pages, llms.txt
            and the examples it links), checked each problem against the live source on {VERIFIED_ON}, and turned the
            failures into rules you can run below.
          </p>
        </div>
        <div className={styles.heroVerdict}>
          <p className={styles.kicker}>The agent&apos;s first try</p>
          <p className={styles.heroScore}>
            <strong>{FIRST_TRY_FAILS}</strong> failures
            <span>
              {' '}
              · {FIRST_TRY.counts.warn} warnings · {FIRST_TRY.counts.pass} pass
            </span>
          </p>
          <ul className={styles.heroFails}>
            {FIRST_TRY.checks
              .filter(check => check.status === 'fail')
              .map(check => (
                <li key={check.id}>
                  <StatusIcon status="fail" />
                  <span>{HERO_REASONS[check.id] || check.title}</span>
                </li>
              ))}
          </ul>
          <a className={styles.heroLink} href="#checker">
            Built only from AssemblyAI&apos;s own snippets. See every line ↓
          </a>
        </div>
      </section>

      <nav className={styles.toc} aria-label="Sections">
        {SECTIONS.map(([id, label], i) => (
          <a key={id} href={`#${id}`}>
            <span>{String(i + 1).padStart(2, '0')}</span> {label}
          </a>
        ))}
      </nav>

      <section id="checker" className={`${styles.section} ${styles.sectionFirst}`}>
        <SectionHead n="01" title="Integration checker" kicker="Live, free">
          Below is what an agent assembles from AssemblyAI&apos;s own current snippets. It looks right and fails{' '}
          {NUMBER_WORDS[FIRST_TRY_FAILS] || FIRST_TRY_FAILS} ways. Pick another sample or paste your own; each finding links to its line and its evidence.
        </SectionHead>
        <Checker request={checkRequest} />
      </section>

      <section id="gaps" className={styles.section}>
        <SectionHead n="02" title={`${GAPS.length} verified gaps`} kicker={`Checked ${VERIFIED_ON}`}>
          Each one: what the agent does, the source that leads it there, what breaks, and the smallest fix. Quotes are
          verbatim from the linked page, markdown emphasis dropped.
        </SectionHead>
        <div className={styles.gapGrid}>
          {GAPS.map((gap, i) => (
            <GapCard key={gap.id} gap={gap} n={i + 1} />
          ))}
        </div>
        <div className={styles.alsoSeen}>
          <h3 className={styles.alsoTitle}>Also seen while probing</h3>
          <ul>
            {ALSO_SEEN.map(item => (
              <li key={item}>
                <Rich text={item} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="fix" className={styles.section}>
        <SectionHead n="03" title="The fix" kicker="Reference integration">
          Three files for a Next.js App Router project, written against the current v3 docs. Only the token route sees
          the key.
        </SectionHead>
        <div className={styles.fileTabs} role="tablist" aria-label="Reference files">
          {REFERENCE_FILES.map((item, i) => (
            <button
              key={item.path}
              type="button"
              role="tab"
              aria-selected={fileIndex === i}
              className={styles.fileTab}
              onClick={() => setFileIndex(i)}
            >
              {item.path.split('/').pop()}
              <span className={styles.fileDir}>{item.path.split('/').slice(0, -1).join('/')}/</span>
            </button>
          ))}
        </div>
        <p className={styles.fileNote}>{file.note}</p>
        <CodeView code={file.code} title={file.path} maxHeight="560px" className={styles.fixCode} />
        <div className={styles.fixActions}>
          <button type="button" className={styles.secondary} onClick={checkReference}>
            Run the checker on these files
          </button>
          <span className={styles.fixHint}>
            Needs <code className={styles.inlineCode}>ASSEMBLYAI_API_KEY</code> on the server only. Not run live here
            unless this deployment has a key.
          </span>
        </div>
        {liveCaptions && <LiveCaptions />}
      </section>

      <section id="proposal" className={styles.section}>
        <SectionHead n="04" title="Agent-experience changes" kicker="Proposed, not shipped">
          Two MCP tools so an agent can test streaming instead of guessing, the one-line README fix, and how I would
          measure whether any of it helps.
        </SectionHead>

        <div className={styles.toolGrid}>
          {MCP_TOOLS.map(tool => (
            <div key={tool.name} className={styles.tool}>
              <h3 className={styles.toolName}>
                <code>{tool.name}</code>
              </h3>
              <p className={styles.toolWhy}>{tool.why}</p>
              <CodeView
                code={JSON.stringify(tool.schema, null, 2)}
                lang="js"
                title="MCP tool definition"
                numbers={false}
                wrap
                maxHeight="420px"
              />
            </div>
          ))}
        </div>

        <div className={styles.readmeFix}>
          <h3 className={styles.subTitle}>The README fix</h3>
          <CodeView code={README_DIFF} lang="diff" title="assemblyai-node-sdk/README.md" numbers={false} />
        </div>

        <div className={styles.evalBox}>
          <div className={styles.evalHead}>
            <h3 className={styles.subTitle}>How I would measure it</h3>
            <span className={styles.badge}>Design only. No results yet.</span>
          </div>
          <p className={styles.evalLede}>
            The task above, N = 30 runs for each agent (Claude Code, Cursor, Codex), condition and Next.js version (14 and
            15), each from a fresh create-next-app repo: 3 × 4 × 2 × 30 = 720 runs. Rates reported with 95% intervals.
          </p>
          <div className={styles.evalGrid}>
            <div>
              <h4 className={styles.evalLabel}>Conditions</h4>
              <dl className={styles.evalList}>
                {EVAL_CONDITIONS.map(([name, text]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h4 className={styles.evalLabel}>Scored on</h4>
              <dl className={styles.evalList}>
                {EVAL_METRICS.map(([name, text]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section id="plan" className={styles.section}>
        <SectionHead n="05" title="What I'd do in the first 30 days" />
        <ol className={styles.plan}>
          {PLAN.map(item => (
            <li key={item.title}>
              <strong>{item.title}</strong> {item.body}
            </li>
          ))}
        </ol>
      </section>
      </div>
    </DemoLayout>
  );
}
