---
name: "12306"
description: Query China Railway 12306 for train schedules, remaining tickets, and station info. Use when user asks about train/高铁/火车 tickets, schedules, or availability within China.
metadata: {"openclaw":{"emoji":"🚄","requires":{"bins":["node"]}}}
---

# 12306 Train Query

Query train schedules and remaining tickets from China Railway 12306.

## Query Tickets

```bash
node {baseDir}/scripts/query.mjs <from> <to> [options]
```

- HTML mode (default): writes file, prints path to stdout
- Markdown mode (`-f md`): prints table to stdout

### Examples

```bash
# All trains from Beijing to Shanghai (defaults to today)
node {baseDir}/scripts/query.mjs 北京 上海

# Markdown table output (to stdout, good for chat)
node {baseDir}/scripts/query.mjs 北京 上海 -t G -f md

# Morning departures, 2h max, with second class available
node {baseDir}/scripts/query.mjs 上海 杭州 -t G --depart 06:00-12:00 --max-duration 1h --seat ze

# Only bookable trains arriving before 6pm
node {baseDir}/scripts/query.mjs 深圳 长沙 --available --arrive -18:00

# Custom output path
node {baseDir}/scripts/query.mjs 广州 武汉 -o /tmp/tickets.html

# JSON output (to stdout)
node {baseDir}/scripts/query.mjs 广州 武汉 --json
```

### Options

- `-d, --date <YYYY-MM-DD>`: Travel date (default: today)
- `-t, --type <G|D|Z|T|K>`: Filter train types (combinable, e.g. `GD`)
- `--depart <HH:MM-HH:MM>`: Depart time range (e.g. `08:00-12:00`, `18:00-`)
- `--arrive <HH:MM-HH:MM>`: Arrive time range (e.g. `-18:00`, `14:00-20:00`)
- `--max-duration <duration>`: Max travel time (e.g. `2h`, `90m`, `1h30m`)
- `--available`: Only show bookable trains
- `--seat <types>`: Only show trains with tickets for given seat types (comma-separated: `swz,zy,ze,rw,dw,yw,yz,wz`)
- `-f, --format <html|md>`: Output format — `html` (default, saves file) or `md` (markdown table to stdout)
- `-o, --output <path>`: Output file path, html mode only (default: `{baseDir}/data/<from>-<to>-<date>.html`)
- `--json`: Output raw JSON to stdout

### Output Columns

| Column | Meaning |
|--------|---------|
| 商务/特等 | Business class / Premium (swz) |
| 一等座 | First class (zy) |
| 二等座 | Second class (ze) |
| 软卧/动卧 | Soft sleeper / Bullet sleeper (rw/dw) |
| 硬卧 | Hard sleeper (yw) |
| 硬座 | Hard seat (yz) |
| 无座 | Standing (wz) |

Values: number = remaining seats, `有` = available (qty unknown), `—` = not applicable

## Station Lookup

```bash
node {baseDir}/scripts/stations.mjs 杭州
node {baseDir}/scripts/stations.mjs 香港西九龙
```

## Transfer Query

```bash
node {baseDir}/scripts/transfer-query.mjs <from> <to> [options]
```

- Default mode: prints best direct/one-transfer itineraries
- Supports mixed transfer hubs: built-in hubs + user-specified hubs
- Supports `best` / `candidates` / `both` views

### Examples

```bash
# Best itineraries arriving before noon
node {baseDir}/scripts/transfer-query.mjs 贵阳 泸州 -d 2026-04-18 --arrive-before 12:00

# Show best results plus raw candidates
node {baseDir}/scripts/transfer-query.mjs 贵阳 泸州 -d 2026-04-18 --arrive-before 12:00 --view both

# Add custom hub(s) on top of default hubs
node {baseDir}/scripts/transfer-query.mjs 贵阳 泸州 -d 2026-04-18 --arrive-before 12:00 --hubs 成都东

# Use only custom hubs
node {baseDir}/scripts/transfer-query.mjs 贵阳 泸州 -d 2026-04-18 --arrive-before 12:00 --no-default-hubs --hubs 重庆西,宜宾西

# JSON output
node {baseDir}/scripts/transfer-query.mjs 贵阳 泸州 -d 2026-04-18 --arrive-before 12:00 --view both --json
```

