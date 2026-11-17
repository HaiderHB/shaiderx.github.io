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
- **Gallery:** `npm run dev`, then open `/demo/ui/`. Every component with sample props, an
  accent switcher in the hero and the theme switch in the bar. The route returns 404 in
  production builds (`getStaticProps` → `notFound`).

## Catalog

Demos: **D** Distru, **A** AssemblyAI, **G** Great Question, **GT** GoodTime, **R** Reacher. "via" means used
inside another kit component.

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
| `Avatar`, `initials` | Initials on a circle for a person or account (no photos in sample data); decorative unless given `aria-label` | `name`, `size` (`s` 28, `m` 36, `l` 52 px), `tone` (`neutral`, `accent` = selected) | R |
| `Dot` | 8px status dot | `tone` (`ok`, `warn`, `bad`, `idle`), `motion` (`pulse`, `ring`) | D, G via RunStatus |
| `RunStatus` | Status line for a run: example (recorded), waiting, live, ended, idle | `state` (`example`, `wait`, `live`, `ended`, `idle`), children | G |
| `StatusIcon` | Pass / fail / warn / n/a icon | `status` (`pass`, `fail`, `warn`, `na`), `variant` (`soft` 20px rule lists, `solid` 18px evals) | A, D via Timeline and EvalTable |
| `Card` | Surface panel; padding from `--uiCardPad` | `tone` (none, `tint`, `accent`, `inset`), `as`, div props | D, A, G |
| `StatTile`, `StatGrid` | A headline number with an icon chip, unit and note; a row of them | `label`, `value`, `unit`, `icon`, `note`, `tone` (none, `tint`, `accent`), children under the value; `columns`; other props pass through (`as="a" href`) | G |
| `CardHead`, `CardTitle` | Card header row with an `aside` pushed right; card title | `aside`, `nowrap`; `as`, `size` (`s`) | D |
| `SectionHead` | Section heading | `variant` (`plain`, `eyebrow`, `numbered`), `title`, `titleId`, `lede`, `kicker`, `step`, `index`, `action`, `flush`, `compact` (inside a card) | D (plain), G (eyebrow), A (numbered) |
| `Eyebrow`, `Kicker`, `MiniLabel` | Uppercase labels: step + kicker; kicker paragraph; tiny label over a value or block | `step`; children; `as` | G via SectionHead, A, D |
| `KeyValues` | Label/value grid (`dl`) | `items` `[[label, value]]`; `--uiKvColumns`, `--uiKvGap` | D |
| `NoteGrid` | "Design choices" / "How it works" notes | `items` `[{ title, text }]`, `variant` (`accent`, `boxed`) | D (accent), G (boxed) |
| `PipelineStrip` | How a run works: numbered step cards with cost | `steps` `[{ label, what, cost }]`, `label` | D |
| `Timeline`, `TimelineStep` | Run stages with marker (number, spinner, tick), timing and details | `index`, `status` (`pending`, `running`, `done`, `error`), `title`, `detail`, `ms` (formatted), children | D |
| `ProbabilityBar`, `ProbabilityBars` | Decision probabilities as bars on a hatched track, chosen option bold, threshold marks | `label`, `value`, `tone` (`ok`, `warn`, `bad`, `accent`), `strong`, `marks`; `options` `[{ value, label, tone }]`, `probabilities`, `choice` | D, R |
| `Funnel` | Narrowing counts, one bar per step (40 → 12 → 10 → 8); pending steps hatched, the last reached step in the accent | `steps` `[{ label, value, note }]` (`value: null` = not reached), `max`, `size` (`m`, `s`), `tone` (`accent`, `ink` on an accent card), `label` | R |
| `Gauge` | Half-dial of ticks with a big value in the middle | `value` (0..1), `ticks`, `tone`, `caption`, `label`, children | D |
| `Ring` | Circular progress around a short label | `value` (0..1), `tone`, `size`, `stroke`, `label`, children | D, G |
| `Meter` | Segmented meter | `value` (0..1), `segments`, `tone`, `size` (`m`, `s`), `label` | D, G |
| `SplitBar` | One bar in proportional parts, with a legend | `parts` `[{ label, value, tone, display }]`, `legend`, `label` | A |
| `MiniBars` | Small column chart: active column filled, the rest hatched | `data` `[{ label, value, display }]`, `active`, `max`, `height`, `label` | D |
| `Sparkline` | Line over a short series with an end dot and optional threshold | `values`, `min`, `max`, `tone`, `height`, `threshold`, `label` | G |
| `EvalTable` | Expected vs actual per check, with pass/fail icons | `rows` `[{ id, label, expected, actual, pass }]`, `columns` | D |
| `SegmentedControl` | One-of-n toggle | `options` `[{ value, label, disabled }]`, `value`, `onChange`, `label`, `variant` (`pill`, `box`), `disabled` | G |
| `OptionList`, `IndexBadge` | Stacked, numbered sample picker; the square number | `options` `[{ value, label, hint }]`, `value`, `onChange`, `label` | D |
| `ChoiceChips` | Row of toggle chips (samples, filters) | `options` `[{ value, label }]`, `value`, `onChange`, `label` | A |
| `Tabs` | Tab list; caller renders the panel | `items` `[{ id, label, sub }]`, `value`, `onChange`, `label`, `variant` (`files`, `list`) | A (files), D via McpToolPanel (list) |
| `TextArea`, `Input`, `Select` | Form fields | `variant` (`plain`, `ring`), `code` (monospace), field props | D, G |
| `JsonView` | Pretty, coloured JSON without innerHTML | `value`, `variant` (`well`, `boxed`), `tall`, `clip` (chars), `clipNote`, `colon` (`key`, `plain`) | D, G |
| `JsonDetails` | Raw JSON behind a disclosure | `summary`, `value`, `open`, `tall`, `variant` | D |
| `CodeView` | Highlighted code with line numbers, line marks, focus-and-flash, copy | `code`, `lang` (`js`, `diff`, `text`), `title`, `copy`, `numbers`, `marks` `{ line: 'fail' \| 'warn' \| 'pass' }`, `focusLine` `{ line, at }`, `maxHeight`, `wrap`; `--uiCodeHeight` | A |
| `TrackedText` | Prose with tracked changes as a redline: struck deletions, underlined insertions; accept/reject flashes the spot; new changes draw in | `text`, `changes` `[{ id, start, end, insert, state, title }]` (`state`: `pending`, `accepted`, `rejected`), `activeId`, `onSelect`, `animate`, `as`; `--uiRedlineDel` / `--uiRedlineIns` (rgb channels) | GC AI |
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
| `ScheduleStrip` | A few days of a calendar as columns, blocks placed by time; shows what is held, just changed, moved away or dropped, over shaded availability | `days` `[{ id, label, sub }]`, `from`, `to` (hours), `blocks` `[{ id, day, start, end (minutes), title, sub, meta, tone, state, hint }]` (`state`: `changed`, `held`, `removed`, `dropped`), `windows`, `tz`, `legend` `[{ state, label }]`; `--uiStripHour` | GT |
| `ChatThread` | Two-sided conversation with avatars, meta line, typing dots and a streaming caret; children under a bubble (change chips, a trace) | `messages` `[{ id, side (`start`, `end`), name, avatar, meta, text, pending, streaming, children }]`, `empty`, `follow`; `--uiChatHeight` | GT |
| `AuditTrail` | Time-stamped record of what an agent and people did, actor pill by tone, optional action per row | `items` `[{ id, at, actor, tone, text, action }]`, `empty`, `label` | GT |

