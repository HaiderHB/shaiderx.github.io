// Formatting helpers for demo pages. Plain functions, safe to import from API routes too.

/** Milliseconds for a step timing: "<0.01 ms", "0.42 ms", "38 ms", "1.27 s". */
export function formatMs(ms) {
  if (ms == null) return '';
  if (ms < 0.01) return '<0.01 ms';
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Seconds with one decimal from milliseconds: 1840 -> "1.8 s". */
export const seconds = ms => `${(ms / 1000).toFixed(1)} s`;

/** A probability as a whole percent: 0.956 -> "96%". Missing values read 0%. */
export const pct = value => `${Math.round((Number(value) || 0) * 100)}%`;

/** A probability for a badge: "–" when missing, "<1%" for tiny values, else "37%". */
export const percent = p =>
  p == null ? '–' : p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`;

/** Risk tone for a probability where higher is worse (leading, off-topic, fraud...). */
export const riskTone = (p, { warn = 0.3, bad = 0.6 } = {}) =>
  p == null ? 'muted' : p >= bad ? 'bad' : p >= warn ? 'warn' : 'ok';

/** Clock time for a transcript or recording: 75 -> "01:15". */
export function formatTime(secondsValue) {
  const s = Math.max(0, Math.round(secondsValue || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(
    2,
    '0'
  )}`;
}
