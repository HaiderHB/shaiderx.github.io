// Reference demo: the smallest page built on the demo kit (src/demos/ui).
// For a new company demo run `node scripts/new-demo.js <slug> "<Company>"` instead of copying
// this folder. Live at /demo/sample/ (unlisted, noindex).
import { DemoLayout } from 'demos/DemoLayout';
import { streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  Caret,
  EmptyState,
  MarkdownLite,
  Notice,
  Pill,
  Spinner,
  TextArea,
  srOnly,
} from 'demos/ui';
import { useState } from 'react';
import styles from './Sample.module.css';

const EXAMPLE =
  'Hi, my order #4417 arrived damaged and I need a replacement before Friday. Can you help?';

export default function SampleDemo() {
  const [input, setInput] = useState(EXAMPLE);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  async function run(event) {
    event.preventDefault();
    setRunning(true);
    setError('');
    setOutput('');
    try {
      await streamFromApi('/api/demo/sample/', { message: input }, (_, text) =>
        setOutput(text)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <DemoLayout
      live={false}
      company="Sample Co"
      title="Support triage agent"
      tagline="Paste a customer message and watch the agent classify it, pick a tool and draft a reply. This page is the template every company demo starts from."
    >
      <div className={styles.grid}>
        <Card as="form" onSubmit={run}>
          <CardHead>
            <CardTitle>Customer message</CardTitle>
            <span className={styles.muted}>editable</span>
          </CardHead>
          <label className={srOnly} htmlFor="message">
            Customer message
          </label>
          <TextArea
            id="message"
            rows={6}
            value={input}
            onChange={event => setInput(event.target.value)}
          />
          <div className={styles.runRow}>
            <Button type="submit" disabled={running || !input.trim()}>
              {running ? (
                <>
                  <Spinner /> Running
                </>
              ) : (
                'Run agent'
              )}
            </Button>
          </div>
        </Card>

        <Card aria-live="polite">
          <CardHead>
            <CardTitle>Agent reply</CardTitle>
            <Pill tone={running ? 'live' : 'neutral'}>
              {running ? 'Streaming' : 'Streamed text'}
            </Pill>
          </CardHead>
          {output ? (
            <MarkdownLite text={output}>{running && <Caret variant="block" />}</MarkdownLite>
          ) : (
            <EmptyState size="s" loading={running}>
              {running ? 'Waiting…' : 'The reply appears here.'}
            </EmptyState>
          )}
          {error && (
            <Notice kind="error" size="s" className={styles.notice} role="alert">
              {error}
            </Notice>
          )}
        </Card>
      </div>
    </DemoLayout>
  );
}
