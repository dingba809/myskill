import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Referer: 'https://kyfw.12306.cn/otn/leftTicket/init?linktypeid=dc',
};

const F = {
  trainNo: 2, trainCode: 3, fromCode: 6, toCode: 7,
  departTime: 8, arriveTime: 9, duration: 10, canBuy: 11, date: 13,
  gr: 21, rw: 23, rz: 24, tz: 25, wz: 26, yw: 28, yz: 29,
  ze: 30, zy: 31, swz: 32, dw: 33,
};

export function parseTime(s) {
  const [h, m] = String(s).split(':').map(Number);
  return h * 60 + m;
}

export function parseTimeRange(s) {
  if (!s) return null;
  const [lo, hi] = s.split('-');
  return { lo: lo ? parseTime(lo) : 0, hi: hi ? parseTime(hi) : 24 * 60 };
}

export function parseDurationLimit(s) {
  if (!s) return null;
  const match = s.match(/^(?:(\d+)h)?(?:(\d+)m)?$/i);
  if (!match) return null;
  return (parseInt(match[1] || 0) * 60) + parseInt(match[2] || 0);
}

export function formatDuration(raw) {
  const [h, m] = String(raw).split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return raw;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function durationMinutes(raw) {
  const [h, m] = String(raw).split(':').map(Number);
  return h * 60 + m;
}

export function hasSeat(val) {
  return val && val !== '--' && val !== '' && val !== '无';
}

export async function getCookie() {
  const res = await fetch('https://kyfw.12306.cn/otn/leftTicket/init?linktypeid=dc', {
    headers: HEADERS,
    redirect: 'manual',
  });
  const cookies = res.headers.getSetCookie?.() || [];
  return cookies.map(c => c.split(';')[0]).join('; ');
}

export async function queryTickets(from, to, travelDate) {
  const cookie = await getCookie();
  const params = new URLSearchParams({
    'leftTicketDTO.train_date': travelDate,
    'leftTicketDTO.from_station': from.station_code,
    'leftTicketDTO.to_station': to.station_code,
    purpose_codes: 'ADULT',
  });

  const res = await fetch(`https://kyfw.12306.cn/otn/leftTicket/query?${params}`, {
    headers: { ...HEADERS, Cookie: cookie },
  });

  const json = await res.json();
  if (!json.data?.result) throw new Error(`No data returned: ${JSON.stringify(json).slice(0, 500)}`);
  return json.data;
}

export function parseTicket(raw, stationMap) {
  const f = raw.split('|');
  const v = (key) => f[F[key]] || '--';

  return {
    trainNo: v('trainNo'), trainCode: v('trainCode'),
    fromStation: stationMap[v('fromCode')]?.station_name || v('fromCode'),
    toStation: stationMap[v('toCode')]?.station_name || v('toCode'),
    departTime: v('departTime'), arriveTime: v('arriveTime'),
    duration: v('duration'), canBuy: v('canBuy'), date: v('date'),
    swz: v('swz'), tz: v('tz'), zy: v('zy'), ze: v('ze'),
    gr: v('gr'), rw: v('rw'), dw: v('dw'),
    yw: v('yw'), rz: v('rz'), yz: v('yz'), wz: v('wz'),
  };
}

export function applyFilters(tickets, options = {}) {
  let result = [...tickets];
  const trainTypeFilter = (options.type || '').toUpperCase();

  if (trainTypeFilter) {
    const chars = [...trainTypeFilter];
    result = result.filter(t => chars.some(ch => t.trainCode.startsWith(ch)));
  }

  const departRange = parseTimeRange(options.depart);
  if (departRange) {
    result = result.filter(t => {
      const m = parseTime(t.departTime);
      return m >= departRange.lo && m <= departRange.hi;
    });
  }

  const arriveRange = parseTimeRange(options.arrive);
  if (arriveRange) {
    result = result.filter(t => {
      const m = parseTime(t.arriveTime);
      return m >= arriveRange.lo && m <= arriveRange.hi;
    });
  }

  const maxDur = parseDurationLimit(options.maxDuration || options['max-duration']);
  if (maxDur) result = result.filter(t => durationMinutes(t.duration) <= maxDur);
  if (options.available) result = result.filter(t => t.canBuy === 'Y');

  if (options.seat) {
    const seatTypes = String(options.seat).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    result = result.filter(t => seatTypes.every(s => hasSeat(t[s])));
  }

  return result;
}

export async function fetchTickets(stationData, fromStation, toStation, options = {}) {
  const data = await queryTickets(fromStation, toStation, options.date);
  const tickets = data.result.map(r => parseTicket(r, stationData.STATIONS));
  return applyFilters(tickets, options);
}

function seatCell(val) {
  if (!val || val === '--' || val === '') return '<td class="na">—</td>';
  if (val === '无') return '<td class="sold-out">无</td>';
  if (val === '有') return '<td class="available">有</td>';
  return `<td class="count">${val}</td>`;
}

export function buildFilterDesc(options = {}) {
  const parts = [];
  if (options.type) parts.push(`${String(options.type).toUpperCase()} 字头`);
  if (options.depart) parts.push(`出发 ${options.depart}`);
  if (options.arrive) parts.push(`到达 ${options.arrive}`);
  if (options.maxDuration || options['max-duration']) parts.push(`耗时 ≤ ${options.maxDuration || options['max-duration']}`);
  if (options.available) parts.push('仅可购');
  if (options.seat) parts.push(`有票: ${options.seat}`);
  return parts.join(' | ');
}

export function buildMarkdown(tickets, from, to, travelDate, filterDesc = '') {
  const lines = [];
  lines.push(`## ${from.station_name} → ${to.station_name} | ${travelDate} | ${tickets.length} 趟列车`);
  if (filterDesc) lines.push(`> ${filterDesc}`);
  lines.push('');

  if (tickets.length === 0) {
    lines.push('没有找到符合条件的列车');
    return lines.join('\n');
  }

  lines.push('| 车次 | 出发→到达 | 耗时 | 商务/特等 | 一等座 | 二等座 | 软卧/动卧 | 硬卧 | 硬座 | 无座 | 状态 |');
  lines.push('|------|-----------|------|-----------|--------|--------|-----------|------|------|------|------|');

  for (const t of tickets) {
    const swz = t.swz !== '--' ? t.swz : t.tz !== '--' ? t.tz : '--';
    const rw = t.rw !== '--' ? t.rw : t.dw !== '--' ? t.dw : '--';
    const buy = t.canBuy === 'Y' ? '✅' : '❌';
    lines.push(`| ${t.trainCode} | ${t.departTime}→${t.arriveTime} | ${formatDuration(t.duration)} | ${swz} | ${t.zy} | ${t.ze} | ${rw} | ${t.yw} | ${t.yz} | ${t.wz} | ${buy} |`);
  }
  return lines.join('\n');
}

export function buildHTML(tickets, from, to, travelDate, filterDesc = '') {
  const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const fn = e(from.station_name), tn = e(to.station_name);
  const rows = tickets.map(t => {
    const swz = t.swz !== '--' ? t.swz : t.tz !== '--' ? t.tz : '--';
    const rw = t.rw !== '--' ? t.rw : t.dw !== '--' ? t.dw : '--';
    const typeClass = t.trainCode[0]?.toLowerCase() || '';
    const buyClass = t.canBuy === 'Y' ? 'yes' : 'no';
    return `      <tr>
        <td class="train-code type-${typeClass}">${e(t.trainCode)}</td>
        <td class="time"><span class="depart">${e(t.departTime)}</span><span class="arrow">→</span><span class="arrive">${e(t.arriveTime)}</span></td>
        <td class="duration">${formatDuration(t.duration)}</td>
        ${seatCell(swz)}${seatCell(t.zy)}${seatCell(t.ze)}${seatCell(rw)}${seatCell(t.yw)}${seatCell(t.yz)}${seatCell(t.wz)}
        <td class="buy-${buyClass}">${t.canBuy === 'Y' ? '可购' : '售罄'}</td>
      </tr>`;
  }).join('\n');
  const filterTag = filterDesc ? `<div class="filters">${e(filterDesc)}</div>` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${fn} → ${tn} 列车时刻表</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,"SF Pro Text","Helvetica Neue",sans-serif;background:#f5f5f7;color:#1d1d1f}.container{max-width:1100px;margin:0 auto;padding:40px 20px}header{text-align:center;margin-bottom:32px}h1{font-size:28px;font-weight:600}.meta{margin-top:8px;color:#86868b;font-size:15px}.filters{margin-top:6px;color:#0071e3;font-size:13px}.table-wrap{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}.empty{padding:60px 20px;text-align:center;color:#86868b;font-size:15px}table{width:100%;border-collapse:collapse;font-size:14px}thead{background:#fafafa}th{padding:12px 10px;font-weight:500;color:#86868b;font-size:12px;border-bottom:1px solid #f0f0f0;white-space:nowrap}td{padding:11px 10px;border-bottom:1px solid #f5f5f5;text-align:center;white-space:nowrap}.train-code{font-weight:600;text-align:left;padding-left:16px}.type-g{color:#0071e3}.type-d{color:#34c759}.type-z{color:#af52de}.type-t{color:#ff9500}.type-k{color:#86868b}.na{color:#d2d2d7}.available{color:#34c759;font-weight:500}.sold-out{color:#ff3b30}.count{font-weight:600}.buy-yes{color:#34c759;font-weight:500}.buy-no{color:#ff3b30;font-weight:500}footer{text-align:center;margin-top:24px;color:#c0c0c0;font-size:12px}</style>
</head><body><div class="container"><header><h1>${fn}→${tn}</h1><div class="meta"><span>${e(travelDate)}</span><span>${tickets.length} 趟列车</span></div>${filterTag}</header><div class="table-wrap">${tickets.length === 0 ? '<div class="empty">没有找到符合条件的列车</div>' : `<table><thead><tr><th style="text-align:left;padding-left:16px">车次</th><th>时间</th><th>耗时</th><th>商务/特等</th><th>一等座</th><th>二等座</th><th>软卧/动卧</th><th>硬卧</th><th>硬座</th><th>无座</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table>`}</div><footer>数据来源 12306</footer></div></body></html>`;
}

export function writeHTMLFile(html, filename) {
  const outPath = join(__dirname, '..', 'data', filename);
  writeFileSync(outPath, html);
  return outPath;
}