## Tokens

Defined on `.tokens` in `tokens.module.css`; `DemoLayout` puts that class on every demo's
root, so components and demo CSS can use them anywhere inside. Dark is the default and
`body[data-theme='light']` swaps the palette; the bar in `DemoLayout` has the theme switch.

`Rgb` tokens are channels for `rgb(var(--uiRgbOk) / 0.2)`. The site theme tokens
(`--rgbText`, `--rgbBackground`, `--rgbPrimary`, `--rgbAccent`, `--rgbError`, `--fontStack`,
`--monoFontStack`) are re-pointed at the demo palette inside `.tokens`, so `rgb(var(--rgbText)
/ 0.6)` in a demo's CSS follows the demo theme too.

| Group | Tokens |
| --- | --- |
| Layers | `--uiRgbCanvas` (the page), `--uiRgbSurface` (cards), `--uiRgbRaised` (things on cards), `--uiRgbInset` (wells, fields, code), `--uiRgbInk` (text) |
| Accent | `--uiRgbAccent`, `--uiRgbAccentDeep` (fills, the dark-theme button), `--uiRgbAccent2` (far end of a gradient only), `--uiRgbOnAccent` |
| Status | `--uiRgbOk`, `--uiRgbWarn`, `--uiRgbBad`, `--uiRgbOnStatus` (text on a solid status fill) |
| Action | `--uiRgbAction`, `--uiRgbOnAction`: the primary button (accent in the dark, ink in the light) |
| Lines and text | `--uiLine`, `--uiLineStrong`, `--uiMuted`, `--uiFaint`, `--uiWellStrong`, `--uiMono` |
| Fills | `--uiGradient` (one feature card or mark per view), `--uiTint` (soft tiles), `--uiHatch` (empty, pending, the rest of a bar) |
| Elevation | `--uiShadowCard`, `--uiShadowRaised`, `--uiShadowPop`, `--uiShadowAction` |
| Radius | `--uiRadiusXS` 6, `--uiRadiusS` 8, `--uiRadiusM` 12, `--uiRadiusL` 14, `--uiRadiusXL` 18, `--uiRadius2XL` 24, `--uiRadius3XL` 32, `--uiRadiusPill` 999 (px) |
| Type (under `--fontSizeBodyXS`) | `--uiFontMicro` 11, `--uiFontLabel` 11.5, `--uiFontCaption` 12, `--uiFontCode` 12.5, `--uiFontSmall` 13, `--uiFontNote` 13.5 (px); `--uiTrackTight`, `--uiTrackDisplay` for headings and numerals |
| Spacing (between theme steps) | `--uiGap2XS` 2, `--uiGapXS` 4, `--uiGapS` 6, `--uiGapM` 8, `--uiGapL` 10, `--uiGapXL` 12, `--uiGap2XL` 14 (px); the theme's `--spaceXS`..`--space5XL` still apply |
| Motion | `--uiEase` |
| JSON, code | `--uiJsonKey`, `--uiJsonString`, `--uiJsonNumber`, `--uiJsonBool`, `--uiJsonNull`; `--uiRgbCodeKeyword`, `--uiRgbCodeString`, `--uiRgbCodeNumber` |

