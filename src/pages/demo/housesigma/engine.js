// Everything the HouseSigma demo decides in code: validating the filters the LLM proposes,
// searching, picking comparable sold homes, the estimate range, the offer-night numbers, the
// weekly pulse stats and the check that a model's sentence only quotes figures it was given.
// Pure JS: runs in the browser (instant, free) and in the API routes (same answers).
import { CITIES, HOODS, STREET_LABEL, TYPES, getMarket, hoodById } from './data';

export const MAX_ASK = 240;
export const WALK_KM = 1.2;

export const money = value => `$${Math.round(value).toLocaleString('en-US')}`;
export const moneyShort = value =>
  value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(value % 10_000 === 0 ? 2 : 3).replace(/0$/, '')}M` : `$${Math.round(value / 1000)}K`;
export const signedPct = (ratio, digits = 1) => `${ratio > 0 ? '+' : ratio < 0 ? '−' : ''}${Math.abs(ratio * 100).toFixed(digits)}%`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = iso => {
  const [year, month, day] = String(iso).split('-');
  return day ? `${MONTHS[Number(month) - 1]} ${Number(day)}` : `${MONTHS[Number(month) - 1]} ${year}`;
};
export const longDate = iso => {
  const [year, month, day] = String(iso).split('-');
  return day ? `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}` : `${MONTHS[Number(month) - 1]} ${year}`;
};

const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, step) => Math.round(value / step) * step;

// --- Filters ---------------------------------------------------------------------------------

export const EMPTY_FILTERS = {
  cities: [],
  hoods: [],
  types: [],
  bedsMin: null,
  bathsMin: null,
  priceMin: null,
  priceMax: null,
  sqftMin: null,
  goMaxKm: null,
  quiet: false,
  schoolMin: null,
  parkingMin: null,
};

const TYPE_WORDS = {
  detached: 'detached',
  'single family': 'detached',
  house: 'detached',
  semi: 'semi',
  'semi-detached': 'semi',
  'semi detached': 'semi',
  town: 'town',
  townhouse: 'town',
  townhome: 'town',
  'row house': 'town',
  condo: 'condo',
  apartment: 'condo',
  'condo apartment': 'condo',
};

function number(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** A price the model may have written as 1.1, 1100 or 1100000. */
function price(value, notes, label) {
  let amount = number(value);
  if (amount == null || amount <= 0) return null;
  if (amount < 100) {
    amount *= 1_000_000;
    notes.push(`${label}: read as millions`);
  } else if (amount < 20_000) {
    amount *= 1000;
    notes.push(`${label}: read as thousands`);
  }
  if (amount < 200_000 || amount > 6_000_000) {
    notes.push(`${label}: outside the sample market, dropped`);
    return null;
  }
  return round(amount, 5000);
}

function ranged(value, min, max, notes, label, step = 1) {
  const parsed = number(value);
  if (parsed == null) return null;
  if (parsed < min) return null; // "0 baths" is no filter
  if (parsed > max) {
    notes.push(`${label}: capped at ${max}`);
    return max;
  }
  return round(parsed, step);
}

const list = value => (Array.isArray(value) ? value : value == null || value === '' ? [] : [value]).map(item => String(item).trim()).filter(Boolean);

/**
 * Turns whatever the LLM answered into filters this page can run. Unknown places, types and
 * keys are dropped (and reported), numbers are clamped: the model can only narrow a search
 * over fields that exist, never invent one.
 */
export function validateFilters(raw) {
  const notes = [];
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const filters = { ...EMPTY_FILTERS };

  list(source.cities ?? source.city).forEach(name => {
    const city = CITIES.find(item => item.toLowerCase() === name.toLowerCase());
    if (city) filters.cities = [...new Set([...filters.cities, city])];
    else notes.push(`"${name.slice(0, 40)}" is not a city in the sample market`);
  });
  list(source.areas ?? source.neighbourhoods ?? source.area).forEach(name => {
    const hood = HOODS.find(item => item.name.toLowerCase() === name.toLowerCase() || item.id === name);
    if (hood) filters.hoods = [...new Set([...filters.hoods, hood.id])];
    else notes.push(`"${name.slice(0, 40)}" is not an area in the sample market`);
  });
  list(source.types ?? source.type).forEach(name => {
    const type = TYPE_WORDS[name.toLowerCase()];
    if (type) filters.types = [...new Set([...filters.types, type])];
    else notes.push(`"${name.slice(0, 40)}" is not a home type here`);
  });

  filters.bedsMin = ranged(source.beds_min, 1, 5, notes, 'Bedrooms');
  filters.bathsMin = ranged(source.baths_min, 1, 5, notes, 'Bathrooms');
  filters.priceMax = price(source.price_max, notes, 'Max price');
  filters.priceMin = price(source.price_min, notes, 'Min price');
  if (filters.priceMin && filters.priceMax && filters.priceMin > filters.priceMax) {
    [filters.priceMin, filters.priceMax] = [filters.priceMax, filters.priceMin];
    notes.push('Min and max price were swapped');
  }
  filters.sqftMin = ranged(source.sqft_min, 300, 4000, notes, 'Size', 50);
  const go = number(source.go_max_km);
  filters.goMaxKm = go != null && go > 0 ? clamp(Math.round(go * 10) / 10, 0.3, 6) : null;
  filters.quiet = source.quiet_street === true || source.quiet_street === 'true';
  filters.schoolMin = ranged(source.school_min, 1, 10, notes, 'School score');
  filters.parkingMin = ranged(source.parking_min, 1, 6, notes, 'Parking');

  const unmapped = list(source.unmapped).map(text => text.slice(0, 60)).slice(0, 4);
  return { filters, notes, unmapped };
}

export const hasAnyFilter = filters =>
  Object.entries(filters).some(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value)));

/** One chip per active filter: { key, label, value? } (value set for one entry of a list). */
export function chipsFor(filters) {
  const chips = [];
  filters.cities.forEach(city => chips.push({ key: 'cities', value: city, label: city }));
  filters.hoods.forEach(id => chips.push({ key: 'hoods', value: id, label: hoodById(id)?.name || id }));
  filters.types.forEach(type => chips.push({ key: 'types', value: type, label: TYPES[type].label }));
  if (filters.bedsMin) chips.push({ key: 'bedsMin', label: `${filters.bedsMin}+ beds` });
  if (filters.bathsMin) chips.push({ key: 'bathsMin', label: `${filters.bathsMin}+ baths` });
  if (filters.priceMin) chips.push({ key: 'priceMin', label: `Over ${moneyShort(filters.priceMin)}` });
  if (filters.priceMax) chips.push({ key: 'priceMax', label: `Under ${moneyShort(filters.priceMax)}` });
  if (filters.sqftMin) chips.push({ key: 'sqftMin', label: `${filters.sqftMin.toLocaleString('en-US')}+ sq ft` });
  if (filters.goMaxKm) {
    chips.push({
      key: 'goMaxKm',
      label: filters.goMaxKm <= WALK_KM + 0.31 ? `Walk to GO (≤ ${filters.goMaxKm} km)` : `GO within ${filters.goMaxKm} km`,
    });
  }
  if (filters.quiet) chips.push({ key: 'quiet', label: 'Quiet street' });
  if (filters.schoolMin) chips.push({ key: 'schoolMin', label: `Schools ${filters.schoolMin}+ / 10` });
  if (filters.parkingMin) chips.push({ key: 'parkingMin', label: `${filters.parkingMin}+ parking` });
  return chips;
}

export function removeChip(filters, chip) {
  const current = filters[chip.key];
  if (Array.isArray(current)) return { ...filters, [chip.key]: current.filter(item => item !== chip.value) };
  return { ...filters, [chip.key]: chip.key === 'quiet' ? false : null };
}

const inArea = (home, filters) =>
  (!filters.cities.length || filters.cities.includes(home.city) || filters.hoods.includes(home.hood)) &&
  (!filters.hoods.length || filters.hoods.includes(home.hood) || (filters.cities.length > 0 && filters.cities.includes(home.city))) &&
  (!filters.types.length || filters.types.includes(home.type)) &&
  (!filters.bedsMin || home.beds >= filters.bedsMin);

const matches = (home, filters, priceOf) =>
  inArea(home, filters) &&
  (!filters.bathsMin || home.baths >= filters.bathsMin) &&
  (!filters.priceMin || priceOf(home) >= filters.priceMin) &&
  (!filters.priceMax || priceOf(home) <= filters.priceMax) &&
  (!filters.sqftMin || home.sqft >= filters.sqftMin) &&
  (!filters.goMaxKm || home.goKm <= filters.goMaxKm) &&
  (!filters.quiet || home.street === 'quiet') &&
  (!filters.schoolMin || home.school >= filters.schoolMin) &&
  (!filters.parkingMin || home.parking >= filters.parkingMin);

/** Active listings that pass every filter, newest first. */
export function search(filters) {
  return getMarket().active.filter(home => matches(home, filters, item => item.listPrice));
}

/** How many homes are left after each chip, in order: the narrowing shown under the ask. */
export function narrowing(filters) {
  const steps = [{ label: 'All active', count: getMarket().active.length }];
  let running = { ...EMPTY_FILTERS };
  chipsFor(filters).forEach(chip => {
    const value = filters[chip.key];
    running = { ...running, [chip.key]: Array.isArray(value) ? [...running[chip.key], chip.value] : value };
    steps.push({ label: chip.label, count: search(running).length });
  });
  return steps;
}

// --- Comparable sold homes and the estimate -----------------------------------------------------

const SIZE_POWER = { condo: 0.86 };
const sizePower = type => SIZE_POWER[type] || 0.75;

const trendCache = new Map();
/** Monthly price drift for an area and type, from its own sold homes ($ per sq ft, recent vs before). */
export function monthlyTrend(hood, type) {
  const key = `${hood}:${type}`;
  if (trendCache.has(key)) return trendCache.get(key);
  const pool = getMarket().sold.filter(home => home.hood === hood && home.type === type);
  const psf = (from, to) => median(pool.filter(home => home.soldDaysAgo > from && home.soldDaysAgo <= to).map(home => home.soldPrice / home.sqft ** sizePower(type)));
  const recent = psf(0, 75);
  const before = psf(75, 180);
  // Bucket centres are about 3 months apart
  const rate = recent && before ? clamp((recent / before) ** (1 / 3) - 1, -0.01, 0.01) : 0;
  trendCache.set(key, rate);
  return rate;
}

/**
 * Up to six sold homes most like this one: same area and type, similar size and bedrooms,
 * sold in the last six months (widened once if fewer than four turn up). `before` limits the
 * search to homes sold more than that many days ago (to estimate a home that has since sold).
 */
export function findComps(home, { before = 0, limit = 6 } = {}) {
  const { sold } = getMarket();
  const rate = monthlyTrend(home.hood, home.type);
  const pass = (days, sizeBand) =>
    sold.filter(
      comp =>
        comp.id !== home.id &&
        comp.hood === home.hood &&
        comp.type === home.type &&
        comp.soldDaysAgo > before &&
        comp.soldDaysAgo - before <= days &&
        Math.abs(comp.beds - home.beds) <= 1 &&
        Math.abs(Math.log(comp.sqft / home.sqft)) <= sizeBand
    );
  let pool = pass(180, 0.22);
  let widened = false;
  if (pool.length < 4) {
    pool = pass(365, 0.35);
    widened = true;
  }
  const scored = pool.map(comp => {
    const age = comp.soldDaysAgo - before;
    const distance =
      (Math.abs(Math.log(comp.sqft / home.sqft)) / 0.22) * 0.4 +
      Math.abs(comp.beds - home.beds) * 0.14 +
      (age / 180) * 0.22 +
      (Math.min(2, Math.abs(comp.goKm - home.goKm)) / 2) * 0.12 +
      (comp.street === home.street ? 0 : 0.1);
    const similarity = clamp(1 - distance, 0.05, 1);
    // What the comp would sell for today, at this home's size and bedroom count
    const adjusted =
      comp.soldPrice *
      (home.sqft / comp.sqft) ** sizePower(home.type) *
      (1 + 0.03 * (home.beds - comp.beds)) *
      (1 + rate) ** (age / 30.4);
    return { ...comp, similarity, adjusted: round(adjusted, 1000) };
  });
  scored.sort((a, b) => b.similarity - a.similarity);
  return { comps: scored.slice(0, limit), pool: pool.length, widened, rate };
}

/** Estimate range from the comps: similarity-weighted mean, spread from how much they disagree. */
export function estimateFrom(comps) {
  if (comps.length < 3) return null;
  const weights = comps.map(comp => comp.similarity ** 2);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const mid = comps.reduce((sum, comp, index) => sum + comp.adjusted * weights[index], 0) / total;
  const variance = comps.reduce((sum, comp, index) => sum + weights[index] * (comp.adjusted - mid) ** 2, 0) / total;
  const spread = clamp(Math.sqrt(variance) / mid, 0.025, 0.07);
  return {
    low: round(mid * (1 - spread), 1000),
    mid: round(mid, 1000),
    high: round(mid * (1 + spread), 1000),
    spread,
    confidence: comps.length >= 5 && spread <= 0.04 ? 'high' : comps.length >= 4 && spread <= 0.055 ? 'medium' : 'low',
  };
}

export const VERDICTS = [
  { value: 'underpriced', label: 'Underpriced', tone: 'ok', plain: 'Listed below what comparable sales support' },
  { value: 'fair', label: 'Fair price', tone: 'accent', plain: 'Listed within the range comparable sales support' },
  { value: 'overpriced', label: 'Overpriced', tone: 'warn', plain: 'Listed above what comparable sales support' },
];
export const verdictOf = value => VERDICTS.find(item => item.value === value) || VERDICTS[1];

/** The plain rule: under the range, inside it, or over it. */
export function ruleVerdict(listPrice, estimate) {
  if (!estimate) return null;
  if (listPrice < estimate.low) return 'underpriced';
  if (listPrice > estimate.high) return 'overpriced';
  return 'fair';
}

const valuationCache = new Map();
/** Comps, estimate and the rule verdict for one active listing (cached per page load). */
export function valuation(home) {
  if (valuationCache.has(home.id)) return valuationCache.get(home.id);
  const found = findComps(home);
  const estimate = estimateFrom(found.comps);
  const result = {
    ...found,
    estimate,
    gap: estimate ? (home.listPrice - estimate.mid) / estimate.mid : null,
    rule: ruleVerdict(home.listPrice, estimate),
  };
  valuationCache.set(home.id, result);
  return result;
}

// --- Offer-night brief ----------------------------------------------------------------------------

const areaCache = new Map();
/** Sold stats for an area and type: the last 90 days, plus six 30-day buckets (oldest first). */
export function areaStats(hood, type) {
  const key = `${hood}:${type}`;
  if (areaCache.has(key)) return areaCache.get(key);
  const pool = getMarket().sold.filter(home => home.hood === hood && home.type === type);
  const summarise = homes => ({
    count: homes.length,
    overAsking: homes.length ? homes.filter(home => home.soldPrice > home.listPrice).length / homes.length : null,
    saleToList: median(homes.map(home => home.soldPrice / home.listPrice)),
    dom: median(homes.map(home => home.dom)),
  });
  const months = Array.from({ length: 6 }, (_, index) => {
    const to = (6 - index) * 30;
    const from = to - 30;
    return { label: index === 5 ? 'Last 30 d' : `${to}–${from} d ago`, ...summarise(pool.filter(home => home.soldDaysAgo > from && home.soldDaysAgo <= to)) };
  });
  const stats = { ...summarise(pool.filter(home => home.soldDaysAgo <= 90)), months };
  areaCache.set(key, stats);
  return stats;
}

/**
 * The numbers a buyer wants on offer night, and a suggested range with its reasons. Anchored on
 * the estimate, never on the list price. Sample data, not advice.
 */
export function offerBrief(home, value = valuation(home)) {
  const area = areaStats(home.hood, home.type);
  const { estimate } = value;
  if (!estimate) return { area, range: null, reasons: [], stance: 'unknown' };

  const hot = area.overAsking != null && area.overAsking >= 0.45;
  const stale = !home.offerDate && area.dom != null && home.dom > Math.max(14, area.dom * 1.5);
  let low = estimate.low;
  let high = estimate.mid;
  let stance = 'balanced';
  const reasons = [];

  if (value.rule === 'underpriced') {
    reasons.push({
      tone: 'warn',
      text: `Listed ${money(estimate.low - home.listPrice)} under the low end of the estimate${home.offerDate ? `, with offers held until ${shortDate(home.offerDate)}` : ''}. A low list price is there to draw several bids: anchor on the estimate, not the asking price.`,
    });
  } else if (value.rule === 'overpriced') {
    reasons.push({
      tone: 'ok',
      text: `Listed ${money(home.listPrice - estimate.high)} above the high end of what comparable sales support. The asking price is not the anchor here.`,
    });
  } else {
    reasons.push({ tone: 'accent', text: `Asking price sits inside the estimate range (${money(estimate.low)} to ${money(estimate.high)}).` });
  }

  if (hot) {
    low = round(estimate.mid * 0.985, 1000);
    high = Math.min(estimate.high, round(estimate.mid * 1.02, 1000));
    stance = 'competitive';
    reasons.push({
      tone: 'warn',
      text: `${Math.round(area.overAsking * 100)}% of ${TYPES[home.type].label.toLowerCase()} homes in ${home.area} sold over asking in the last 90 days (median ${(area.saleToList * 100).toFixed(1)}% of list): expect competition near the middle of the range.`,
    });
  } else if (area.overAsking != null) {
    reasons.push({
      tone: 'accent',
      text: `${Math.round(area.overAsking * 100)}% of similar homes here sold over asking in the last 90 days (median ${(area.saleToList * 100).toFixed(1)}% of list): most deals close at or under the list price.`,
    });
  }

  if (stale) {
    low = round(estimate.low * 0.985, 1000);
    high = round(estimate.mid * 0.995, 1000);
    stance = 'negotiate';
    reasons.push({ tone: 'ok', text: `On the market ${home.dom} days against an area median of ${Math.round(area.dom)}: room to negotiate, and no offer date to wait for.` });
  }
  if (home.drop) {
    reasons.push({ tone: 'ok', text: `The seller already cut the price from ${money(home.drop.from)} on ${shortDate(home.drop.date)}.` });
  }
  const lastSale = [...home.history].reverse().find(item => item.event === 'Sold');
  if (lastSale) {
    reasons.push({ tone: 'accent', text: `Last sold for ${money(lastSale.price)} in ${longDate(lastSale.date)}.` });
  }

  return { area, range: { low, high }, reasons, stance, hot, stale };
}

// --- Weekly pulse for a saved search ----------------------------------------------------------------

/** What changed in the last 7 days for a saved search: its exact matches and its wider area. */
export function pulseStats(filters) {
  const { active, sold } = getMarket();
  const exact = search(filters);
  const area = active.filter(home => inArea(home, filters));
  const newExact = exact.filter(home => home.dom <= 7);
  const newArea = area.filter(home => home.dom <= 7);
  const drops = area.filter(home => home.drop && home.drop.daysAgo <= 7);
  const soldArea = sold.filter(home => inArea(home, filters));
  const week = soldArea.filter(home => home.soldDaysAgo <= 7);
  const prior = soldArea.filter(home => home.soldDaysAgo > 7 && home.soldDaysAgo <= 35);

  // Each sale against the estimate the comps would have given the day before it sold
  const versus = week
    .map(home => {
      const estimate = estimateFrom(findComps(home, { before: home.soldDaysAgo }).comps);
      return estimate ? { home, ratio: home.soldPrice / estimate.mid } : null;
    })
    .filter(Boolean);
  const overShare = homes => (homes.length ? homes.filter(home => home.soldPrice > home.listPrice).length / homes.length : null);
  const bestNew = [...newExact].sort((a, b) => (valuation(a).gap ?? 0) - (valuation(b).gap ?? 0))[0] || null;
  const biggestDrop = [...drops].sort((a, b) => b.drop.from - b.listPrice - (a.drop.from - a.listPrice))[0] || null;

  return {
    exactCount: exact.length,
    areaCount: area.length,
    newExact,
    newArea: newArea.length,
    drops,
    biggestDrop,
    bestNew,
    soldWeek: week.length,
    soldOverAsking: overShare(week),
    soldOverAskingPrior: overShare(prior),
    saleToList: median(week.map(home => home.soldPrice / home.listPrice)),
    saleToListPrior: median(prior.map(home => home.soldPrice / home.listPrice)),
    domWeek: median(week.map(home => home.dom)),
    domPrior: median(prior.map(home => home.dom)),
    soldVsEstimate: median(versus.map(item => item.ratio)),
    versusCount: versus.length,
  };
}

/** Words for the saved search: "3+ bed semi-detached homes in Brampton". */
export function describeSearch(filters) {
  const types = filters.types.length ? filters.types.map(type => TYPES[type].label.toLowerCase()).join(' or ') : '';
  const places = [...filters.hoods.map(id => hoodById(id)?.name), ...filters.cities].filter(Boolean);
  const beds = filters.bedsMin ? `${filters.bedsMin}+ bed ` : '';
  return `${beds}${types ? `${types} homes` : 'homes'}${places.length ? ` in ${places.join(', ')}` : ' across the sample market'}`;
}

// --- Payloads for the models (built in code, so the page and the API agree) ---------------------------

const pctText = ratio => `${(ratio * 100).toFixed(1)}%`;

/** What the LLM may quote when it explains a verdict: only these facts. */
export function fairFacts(home, value, verdict) {
  const { estimate } = value;
  return {
    home: `${home.address}, ${home.area}, ${home.city}`,
    home_details: `${home.beds} bed ${TYPES[home.type].label.toLowerCase()}, ${home.sqft} sq ft`,
    list_price: money(home.listPrice),
    estimate_low: money(estimate.low),
    estimate_mid: money(estimate.mid),
    estimate_high: money(estimate.high),
    list_vs_estimate_mid: `${pctText(Math.abs(value.gap))} ${value.gap < 0 ? 'below' : 'above'}`,
    list_price_position: value.rule === 'underpriced' ? 'below the estimate range' : value.rule === 'overpriced' ? 'above the estimate range' : 'inside the estimate range',
    verdict,
    days_on_market: home.dom,
    comparable_sales: value.comps.slice(0, 4).map(comp => ({
      address: comp.address,
      sold_price: money(comp.soldPrice),
      adjusted_to_this_home: money(comp.adjusted),
      sold: shortDate(comp.soldDate),
      size: `${comp.sqft} sq ft`,
      beds: comp.beds,
    })),
  };
}

/** The state the decision model reads for a listing: the list price against the comps. */
export function fairState(home, value, area) {
  const { estimate } = value;
  return {
    list_price: home.listPrice,
    comparable_sales_adjusted: value.comps.map(comp => comp.adjusted),
    estimate_mid: estimate.mid,
    list_price_vs_estimate_mid_percent: Math.round(value.gap * 1000) / 10,
    comparables_disagree_by_percent: Math.round(estimate.spread * 1000) / 10,
    days_on_market: home.dom,
    offers_held_for_a_set_date: Boolean(home.offerDate),
    area_share_sold_over_asking_percent: area.overAsking == null ? null : Math.round(area.overAsking * 100),
    area_median_sale_to_list_percent: area.saleToList == null ? null : Math.round(area.saleToList * 1000) / 10,
    area_median_days_on_market: area.dom,
  };
}

/** What the LLM may quote in the weekly pulse. */
export function pulseFacts(filters, stats) {
  const facts = {
    saved_search: describeSearch(filters),
    exact_matches_now: stats.exactCount,
    new_exact_matches_this_week: stats.newExact.length,
    new_listings_in_area_this_week: stats.newArea,
    price_drops_this_week: stats.drops.length,
    sold_this_week: stats.soldWeek,
  };
  if (stats.bestNew) {
    const value = valuation(stats.bestNew);
    facts.best_value_new_match = {
      address: stats.bestNew.address,
      list_price: money(stats.bestNew.listPrice),
      ...(value.estimate && { list_vs_estimate: `${pctText(Math.abs(value.gap))} ${value.gap < 0 ? 'below' : 'above'} the estimate` }),
    };
  }
  if (stats.biggestDrop) {
    facts.biggest_price_drop = {
      address: stats.biggestDrop.address,
      was: money(stats.biggestDrop.drop.from),
      now: money(stats.biggestDrop.listPrice),
      cut: money(stats.biggestDrop.drop.from - stats.biggestDrop.listPrice),
    };
  }
  if (stats.soldWeek) {
    facts.sold_over_asking_this_week = `${Math.round(stats.soldOverAsking * 100)}%`;
    if (stats.soldOverAskingPrior != null) facts.sold_over_asking_prior_4_weeks = `${Math.round(stats.soldOverAskingPrior * 100)}%`;
    facts.median_sale_to_list_this_week = pctText(stats.saleToList);
    facts.median_days_on_market_this_week = Math.round(stats.domWeek);
    if (stats.domPrior != null) facts.median_days_on_market_prior_4_weeks = Math.round(stats.domPrior);
    if (stats.soldVsEstimate != null) {
      const diff = stats.soldVsEstimate - 1;
      facts.median_sold_price_vs_estimate = `${pctText(Math.abs(diff))} ${diff >= 0 ? 'above' : 'below'} the estimate`;
    }
  }
  return facts;
}

// --- "Nothing invented" check -------------------------------------------------------------------------

const numbersIn = text =>
  (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || []).map(token => token.replace(/,/g, '').replace(/\.0+$/, ''));

/**
 * Every figure in a model's sentence must appear in the facts it was given. Returns
 * { total, traced, missing: [tokens] }. Single digits pass (counts like "3 comps").
 */
export function traceFigures(text, facts) {
  const allowed = new Set(numbersIn(JSON.stringify(facts)));
  const figures = numbersIn(text).filter(token => token.length > 1);
  const missing = figures.filter(token => !allowed.has(token));
  return { total: figures.length, traced: figures.length - missing.length, missing: [...new Set(missing)] };
}

/** The page's filters back in the shape validateFilters reads (for a round trip through an API). */
export function toRaw(filters = {}) {
  return {
    cities: filters.cities,
    areas: filters.hoods,
    types: filters.types,
    beds_min: filters.bedsMin,
    baths_min: filters.bathsMin,
    price_min: filters.priceMin,
    price_max: filters.priceMax,
    sqft_min: filters.sqftMin,
    go_max_km: filters.goMaxKm,
    quiet_street: filters.quiet === true,
    school_min: filters.schoolMin,
    parking_min: filters.parkingMin,
  };
}

export { STREET_LABEL };

/** Recently sold homes in the search's area and type: the backdrop for the price / size chart. */
export function soldContext(filters, limit = 220) {
  const pool = getMarket().sold.filter(home => home.soldDaysAgo <= 180 && inArea(home, filters));
  if (pool.length <= limit) return pool;
  const step = pool.length / limit;
  return Array.from({ length: limit }, (_, index) => pool[Math.floor(index * step)]);
}

/** For an empty result: how many homes each single removal would bring back, best first. */
export function relaxations(filters) {
  return chipsFor(filters)
    .map(chip => ({ chip, count: search(removeChip(filters, chip)).length }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}
