import { streamFromApi } from 'demos/client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import styles from './AssemblyAI.module.css';
import { CHECK_COUNT, GROUPS, runChecks, STATUS_ORDER } from './checks';
import { CodeView, Rich } from './CodeView';
import { SAMPLES } from './reference';

const MAX_CHARS = 12000;
const INITIAL = SAMPLES[0];
const INITIAL_RESULTS = runChecks(INITIAL.code);

const STATUS_LABEL = { fail: 'Fail', warn: 'Warn', pass: 'Pass', na: 'N/A' };
const KEY_ERRORS = ['key_missing', 'key_invalid', 'key_expired'];

function verdict({ fail, warn, pass }) {
  if (fail) return { tone: 'fail', text: `Won't work on the first try: ${fail} ${fail === 1 ? 'failure' : 'failures'}` };
  if (warn) return { tone: 'warn', text: `Works, with ${warn} ${warn === 1 ? 'risk' : 'risks'} to fix` };
  if (pass) return { tone: 'pass', text: 'Passes every check that applies' };
  return { tone: 'na', text: 'Nothing streaming-related found to check' };
}

export function StatusIcon({ status }) {
  const paths = {
    fail: <path d="M5 5l6 6M11 5l-6 6" />,
    warn: <path d="M8 4.5v4.5M8 11.2v.3" />,
    pass: <path d="M4.5 8.3l2.3 2.3 4.7-5" />,
    na: <path d="M5 8h6" />,
  };
  return (
    <span className={`${styles.icon} ${styles[`icon_${status}`]}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16">
        {paths[status]}
      </svg>
    </span>
  );
}

/** Minimal markdown for the model's reply: headings, bullets, `code`, **bold**, fenced blocks. */
function Reply({ text }) {
  const blocks = [];
  const fence = /```(\w*)\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  let match;
  while ((match = fence.exec(text))) {
    if (match.index > last) blocks.push({ type: 'text', body: text.slice(last, match.index) });
    blocks.push({ type: 'code', lang: match[1] || 'js', body: match[2] });
    last = fence.lastIndex;
    if (match[0] === '') break;
  }
  if (last < text.length) blocks.push({ type: 'text', body: text.slice(last) });

  const inline = line =>
    line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i}>
          <Rich text={part.slice(2, -2)} />
        </strong>
      ) : (
        <Rich key={i} text={part} />
      )
    );

  return blocks.map((block, i) => {
    if (block.type === 'code') {
      const diff = block.lang === 'diff';
      return (
        <CodeView
          key={i}
          code={block.body}
          lang={diff ? 'diff' : 'js'}
          title={diff ? 'Proposed patch' : 'Code'}
          numbers={false}
        />
      );
    }
    return block.body
      .split(/\n{2,}/)
      .filter(para => para.trim())
      .map((para, j) => {
        const lines = para.split('\n').filter(line => line.trim());
        if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
          return (
            <ul key={`${i}-${j}`} className={styles.replyList}>
              {lines.map((line, k) => (
                <li key={k}>{inline(line.replace(/^\s*[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`${i}-${j}`} className={styles.replyPara}>
            {lines.map((line, k) => (
              <Fragment key={k}>
                {k > 0 && <br />}
                {/^#{1,4}\s/.test(line) ? <strong>{inline(line.replace(/^#{1,4}\s+/, ''))}</strong> : inline(line)}
              </Fragment>
            ))}
          </p>
        );
      });
  });
}

export function Checker({ request }) {
  const [sampleId, setSampleId] = useState(INITIAL.id);
  const [code, setCode] = useState(INITIAL.code);
  const [checked, setChecked] = useState({ code: INITIAL.code, ...INITIAL_RESULTS, run: 0 });
  const [editing, setEditing] = useState(false);
  const [focus, setFocus] = useState(null);
  const [llm, setLlm] = useState({ state: 'idle', text: '', error: '', keyNeeded: false });
  const textarea = useRef(null);
  const llmRun = useRef(0);

  const stale = code !== checked.code;
  const findings = checked.checks.filter(check => check.status === 'fail' || check.status === 'warn');

  const marks = useMemo(() => {
    const map = {};
    for (const check of [...checked.checks].sort((a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status])) {
      if (check.status === 'na') continue;
      check.lines.forEach(line => (map[line] = check.status));
    }
    return map;
  }, [checked]);

  function check(nextCode = code) {
    const results = runChecks(nextCode);
    setChecked(prev => ({ code: nextCode, ...results, run: prev.run + 1 }));
    setEditing(false);
    setFocus(null);
    llmRun.current++;
    setLlm({ state: 'idle', text: '', error: '', keyNeeded: false });
  }

  function pick(id) {
    const sample = SAMPLES.find(s => s.id === id);
    if (!sample) return;
    setSampleId(id);
    setCode(sample.code);
    check(sample.code);
  }

  function pasteOwn() {
    setSampleId('own');
    setCode('');
    setEditing(true);
    llmRun.current++;
    setLlm({ state: 'idle', text: '', error: '', keyNeeded: false });
    setTimeout(() => textarea.current?.focus(), 0);
  }

  useEffect(() => {
    if (request?.id) pick(request.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  async function explain() {
    const run = ++llmRun.current;
    setLlm({ state: 'running', text: '', error: '', keyNeeded: false });
    try {
      await streamFromApi('/api/demo/assemblyai/explain/', { code: checked.code }, (_, text) => {
        if (llmRun.current === run) setLlm(prev => ({ ...prev, text }));
      });
      if (llmRun.current === run) setLlm(prev => ({ ...prev, state: 'done' }));
    } catch (err) {
      if (llmRun.current !== run) return;
      setLlm({
        state: 'error',
        text: '',
        error: err.message,
        keyNeeded: KEY_ERRORS.includes(err.code),
      });
    }
  }

  // Groups with failures first, then warnings; within a group, worst first
  const orderedGroups = GROUPS.map((group, index) => {
    const items = checked.checks
      .filter(item => item.group === group.id)
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    const worst = Math.min(...items.map(item => STATUS_ORDER[item.status]));
    return { group, items, worst, index };
  }).sort((a, b) => a.worst - b.worst || a.index - b.index);

  const v = verdict(checked.counts);
  const showCode = editing || !checked.code.trim();

  return (
    <div className={styles.checker}>
      <div className={styles.samples} role="group" aria-label="Code to check">
        {SAMPLES.map(sample => (
          <button
            key={sample.id}
            type="button"
            className={styles.sampleButton}
            aria-pressed={sampleId === sample.id}
            onClick={() => pick(sample.id)}
          >
            {sample.label}
          </button>
        ))}
        <button type="button" className={styles.sampleButton} aria-pressed={sampleId === 'own'} onClick={pasteOwn}>
          Paste your own
        </button>
      </div>
      <p className={styles.sampleHint}>
        {sampleId === 'own'
          ? 'Paste a token route and the browser code (separate files with a // ---- path ---- line). Nothing leaves your browser for the rule checks.'
          : SAMPLES.find(s => s.id === sampleId)?.hint}
      </p>

      <div className={styles.checkerGrid}>
        <div className={styles.editorPane}>
          {showCode ? (
            <div className={styles.editorWrap}>
              <label className={styles.srOnly} htmlFor="aai-code">
                Code to check
              </label>
              <textarea
                id="aai-code"
                ref={textarea}
                className={styles.editor}
                value={code}
                spellCheck={false}
                maxLength={MAX_CHARS}
                placeholder={"// ---- app/api/token/route.js ----\nexport async function POST() { … }\n\n// ---- app/captions/Captions.jsx ----\n'use client';\n…"}
                onChange={event => {
                  setCode(event.target.value);
                  if (sampleId !== 'own') setSampleId('own');
                }}
              />
            </div>
          ) : (
            <CodeView
              code={checked.code}
              marks={marks}
              focusLine={focus}
              copy={false}
              className={styles.checkedCode}
            />
          )}
          <div className={styles.editorBar}>
            <button type="button" className={styles.primary} onClick={() => check()} disabled={!code.trim()}>
              {stale || showCode ? 'Run checks' : 'Run again'}
            </button>
            {!showCode && (
              <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
                Edit code
              </button>
            )}
            <span className={styles.charCount}>
              {code.length.toLocaleString('en-US')} / {MAX_CHARS.toLocaleString('en-US')}
            </span>
          </div>
        </div>

        <div className={`${styles.resultsPane} ${stale ? styles.resultsStale : ''}`} aria-live="polite">
          <div className={`${styles.verdict} ${styles[`verdict_${v.tone}`]}`}>
            <div className={styles.tally}>
              {['fail', 'warn', 'pass'].map(status => (
                <span key={status} className={`${styles.tallyItem} ${styles[`tally_${status}`]}`}>
                  <strong>{checked.counts[status]}</strong> {STATUS_LABEL[status].toLowerCase()}
                </span>
              ))}
              <span className={styles.tallyMuted}>{CHECK_COUNT} checks · free · in your browser</span>
            </div>
            <p className={styles.verdictText}>{v.text}</p>
            {stale && <p className={styles.staleNote}>These results are for the previous code. Run checks to update.</p>}
          </div>

          <div className={styles.results} key={checked.run}>
            {orderedGroups.map(({ group, items }) => {
              return (
                <div key={group.id} className={styles.resultGroup}>
                  <h4 className={styles.groupLabel}>{group.label}</h4>
                  <ul className={styles.resultList}>
                    {items.map((item, i) => (
                      <li
                        key={item.id}
                        className={`${styles.result} ${styles[`result_${item.status}`]}`}
                        style={{ '--i': i }}
                      >
                        <StatusIcon status={item.status} />
                        <div className={styles.resultBody}>
                          <div className={styles.resultTitle}>
                            <span>{item.title}</span>
                            <span className={styles.resultStatus}>{STATUS_LABEL[item.status]}</span>
                          </div>
                          {item.status !== 'pass' && item.status !== 'na' && (
                            <p className={styles.resultSummary}>
                              <Rich text={item.summary} />
                            </p>
                          )}
                          {(item.status === 'pass' || item.status === 'na') && (
                            <p className={styles.resultSummaryMuted}>
                              <Rich text={item.summary} />
                            </p>
                          )}
                          {(item.lines.length > 0 || (item.gap && item.status !== 'pass' && item.status !== 'na')) && (
                            <div className={styles.resultRefs}>
                              {item.status !== 'na' &&
                                item.lines.slice(0, 4).map(line => (
                                  <button
                                    key={line}
                                    type="button"
                                    className={styles.lineRef}
                                    onClick={() => {
                                      setEditing(false);
                                      setFocus({ line, at: Date.now() });
                                    }}
                                  >
                                    L{line}
                                  </button>
                                ))}
                              {item.gap && item.status !== 'pass' && item.status !== 'na' && (
                                <a className={styles.gapRef} href={`#${item.gap}`}>
                                  Evidence
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.llmPanel}>
        <div className={styles.llmHead}>
          <div>
            <h4 className={styles.llmTitle}>Explain and patch</h4>
            <p className={styles.llmNote}>
              Optional. A small OpenAI model gets the code and the failing checks, explains each and proposes one minimal
              diff. Repeat runs on the same code are cached.
            </p>
          </div>
          <button
            type="button"
            className={styles.primary}
            onClick={explain}
            disabled={llm.state === 'running' || stale || !findings.length}
          >
            {llm.state === 'running' ? 'Explaining…' : findings.length ? 'Explain failures' : 'Nothing to explain'}
          </button>
        </div>
        {llm.state === 'error' && (
          <p className={llm.keyNeeded ? styles.keyNotice : styles.error}>
            {llm.keyNeeded
              ? `${llm.error} The ${CHECK_COUNT} rule checks above are free and already ran in your browser.`
              : llm.error}
          </p>
        )}
        {llm.text && (
          <div className={styles.reply}>
            <Reply text={llm.text} />
            {llm.state === 'running' && <span className={styles.cursor} aria-hidden="true" />}
          </div>
        )}
      </div>
    </div>
  );
}
