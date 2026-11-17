---
name: flight-price-web
description: 使用 OpenCLI 和用户 Chrome 浏览器，从携程、飞猪网页读取实时航班信息与机票展示价格，按相同航线日期汇总比较。用于查机票、抓取携程/飞猪航班、比较两站网页票价；无需 Playwright/Playwriter、API Key 或导出 Cookie。基础范围为国内单程成人机票；保留来源、价格口径、跨日标记和抓取时间。
compatibility: 需要 Node.js、OpenCLI、Chrome 与已连接的 OpenCLI 扩展。示例命令适用于 Bash；OpenCLI 2.0.3 已实测。
---

# 携程与飞猪网页机票查询

以 OpenCLI 浏览器为唯一抓取通道。优先使用本技能的搜索结果页直达与只读提取脚本，不安装额外浏览器框架，不逆向私有签名接口。

## 1. 确认查询条件

必须知道出发地、目的地、出发日期。只问缺少且无法从上下文确定的项目，不自行选定用户出行日期。

- 用系统当前日期将“明天”“下周五”换成 YYYY-MM-DD，在查询结果中说明绝对日期；拒绝已过去的日期和不合法的日历日期。
- 默认范围：国内、单程、1 成人、人民币、经济舱参考价。若用户指定乘客人数、机场或舱位，必须在两站页面核实并设成相同条件。
- 用户问往返时分别查询两方向，明确是两张单程票组合，不宣称获得往返联票价格。儿童/婴儿、国际、多程、经停/中转行程需要另外核实页面，不由本脚本推断。
- 城市代码与机场代码不能混用。北京 BJS、上海 SHA 作为城市查询；用户指定首都 PEK、大兴 PKX、虹桥 SHA 或浦东 PVG 时，先通过页面确认机场选择，再核查每条结果的机场。
- 常见城市代码：北京 BJS、上海 SHA、广州 CAN、深圳 SZX、杭州 HGH、成都 CTU、重庆 CKG、南京 NKG、武汉 WUH、西安 SIA。未确认的代码从本站搜索表单联想结果读取，不猜测。

## 2. 检查 OpenCLI

```bash
opencli --version
opencli doctor
opencli browser --help
```

`doctor` 必须返回 `ok: true`，且 `extensionConnected`、`connectivity.ok` 为真。桥接不通时按 doctor 提示处理，不当成网站无航班。

本机 OpenCLI 2.0.3 的正确写法是 **子命令后加 `--session 名称`**：

```bash
opencli browser state --session flight-ctrip
```

不要照搬某些旧技能文档中的 `opencli browser flight-ctrip state`。其他版本以实际 `--help` 为准。浏览器相关操作参考 `opencli-browser` 技能；可复用的已有站点命令先用 `opencli list -f json` 核查，不虚构 `opencli ctrip flights`。初次实现时 2.0.3 未提供这两站的航班适配器。

## 3. 打开搜索结果页

每个平台使用独立会话，不绑定或导航用户原有标签页。下列是已验证的**示例查询**，不是默认出行日期，实际运行时替换城市代码、日期与城市名称。URL 参数必须使用 URL/URLSearchParams 编码，不能把任意用户输入拼进 shell 命令。

携程城市代码在路径中小写；`cabin=y` 为经济舱：

```bash
opencli browser open 'https://flights.ctrip.com/online/list/oneway-bjs-hgh?depdate=2026-11-18&cabin=y&adult=1&child=0&infant=0' --session flight-ctrip
opencli browser state --session flight-ctrip
opencli browser wait selector '[data-testid^="flight-item-"]' --timeout 30000 --session flight-ctrip
```

飞猪代码为大写，`tripType=0` 是单程：

```bash
opencli browser open 'https://sjipiao.fliggy.com/flight_search_result.htm?tripType=0&depCity=BJS&arrCity=HGH&depDate=2026-11-18&depCityName=%E5%8C%97%E4%BA%AC&arrCityName=%E6%9D%AD%E5%B7%9E' --session flight-fliggy
opencli browser state --session flight-fliggy
opencli browser wait selector 'tr.flight-item-tr' --timeout 30000 --session flight-fliggy
```

`open` 成功只代表导航成功。卡片等待失败时继续检查 state 和脚本 `status`，区分加载未完成、需登录、验证拦截、真实无结果与页面改版。确认页面仍在加载时最多补一次 30 秒条件等待，不反复刷新。

结果页直达失败时，回到主页通过真实表单查询：

- 携程：`https://flights.ctrip.com/online/channel/domestic`
- 飞猪：`https://www.fliggy.com/`

先 `state`/`find` 获取当前 ref，再用 `type`/`click`/`keys`，操作后验证。切勿通过 `eval` 修改表单或触发提交。

已观察到的表单锚点仅供重新查找：

- 携程城市框 `input[aria-label="可输入城市或机场"]`，按出发/到达区分；日期 `input[aria-label="请选择日期"]`。
- 携程城市 Enter 确认后可能自动弹出另一个城市列表，遮住日期和搜索按钮。必须点击当前正确城市建议并重新观察，不强制点击穿透遮挡。
- 携程日期展开后会变成 readonly。用真实日历选日期，不删除 readonly 属性。
- 飞猪主页有 `[data-testid="flight-tab-domestic"]`、`#form_depCity`、`#form_arrCity`、`[data-testid="dep-date-input"]`、`[data-testid="search-flight-button"]`。
- 飞猪点击搜索会新开结果标签页；用 `tab list` 后选择本次新增的结果页，不能继续提取主页促销价。
- 若 native input 提示页面不可见，可用 `--window foreground` 打开并恢复相应窗口。不要绕过此错误伪造 DOM 点击；只读的结果页直达通常无需键鼠操作。