### Options

- `-d, --date <YYYY-MM-DD>`: Travel date (default: today)
- `--arrive-before <HH:MM>`: Latest allowed final arrival time
- `--depart <HH:MM-HH:MM>`: First-leg departure time range
- `--min-transfer <minutes>`: Minimum transfer time (default: `25`)
- `--max-transfer <minutes>`: Maximum transfer wait time (default: `180`)
- `-t, --type <G|D|Z|T|K>`: Filter train types
- `--available`: Only keep itineraries where all legs are bookable
- `--seat <types>`: Require specified seat types on all legs
- `--direct-only`: Only search direct trains
- `--hubs <站1,站2,...>`: Add custom transfer hubs
- `--no-default-hubs`: Disable built-in default hubs
- `--same-station-only`: Require same-station transfer (default behavior)
- `--view <best|candidates|both>`: Output best results, raw candidates, or both
- `--limit <N>`: Maximum number of recommended results (default: `5`)
- `-f, --format <md|json>` / `--json`: Output markdown or JSON

## Important Notes for AI Assistant

### ⚠️ Station Name Resolution Warning

**CRITICAL**: When querying by city name (e.g., "武汉", "上海", "深圳", "广州"), the API may return trains from/to ANY station in that city, not just the main station.

**Common Pitfalls:**
- **武汉** includes: 武汉站 (main), 汉口站 (Hankou), 武昌站 (Wuchang), 武汉东站
- **上海** includes: 上海虹桥 (Hongqiao), 上海站 (main), 上海南站, 上海松江站
- **深圳** includes: 深圳北站 (main), 深圳站 (Luohu), 福田站, 深圳东站
- **广州** includes: 广州南站 (main), 广州站, 广州东站, 广州北站

**Best Practice - Always verify exact stations:**
1. **First**, use `stations.mjs` to list all stations in the city:
   ```bash
   node {baseDir}/scripts/stations.mjs 武汉
   ```
2. **Then**, query with exact station names for accurate results:
   ```bash
   node {baseDir}/scripts/query.mjs 武汉 上海虹桥 -f md
   ```

### 🔄 Transfer/Connection Guidelines

When planning transfers (中转):
- **Use JSON output** (`--json`) to verify exact station names
- Ensure both segments use the **SAME station** (e.g., both use 武汉站, not 武汉→汉口)
- Recommended minimum transfer time: **20-30 minutes** for same station
- **Different stations** in same city require additional travel time (e.g., 武汉→汉口 = 30+ min by subway)

### 📋 Query Workflow Recommendation

**For accurate results, follow this workflow:**

1. **List stations** in departure city:
   ```bash
   node {baseDir}/scripts/stations.mjs 北京
   ```

2. **List stations** in arrival city:
   ```bash
   node {baseDir}/scripts/stations.mjs 上海
   ```

3. **Query with exact station names** (e.g., 北京南 → 上海虹桥):
   ```bash
   node {baseDir}/scripts/query.mjs 北京南 上海虹桥 -d 2026-03-05 -f md
   ```

4. **For transfers**: Always verify both segments use the same station by checking `fromStation` and `toStation` in JSON output.

### ⏰ Deadline-Oriented Query Playbook

When the user asks for queries like:
- “明天中午 12 点前到达”
- “直达优先，没有就看中转”
- “总耗时越短越好”

do not rely on only one city-to-city query. Use the workflow below.

#### 1. Resolve all stations first

Always check all stations in both cities:

```bash
node {baseDir}/scripts/stations.mjs 贵阳
node {baseDir}/scripts/stations.mjs 泸州
```

Why:
- city names may map to multiple stations
- city-level query results may hide better exact-station pairs
- transfer planning needs exact station names

#### 2. Check direct trains with the arrival deadline

Use a city-level direct scan first:

