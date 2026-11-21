// HouseSigma demo: "Ask, then know if it's a fair price". A home-search copilot prototype on a
// generated sample market. One sentence becomes validated filters (LLM proposes, code checks),
// the matches are valued against comparable sold homes in code, a fast decision model gives an
// underpriced / fair / overpriced verdict with probabilities, the LLM explains it citing the
// comps, then an offer-night brief and a weekly pulse for the saved search.
// Live at /demo/housesigma/ (unlisted, noindex). Without a demo key the page shows a recorded
// run; search, comps, estimates and the brief always run in the browser. Notes in ./README.md.
import { DemoLayout } from 'demos/DemoLayout';
import { getDemoKey, postJson, streamFromApi } from 'demos/client';
import {
  Button,
  Card,
  CardHead,
  CardTitle,
  Chip,
  EmptyState,
  Notice,
  NoteGrid,
  Pill,
  SectionHead,
  SegmentedControl,
  Select,
  Spinner,
  StatGrid,
  StatTile,
  srOnly,
} from 'demos/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowUp, FiSearch, FiSliders } from 'react-icons/fi';
import { CITIES, TODAY, TYPES, getMarket } from './data';
import {
  EMPTY_FILTERS,
  MAX_ASK,
  WALK_KM,
  areaStats,
  chipsFor,
  describeSearch,
  fairFacts,
  hasAnyFilter,
  longDate,
  money,
  narrowing,
  offerBrief,
  pulseFacts,
  pulseStats,
  relaxations,
  removeChip,
  search,
  signedPct,
  soldContext,
  toRaw,
  traceFigures,
  validateFilters,
  valuation,
} from './engine';
import { EXAMPLE } from './example';
import {
  AreaTrend,
  CompsList,
  FilterChip,
  HomeFacts,
  HomeGlyph,
  HomeHistory,
  ListingCard,
  MiniHome,
  OfferRange,
  PriceSizeChart,
  PulseText,
  SavedBadge,
  TraceLine,
  VerdictPanel,
} from './panels';
import styles from './Housesigma.module.css';

const API = '/api/demo/housesigma';
const NAV = [
  { href: '#ask', label: 'Ask' },
  { href: '#fair', label: 'Fair price' },
  { href: '#offer', label: 'Offer night' },
  { href: '#pulse', label: 'This week' },
  { href: '#notes', label: 'Design' },
];
const ASKS = [
  EXAMPLE.ask,
  'Detached in Oakville with 4 bedrooms and great schools, under $2.2M',
  '2-bed condo near a GO station in Port Credit, max 900k, with parking and a lake view',
];
const SORTS = [
  { value: 'value', label: 'Best value' },
  { value: 'new', label: 'Newest' },
  { value: 'price', label: 'Price' },
];
const NOTES = [
  {
    title: 'The model proposes, code decides',
    text: 'The LLM only turns a sentence into a small JSON object. Code keeps the places, home types and ranges that exist in the data, drops the rest and says so. Every chip can be removed or edited, and the search itself is plain code.',
  },
  {
    title: 'Comps you can check',
    text: 'Comparable sales are picked by rules: same area and type, similar size and bedrooms, sold in the last six months, then adjusted for size and time. The estimate range is wider when the comps disagree.',
  },
  {
    title: 'A verdict with odds',
    text: 'A fast decision model reads only the asking price and the comps and answers underpriced, fair or overpriced with a probability for each, in about a tenth of a second. A range check in code runs beside it, and a split is shown as a close call.',
  },
  {
    title: 'No invented numbers',
    text: 'The LLM writes the explanation and the weekly update from facts computed in code. The page then checks every figure in its text against those facts and flags any that are not there.',
  },
];
const PREVIEW_ASK = 'Preview mode: reading a new ask needs the private link from my message. The filters below still work: search, comps and estimates run in your browser.';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const filtersKey = filters => JSON.stringify(toRaw(filters));
const exampleParse = validateFilters(EXAMPLE.raw);
const EXAMPLE_KEY = filtersKey(exampleParse.filters);
const recordedDay = longDate(EXAMPLE.recorded);

