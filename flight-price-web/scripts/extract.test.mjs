import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./extract.js", import.meta.url), "utf8");
function card(values, raw, hidden = false) {
  return {
    innerText: raw,
    getClientRects: () => hidden ? [] : [{}],
    querySelector: selector => values[selector] == null ? null : { textContent: values[selector] },
  };
}
function extract(cards, { fliggy = false, body = "", url } = {}) {
  const href = url ?? (fliggy
    ? "https://sjipiao.fliggy.com/flight_search_result.htm?tripType=0&depCity=BJS&arrCity=HGH&depDate=2026-11-18"
    : "https://flights.ctrip.com/online/list/oneway-bjs-hgh?depdate=2026-11-18&cabin=y&adult=1");
  return vm.runInNewContext(source, {
    URL, location: { href },
    getComputedStyle: () => ({ visibility: "visible" }),
    document: {
      title: "北京到杭州机票", body: { innerText: body },
      querySelectorAll: selector => /flight-item/.test(selector) ? cards : [],
    },
  });
}
const ctripValues = {
  ".airline-name": "南方航空", ".plane-No": "CZ8859",
  ".depart-box .time": "18:35", ".arrive-box .time": "20:40",
  ".depart-box .airport": "大兴国际机场", ".arrive-box .airport": "萧山国际机场T4",
  ".flight-price span.price": "380", ".flight-price": "¥380起",
  ".sub-price-detail": "经济舱1.6折",
};
const ctripCard = card(ctripValues, "CZ8859 已减¥40 接送机60元券 ¥380起");
let result = extract([ctripCard]);
assert.equal(result.status, "ok");
assert.equal(result.flights[0].price, 380, "不能取优惠券40/60元");
assert.equal(result.flights[0].priceBasis, "from_price");
assert.equal(result.flights[0].taxIncluded, null);
assert.equal(result.flights[0].arrivalDayOffset, 0);
assert.equal(result.query.departureDate, "2026-11-18");
assert.equal(result.query.route.join("-"), "BJS-HGH");

const fliggyValues = {
  '[aria-label^="航班号"]': "国航CA1732",
  '[aria-label^="起飞时间"]': "21:30", '[aria-label^="到达时间"]': "00:05",
  '[aria-label="出发机场"]': "首都国际机场T3", '[aria-label="到达机场"]': "萧山国际机场T4",
  '[aria-label^="票价"]': "558",
};
result = extract([card(fliggyValues, "国航CA1732 21:30 00:05 第2天 ¥558")], { fliggy: true });
assert.equal(result.flights[0].flightNumber, "CA1732");
assert.equal(result.flights[0].airline, "国航");
assert.equal(result.flights[0].arrivalDayOffset, 1);
assert.equal(result.flights[0].cabinText, null);
assert.equal(result.flights[0].priceBasis, "displayed_fare_tax_unknown");

result = extract([card(fliggyValues, "国航CA1732 21:30 00:05 ¥558")], { fliggy: true });
assert.equal(result.flights[0].arrivalDayOffset, null, "跨日未标明时不猜测日期");
result = extract([card({ ...ctripValues, ".plane-No": "" }, "缺航班号")]);
assert.equal(result.status, "parse_error");
assert.equal(result.skippedCards, 1);
result = extract([card({ ...ctripValues, ".flight-price span.price": "380起" }, "价格格式变化")]);
assert.equal(result.status, "parse_error", "不能宽松解析未知价格格式");
result = extract([card(ctripValues, "中转7小时15分 转1次")]);
assert.equal(result.unsupportedItineraries, 1);
assert.equal(result.flights.length, 0);
assert.equal(result.status, "no_direct_results");
result = extract([ctripCard, card({ ...ctripValues, ".plane-No": "PN6490" }, "华夏联程茅台 8h10m PN6490华夏航 G52684")]);
assert.equal(result.flights.length, 1, "联程不能混入直飞结果");
assert.equal(result.unsupportedItineraries, 1);
result = extract([ctripCard, card(ctripValues, "隐藏的重复卡片", true)]);
assert.equal(result.cardCount, 1);
assert.equal(extract([], { body: "滑动验证" }).status, "blocked");
assert.equal(extract([], { body: "请先登录" }).status, "login_required");
assert.equal(extract([], { body: "暂无航班" }).status, "no_results");
assert.equal(extract([], { body: "登录 搜索机票" }).status, "not_ready_or_page_changed", "普通登录链接不是登录墙");
assert.equal(extract([], { url: "https://example.com/" }).status, "unsupported_page");
console.log("通过：票价定位、两站字段、跨日、缺失字段、隐藏卡片、中转、鉴权与空结果检查");