### Accent

Each demo picks an accent pair with a prop, never by overriding `--uiRgbAccent` in its own
CSS (the gradient, tint and shadow tokens are computed on the layout root, so an override
further down would not reach them):

```jsx
<DemoLayout accent="cobalt" …>   // 'iris' (default) | 'cobalt' | 'coral'
```

To add a preset, add a `.tokens[data-accent='name']` block (dark) and its
`body[data-theme='light']` twin in `tokens.module.css`. Status colours, surfaces and type
stay the same across demos.

### Conventions

- Labels are sentence case, quiet and medium weight; the value under them carries the weight.
- Numbers, ids and timings use `--uiMono` with tabular figures.
- One saturated card per view (`Card tone="accent"` or an accent `StatTile`); `tint` for the
  card that leads a group. No gradient text.
- A chart takes one tone. Tracks and "the rest" are hatched or faint, never a second hue.
- Hatching (`--uiHatch`) means "not there yet": empty states, pending badges, bar tracks.

Component knobs, set on a wrapper or the component: `--uiCardPad` (Card padding),
`--uiKvColumns` / `--uiKvGap` (KeyValues), `--uiCodeHeight` (CodeView scroll height),
`--uiNoticeRgb` (info Notice colour), `--uiSpinnerColor` / `--uiSpinnerTrackColor` (Spinner;
primary buttons set them), `--uiStatColumns` (StatGrid, via `columns`). Larger type sizes and
`--space*` come from the site theme (`components/ThemeProvider/theme.js`).

### Shell

`DemoLayout` (`src/demos/DemoLayout.js`) draws the floating bar, the hero and the footer:

| Prop | What it does |
| --- | --- |
| `company`, `title`, `tagline` | Bar label, hero title and lede |
| `accent` | Accent preset, see above |
| `nav` | `[{ href: '#id', label }]` section links in the bar; the current section is highlighted while scrolling. Give sections `scroll-margin-top: 96px` |
| `hero` | Node shown beside the title on wide screens (stat tiles, a verdict card) |
| `live` | `false` hides the preview-mode chip for demos that never call paid models |
| `wide` | 1360px content instead of 1240px |

Fonts (Host Grotesk, Geist Mono) load from Google Fonts on demo pages only; Gotham is the
fallback.

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

Move a piece here when a second demo needs it. Add it to `index.js`, the gallery and the
catalog above, build it only from tokens (check it in both themes and all three accents in the
gallery), and prefer a token or a `variant` over a one-off prop.
