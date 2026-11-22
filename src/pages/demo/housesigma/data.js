// Sample market for the HouseSigma demo, generated in code from a fixed seed (same data on the
// server and in the browser, every time). Nothing here is a real listing: the cities, areas and
// GO stations are real places, the street names are invented, and every home, price and date
// comes from the price model below. Pure JS, no imports: safe for pages and API routes.

/** The day the sample market is frozen on. Every "days ago" counts back from here. */
export const TODAY = '2026-11-20';
const TODAY_MS = Date.parse(`${TODAY}T12:00:00Z`);
const DAY = 86_400_000;

export const TYPES = {
  detached: { label: 'Detached', short: 'Detached' },
  semi: { label: 'Semi-detached', short: 'Semi' },
  town: { label: 'Townhouse', short: 'Town' },
  condo: { label: 'Condo', short: 'Condo' },
};

// Detached reference price is for a 2,000 sq ft, 4-bed home at the area's index of 1.
// heat: share of sellers who list low and hold an offer night. trend: monthly price drift.
export const HOODS = [
  {
    id: 'bram-mp',
    city: 'Brampton',
    name: 'Mount Pleasant',
    station: 'Mount Pleasant GO',
    base: 1_135_000,
    condoPsf: 640,
    mix: { detached: 0.34, semi: 0.3, town: 0.28, condo: 0.08 },
    go: [0.3, 3.2],
    school: 7.2,
    heat: 0.38,
    trend: [-0.004, 0.005],
    weight: 1.5,
    streets: ['Fernwick Cres', 'Tallowbrook Crt', 'Quillmere Dr', 'Wrenfold Lane', 'Brindlemoor Rd', 'Osterley Gate Blvd', 'Marrowfield Cres', 'Pennywhistle Crt', 'Dunsmere Way', 'Larkhollow Dr', 'Sablewood Ave', 'Tinderbrook Pl', 'Calderwick Cres', 'Hobsfield Rd'],
  },
  {
    id: 'bram-dt',
    city: 'Brampton',
    name: 'Downtown Brampton',
    station: 'Brampton GO',
    base: 1_045_000,
    condoPsf: 665,
    mix: { detached: 0.3, semi: 0.3, town: 0.2, condo: 0.2 },
    go: [0.2, 2.6],
    school: 6.4,
    heat: 0.32,
    trend: [-0.005, 0.004],
    weight: 1.3,
    streets: ['Ambervale St', 'Corbel Mill Lane', 'Thistlewade Cres', 'Gantry Row', 'Hartsbourne Ave', 'Millrace Crt', 'Vesperton St', 'Kilnworth Rd', 'Juniper Wharf Dr', 'Old Foundry Pl', 'Nettlecombe Cres', 'Yarrowgate Ave'],
  },
  {
    id: 'miss-pc',
    city: 'Mississauga',
    name: 'Port Credit',
    station: 'Port Credit GO',
    base: 1_690_000,
    condoPsf: 905,
    mix: { detached: 0.32, semi: 0.16, town: 0.2, condo: 0.32 },
    go: [0.3, 2.4],
    school: 7.8,
    heat: 0.26,
    trend: [-0.003, 0.003],
    weight: 0.9,
    streets: ['Harbourlight Ave', 'Saltmarsh Crt', 'Pilotfish Lane', 'Breakwater Row', 'Oarsman Cres', 'Tidewick St', 'Lanternquay Rd', 'Gullsreach Dr', 'Driftwell Pl', 'Capstan Mews'],
  },
  {
    id: 'miss-em',
    city: 'Mississauga',
    name: 'Erin Mills',
    station: 'Erindale GO',
    base: 1_420_000,
    condoPsf: 720,
    mix: { detached: 0.38, semi: 0.24, town: 0.26, condo: 0.12 },
    go: [1.6, 5.2],
    school: 8.3,
    heat: 0.24,
    trend: [-0.004, 0.003],
    weight: 1,
    streets: ['Glenhollow Cres', 'Ravenscar Dr', 'Windlethorpe Crt', 'Sorrelbank Rd', 'Abbotsmoor Way', 'Culverhay Pl', 'Finchgrove Cres', 'Mossdale Gate', 'Thornapple Ave', 'Elderwick Trail', 'Kestrel Hollow Crt'],
  },
  {
    id: 'oak-br',
    city: 'Oakville',
    name: 'Bronte',
    station: 'Bronte GO',
    base: 1_760_000,
    condoPsf: 880,
    mix: { detached: 0.42, semi: 0.14, town: 0.26, condo: 0.18 },
    go: [0.9, 4.4],
    school: 8.6,
    heat: 0.2,
    trend: [-0.002, 0.002],
    weight: 0.9,
    streets: ['Sandpiper Reach', 'Coopersmill Crt', 'Lakewind Cres', 'Marlinspike Dr', 'Orchard Staith Rd', 'Bellwether Lane', 'Pebblecote Ave', 'Wharfinger Way', 'Hazelbourne Pl', 'Skerryvale Cres'],
  },
  {
    id: 'tor-ed',
    city: 'Toronto',
    name: 'East Danforth',
    station: 'Danforth GO',
    base: 1_510_000,
    condoPsf: 960,
    mix: { detached: 0.24, semi: 0.4, town: 0.12, condo: 0.24 },
    go: [0.2, 2.1],
    school: 7,
    heat: 0.42,
    trend: [-0.003, 0.005],
    weight: 1,
    streets: ['Copperbeech Ave', 'Linnetway Rd', 'Tramshed Lane', 'Wexcombe Ave', 'Ashlar Crt', 'Kettlewood Cres', 'Signalbox Row', 'Hollisfield Ave', 'Marchbank St', 'Quarrylight Pl'],
  },
];