## 4. 只读提取

读取并使用同目录 `scripts/extract.js`，它是返回 JSON 的浏览器只读表达式，不是 Node 入口程序。将路径替换为本技能的绝对路径；Bash 示例：

```bash
opencli browser eval "$(cat /absolute/path/flight-price-web/scripts/extract.js)" --session flight-ctrip
opencli browser eval "$(cat /absolute/path/flight-price-web/scripts/extract.js)" --session flight-fliggy
```

如果结果很多，重定向到系统临时目录的 JSON 文件，再用 context-mode 或本地脚本只输出状态、数量与所需航班。不要把整页 HTML、完整网络包或几十条原文灌入上下文，也不要将账号/Cookie写入文件。跨平台执行时通过可靠的参数数组传递完整 JS，不把用户输入插入 shell。

OpenCLI 外层 `ok` 为真仍需检查 `data.status`：

| status | 处理 |
|---|---|
| ok | 核对 query、pageContext、页面航线/日期，再使用 flights |
| no_results | 页面明确显示无匹配航班；如实报告 |
| no_direct_results | 当前已加载卡片均为中转/经停/联程；报告未取得直飞结果，不推断整个航线无直飞 |
| blocked | 暂停该站点，告知用户在 Chrome 手动完成验证或等待恢复 |
| login_required | 暂停该站点，请用户在 Chrome 登录后重试，不索要密码或导出 Cookie |
| not_ready_or_page_changed | 检查加载/重定向，必要时再等待一次；仍无卡片则报告无法取得数据 |
| parse_error | 卡片存在但字段不完整；重新查看实际卡片，不能解释为“没航班” |
| unsupported_page | 导航到实际搜索结果页后再运行 |

脚本输出：平台、航班号、航司、出发日期、起降时间、到达跨日偏移、机场/航站楼、舱位原文、CNY价格、价格口径、税费状态、共享航班标记、来源 URL、抓取时间和卡片原文。

`arrivalDayOffset=1` 表示次日，`null` 表示未能确认；不得把凌晨到达自动当成出发当天。

只覆盖**已加载且未隐藏的直飞卡片**。`cardCount`、`skippedCards`、`unsupportedItineraries` 和 warnings 必须保留；缺少航班号等关键字段的卡片会跳过。不能称为“所有航班”或“全网最低价”。

用户要求完整列表时，先用真实滚动/分页逐步加载，每轮重新提取，按平台+日期+航班号+起降机场+时间去重；连续两轮无新增且页面已无更多入口才停止。虚拟列表需逐批合并，不能只取最后一次的 DOM。

## 5. 核对与比较

1. 页面 title、城市输入值和日期必须与用户条件一致。URL 中的参数只是请求意图，不能单独证明页面查询条件正确。页面条件缺失时重新读标题/表单/航线摘要；无法核对则不下比价结论。
2. `from_price` 是携程列表“起价”；`displayed_fare_tax_unknown` 是飞猪列表展示票价。`taxIncluded=null` 表示税费未确认，不能擅自标成含税总价。
3. 飞猪结果页列表并未证明乘客人数、舱位或票规相同；携程虽传了参数，仍需页面核对。缺少舱位/税费/行李/退改任一关键条件时，只能并列展示“页面参考价”，不计算可比价差，不说某平台购买一定便宜。
4. 若需准确购买价，通过页面查看对应舱位/供应商、乘客人数、税费、行李和退改条件。仅相同日期、航班、机场、时刻、舱位及价格口径才计算价差。不要点击提交订单、锁位、支付或购买。
5. 共享航班独立展示营销航班号；未确认实际承运人时，不将不同营销航班号合并成同一班次。
6. 不能把中转套餐价、优惠券金额、低价日历价或首页促销价当作某条直飞航班的实际票价。原文与提取值不一致时优先报告问题。携程“华夏联程”等卡片可能没有“中转”字样；“联程”“转机”同样必须排除。

建议输出表格列：平台、日期、航班、出发→到达机场、时刻（跨日标记）、展示价格、价格口径、链接。正文注明抓取时间（北京时间）、当前覆盖范围、跳过数量与需要核实的条件。若只成功一个平台，先返回已取得的数据，明确另一平台失败原因，不用其他来源冒充其网页价格。

## 验证记录

2026-11-17 在 OpenCLI 2.0.3、扩展 1.0.27 上实测国内单程北京→杭州、2026-11-18：两站结果页直达与本脚本均获得真实卡片，且页面城市、日期核对一致。携程 7 张已加载卡片提取 4 条，跳过 2 张缺字段卡片和 1 张中转卡片；飞猪 81 张卡片提取 80 条，跳过 1 张中转卡片。飞猪结果含共享航班，不等于 80 个独立承运班次。携程实测存在缺失可见航班号的卡片，会跳过并报告；经停/中转未做多航段解析。这是一次线路验证，不保证所有日期、城市、账号状态长期可用。

本地回归检查：`node scripts/extract.test.mjs`。新增解析规则时同步更新相关断言，再对网页抽样核对。站点改版时修最小的卡片提取规则，登录/验证码问题不修改解析器。
