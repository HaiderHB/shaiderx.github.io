import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import styles from './AssemblyAI.module.css';
import { highlightLines } from './highlight';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export function CopyButton({ text, label = 'Copy', className }) {
  const [state, setState] = useState('idle');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  }

  return (
    <button type="button" className={className || styles.copy} onClick={copy}>
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press Ctrl+C' : label}
    </button>
  );
}

/** Text with `inline code` spans. */
export function Rich({ text }) {
  const parts = String(text).split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
      <code key={i} className={styles.inlineCode}>
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

/**
 * Highlighted, line-numbered code. `marks` maps line number -> 'fail' | 'warn' | 'pass'.
 * `focusLine` scrolls that line into view and flashes it.
 */
export function CodeView({
  code,
  lang = 'js',
  title,
  copy = true,
  numbers = true,
  marks,
  focusLine,
  maxHeight,
  wrap = false,
  className,
}) {
  const lines = useMemo(() => highlightLines(code, lang), [code, lang]);
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, left: 0 }); // a new file starts at its first line
  }, [code]);

  useEffect(() => {
    if (!focusLine?.line || !scroller.current) return;
    const row = scroller.current.querySelector(`[data-line="${focusLine.line}"]`);
    if (!row) return;
    const box = scroller.current;
    box.scrollTo({ top: Math.max(0, row.offsetTop - box.clientHeight / 3), behavior: 'smooth' });
  }, [focusLine]);

  return (
    <div className={[styles.codeView, !numbers && styles.noNumbers, wrap && styles.wrap, className].filter(Boolean).join(' ')}>
      {(title || copy) && (
        <div className={styles.codeHead}>
          {title && <span className={styles.codeTitle}>{title}</span>}
          {copy && <CopyButton text={code} />}
        </div>
      )}
      <div className={styles.codeScroll} ref={scroller} style={maxHeight ? { maxHeight } : undefined}>
        <pre className={styles.pre}>
          <code>
            {lines.map((pieces, i) => {
              const n = i + 1;
              const mark = marks?.[n];
              const flash = focusLine?.line === n;
              return (
                <span
                  key={flash ? `${n}-${focusLine.at}` : n}
                  data-line={n}
                  className={[styles.line, mark && styles[`mark_${mark}`], flash && styles.flash]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {numbers && <span className={styles.lineNo}>{n}</span>}
                  <span className={styles.lineText}>
                    {pieces.length
                      ? pieces.map(([text, kind], j) =>
                          kind ? (
                            <span key={j} className={styles[`tok_${kind}`]}>
                              {text}
                            </span>
                          ) : (
                            <Fragment key={j}>{text}</Fragment>
                          )
                        )
                      : ' '}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
