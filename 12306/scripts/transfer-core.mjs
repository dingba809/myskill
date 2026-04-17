import { durationMinutes, formatDuration, hasSeat, parseTime } from './query-core.mjs';

export const DEFAULT_HUBS = [
  '重庆西', '重庆北', '宜宾西', '自贡', '内江北', '隆昌北',
];

export function normalizeSeatRequirement(seat) {
  return !seat ? [] : String(seat).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function legHasSeats(leg, seats) {
  return seats.every(s => hasSeat(leg[s]));
}

function itineraryHasSeats(itinerary, seats) {
  return itinerary.legs.every(leg => legHasSeats(leg, seats));
}

export function toLegSummary(leg) {
  return {
    ...leg,
    durationMinutes: durationMinutes(leg.duration),
    bookable: leg.canBuy === 'Y',
  };
}

export function buildDirectItineraries(tickets) {
  return tickets.map(t => ({
    kind: 'direct',
    transferStation: null,
    transferMinutes: 0,
    totalDurationMinutes: durationMinutes(t.duration),
    finalArriveTime: t.arriveTime,
    departTime: t.departTime,
    legs: [toLegSummary(t)],
  }));
}

export function buildTransferItineraries(firstLegs, secondLegs, options = {}) {
  const minTransfer = options.minTransferMinutes ?? 25;
  const maxTransfer = options.maxTransferMinutes ?? 180;
  const sameStationOnly = options.sameStationOnly !== false;
  const arriveBefore = options.arriveBefore || null;
  const seats = normalizeSeatRequirement(options.seat);

  const itineraries = [];
  for (const first of firstLegs) {
    for (const second of secondLegs) {
      if (sameStationOnly && first.toStation !== second.fromStation) continue;
      const transferMinutes = parseTime(second.departTime) - parseTime(first.arriveTime);
      if (transferMinutes < minTransfer || transferMinutes > maxTransfer) continue;
      if (arriveBefore && parseTime(second.arriveTime) > parseTime(arriveBefore)) continue;
      if (options.available && (first.canBuy !== 'Y' || second.canBuy !== 'Y')) continue;
      if (seats.length && (!legHasSeats(first, seats) || !legHasSeats(second, seats))) continue;

      itineraries.push({
        kind: 'transfer',
        transferStation: first.toStation,
        transferMinutes,
        totalDurationMinutes: durationMinutes(first.duration) + transferMinutes + durationMinutes(second.duration),
        finalArriveTime: second.arriveTime,
        departTime: first.departTime,
        legs: [toLegSummary(first), toLegSummary(second)],
      });
    }
  }
  return itineraries;
}

export function filterItineraries(itineraries, options = {}) {
  const arriveBefore = options.arriveBefore || null;
  const departRange = options.departRange || null;
  const seats = normalizeSeatRequirement(options.seat);
  return itineraries.filter(it => {
    if (arriveBefore && parseTime(it.finalArriveTime) > parseTime(arriveBefore)) return false;
    if (departRange) {
      const depart = parseTime(it.departTime);
      if (depart < departRange.lo || depart > departRange.hi) return false;
    }
    if (options.available && it.legs.some(l => !l.bookable)) return false;
    if (seats.length && !itineraryHasSeats(it, seats)) return false;
    return true;
  });
}

function seatScore(itinerary, seats) {
  if (!seats.length) return itinerary.legs.every(l => l.bookable) ? 2 : 1;
  return itineraryHasSeats(itinerary, seats) ? 2 : 0;
}

export function rankItineraries(itineraries, options = {}) {
  const seats = normalizeSeatRequirement(options.seat);
  return [...itineraries].sort((a, b) => {
    if (a.totalDurationMinutes !== b.totalDurationMinutes) return a.totalDurationMinutes - b.totalDurationMinutes;
    if (parseTime(a.finalArriveTime) !== parseTime(b.finalArriveTime)) return parseTime(a.finalArriveTime) - parseTime(b.finalArriveTime);
    if (a.transferMinutes !== b.transferMinutes) return a.transferMinutes - b.transferMinutes;
    return seatScore(b, seats) - seatScore(a, seats);
  });
}

export function dedupeItineraries(itineraries) {
  const best = new Map();
  for (const it of itineraries) {
    const key = `${it.transferStation || '-'}|${it.legs.map(l => l.trainCode).join('+')}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, it);
      continue;
    }
    const better = rankItineraries([prev, it])[0];
    best.set(key, better);
  }
  return [...best.values()];
}

export function mergeHubLists(defaultHubs = DEFAULT_HUBS, extraHubs = [], useDefaultHubs = true) {
  const list = [
    ...(useDefaultHubs ? defaultHubs : []),
    ...extraHubs,
  ].map(s => String(s).trim()).filter(Boolean);
  return [...new Set(list)];
}

export function formatTransferMinutes(minutes) {
  return `${minutes} 分钟`;
}

export function itineraryToMarkdown(it, index = null) {
  const title = index ? `推荐方案 ${index}` : `${it.kind === 'direct' ? '直达' : '中转'}方案`;
  const start = it.legs[0].fromStation;
  const end = it.legs[it.legs.length - 1].toStation;
  const lines = [`${title}：${start} → ${end}`];
  const [first, second] = it.legs;
  lines.push(`- ${first.trainCode}：${first.departTime} → ${first.arriveTime}（${formatDuration(first.duration)}）`);
  if (second) {
    lines.push(`- 换乘：${it.transferStation}，${formatTransferMinutes(it.transferMinutes)}`);
    lines.push(`- ${second.trainCode}：${second.departTime} → ${second.arriveTime}（${formatDuration(second.duration)}）`);
  }
  lines.push(`- 总耗时：${Math.floor(it.totalDurationMinutes / 60)}小时${String(it.totalDurationMinutes % 60).padStart(2, '0')}分`);
  lines.push(`- 到达：${it.finalArriveTime}`);
  return lines.join('\n');
}

export function candidatesToMarkdown(itineraries) {
  const lines = [];
  for (const [idx, it] of itineraries.entries()) {
    const legs = it.legs.map(l => `${l.trainCode} ${l.fromStation} ${l.departTime}→${l.toStation} ${l.arriveTime}`).join(' | ');
    lines.push(`${idx + 1}. ${it.kind === 'direct' ? '直达' : '中转'} | ${legs} | 总耗时 ${it.totalDurationMinutes} 分钟 | 到达 ${it.finalArriveTime}`);
  }
  return lines.join('\n');
}
