import { streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardTitle,
  Caret,
  ChoiceChips,
  CodeView,
  MarkdownLite,
  Notice,
  RichText,
  SplitBar,
  StatusIcon,
  srOnly,
} from 'demos/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowDown, FiCode, FiZap } from 'react-icons/fi';
import styles from './AssemblyAI.module.css';
import { CHECK_COUNT, GROUPS, runChecks, STATUS_ORDER } from './checks';
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

const SAMPLE_OPTIONS = [
  ...SAMPLES.map(sample => ({ value: sample.id, label: sample.label })),
  { value: 'own', label: 'Paste your own' },
];

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
  const { fail, warn, pass, na } = checked.counts;

  return (
    <div className={styles.checker}>
      <div className={styles.checkerBar}>
        <ChoiceChips
          label="Code to check"
          options={SAMPLE_OPTIONS}
          value={sampleId}
          onChange={id => (id === 'own' ? pasteOwn() : pick(id))}
        />
        <p className={styles.sampleHint}>
          {sampleId === 'own'
            ? 'Paste a token route and the browser code (separate files with a // ---- path ---- line). Nothing leaves your browser for the rule checks.'
            : SAMPLES.find(s => s.id === sampleId)?.hint}
        </p>
      </div>

      <div className={styles.checkerGrid}>
        <Card className={styles.codePane}>
          <div className={styles.paneHead}>
            <span className={styles.paneTitle}>
              <FiCode aria-hidden />
              Code
            </span>
            <span className={styles.markLegend} aria-hidden>
              <i data-mark="fail" />
              fail
              <i data-mark="warn" />
              warn
            </span>
            <span className={styles.charCount}>
              {code.length.toLocaleString('en-US')} / {MAX_CHARS.toLocaleString('en-US')}
            </span>
          </div>
          {showCode ? (
            <div className={styles.editorWrap}>
              <label className={srOnly} htmlFor="aai-code">
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
            <Button size="s" onClick={() => check()} disabled={!code.trim()}>
              {stale || showCode ? 'Run checks' : 'Run again'}
            </Button>
            {!showCode && (
              <Button variant="secondary" size="s" onClick={() => setEditing(true)}>
                Edit code
              </Button>
            )}
            <span className={styles.editorNote}>{CHECK_COUNT} checks · free · in your browser</span>
          </div>
        </Card>

        {/* The cell takes its height from the code pane; the card fills it and scrolls inside */}
        <div className={styles.resultsCell}>
          <Card className={styles.resultsPane} data-stale={stale ? '' : undefined} aria-live="polite">
            <div className={styles.verdict} data-tone={v.tone}>
              <div className={styles.verdictLine}>
                <StatusIcon status={v.tone} />
                <p className={styles.verdictText}>{v.text}</p>
              </div>
              <SplitBar
                className={styles.tally}
                label={`${fail} fail, ${warn} warn, ${pass} pass, ${na} not applicable`}
                parts={[
                  { label: STATUS_LABEL.fail.toLowerCase(), value: fail, tone: 'bad' },
                  { label: STATUS_LABEL.warn.toLowerCase(), value: warn, tone: 'warn' },
                  { label: STATUS_LABEL.pass.toLowerCase(), value: pass, tone: 'ok' },
                  ...(na ? [{ label: STATUS_LABEL.na.toLowerCase(), value: na, tone: 'muted' }] : []),
                ]}
              />
              {stale && <p className={styles.staleNote}>These results are for the previous code. Run checks to update.</p>}
            </div>

            <div className={styles.results} key={checked.run}>
              {orderedGroups.map(({ group, items }) => {
                return (
                  <div key={group.id} className={styles.resultGroup}>
                    <h4 className={styles.groupLabel}>
                      {group.label}
                      <span>{items.length}</span>
                    </h4>
                    <ul className={styles.resultList}>
                      {items.map((item, i) => (
                        <li key={item.id} className={styles.result} data-status={item.status} style={{ '--index': i }}>
                          <StatusIcon status={item.status} />
                          <div className={styles.resultBody}>
                            <div className={styles.resultTitle}>
                              <span>{item.title}</span>
                              <span className={styles.resultStatus}>{STATUS_LABEL[item.status]}</span>
                            </div>
                            {item.status !== 'pass' && item.status !== 'na' && (
                              <p className={styles.resultSummary}>
                                <RichText text={item.summary} />
                              </p>
                            )}
                            {(item.status === 'pass' || item.status === 'na') && (
                              <p className={styles.resultSummaryMuted}>
                                <RichText text={item.summary} />
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
                                    <FiArrowDown aria-hidden />
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
          </Card>
        </div>
      </div>

      <Card className={styles.llmPanel}>
        <div className={styles.llmHead}>
          <span className={styles.llmIcon} aria-hidden>
            <FiZap />
          </span>
          <div>
            <CardTitle as="h4">Explain and fix</CardTitle>
            <p className={styles.llmNote}>
              Optional. DeepSeek V3.2 (via fal) gets the code and the failing checks and explains what
              each one breaks; each Fix line is reviewed text for that check. Repeat runs are cached.
            </p>
          </div>
          <Button size="s" onClick={explain} disabled={llm.state === 'running' || stale || !findings.length}>
            {llm.state === 'running' ? 'Explaining…' : findings.length ? 'Explain failures' : 'Nothing to explain'}
          </Button>
        </div>
        {llm.state === 'error' &&
          (llm.keyNeeded ? (
            <Notice className={styles.keyNotice}>
              {`${llm.error} The ${CHECK_COUNT} rule checks above are free and already ran in your browser.`}
            </Notice>
          ) : (
            <Notice kind="error" className={styles.keyNotice}>
              {llm.error}
            </Notice>
          ))}
        {llm.text && (
          <MarkdownLite text={llm.text} className={styles.reply}>
            {llm.state === 'running' && <Caret variant="block" />}
          </MarkdownLite>
        )}
      </Card>
    </div>
  );
}
