#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { loadStations, resolveStation } from './stations.mjs';
import { fetchTickets, parseTimeRange } from './query-core.mjs';
import {
  DEFAULT_HUBS,
  buildDirectItineraries,
  buildTransferItineraries,
  candidatesToMarkdown,
  dedupeItineraries,
  filterItineraries,
  itineraryToMarkdown,
  mergeHubLists,
  rankItineraries,
} from './transfer-core.mjs';

const { values, positionals } = parseArgs({
  options: {
    date: { type: 'string', short: 'd' },
    'arrive-before': { type: 'string' },
    depart: { type: 'string' },
    'max-transfer': { type: 'string', default: '180' },
    'min-transfer': { type: 'string', default: '25' },
    type: { type: 'string', short: 't', default: '' },
    available: { type: 'boolean', default: false },
    seat: { type: 'string' },
    'direct-only': { type: 'boolean', default: false },
    'allow-transfer': { type: 'boolean', default: true },
    hubs: { type: 'string' },
    'no-default-hubs': { type: 'boolean', default: false },
    'same-station-only': { type: 'boolean', default: true },
    view: { type: 'string', default: 'best' },
    limit: { type: 'string', default: '5' },
    format: { type: 'string', short: 'f', default: 'md' },
    json: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

const [fromName, toName] = positionals;
if (!fromName || !toName) {
  console.error(`Usage: transfer-query.mjs <from> <to> [options]

Options:
  -d, --date <YYYY-MM-DD>        Travel date (default: today)
  --arrive-before <HH:MM>        Latest arrival time
  --depart <HH:MM-HH:MM>         First leg departure range
  --min-transfer <minutes>       Minimum transfer minutes (default: 25)
  --max-transfer <minutes>       Maximum transfer minutes (default: 180)
  -t, --type <G|D|Z|T|K>         Filter train types
  --available                    Only show bookable itineraries
  --seat <types>                 Required seat types, e.g. ze or zy,ze
  --direct-only                  Only query direct trains
  --allow-transfer               Allow transfer (default: true)
  --hubs <站1,站2,...>            Extra transfer hubs
  --no-default-hubs              Disable built-in hubs
  --same-station-only            Require same-station transfer (default: true)
  --view <best|candidates|both>  Output view (default: best)
  --limit <N>                    Max best itineraries (default: 5)
  -f, --format <md|json>         Output format (default: md)
  --json                         Same as -f json`);
  process.exit(1);
}

const date = values.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
const stationData = await loadStations();
const fromStation = resolveStation(stationData, fromName);
const toStation = resolveStation(stationData, toName);
if (!fromStation) { console.error(`Station not found: ${fromName}`); process.exit(1); }
if (!toStation) { console.error(`Station not found: ${toName}`); process.exit(1); }

const baseQueryOptions = {
  date,
  type: values.type,
  available: values.available,
  seat: values.seat,
};

const directTickets = await fetchTickets(stationData, fromStation, toStation, {
  ...baseQueryOptions,
  arrive: values['arrive-before'] ? `-${values['arrive-before']}` : undefined,
  depart: values.depart,
});

let itineraries = buildDirectItineraries(directTickets);

if (!values['direct-only'] && values['allow-transfer']) {
  const extraHubs = values.hubs ? values.hubs.split(',').map(x => x.trim()).filter(Boolean) : [];
  const hubNames = mergeHubLists(DEFAULT_HUBS, extraHubs, !values['no-default-hubs'])
    .filter(name => ![fromStation.station_name, toStation.station_name].includes(name));

  for (const hubName of hubNames) {
    const hubStation = resolveStation(stationData, hubName);
    if (!hubStation) continue;
    const [firstLegs, secondLegs] = await Promise.all([
      fetchTickets(stationData, fromStation, hubStation, { ...baseQueryOptions, depart: values.depart }),
      fetchTickets(stationData, hubStation, toStation, {
        ...baseQueryOptions,
        arrive: values['arrive-before'] ? `-${values['arrive-before']}` : undefined,
      }),
    ]);

    itineraries.push(...buildTransferItineraries(firstLegs, secondLegs, {
      minTransferMinutes: Number(values['min-transfer']),
      maxTransferMinutes: Number(values['max-transfer']),
      sameStationOnly: values['same-station-only'],
      arriveBefore: values['arrive-before'],
      available: values.available,
      seat: values.seat,
    }));
  }
}

itineraries = dedupeItineraries(filterItineraries(itineraries, {
  arriveBefore: values['arrive-before'],
  departRange: parseTimeRange(values.depart),
  available: values.available,
  seat: values.seat,
}));

const ranked = rankItineraries(itineraries, { seat: values.seat });
const limit = Number(values.limit) || 5;
const best = ranked.slice(0, limit);

if (values.json || values.format === 'json') {
  console.log(JSON.stringify({
    query: {
      from: fromStation.station_name,
      to: toStation.station_name,
      date,
      arriveBefore: values['arrive-before'] || null,
      depart: values.depart || null,
    },
    best,
    candidates: values.view === 'best' ? [] : ranked,
  }, null, 2));
  process.exit(0);
}

const lines = [];
const qualifyingDirect = ranked.filter(x => x.kind === 'direct');
lines.push(`## ${fromStation.station_name} → ${toStation.station_name} | ${date}`);
lines.push(qualifyingDirect.length ? `结论：有 ${qualifyingDirect.length} 个符合条件的直达方案。` : '结论：没有查到符合条件的直达车。');

if (values.view === 'best' || values.view === 'both') {
  lines.push('');
  if (best.length === 0) {
    lines.push('没有找到符合条件的直达/一次中转方案。');
  } else {
    for (const [idx, it] of best.entries()) {
      lines.push(itineraryToMarkdown(it, idx + 1));
      lines.push('');
    }
  }
}

if (values.view === 'candidates' || values.view === 'both') {
  lines.push('### 原始候选');
  lines.push(ranked.length ? candidatesToMarkdown(ranked) : '没有候选方案');
}

console.log(lines.join('\n').trim());
