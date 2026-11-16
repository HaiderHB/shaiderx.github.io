// Anchoring: turn a model's proposed edit ({ c, quote, insert }) into an exact character range
// in the contract, or refuse it. Pure functions, shared by the API route (which anchors every
// edit as it streams in) and the page (which runs the anchoring checks in the browser).
//
// Order of attempts, strictest first:
//   1. exact, unique match inside the clause the model named          -> anchored
//   2. unique match after folding quotes, dashes, spacing and case    -> re-anchored
//   3. unique match in a different clause (model cited the wrong §)   -> re-anchored
//   anything else (not found, found twice, elided with "…", overlaps) -> refused, never guessed
// The deletion shown in the document is always the contract's own text at the anchored range,
// never the model's quote, so a near-miss quote cannot change what the redline appears to strike.

const FOLD = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': "'",
  '\u201B': "'",
  '\u2032': "'",
  '\u201C': '"',
  '\u201D': '"',
  '\u201E': '"',
  '\u2033': '"',
  '\u2012': '-',
  '\u2013': '-',
  '\u2014': '-',
  '\u2212': '-',
  '\u00A0': ' ',
  '\u2009': ' ',
  '\u202F': ' ',
};

const MIN_QUOTE = 3;

/**
 * Folds text for matching (typographic quotes and dashes to ASCII, runs of whitespace to one
 * space, lower case) and keeps a map back to the original: map[i] is the source index of
 * folded character i, map[length] the source length.
 */
export function fold(source) {
  let text = '';
  const map = [];
  let lastSpace = false;
  for (let index = 0; index < source.length; index += 1) {
    let char = FOLD[source[index]] ?? source[index];
    if (/\s/.test(char)) {
      if (lastSpace) continue;
      char = ' ';
      lastSpace = true;
    } else {
      lastSpace = false;
    }
    const lower = char.toLowerCase();
    text += lower.length === 1 ? lower : char;
    map.push(index);
  }
  map.push(source.length);
  return { text, map };
}

/** Every start index of needle in haystack (overlapping hits count: they are ambiguous too). */
export function indexesOf(haystack, needle) {
  const hits = [];
  if (!needle) return hits;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return hits;
    hits.push(at);
    from = at + 1;
  }
}

/** Exact hits, then folded hits, in one clause: [{ start, end, folded }] */
function findInClause(text, quote) {
  const exact = indexesOf(text, quote);
  if (exact.length) {
    return exact.map(start => ({ start, end: start + quote.length, folded: false }));
  }
  const source = fold(text);
  const needle = fold(quote).text.trim();
  if (needle.length < MIN_QUOTE) return [];
  return indexesOf(source.text, needle).map(at => ({
    start: source.map[at],
    end: source.map[at + needle.length - 1] + 1,
    folded: true,
  }));
}

// The folds by name, so a re-anchor can say which one it needed
const FOLD_STEPS = [
  [
    'curly quotes',
    value =>
      value.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'").replace(/[\u201C\u201D\u201E\u2033]/g, '"'),
  ],
  ['dashes', value => value.replace(/[\u2012-\u2014\u2212]/g, '-')],
  ['spacing', value => value.replace(/[\s\u00A0\u2009\u202F]+/g, ' ').trim()],
  ['capitalisation', value => value.toLowerCase()],
];

/** What folding had to forgive, in words: "curly quotes and spacing". */
export function foldNote(original, quote) {
  // A fold was needed if the texts still differ with every other fold applied
  const without = (value, skip) =>
    FOLD_STEPS.reduce((acc, [name, step]) => (name === skip ? acc : step(acc)), value);
  const reasons = FOLD_STEPS.filter(
    ([name]) => without(original, name) !== without(quote, name)
  ).map(([name]) => name);
  return reasons.length ? `normalised ${reasons.join(' and ')}` : 'normalised the text';
}

const overlaps = (a, b) => a.start < b.end && b.start < a.end;