```bash
node {baseDir}/scripts/query.mjs 贵阳 泸州 -d 2026-04-18 --arrive=-12:00 -f md
```

Notes:
- for option values beginning with `-`, prefer `--arrive=-12:00`
- if direct trains exist, rank by:
  1. arrival before deadline
  2. shortest duration
  3. better ticket availability

#### 3. If direct results are poor or empty, expand to exact-station pairs

Explicitly query major station combinations:

```bash
node {baseDir}/scripts/query.mjs 贵阳北 泸州 -d 2026-04-18 --arrive=-12:00 -f md
node {baseDir}/scripts/query.mjs 贵阳北 泸州东 -d 2026-04-18 --arrive=-12:00 -f md
node {baseDir}/scripts/query.mjs 贵阳东 泸州 -d 2026-04-18 --arrive=-12:00 -f md
```

This helps avoid missing trains hidden by city-level station resolution.

#### 4. For transfer planning, search backward from the destination

If the user has a hard arrival cutoff, first find trains that can reach the destination before the deadline from likely transfer hubs:

```bash
node {baseDir}/scripts/query.mjs 重庆西 泸州 -d 2026-04-18 --arrive=-12:00 -f md
node {baseDir}/scripts/query.mjs 宜宾西 泸州 -d 2026-04-18 --arrive=-12:00 -f md
node {baseDir}/scripts/query.mjs 自贡 泸州 -d 2026-04-18 --arrive=-12:00 -f md
node {baseDir}/scripts/query.mjs 内江北 泸州 -d 2026-04-18 --arrive=-12:00 -f md
```

Recommended heuristic:
- first identify the **second leg** that arrives before the deadline
- then query the **first leg** from origin to that transfer station
- finally rank complete itineraries by total duration

For southwest routes, common fallback hubs often include:
- 重庆西 / 重庆北
- 宜宾西
- 自贡
- 内江北
- 隆昌北

Pick hubs based on geography and rail corridors; do not brute-force the full network unless necessary.

#### 5. Verify transfer station consistency with JSON

Before recommending a transfer, verify exact station names:

```bash
node {baseDir}/scripts/query.mjs 贵阳北 重庆西 -d 2026-04-18 --json
node {baseDir}/scripts/query.mjs 重庆西 泸州 -d 2026-04-18 --json
```

Check:
- first leg `toStation`
- second leg `fromStation`
- they must match unless cross-station transfer time is explicitly accounted for

Important:
- do not assume `重庆西` and `重庆北` are interchangeable
- do not assume `泸州` and `泸州东` are interchangeable for transfer validation

#### 6. Transfer-time rules

Default recommendation:
- same station: **at least 20–30 minutes**
- large station / luggage / unfamiliar route: **30–45 minutes**
- different stations in the same city: usually **not recommended** unless separately verified

If a plan has a very short transfer (for example 10–15 minutes), label it clearly as:
- “理论可换乘”
- “时间偏紧，不推荐作为首选”

#### 7. How to present results

When replying:
1. state whether a qualifying **direct** train exists
2. list the best **2–4 transfer options**
3. sort by:
   - shortest total travel time
   - then earlier arrival
   - then stronger ticket availability
4. explicitly mark risky short-transfer plans

Recommended summary format:

```text
结论：无符合条件的直达车。

推荐方案 1：贵阳北 → 重庆西 → 泸州
- G2680：08:55 → 10:59
- 换乘 23 分钟
- G5775：11:22 → 11:52
- 总耗时：2小时57分
- 到达：11:52
```

#### 8. Practical strategy summary

For “A 到 B，X 点前到达，直达/中转都可以” queries:
- first resolve stations
- then check direct trains
- then search destination-bound second legs before the deadline
- then fill in feasible first legs
- finally verify station names and transfer times with JSON

## Technical Notes

- Data comes directly from 12306 official API (no key needed)
- Station data is cached for 7 days in `{baseDir}/data/stations.json`
- Works for all train types: G (高铁), D (动车), Z (直达), T (特快), K (快速)