/** Reveals recorded text a few characters at a time, so an example reads like a run. */
async function typeOut(text, onText, cancelled) {
  if (reducedMotion()) return onText(text);
  for (let index = 0; index < text.length; index += 4) {
    if (cancelled()) return undefined;
    onText(text.slice(0, index + 4));
    await sleep(14);
  }
  return onText(text);
}

function Refine({ filters, onChange }) {
  const set = patch => onChange({ ...filters, ...patch });
  const numberOrNull = value => (value === '' ? null : Number(value));
  return (
    <div className={styles.refine}>
      <label>
        <span>City</span>
        <Select value={filters.cities[0] || ''} onChange={event => set({ cities: event.target.value ? [event.target.value] : [], hoods: [] })}>
          <option value="">Any</option>
          {CITIES.map(city => (
            <option key={city}>{city}</option>
          ))}
        </Select>
      </label>
      <label>
        <span>Home type</span>
        <Select value={filters.types[0] || ''} onChange={event => set({ types: event.target.value ? [event.target.value] : [] })}>
          <option value="">Any</option>
          {Object.entries(TYPES).map(([value, type]) => (
            <option key={value} value={value}>
              {type.label}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <span>Bedrooms</span>
        <Select value={filters.bedsMin || ''} onChange={event => set({ bedsMin: numberOrNull(event.target.value) })}>
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map(count => (
            <option key={count} value={count}>
              {count}+
            </option>
          ))}
        </Select>
      </label>
      <label>
        <span>Max price</span>
        <Select value={filters.priceMax || ''} onChange={event => set({ priceMax: numberOrNull(event.target.value) })}>
          <option value="">Any</option>
          {[700, 800, 900, 1000, 1100, 1250, 1500, 1750, 2000, 2500].map(k => (
            <option key={k} value={k * 1000}>
              {money(k * 1000)}
            </option>
          ))}
          {filters.priceMax && filters.priceMax % 50_000 !== 0 && <option value={filters.priceMax}>{money(filters.priceMax)}</option>}
        </Select>
      </label>
      <label>
        <span>GO station</span>
        <Select value={filters.goMaxKm || ''} onChange={event => set({ goMaxKm: numberOrNull(event.target.value) })}>
          <option value="">Any distance</option>
          <option value={WALK_KM}>Walk (≤ {WALK_KM} km)</option>
          <option value={2.5}>Within 2.5 km</option>
          <option value={4}>Within 4 km</option>
          {filters.goMaxKm && ![WALK_KM, 2.5, 4].includes(filters.goMaxKm) && <option value={filters.goMaxKm}>Within {filters.goMaxKm} km</option>}
        </Select>
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={filters.quiet} onChange={event => set({ quiet: event.target.checked })} />
        <span>Quiet street</span>
      </label>
    </div>
  );
}

export default function HousesigmaDemo() {
  const [hasKey, setHasKey] = useState(false);
  const [ask, setAsk] = useState(EXAMPLE.ask);
  const [filters, setFilters] = useState(exampleParse.filters);
  const [parse, setParse] = useState({ status: 'done', kind: 'example', notes: exampleParse.notes, unmapped: exampleParse.unmapped, ms: EXAMPLE.parseMs, error: '', notice: '' });
  const [refine, setRefine] = useState(false);
  const [sort, setSort] = useState('value');
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState(EXAMPLE.fair.id);
  const [fairs, setFairs] = useState(() =>
    EXAMPLE.fair.verdict ? { [EXAMPLE.fair.id]: { status: 'done', kind: 'example', verdict: EXAMPLE.fair.verdict, text: EXAMPLE.fair.text } } : {}
  );
  const [pulse, setPulse] = useState({ status: EXAMPLE.pulse.text ? 'done' : 'idle', kind: 'example', text: EXAMPLE.pulse.text, key: EXAMPLE_KEY, error: '' });
  const runId = useRef(0);
  const fairSection = useRef(null);

  useEffect(() => setHasKey(Boolean(getDemoKey())), []);

  const market = useMemo(() => getMarket(), []);
  const results = useMemo(() => {
    const found = search(filters);
    const sorted = [...found];
    if (sort === 'value') sorted.sort((a, b) => (valuation(a).gap ?? 0) - (valuation(b).gap ?? 0));
    if (sort === 'price') sorted.sort((a, b) => a.listPrice - b.listPrice);
    return sorted;
  }, [filters, sort]);
  const steps = useMemo(() => narrowing(filters), [filters]);
  const chips = useMemo(() => chipsFor(filters), [filters]);
  const sold = useMemo(() => soldContext(filters), [filters]);
  const relax = useMemo(() => (results.length ? [] : relaxations(filters)), [results.length, filters]);
  const currentKey = filtersKey(filters);

  // Keep a home open: the first match when the open one drops out of the results
  useEffect(() => {
    if (!results.length) return;
    if (!results.some(home => home.id === selectedId)) setSelectedId(results[0].id);
  }, [results, selectedId]);

  const home = useMemo(() => market.active.find(item => item.id === selectedId) || null, [market, selectedId]);
  const value = useMemo(() => (home ? valuation(home) : null), [home]);
  const brief = useMemo(() => (home && value?.estimate ? offerBrief(home, value) : null), [home, value]);
  const fair = home ? fairs[home.id] : null;
  const fairCheck = useMemo(
    () => (home && value?.estimate && fair?.status === 'done' && fair.text ? traceFigures(fair.text, fairFacts(home, value, fair.verdict?.choice)) : null),
    [home, value, fair]
  );
  const stats = useMemo(() => pulseStats(filters), [filters]);
  const pulseShown = pulse.key === currentKey ? pulse : { status: 'idle', kind: 'live', text: '', error: '' };
  const pulseCheck = useMemo(
    () => (pulseShown.status === 'done' && pulseShown.text ? traceFigures(pulseShown.text, pulseFacts(filters, stats)) : null),
    [pulseShown.status, pulseShown.text, filters, stats]
  );

  const applyFilters = useCallback(next => {
    setFilters(next);
    setShowAll(false);
  }, []);

  async function submitAsk(event, text = ask) {
    event?.preventDefault();
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length < 3 || parse.status === 'loading') return;
    const id = ++runId.current;
    const isExample = clean.toLowerCase() === EXAMPLE.ask.toLowerCase();
    if (!hasKey && !isExample) {
      setParse(current => ({ ...current, notice: PREVIEW_ASK, error: '' }));
      return;
    }
    setParse({ status: 'loading', kind: hasKey ? 'live' : 'example', notes: [], unmapped: [], ms: null, error: '', notice: '' });
    try {
      let result;
      if (hasKey) {
        result = await postJson(`${API}/parse/`, { ask: clean });
      } else {
        await sleep(reducedMotion() ? 0 : 700);
        result = { ...exampleParse, ms: EXAMPLE.parseMs, understood: true };
      }
      if (id !== runId.current) return;
      if (!hasAnyFilter(result.filters)) {
        setParse({ status: 'error', kind: 'live', notes: result.notes, unmapped: result.unmapped, ms: result.ms, notice: '', error: 'Nothing in that ask maps to a filter in the sample market. Try a city, a home type, a budget or bedrooms.' });
        return;
      }
      applyFilters({ ...EMPTY_FILTERS, ...result.filters });
      setSort('value');
      setParse({ status: 'done', kind: hasKey ? 'live' : 'example', notes: result.notes, unmapped: result.unmapped, ms: result.ms, cached: result.cached, error: '', notice: '' });
    } catch (error) {
      if (id !== runId.current) return;
      setParse({ status: 'error', kind: 'live', notes: [], unmapped: [], ms: null, notice: '', error: error.message });
    }
  }

  function pickAsk(text) {
    setAsk(text);
    submitAsk(null, text);
  }

  function selectHome(id, { scroll = true } = {}) {
    setSelectedId(id);
    if (scroll && typeof window !== 'undefined' && window.innerWidth < 900) {
      requestAnimationFrame(() => fairSection.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }));
    }
  }

  async function checkPrice() {
    if (!home || !value?.estimate) return;
    const id = home.id;
    const patch = next => setFairs(current => ({ ...current, [id]: { ...current[id], ...next } }));
    if (!hasKey) {
      if (id === EXAMPLE.fair.id && EXAMPLE.fair.verdict) {
        patch({ status: 'loading', kind: 'example', verdict: null, text: '', error: '' });
        await sleep(reducedMotion() ? 0 : 450);
        patch({ verdict: EXAMPLE.fair.verdict });
        await typeOut(EXAMPLE.fair.text, text => patch({ text }), () => false);
        patch({ status: 'done' });
      } else {
        patch({ status: 'rule', kind: 'rule' });
      }
      return;
    }
    patch({ status: 'loading', kind: 'live', verdict: null, text: '', error: '', cached: false });
    try {
      let seen = 0;
      let text = '';
      let failed = '';
      await streamFromApi(`${API}/fair/`, { id }, (_, all) => {
        const lines = all.split('\n');
        lines.pop(); // the last piece may be half a line
        lines.slice(seen).forEach(line => {
          if (!line.trim()) return;
          const event = JSON.parse(line);
          if (event.t === 'verdict') patch({ verdict: event, cached: Boolean(event.cached) });
          if (event.t === 'delta') {
            text += event.text;
            patch({ text });
          }
          if (event.t === 'error') failed = event.message;
        });
        seen = lines.length;
      });
      if (failed) patch({ status: 'error', error: failed });
      else patch({ status: 'done' });
    } catch (error) {
      patch({ status: 'error', error: error.message });
    }
  }

  async function writePulse() {
    const key = currentKey;
    if (!hasKey) {
      if (key === EXAMPLE_KEY && EXAMPLE.pulse.text) {
        setPulse({ status: 'loading', kind: 'example', text: '', key, error: '' });
        await sleep(reducedMotion() ? 0 : 400);
        await typeOut(EXAMPLE.pulse.text, text => setPulse(current => (current.key === key ? { ...current, text } : current)), () => false);
        setPulse(current => (current.key === key ? { ...current, status: 'done' } : current));
      }
      return;
    }
    setPulse({ status: 'loading', kind: 'live', text: '', key, error: '' });
    try {
      const text = await streamFromApi(`${API}/pulse/`, { filters: toRaw(filters) }, (_, all) =>
        setPulse(current => (current.key === key ? { ...current, text: all } : current))
      );
      setPulse(current => (current.key === key ? { ...current, status: 'done', text } : current));
    } catch (error) {
      setPulse(current => (current.key === key ? { ...current, status: 'error', error: error.message } : current));
    }
  }

  const loading = parse.status === 'loading';
  const shown = showAll ? results : results.slice(0, 5);
  const area = home ? areaStats(home.hood, home.type) : null;
  const competition = fair?.verdict?.competition;

  return (
    <DemoLayout
      company="HouseSigma"
      title="Ask for a home. Know if the price is fair."
      tagline="Describe what you want in a sentence. The prototype turns it into filters you can edit, values every match against comparable sold homes, and tells you if the asking price holds up, with the odds and the comps behind it."
      accent="cobalt"
      nav={NAV}
    >
      <div className={styles.page}>
        <section id="ask" className={styles.section} aria-labelledby="ask-heading">
          <h2 id="ask-heading" className={srOnly}>
            Ask
          </h2>
          <Card className={styles.askCard} data-track="ask">
            <form className={styles.askForm} onSubmit={submitAsk}>
              <FiSearch className={styles.askIcon} aria-hidden />
              <label className={srOnly} htmlFor="hs-ask">
                Describe the home you want
              </label>
              <input
                id="hs-ask"
                className={styles.askInput}
                value={ask}
                maxLength={MAX_ASK}
                placeholder="Describe the home you want"
                autoComplete="off"
                enterKeyHint="search"
                onChange={event => setAsk(event.target.value)}
              />
              <button type="submit" className={styles.askGo} disabled={loading || ask.trim().length < 3} aria-label="Search" data-action="ask">
                {loading ? <Spinner /> : <FiArrowUp aria-hidden />}
              </button>
            </form>
            <div className={styles.tryRow}>
              <span className={styles.muted}>Try</span>
              {ASKS.map(text => (
                <Chip key={text} onClick={() => pickAsk(text)} disabled={loading}>
                  {text}
                </Chip>
              ))}
            </div>

            <div className={styles.understood} data-track="chips" aria-live="polite">
              <div className={styles.understoodHead}>
                <span className={styles.label}>{loading ? 'Reading your ask' : 'Understood as'}</span>
                {!loading && parse.status === 'done' && (
                  <span className={styles.muted}>
                    {parse.kind === 'example' ? `recorded run, ${recordedDay}` : `the LLM${parse.ms ? `, ${(parse.ms / 1000).toFixed(1)} s` : ''}${parse.cached ? ' (cached)' : ''} · checked in code`}
                  </span>
                )}
                <button type="button" className={styles.refineToggle} aria-expanded={refine} onClick={() => setRefine(open => !open)}>
                  <FiSliders aria-hidden /> Edit filters
                </button>
              </div>
              {loading ? (
                <div className={styles.chipSkeleton} aria-label="Reading your ask">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <div className={styles.chipRow}>
                  {chips.map((chip, index) => (
                    <FilterChip key={`${chip.key}${chip.value || ''}`} label={chip.label} count={steps[index + 1]?.count} onRemove={() => applyFilters(removeChip(filters, chip))} />
                  ))}
                  {chips.length === 0 && <span className={styles.muted}>No filters: showing every active listing.</span>}
                  {parse.unmapped?.map(text => (
                    <span key={text} className={styles.unmapped} title="The sample data has no field for this, so it is not used">
                      not searchable yet: “{text}”
                    </span>
                  ))}
                </div>
              )}
              {refine && <Refine filters={filters} onChange={applyFilters} />}
              {parse.notes?.length > 0 && !loading && <p className={styles.parseNotes}>Code check: {parse.notes.join(' · ')}</p>}
              {parse.error && (
                <Notice kind="error" size="s" role="alert">
                  {parse.error}
                </Notice>
              )}
              {parse.notice && (
                <Notice size="s" role="status">
                  {parse.notice}
                </Notice>
              )}
            </div>

            <p className={styles.count} data-track="count">
              <span>{market.active.length} active listings</span>
              <i aria-hidden>→</i>
              <b>{loading ? '…' : results.length}</b>
              <span>{results.length === 1 ? 'home matches' : 'homes match'}</span>
              <span className={styles.countAside}>sample market, frozen on {longDate(TODAY)}</span>
            </p>
          </Card>

          <div className={styles.resultsGrid}>
            <div className={styles.results} data-track="results">
              <div className={styles.resultsHead}>
                <h3 className={styles.h3}>Matches</h3>
                <SegmentedControl label="Sort" options={SORTS} value={sort} onChange={setSort} />
              </div>
              {loading ? (
                <div className={styles.listSkeleton} aria-label="Searching">
                  <span />
                  <span />
                  <span />
                </div>
              ) : results.length === 0 ? (
                <EmptyState>
                  <strong>No home matches every filter.</strong>
                  <span>Dropping one of these brings homes back:</span>
                  <span className={styles.relax}>
                    {relax.map(({ chip, count }) => (
                      <Chip key={chip.label} onClick={() => applyFilters(removeChip(filters, chip))}>
                        Without “{chip.label}”: {count} {count === 1 ? 'home' : 'homes'}
                      </Chip>
                    ))}
                    {relax.length === 0 && (
                      <Chip onClick={() => applyFilters(EMPTY_FILTERS)}>Clear all filters</Chip>
                    )}
                  </span>
                </EmptyState>
              ) : (
                <>
                  <div className={styles.list}>
                    {shown.map(item => (
                      <ListingCard key={item.id} home={item} value={valuation(item)} selected={item.id === selectedId} onSelect={selectHome} />
                    ))}
                  </div>
                  {results.length > shown.length && (
                    <Button variant="ghost" size="s" className={styles.more} onClick={() => setShowAll(true)}>
                      Show all {results.length} homes
                    </Button>
                  )}
                </>
              )}
            </div>
            <Card className={styles.chartCard} data-track="chart">
              <CardHead>
                <CardTitle size="s">Asking price against size</CardTitle>
              </CardHead>
              <p className={styles.chartLede}>A match sitting under the grey cloud asks less than similar homes sold for.</p>
              <PriceSizeChart results={loading ? [] : results} sold={sold} selectedId={selectedId} onSelect={id => selectHome(id, { scroll: false })} />
            </Card>
          </div>
        </section>

        <section id="fair" ref={fairSection} className={styles.section} aria-labelledby="fair-heading">
          <SectionHead titleId="fair-heading" title="Is this a fair price?" lede="Comparable sold homes are picked and adjusted in code. A fast decision model gives the verdict with its odds; the LLM explains it using only those comps." />
          {home && value?.estimate ? (
            <div className={styles.fairGrid}>
              <Card className={styles.fairCard} data-track="fair">
                <div className={styles.homeHead}>
                  <HomeGlyph type={home.type} seed={Number(home.id.replace(/\D/g, ''))} size="l" />
                  <div>
                    <p className={styles.homePrice}>{money(home.listPrice)}</p>
                    <p className={styles.homeAddress}>
                      {home.address}, {home.area}, {home.city}
                    </p>
                    <HomeFacts home={home} />
                  </div>
                </div>
                <VerdictPanel home={home} value={value} fair={fair} hasKey={hasKey} onCheck={checkPrice} check={fairCheck} />
              </Card>
              <Card className={styles.compsCard}>
                <CardHead aside={<span className={styles.muted}>{value.pool} candidates · picked in code</span>}>
                  <CardTitle size="s">Comparable sold homes</CardTitle>
                </CardHead>
                <CompsList value={value} />
                <p className={styles.compsNote}>
                  Same area and type, within one bedroom and about 20% in size, sold in the last {value.widened ? '12' : '6'} months. Prices are adjusted to this home&apos;s size and for time ({signedPct(value.rate, 2)} a month here).
                </p>
              </Card>
            </div>
          ) : (
            <EmptyState>
              <strong>Pick a home above</strong>
              <span>Its comparable sales, estimate range and verdict show up here.</span>
            </EmptyState>
          )}
        </section>

        <section id="offer" className={styles.section} aria-labelledby="offer-heading">
          <SectionHead titleId="offer-heading" title="Offer-night brief" lede={home ? `What ${TYPES[home.type].label.toLowerCase()} homes in ${home.area} have been doing, and a range to walk in with. All of it computed from the sold records.` : 'Pick a home to see its brief.'} />
          {home && brief?.range && area ? (
            <div className={styles.offerGrid}>
              <div className={styles.offerStats} data-track="offerStats">
                <StatGrid columns={2}>
                  <StatTile label="Sold over asking" value={Math.round(area.overAsking * 100)} unit="%" note={`${area.count} sales, last 90 days`} />
                  <StatTile label="Median sale to list" value={(area.saleToList * 100).toFixed(1)} unit="%" note="100% = sold at asking" />
                  <StatTile label="Median days on market" value={Math.round(area.dom)} unit=" d" note={`this home: ${home.dom} d`} />
                  <StatTile
                    label="Chance of competing offers"
                    value={competition != null ? Math.round(competition * 100) : '–'}
                    unit={competition != null ? '%' : undefined}
                    tone="tint"
                    note={competition != null ? 'fast decision model' : 'run the price check to see it'}
                  />
                </StatGrid>
                <Card className={styles.trendCard}>
                  <AreaTrend area={area} />
                </Card>
              </div>
              <div className={styles.offerSide}>
                <Card tone="tint" className={styles.offerCard}>
                  <OfferRange home={home} brief={brief} />
                </Card>
                <Card>
                  <CardHead>
                    <CardTitle size="s">This home&apos;s list-to-sold history</CardTitle>
                  </CardHead>
                  <HomeHistory home={home} />
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState size="s">The brief needs a home with enough comparable sales.</EmptyState>
          )}
        </section>

        <section id="pulse" className={styles.section} aria-labelledby="pulse-heading">
          <SectionHead titleId="pulse-heading" title="This week on your saved search" lede="New listings, price drops and what sold against its estimate, counted in code for the last 7 days. The LLM only words it." />
          <div className={styles.pulse} data-track="pulse">
            <div className={styles.pulseHead}>
              <SavedBadge>Saved search</SavedBadge>
              <span className={styles.pulseSearch}>{describeSearch(filters)}</span>
              <span className={styles.muted}>{stats.exactCount} exact matches · {stats.areaCount} in the wider area</span>
            </div>
            <StatGrid columns={4}>
              <StatTile label="New matches" value={stats.newExact.length} note={`${stats.newArea} new in the area`} tone="tint" />
              <StatTile label="Price drops" value={stats.drops.length} note={stats.biggestDrop ? `biggest: ${money(stats.biggestDrop.drop.from - stats.biggestDrop.listPrice)}` : 'none this week'} />
              <StatTile label="Sold this week" value={stats.soldWeek} note={stats.soldWeek ? `${Math.round(stats.soldOverAsking * 100)}% over asking` : 'no sales'} />
              <StatTile
                label="Sold vs estimate"
                value={stats.soldVsEstimate != null ? signedPct(stats.soldVsEstimate - 1) : '–'}
                note={stats.soldVsEstimate != null ? `median of ${stats.versusCount} sales` : 'no sales to compare'}
              />
            </StatGrid>
            <div className={styles.pulseGrid}>
              <Card className={styles.digest} data-track="digest" aria-live="polite">
                <CardHead
                  aside={
                    pulseShown.status === 'idle' ? null : pulseShown.kind === 'example' ? <Pill>Example run</Pill> : <Pill tone="live">Live</Pill>
                  }
                >
                  <CardTitle size="s">Your week, in plain words</CardTitle>
                </CardHead>
                {pulseShown.text ? (
                  <>
                    <PulseText text={pulseShown.text} streaming={pulseShown.status === 'loading'} />
                    {pulseShown.status === 'done' && <TraceLine check={pulseCheck} noun="this week's numbers" />}
                  </>
                ) : pulseShown.status === 'loading' ? (
                  <div className={styles.digestWait} aria-label="Writing">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <EmptyState size="s">
                    {hasKey || currentKey === EXAMPLE_KEY
                      ? 'The numbers above are live. The written update takes a few seconds.'
                      : 'The numbers above are live for this search. The written update needs the private link.'}
                  </EmptyState>
                )}
                {pulseShown.error && (
                  <Notice kind="error" size="s" role="alert">
                    {pulseShown.error}
                  </Notice>
                )}
                {(hasKey || currentKey === EXAMPLE_KEY) && pulseShown.status !== 'loading' && (
                  <Button variant={pulseShown.text ? 'secondary' : 'primary'} size="s" className={styles.digestButton} onClick={writePulse} data-action="write-pulse">
                    {pulseShown.text ? 'Write it again' : "Write this week's update"}
                  </Button>
                )}
              </Card>
              <Card className={styles.newCard}>
                <CardHead>
                  <CardTitle size="s">New and reduced this week</CardTitle>
                </CardHead>
                {stats.newExact.length + stats.drops.length === 0 ? (
                  <EmptyState size="s">Nothing new or reduced in the last 7 days.</EmptyState>
                ) : (
                  <div className={styles.miniList}>
                    {stats.newExact.slice(0, 3).map(item => (
                      <MiniHome key={item.id} home={item} note={item.dom === 0 ? 'New today' : `New, ${item.dom} d ago`} onSelect={selectHome} />
                    ))}
                    {[...stats.drops].sort((a, b) => b.drop.from - b.listPrice - (a.drop.from - a.listPrice)).slice(0, 2).map(item => (
                      <MiniHome key={`drop${item.id}`} home={item} note={`Cut ${money(item.drop.from - item.listPrice)}`} onSelect={selectHome} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </section>

        <section id="notes" className={styles.section} aria-labelledby="notes-heading">
          <SectionHead titleId="notes-heading" title="Design choices" lede={`Unofficial prototype on sample data: ${market.active.length} active listings and ${market.sold.length.toLocaleString('en-US')} sold records generated in code. The cities, areas and GO stations are real places; every street, home and price is invented.`} />
          <NoteGrid className={styles.notes} items={NOTES} />
        </section>
      </div>
    </DemoLayout>
  );
}