export const hoodById = id => HOODS.find(hood => hood.id === id);
export const CITIES = [...new Set(HOODS.map(hood => hood.city))];

const TYPE_FACTOR = { detached: 1, semi: 0.83, town: 0.73 };
const SHAPES = {
  detached: { sqft: [1650, 3400], beds: [3, 4, 4, 4, 5], ref: 2000, refBeds: 4, lot: [32, 52] },
  semi: { sqft: [1300, 2150], beds: [3, 3, 3, 4], ref: 1650, refBeds: 3, lot: [20, 30] },
  town: { sqft: [1150, 1950], beds: [2, 3, 3, 3, 4], ref: 1500, refBeds: 3, lot: [16, 24] },
  condo: { sqft: [520, 1180], beds: [1, 1, 2, 2, 3], ref: 760, refBeds: 2, lot: null },
};

// What kind of street a suffix is. Quiet streets carry a small premium, busy ones a discount.
const STREET_KIND = {
  Cres: 'quiet',
  Crt: 'quiet',
  Pl: 'quiet',
  Lane: 'quiet',
  Mews: 'quiet',
  Way: 'quiet',
  Trail: 'quiet',
  Reach: 'quiet',
  Dr: 'through',
  St: 'through',
  Row: 'through',
  Gate: 'through',
  Rd: 'busy',
  Ave: 'busy',
  Blvd: 'busy',
};
export const STREET_LABEL = { quiet: 'Quiet street', through: 'Through street', busy: 'Busy road' };

// Where prices stood in earlier years against today (for a home's previous sale).
const PAST_INDEX = { 2012: 0.42, 2013: 0.45, 2014: 0.49, 2015: 0.54, 2016: 0.63, 2017: 0.72, 2018: 0.7, 2019: 0.74, 2020: 0.83, 2021: 0.98, 2022: 1.07, 2023: 1.01 };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (value, step) => Math.round(value / step) * step;
export const isoDaysAgo = days => new Date(TODAY_MS - days * DAY).toISOString().slice(0, 10);

/** Price level of an area `daysAgo` against today: a soft dip that turned about five months ago. */
function areaIndex(hood, daysAgo) {
  const months = daysAgo / 30.4;
  const [fall, rise] = hood.trend;
  const sinceTurn = Math.min(months, 5);
  const beforeTurn = Math.max(0, months - 5);
  // Walking back in time: undo the recent rise, then the earlier fall
  return (1 + rise) ** -sinceTurn * (1 + fall) ** -beforeTurn;
}

