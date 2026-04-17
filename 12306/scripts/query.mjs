#!/usr/bin/env node
// Query 12306 train tickets: schedule, remaining tickets, prices
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { loadStations, resolveStation } from './stations.mjs';
import {
  fetchTickets,
  buildFilterDesc,
  buildHTML,
  buildMarkdown,
  writeHTMLFile,
} from './query-core.mjs';

const { values, positionals } = parseArgs({
  options: {
    date: { type: 'string', short: 'd' },
    type: { type: 'string', short: 't', default: '' },
    depart: { type: 'string' },
    arrive: { type: 'string' },
    'max-duration': { type: 'string' },
    available: { type: 'boolean', default: false },
    seat: { type: 'string' },
    format: { type: 'string', short: 'f', default: 'html' },
    output: { type: 'string', short: 'o' },
    json: { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

const [fromName, toName] = positionals;
if (!fromName || !toName) {
  console.error(`Usage: query.mjs <from> <to> [options]

Options:
  -d, --date <YYYY-MM-DD>     Travel date (default: today)
  -t, --type <G|D|Z|T|K>      Filter train types (combinable, e.g. GD)
  --depart <HH:MM-HH:MM>      Depart time range (e.g. 08:00-12:00, 18:00-)
  --arrive <HH:MM-HH:MM>      Arrive time range (e.g. -18:00, 14:00-20:00)
  --max-duration <duration>   Max travel time (e.g. 2h, 90m, 1h30m)
  --available                 Only show bookable trains
  --seat <types>              Only show trains with tickets for given seats
  -f, --format <html|md>      Output format (default: html)
  -o, --output <path>         Output file path (html mode only)
  --json                      Output raw JSON`);
  process.exit(1);
}

const date = values.date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
const stationData = await loadStations();
const fromStation = resolveStation(stationData, fromName);
const toStation = resolveStation(stationData, toName);
if (!fromStation) { console.error(`Station not found: ${fromName}`); process.exit(1); }
if (!toStation) { console.error(`Station not found: ${toName}`); process.exit(1); }

console.error(`Querying: ${fromStation.station_name}(${fromStation.station_code}) → ${toStation.station_name}(${toStation.station_code}) on ${date}`);

const filtered = await fetchTickets(stationData, fromStation, toStation, { ...values, date });
const fmt = values.format?.toLowerCase() || 'html';
const filterDesc = buildFilterDesc(values);

if (values.json) {
  console.log(JSON.stringify(filtered, null, 2));
} else if (fmt === 'md') {
  console.log(buildMarkdown(filtered, fromStation, toStation, date, filterDesc));
} else {
  const html = buildHTML(filtered, fromStation, toStation, date, filterDesc);
  const outPath = values.output || writeHTMLFile(html, `${fromStation.station_name}-${toStation.station_name}-${date}.html`);
  if (values.output) writeFileSync(outPath, html);
  console.log(outPath);
}
