# Demo UI kit

Shared components and design tokens for the company demos in `src/pages/demo/<slug>/`.
Everything here was pulled out of the Distru, AssemblyAI and Great Question demos, so each
piece has a real page using it. Import from `demos/ui`:

```js
import { Button, Card, CardHead, CardTitle, JsonView, Notice, srOnly } from 'demos/ui';
```

- Plain React and CSS modules, no new dependencies. Pure helpers (`demos/ui/format`) are safe
  to import from API routes; the barrel (`demos/ui`) pulls in CSS, so keep it to pages.
- No demo-specific copy inside components: labels, notes and help text come in as props.
- Looks the three demos need differently are variants (`variant`, `size`, `pill`...), named
  for what they look like, not which demo uses them.
- **Gallery:** `npm run dev`, then open `/demo/ui/`. Every component with sample props. The
  route returns 404 in production builds (`getStaticProps` → `notFound`).

## Catalog

Demos: **D** Distru, **A** AssemblyAI, **G** Great Question. "via" means used inside another
kit component.

| Component | What it is | Props | Used by |
| --- | --- | --- | --- |
| `Button` | Primary / secondary / ghost / link button | `variant` (`primary`, `secondary`, `ghost`, `link`), `size` (`m`, `s`), `pill` (42px rounded, fits an icon), button props | D, A, G |
| `CopyButton` | Copies text, confirms "Copied" | `text`, `label`, `copiedLabel`, `failedLabel`, `resetMs`, `variant` (`code`, `ghost`) | A via CodeView, D via McpConnectCommand |
| `Chip` | Small rounded action (query presets) | button props | G |
| `Pill` | Rounded label: run kind, model, cost, hint | `tone` (`neutral`, `live`, `ok`, `warn`, `bad`), `caps` (uppercase outline) | D, A |
| `Tag` | Short uppercase tag by a value ("vague", "backorder") | `tone` (`ok`, `warn`, `bad`), `soft` (neutral id tag, not uppercase) | D, G |
| `DecisionBadge` | The decision a run ended on (route, verdict) | `tone` (`ok`, `warn`, `bad`), `size` (`m`, `l`), children | D |
| `ScoreBadge` | One model probability as a badge with a risk dot | `label`, `value`, `tone` (`ok`, `warn`, `bad`, `muted`), `variant` (`score`, `neutral`, `pending`, `muted`), `title`, or children | G |
| `BadgeRow`, `BadgeMeta` | Row of score badges; small grey trailer ("Jev · 96 ms") | children | G |
| `Dot` | 8px status dot | `tone` (`ok`, `warn`, `bad`, `idle`), `motion` (`pulse`, `ring`) | D, G via RunStatus |
| `RunStatus` | Status line for a run: example (recorded), waiting, live, ended, idle | `state` (`example`, `wait`, `live`, `ended`, `idle`), children | G |
| `StatusIcon` | Pass / fail / warn / n/a icon | `status` (`pass`, `fail`, `warn`, `na`), `variant` (`soft` 20px rule lists, `solid` 18px evals) | A, D via Timeline and EvalTable |
| `Card` | Bordered panel; padding from `--uiCardPad` | `as`, div props | D, G |
| `CardHead`, `CardTitle` | Card header row with an `aside` pushed right; card title | `aside`, `nowrap`; `as`, `size` (`s`) | D |
| `SectionHead` | Section heading | `variant` (`plain`, `eyebrow`, `numbered`), `title`, `titleId`, `lede`, `kicker`, `step`, `index`, `action`, `flush`, `compact` (inside a card) | D (plain), G (eyebrow), A (numbered) |
| `Eyebrow`, `Kicker`, `MiniLabel` | Uppercase labels: step + kicker; kicker paragraph; tiny label over a value or block | `step`; children; `as` | G via SectionHead, A, D |
| `KeyValues` | Label/value grid (`dl`) | `items` `[[label, value]]`; `--uiKvColumns`, `--uiKvGap` | D |
| `NoteGrid` | "Design choices" / "How it works" notes | `items` `[{ title, text }]`, `variant` (`accent`, `boxed`) | D (accent), G (boxed) |
| `PipelineStrip` | How a run works: numbered step cards with cost | `steps` `[{ label, what, cost }]`, `label` | D |
| `Timeline`, `TimelineStep` | Run stages with marker (number, spinner, tick), timing and details | `index`, `status` (`pending`, `running`, `done`, `error`), `title`, `detail`, `ms` (formatted), children | D |
| `ProbabilityBar`, `ProbabilityBars` | Decision probabilities as bars, chosen option bold, threshold marks | `label`, `value`, `tone`, `strong`, `marks`; `options` `[{ value, label, tone }]`, `probabilities`, `choice` | D |
| `EvalTable` | Expected vs actual per check, with pass/fail icons | `rows` `[{ id, label, expected, actual, pass }]`, `columns` | D |
| `SegmentedControl` | One-of-n toggle | `options` `[{ value, label, disabled }]`, `value`, `onChange`, `label`, `variant` (`pill`, `box`), `disabled` | G |
| `OptionList`, `IndexBadge` | Stacked, numbered sample picker; the square number | `options` `[{ value, label, hint }]`, `value`, `onChange`, `label` | D |
| `ChoiceChips` | Row of toggle chips (samples, filters) | `options` `[{ value, label }]`, `value`, `onChange`, `label` | A |
| `Tabs` | Tab list; caller renders the panel | `items` `[{ id, label, sub }]`, `value`, `onChange`, `label`, `variant` (`files`, `list`) | A (files), D via McpToolPanel (list) |
| `TextArea`, `Input`, `Select` | Form fields | `variant` (`plain`, `ring`), `code` (monospace), field props | D, G |
| `JsonView` | Pretty, coloured JSON without innerHTML | `value`, `variant` (`well`, `boxed`), `tall`, `clip` (chars), `clipNote`, `colon` (`key`, `plain`) | D, G |
| `JsonDetails` | Raw JSON behind a disclosure | `summary`, `value`, `open`, `tall`, `variant` | D |
| `CodeView` | Highlighted code with line numbers, line marks, focus-and-flash, copy | `code`, `lang` (`js`, `diff`, `text`), `title`, `copy`, `numbers`, `marks` `{ line: 'fail' \| 'warn' \| 'pass' }`, `focusLine` `{ line, at }`, `maxHeight`, `wrap`; `--uiCodeHeight` | A |
| `RichText`, `InlineCode` | Prose with `` `code` `` spans; one inline code span | `text`; children | A |
| `MarkdownLite` | Streamed model output: paragraphs, bullets, headings, bold, code, fenced blocks | `text`, `codeTitle`, `diffTitle`, children after the blocks (a Caret) | A |
| `Caret`, `TypingDots`, `Spinner` | Streaming caret; "typing" dots; inline spinner (inherits a primary button's colour) | `variant` (`bar`, `soft`, `block`); `label`; none | D, A, G; G; D |
| `EmptyState`, `SkeletonGrid` | Dashed placeholder before output arrives; shimmering cards while loading | `size` (`s`, `m`), `loading`; `count`, `label` | D, G; G |
| `Notice` | Preview-mode (no key), info and error messages | `kind` (`info`, `error`), `size` (`s`, `m`), `flat`, `as`; `--uiNoticeRgb` | D, A, G |
| `McpToolPanel` | Tool list → definition → arguments → JSON-RPC request and result, in the browser | `tools` (tools/list entries), `examples`, `call(name, args)`, `errorText`, `initialTool`, `hint`, `argsId` | D |
| `McpConnectCommand` | "Connect from Claude Code" command with copy | `label`, `command` | D |
| `rpcRequest`, `toolResult`, `toolErrorResult` | JSON-RPC `tools/call` request and MCP result shapes | `(id, name, args)`; `(structured)`; `(text)` | G, D via McpToolPanel |
| `formatMs`, `seconds`, `pct`, `percent`, `riskTone`, `formatTime` | Timings, probabilities, risk tone, mm:ss (`demos/ui/format`, pure JS) | see `format.js` | D, G (and G's findings API via `study.js`) |
| `highlightLines`, `tokenizeJson`, `splitFences` | The tokenizers behind CodeView, JsonView and MarkdownLite | text in, pieces out | via components |
| `srOnly`, `tokens` | Screen-reader-only class; the token class (DemoLayout applies it) | class names | D, A, G |

## Tokens

Defined on `.tokens` in `tokens.module.css`; `DemoLayout` puts that class on every demo's
root, so components and demo CSS can use them anywhere inside. A demo changes the kit's look by
overriding tokens on its own wrapper, never by editing a component:

```css
.page {
  --uiRgbAccent: var(--rgbPrimary); /* Great Question: accent follows the theme primary */
  --uiRgbOk: 40 190 120;
}
```

`Rgb` tokens are channels for `rgb(var(--uiRgbOk) / 0.2)`. Light theme values are set under
`body[data-theme='light']`.

| Group | Tokens (dark default) |
| --- | --- |
| Status | `--uiRgbOk` 52 211 153, `--uiRgbWarn` 251 191 36, `--uiRgbBad` = `--rgbError`, `--uiRgbAccent` = `--rgbAccent` (light: 8 145 178) |
| Surfaces | `--uiLine` text/0.12, `--uiLineStrong` text/0.2, `--uiPanel` text/0.035, `--uiWell` text/0.05, `--uiWellStrong` text/0.06, `--uiMuted` text/0.62, `--uiMono` |
| Radius | `--uiRadiusXS` 4, `--uiRadiusS` 6, `--uiRadiusM` 8, `--uiRadiusL` 10, `--uiRadiusXL` 12, `--uiRadiusPill` 999 (px) |
| Type (under `--fontSizeBodyXS`) | `--uiFontMicro` 11, `--uiFontLabel` 11.5, `--uiFontCaption` 12, `--uiFontCode` 12.5, `--uiFontSmall` 13, `--uiFontNote` 13.5 (px) |
| Spacing (between theme steps) | `--uiGap2XS` 2, `--uiGapXS` 4, `--uiGapS` 6, `--uiGapM` 8, `--uiGapL` 10, `--uiGapXL` 12, `--uiGap2XL` 14 (px); the theme's `--spaceXS`..`--space5XL` still apply |
| JSON | `--uiJsonKey`, `--uiJsonString`, `--uiJsonNumber`, `--uiJsonBool`, `--uiJsonNull` (full colours) |
| Code | `--uiRgbCodeKeyword`, `--uiRgbCodeString`, `--uiRgbCodeNumber` |

Component knobs, set on a wrapper or the component: `--uiCardPad` (Card padding),
`--uiKvColumns` / `--uiKvGap` (KeyValues), `--uiCodeHeight` (CodeView scroll height),
`--uiNoticeRgb` (info Notice colour), `--uiSpinnerColor` / `--uiSpinnerTrackColor` (Spinner;
primary buttons set them). Larger sizes, `--space*`, `--fontSize*`, `--rgbText`,
`--rgbPrimary` and friends come from the site theme (`components/ThemeProvider/theme.js`).

## Start a new demo

```sh
node scripts/new-demo.js acme "Acme"
```

It writes a working skeleton that builds as is:

- `src/pages/demo/acme/index.page.js`: `DemoLayout` with a pipeline strip, sample picker,
  input, Run button (preview note without a key), streamed output via `MarkdownLite`, an
  "Example run" pill and note, and a design-choices grid.
- `src/pages/demo/acme/Acme.module.css`: page layout on the tokens.
- `src/pages/demo/acme/README.md`: the standard sections (what is on the page, how a run
  works, modes, env vars, assumptions, cuts, with real data, testing, take-down).
- `src/pages/api/demo/acme/run.api.js`: `POST /api/demo/acme/run/`, `demoApi` guarded
  (`COST.llm`), streams `chatStream` with `DEMO_LLM`.

Then replace the TODOs, record a live run for the example output, check the page at
`/demo/acme/` on desktop and 390px, `npm run build`, and mint a link with
`node scripts/demo-key.js acme --label "Founder email"`. Reach for the gallery at `/demo/ui/`
for anything else the page needs (decision bars, timelines, MCP panel, code views).

## Adding to the kit

Move a piece here when a second demo needs it. Keep its markup and CSS identical to the page
it came from (screenshot before and after), add it to `index.js`, the gallery and the catalog
above, and prefer a token or a `variant` over a one-off prop.