function build() {
  const rand = mulberry32(20261120);
  const between = (min, max) => min + (max - min) * rand();
  const pick = list => list[Math.floor(rand() * list.length)];
  const normal = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const weighted = entries => {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rand() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return value;
    }
    return entries[entries.length - 1][0];
  };

  // Streets: a kind from the suffix and one distance to the station for the whole street
  const streets = {};
  HOODS.forEach(hood => {
    streets[hood.id] = hood.streets.map(name => ({
      name,
      kind: STREET_KIND[name.split(' ').pop()] || 'through',
      goKm: Math.round(between(hood.go[0], hood.go[1]) * 10) / 10,
      school: Math.max(3, Math.min(10, Math.round((hood.school + normal() * 0.9) * 10) / 10)),
    }));
  });

  function home() {
    const hood = weighted(HOODS.map(item => [item, item.weight]));
    const type = weighted(Object.entries(hood.mix));
    const shape = SHAPES[type];
    const street = pick(streets[hood.id]);
    const beds = pick(shape.beds);
    const span = shape.sqft[1] - shape.sqft[0];
    // Bigger homes get more bedrooms: size follows the bed count with some spread
    const bedShare = (beds - shape.beds[0]) / Math.max(1, shape.beds[shape.beds.length - 1] - shape.beds[0]);
    const sqft = round(shape.sqft[0] + span * Math.min(1, Math.max(0, bedShare * 0.6 + rand() * 0.45)), 10);
    const baths = Math.max(1, Math.min(5, Math.round(beds * 0.7 + between(-0.4, 0.9))));
    const lot = shape.lot ? Math.round(between(shape.lot[0], shape.lot[1])) : null;
    const goKm = Math.max(0.2, Math.round((street.goKm + between(-0.15, 0.15)) * 10) / 10);
    const number = type === 'condo' ? round(between(20, 480), 2) : Math.round(between(3, 289));
    const unit = type === 'condo' ? `${Math.round(between(2, 28))}${String(Math.round(between(1, 14))).padStart(2, '0')}` : null;
    const built = Math.round(type === 'condo' ? between(2004, 2023) : between(1962, 2019));
    const parking = type === 'condo' ? (rand() < 0.75 ? 1 : 0) : type === 'detached' ? pick([2, 2, 4, 4, 6]) : pick([1, 2, 2, 3]);

    const core =
      type === 'condo'
        ? hood.condoPsf * shape.ref * (sqft / shape.ref) ** 0.86
        : hood.base * TYPE_FACTOR[type] * (sqft / shape.ref) ** 0.75;
    const worth =
      core *
      (1 + 0.03 * (beds - shape.refBeds)) *
      (1 + 0.018 * (baths - 3)) *
      (1 + 0.05 * Math.max(0, (1.5 - goKm) / 1.5)) *
      (1 + 0.012 * (street.school - 6)) *
      (street.kind === 'quiet' ? 1.02 : street.kind === 'busy' ? 0.96 : 1) *
      (lot ? 1 + 0.004 * (lot - (shape.lot[0] + shape.lot[1]) / 2) : 1) *
      Math.exp(normal() * 0.04);

    return {
      hood: hood.id,
      city: hood.city,
      area: hood.name,
      type,
      address: unit ? `${unit} - ${number} ${street.name}` : `${number} ${street.name}`,
      street: street.kind,
      beds,
      baths,
      sqft,
      lot,
      built,
      parking,
      goKm,
      station: hood.station,
      school: street.school,
      worth,
    };
  }

  // How a seller prices: under (offer night), at market, or over (sits, then drops)
  const strategy = hood => {
    const roll = rand();
    if (roll < hood.heat) return 'under';
    if (roll < hood.heat + 0.4) return 'market';
    return 'over';
  };

  const sold = [];
  for (let index = 0; index < 3200; index += 1) {
    const base = home();
    const hood = hoodById(base.hood);
    const plan = strategy(hood);
    const soldDaysAgo = Math.floor(between(1, 365));
    const level = base.worth * areaIndex(hood, soldDaysAgo);
    let listPrice;
    let soldPrice;
    let dom;
    if (plan === 'under') {
      listPrice = level * between(0.9, 0.96);
      soldPrice = level * between(0.985, 1.045);
      dom = Math.round(between(5, 10));
    } else if (plan === 'market') {
      listPrice = level * between(0.985, 1.02);
      soldPrice = level * between(0.97, 1.012);
      dom = Math.round(between(7, 32));
    } else {
      listPrice = level * between(1.035, 1.1);
      soldPrice = level * between(0.96, 1.005);
      dom = Math.round(between(24, 78));
    }
    const rest = { ...base };
    delete rest.worth; // the model's hidden value never leaves this file
    sold.push({
      id: `S-${20000 + index}`,
      ...rest,
      listPrice: round(listPrice, 1000) - 100,
      soldPrice: round(soldPrice, 500),
      soldDaysAgo,
      soldDate: isoDaysAgo(soldDaysAgo),
      dom,
    });
  }
  sold.sort((a, b) => a.soldDaysAgo - b.soldDaysAgo);

  const active = [];
  for (let index = 0; index < 580; index += 1) {
    const base = home();
    const hood = hoodById(base.hood);
    const plan = strategy(hood);
    let dom;
    let listPrice;
    let offerDate = null;
    let drop = null;
    const history = [];
    if (plan === 'under') {
      dom = Math.floor(between(0, 8));
      listPrice = base.worth * between(0.9, 0.955);
      offerDate = isoDaysAgo(dom - 8 + Math.floor(between(0, 2)));
    } else if (plan === 'market') {
      dom = Math.floor(between(0, 30));
      listPrice = base.worth * between(0.985, 1.02);
    } else {
      dom = Math.floor(between(4, 74));
      listPrice = base.worth * between(1.04, 1.12);
      if (dom > 16 && rand() < 0.6) {
        const was = listPrice;
        listPrice = base.worth * between(1.0, 1.06);
        const dropDaysAgo = Math.floor(between(0, Math.min(dom - 12, 21)));
        drop = { from: round(was, 1000) - 100, daysAgo: dropDaysAgo, date: isoDaysAgo(dropDaysAgo) };
      }
    }
    listPrice = round(listPrice, 1000) - 100;

    // The home's own record, oldest first: a previous sale, sometimes a failed listing this year
    if (rand() < 0.86) {
      const year = Math.max(base.built + 1, Math.round(between(2012, 2023)));
      if (PAST_INDEX[year]) {
        history.push({ date: `${year}-${String(Math.round(between(1, 12))).padStart(2, '0')}`, event: 'Sold', price: round(base.worth * PAST_INDEX[year] * between(0.95, 1.05), 1000) });
      }
    }
    if (plan !== 'under' && rand() < 0.14) {
      const ago = dom + Math.round(between(40, 150));
      history.push({ date: isoDaysAgo(ago).slice(0, 7), event: 'Listed, not sold', price: round(base.worth * between(1.08, 1.16), 1000) - 100 });
    }
    if (drop) history.push({ date: isoDaysAgo(dom), event: 'Listed', price: drop.from });
    history.push(
      drop
        ? { date: drop.date, event: 'Price reduced', price: listPrice }
        : { date: isoDaysAgo(dom), event: 'Listed', price: listPrice }
    );

    const rest = { ...base };
    delete rest.worth; // the model's hidden value never leaves this file
    active.push({
      id: `L-${1000 + index}`,
      ...rest,
      listPrice,
      dom,
      listedDate: isoDaysAgo(dom),
      offerDate,
      drop,
      history,
    });
  }
  active.sort((a, b) => a.dom - b.dom);

  return { active, sold };
}

let market = null;
/** { active: [...], sold: [...] }, built once per process / page load (a few milliseconds). */
export function getMarket() {
  if (!market) market = build();
  return market;
}
