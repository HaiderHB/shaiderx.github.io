// Tiny syntax highlighter for the code on this page (JS, JSX, JSON, diff, shell).
// Returns lines of [text, kind] pieces; kinds map to CSS classes in the page module.

const KEYWORDS = new Set(
  'import from export default async await function const let var return if else for of in while new class extends this true false null undefined try catch finally throw typeof continue'.split(
    ' '
  )
);

const TOKEN =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\[\s\S]|[^`\\])*`)|\b(\d[\d_]*(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)/g;

function tokenize(code) {
  const pieces = [];
  let last = 0;
  let match;
  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(code))) {
    // `https://...` outside a string is a URL, not a comment
    if (match[1] && match[1].startsWith('//') && code[match.index - 1] === ':') {
      TOKEN.lastIndex = match.index + 2;
      continue;
    }
    if (match.index > last) pieces.push([code.slice(last, match.index), '']);
    let kind = '';
    if (match[1]) kind = 'comment';
    else if (match[2]) kind = 'string';
    else if (match[3]) kind = 'number';
    else if (KEYWORDS.has(match[4])) kind = 'keyword';
    pieces.push([match[0], kind]);
    last = match.index + match[0].length;
  }
  if (last < code.length) pieces.push([code.slice(last), '']);
  return pieces;
}

function splitLines(pieces) {
  const lines = [[]];
  for (const [text, kind] of pieces) {
    const parts = text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push([part, kind]);
    });
  }
  return lines;
}

export function highlightLines(code, lang = 'js') {
  const source = String(code ?? '').replace(/\n$/, '');
  if (lang === 'diff') {
    return source.split('\n').map(line => {
      const kind = line.startsWith('+') ? 'added' : line.startsWith('-') ? 'removed' : '';
      return [[line, kind]];
    });
  }
  if (lang === 'text') return source.split('\n').map(line => [[line, '']]);
  return splitLines(tokenize(source));
}
