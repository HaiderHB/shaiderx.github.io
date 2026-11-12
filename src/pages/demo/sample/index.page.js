// Reference demo: copy this folder to src/pages/demo/<company>/ for a new demo.
// Live at /demo/sample/ (unlisted, noindex).
import { DemoLayout } from 'demos/DemoLayout';
import { streamFromApi } from 'demos/client';
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
      <form className={styles.panel} onSubmit={run}>
        <label className={styles.label} htmlFor="message">
          Customer message
        </label>
        <textarea
          id="message"
          className={styles.input}
          rows={4}
          value={input}
          onChange={event => setInput(event.target.value)}
        />
        <button className={styles.button} type="submit" disabled={running || !input.trim()}>
          {running ? 'Running…' : 'Run agent'}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
      {output && <pre className={styles.output}>{output}</pre>}
    </DemoLayout>
  );
}
