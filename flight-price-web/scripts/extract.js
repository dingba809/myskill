(() => {
  const clean = value => String(value ?? "").replace(/\s+/g, " ").trim();
  const text = (node, selector) => clean(node.querySelector(selector)?.textContent);
  const visible = node => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
  const url = new URL(location.href);
  const platform = url.hostname === "flights.ctrip.com" ? "ctrip"
    : url.hostname === "sjipiao.fliggy.com" ? "fliggy" : null;
  if (!platform) return { status: "unsupported_page", sourceUrl: url.href, flights: [] };

  const ctrip = platform === "ctrip";
  const cards = [...document.querySelectorAll(ctrip
    ? '[data-testid^="flight-item-"]'
    : 'tr.flight-item-tr')].filter(visible);
  const body = clean(document.body.innerText);
  const query = ctrip ? {
    route: url.pathname.match(/\/oneway-([a-z0-9]+)-([a-z0-9]+)\/?$/i)?.slice(1).map(x => x.toUpperCase()) ?? null,
    departureDate: url.searchParams.get("depdate"),
    cabin: url.searchParams.get("cabin"),
    adults: url.searchParams.get("adult"),
  } : {
    route: [url.searchParams.get("depCity"), url.searchParams.get("arrCity")],
    departureDate: url.searchParams.get("depDate"),
    cabin: null,
    adults: null,
  };
  const pageContext = ctrip ? {
    title: document.title,
    cities: [...document.querySelectorAll('input[aria-label="可输入城市或机场"]')].map(e => e.value),
    dates: [...document.querySelectorAll('input[aria-label="请选择日期"]')].map(e => e.value),
  } : {
    title: document.title,
    cities: [...document.querySelectorAll('input[name="depCityName"], input[name="arrCityName"]')].map(e => e.value),
    dates: [...document.querySelectorAll('input[name="depDate"]')].map(e => e.value),
  };
  const collectedAt = new Date().toISOString();
  const warnings = [];
  const flights = [];
  let skippedCards = 0;
  let unsupportedItineraries = 0;
  for (const card of cards) {
    const rawText = clean(card.innerText);
    // shortcut: 仅提取直飞卡片；经停/中转需单独的多航段映射后再支持。
    if (/中转|经停|联程|转机|转\d+次/.test(rawText)) { unsupportedItineraries++; continue; }
    const airlineText = text(card, ctrip ? ".airline-name" : '[aria-label^="航班号"]');
    const flightText = ctrip ? text(card, ".plane-No") : airlineText;
    const flightNumbers = flightText.match(/\b[A-Z0-9]{2}\s?\d{3,4}\b/g) ?? [];
    const departureTime = text(card, ctrip ? ".depart-box .time" : '[aria-label^="起飞时间"]');
    const arrivalTime = text(card, ctrip ? ".arrive-box .time" : '[aria-label^="到达时间"]');
    const departureAirport = text(card, ctrip ? ".depart-box .airport" : '[aria-label="出发机场"]');
    const arrivalAirport = text(card, ctrip ? ".arrive-box .airport" : '[aria-label="到达机场"]');
    // 只读票价节点，不能从整张卡片取最小数字：其中可能有优惠券、折扣或时刻。
    const priceNode = card.querySelector(ctrip ? ".flight-price span.price" : '[aria-label^="票价"]');
    const priceText = clean(priceNode?.textContent);
    const price = /^(?:[¥￥]\s*)?(\d+(?:,\d{3})*(?:\.\d{1,2})?)$/.exec(priceText);
    if (flightNumbers.length !== 1 || !/^\d{2}:\d{2}/.test(departureTime)
      || !/^\d{2}:\d{2}/.test(arrivalTime) || !departureAirport || !arrivalAirport || !price || Number(price[1].replace(/,/g, "")) <= 0) {
      skippedCards++; continue;
    }
    const dayMatch = /第(\d+)天/.exec(rawText);
    const plusDay = /\+(\d+)天/.exec(text(card, ".arrive-box .day"));
    const arrivalDayOffset = dayMatch ? Number(dayMatch[1]) - 1 : plusDay ? Number(plusDay[1])
      : arrivalTime.slice(0, 5) >= departureTime.slice(0, 5) ? 0 : null;
    flights.push({
      platform,
      flightNumber: flightNumbers[0].replace(/\s/g, ""),
      airline: ctrip ? airlineText : clean(airlineText.replace(flightNumbers[0], "")),
      departureDate: query.departureDate,
      departureTime,
      arrivalTime,
      arrivalDayOffset,
      departureAirport,
      arrivalAirport,
      cabinText: ctrip ? text(card, ".sub-price-detail") || null : null,
      price: Number(price[1].replace(/,/g, "")),
      currency: "CNY",
      priceBasis: ctrip && /起/.test(text(card, ".flight-price")) ? "from_price" : "displayed_fare_tax_unknown",
      taxIncluded: null,
      codeshare: /共享/.test(rawText) || !!card.querySelector('[data-testid="share-flight-tip"]'),
      sourceUrl: url.href,
      collectedAt,
      rawText,
    });
  }
  if (skippedCards) warnings.push(`${skippedCards} 张卡片字段不完整或含多个航班号，未纳入价格列表`);
  if (unsupportedItineraries) warnings.push(`${unsupportedItineraries} 张经停/中转卡片未提取`);
  warnings.push("仅覆盖当前已加载的可见卡片，不代表完整航班列表；未确认税费、行李与退改条件");
  let status = flights.length ? "ok" : cards.length && unsupportedItineraries === cards.length
    ? "no_direct_results" : cards.length ? "parse_error" : "not_ready_or_page_changed";
  // 只有页面确实阻断查询时才判鉴权，页头的普通“登录”链接不是登录墙。
  if (!flights.length && /滑动验证|拖动滑块|安全验证|访问过于频繁|验证码验证/.test(body)) status = "blocked";
  else if (!flights.length && /请先登录|登录后查看|登录后查询/.test(body)) status = "login_required";
  else if (!cards.length && /暂无航班|未查询到航班|没有符合.*航班|没有找到.*航班/.test(body)) status = "no_results";
  return { status, platform, query, pageContext, collectedAt, cardCount: cards.length, skippedCards,
    unsupportedItineraries, coverage: "loaded_visible_cards", warnings, flights };
})()
