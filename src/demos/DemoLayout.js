import { Monogram } from 'components/Monogram';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { getDemoKey } from './client';
import styles from './DemoLayout.module.css';
import ui from './ui/tokens.module.css';

/**
 * Shell for every company demo at /demo/<company>.
 * Labels the page as an unofficial prototype and keeps it out of search results.
 * Defines the --ui* design tokens (demos/ui/tokens.module.css) for everything inside it.
 * `live`: the demo calls paid models, so visitors without a private key see a note.
 */
export function DemoLayout({ company, title, tagline, live = true, children }) {
  const pageTitle = `${title} | Prototype for ${company} by Haider Bokhari`;
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => setHasKey(Boolean(getDemoKey())), []);

  return (
    <div className={`${styles.demo} ${ui.tokens}`}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={`An unofficial prototype built for ${company} by Haider Bokhari.`}
        />
      </Head>
      <header className={styles.bar}>
        <a className={styles.brand} href="https://haiderb.com" aria-label="Haider Bokhari">
          <Monogram />
        </a>
        <span className={styles.label}>
          Prototype for <strong>{company}</strong>
        </span>
        <nav className={styles.links}>
          <a href="https://haiderb.com" target="_blank" rel="noreferrer">
            haiderb.com
          </a>
          <a href="/Haider_Bokhari_Resume.pdf" target="_blank" rel="noreferrer">
            Resume
          </a>
          <a href="mailto:shaiderhb@gmail.com">Email me</a>
        </nav>
      </header>
      {live && !hasKey && (
        <p className={styles.notice}>
          Preview mode. The private link from my email turns on live generation.
        </p>
      )}
      <main className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {tagline && <p className={styles.tagline}>{tagline}</p>}
        {children}
      </main>
      <footer className={styles.footer}>
        Built by Haider Bokhari as an unofficial prototype. Not affiliated with or endorsed
        by {company}. Sample data only.
      </footer>
    </div>
  );
}