/**
 * Anchors one proposed edit.
 * edit: { c, quote, insert }; clauses: [{ n, text }]; taken: [{ clause, start, end, id }] already
 * anchored in this review (an overlapping edit is refused, not merged).
 * Returns { status: 'anchored' | 'reanchored' | 'refused', clause, start, end, original, note }.
 */
export function anchorEdit(edit, clauses, taken = []) {
  const claimed = Number(edit.c);
  const quote = typeof edit.quote === 'string' ? edit.quote : '';
  const insert = typeof edit.insert === 'string' ? edit.insert : '';
  const refuse = note => ({ status: 'refused', clause: claimed || null, note });

  if (quote.trim().length < MIN_QUOTE) return refuse('Quote is empty or too short to anchor.');
  if (/\.\.\.|…/.test(quote)) return refuse('Quote skips text with an ellipsis.');
  if (quote.trim() === insert.trim()) return refuse('Replacement is identical to the quote.');

  const home = clauses.find(clause => clause.n === claimed);
  let hits = home ? findInClause(home.text, quote).map(hit => ({ ...hit, clause: home.n })) : [];
  let moved = false;

  if (hits.length > 1) {
    return refuse(`Quote appears ${hits.length} times in §${claimed}; not guessing which.`);
  }

  if (!hits.length) {
    hits = clauses
      .filter(clause => clause !== home)
      .flatMap(clause =>
        findInClause(clause.text, quote).map(hit => ({ ...hit, clause: clause.n }))
      );
    if (hits.length > 1) {
      return refuse(`Quote not in §${claimed || '?'} and appears ${hits.length} times elsewhere.`);
    }
    if (!hits.length) {
      return refuse(
        home ? `Quote not found in §${claimed} or anywhere else.` : 'Quote not found in the contract.'
      );
    }
    moved = true;
  }

  const [hit] = hits;
  const clause = clauses.find(item => item.n === hit.clause);
  const original = clause.text.slice(hit.start, hit.end);
  const clash = taken.find(range => range.clause === hit.clause && overlaps(range, hit));
  if (clash) return refuse(`Overlaps change ${clash.id} in §${hit.clause}.`);

  const notes = [];
  if (moved) notes.push(home ? `found in §${hit.clause}, not §${claimed}` : `found in §${hit.clause}`);
  if (hit.folded) notes.push(foldNote(original, quote));

  return {
    status: moved || hit.folded ? 'reanchored' : 'anchored',
    clause: hit.clause,
    start: hit.start,
    end: hit.end,
    original,
    note: notes.length
      ? `${notes.join('; ').replace(/^./, char => char.toUpperCase())}.`
      : 'Exact, unique match.',
  };
}

/** Anchoring checks shown on the page: crafted model outputs and what must happen to each. */
export const ANCHOR_CASES = [
  {
    id: 'exact',
    label: 'Exact quote',
    edit: { c: 11, quote: 'three (3) months', insert: 'twelve (12) months' },
    expect: 'anchored',
  },
  {
    id: 'quotes',
    label: 'Straight apostrophe for a curly one',
    edit: { c: 7, quote: "upon Customer's written request", insert: 'automatically' },
    expect: 'reanchored',
  },
  {
    id: 'clause',
    label: 'Right words, wrong clause number',
    edit: { c: 12, quote: 'within fifteen (15) days', insert: 'within thirty (30) days' },
    expect: 'reanchored',
  },
  {
    id: 'paraphrase',
    label: 'Paraphrased quote',
    edit: { c: 6, quote: 'Customer shall keep confidential all information', insert: 'Each party shall' },
    expect: 'refused',
  },
  {
    id: 'ambiguous',
    label: 'Quote appears twice',
    edit: { c: 4, quote: 'thirty-six (36)', insert: 'twelve (12)' },
    expect: 'refused',
  },
  {
    id: 'elided',
    label: 'Quote with an ellipsis',
    edit: { c: 5, quote: 'Customer may not terminate … for convenience', insert: '' },
    expect: 'refused',
  },
];
