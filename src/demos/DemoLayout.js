import { Monogram } from 'components/Monogram';
import { useAppContext } from 'hooks';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { FiArrowUpRight, FiLock, FiMoon, FiSun } from 'react-icons/fi';
import { getDemoKey } from './client';
import styles from './DemoLayout.module.css';
import ui from './ui/tokens.module.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400..600&family=Host+Grotesk:wght@300..800&display=swap';

/** Highlights the nav link whose section is currently under the top bar. */
function useActiveSection(nav) {
  const [active, setActive] = useState(null);
  const ids = (nav || []).map(item => item.href.replace(/^#/, '')).join(',');

  useEffect(() => {
    if (!ids) return undefined;
    const sections = ids
      .split(',')
      .map(id => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      // The last section whose top has passed a line a third of the way down the viewport
      const line = window.innerHeight * 0.34;
      let current = null;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) current = section.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids]);

  return active;
}

/**
 * Light / dark switch for demo pages. The portfolio nav (which owns the site's toggle) is
 * hidden on demos, so the bar carries its own. Both icons render; CSS shows the right one,
 * which keeps the server and client markup identical.
 */
function ThemeToggle() {
  const { dispatch } = useAppContext();
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label="Switch between light and dark theme"
      title="Switch theme"
      onClick={() => dispatch?.({ type: 'toggleTheme' })}
    >
      <FiSun className={styles.sun} aria-hidden />
      <FiMoon className={styles.moon} aria-hidden />
    </button>
  );
}

/**
 * Shell for every company demo at /demo/<company>.
 * Labels the page as an unofficial prototype and keeps it out of search results.
 * Defines the --ui* design tokens (demos/ui/tokens.module.css) for everything inside it.
 *
 * live: the demo calls paid models, so visitors without a private key see a preview chip.
 * accent: 'iris' (default) | 'cobalt' | 'coral': the accent pair for this demo.
 * nav: [{ href: '#id', label }] section links in the bar, highlighted while scrolling.
 * hero: node shown beside the title on wide screens (stat tiles, a verdict card).
 * wide: lets the page use 1360px instead of 1240px.
 */
export function DemoLayout({
  company,
  title,
  tagline,
  live = true,
  accent = 'iris',
  nav,
  hero,
  wide = false,
  children,
}) {
  const pageTitle = `${title} | Prototype for ${company} by Haider Bokhari`;
  const [hasKey, setHasKey] = useState(true);
  const active = useActiveSection(nav);

  useEffect(() => setHasKey(Boolean(getDemoKey())), []);

  return (
    <div
      className={`${styles.demo} ${ui.tokens}`}
      data-accent={accent}
      data-wide={wide ? '' : undefined}
    >
      <Head>
        <title>{pageTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content={`An unofficial prototype built for ${company} by Haider Bokhari.`}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Demo pages only: the portfolio keeps Gotham, which is also the fallback here */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
      </Head>
      <div className={styles.backdrop} aria-hidden />
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <a
            className={styles.brand}
            href="https://haiderb.com"
            aria-label="Haider Bokhari"
          >
            <Monogram />
          </a>
          <span className={styles.label}>
            <span>Prototype for</span>
            <strong>{company}</strong>
          </span>
          {nav?.length > 0 && (
            <nav className={styles.nav} aria-label="Sections">
              {nav.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active === item.href.replace(/^#/, '') ? 'true' : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
          <div className={styles.actions}>
            <ThemeToggle />
            <a
              className={styles.link}
              href="/Haider_Bokhari_Resume.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Resume
            </a>
            <a className={styles.cta} href="mailto:shaiderhb@gmail.com">
              Email me
              <FiArrowUpRight aria-hidden />
            </a>
          </div>
        </div>
      </header>
      <main className={styles.content}>
        <div className={styles.hero} data-split={hero ? '' : undefined}>
          <div className={styles.heroText}>
            <p className={styles.kickers}>
              <span className={styles.kicker}>
                <i aria-hidden />
                Unofficial prototype
              </span>
              <span className={styles.kicker} data-quiet>
                Sample data only
              </span>
              {live && !hasKey && (
                <span className={styles.kicker} data-preview>
                  <FiLock aria-hidden />
                  Preview mode. The private link from my email turns on live generation.
                </span>
              )}
            </p>
            <h1 className={styles.title}>{title}</h1>
            {tagline && <p className={styles.tagline}>{tagline}</p>}
          </div>
          {hero && <div className={styles.heroAside}>{hero}</div>}
        </div>
        {children}
      </main>
      <footer className={styles.footer}>
        <span className={styles.footMark} aria-hidden>
          <Monogram />
        </span>
        <p>
          Built by Haider Bokhari as an unofficial prototype. Not affiliated with or
          endorsed by {company}. Sample data only.
        </p>
        <a href="https://haiderb.com" target="_blank" rel="noreferrer">
          haiderb.com
        </a>
      </footer>
    </div>
  );
}
