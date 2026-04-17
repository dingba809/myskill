# sing-box Troubleshooting

> 依据：sing-box 官方同站配置文档，抓取日期 2026-04-17。
>
> 用途：用于分析配置结构、对象引用、路由行为、DNS 结果和平台相关问题。需要运行时证据时，必须向用户索取日志和最小复现配置。

## Fast triage checklist
1. JSON 是否能被 sing-box 正常读取，并且对象层级符合官方结构？
2. `tag`、`detour`、`selector`、`route`、`rule_set` 的引用是否闭合？
3. DNS、route、outbound 的依赖链是否和用户预期一致？
4. 当前问题是否与平台相关对象（尤其是 TUN 或 experimental）有关？
5. 日志级别是否足够提供启动和匹配路径证据？

## Symptom: JSON is valid but sing-box still fails to start
- Check
  - 顶层对象是否放在官方允许的位置，例如 `log`、`dns`、`inbounds`、`outbounds`、`route`、`experimental`。
  - 某些对象是否缺少必填字段，例如协议出站常见的 `server`、`server_port`、`uuid`，或 selector/urltest 的 `outbounds`。
  - 是否使用了当前版本未支持或已变更的字段，官方页面是否带有 `Since` 或 `Changes in` 标记。
- Why it happens
  - JSON 合法只代表语法正确，不代表对象结构满足 sing-box 的配置约束。
  - 启动失败往往来自缺字段、字段放错层级、或版本不兼容，而不是 JSON 本身。
- What to change
  - 先缩成最小配置，只保留一个 inbound、一个 outbound、一个 route.final。
  - 对照官方对象结构逐层检查必填字段。
  - 如果字段带版本变更标记，先按用户实际版本删减到保守写法。

## Symptom: tag / detour / selector / route references do not line up
- Check
  - `route.final` 指向的 outbound tag 是否真实存在。
  - `selector.outbounds` 或 `urltest.outbounds` 中列出的 tag 是否全部存在。
  - `rule_set` 在 root `route.rule_set` 中是否声明过，并且 route rule 或 DNS rule 中引用的是同一个 tag。
  - 用户提到的 `detour` 是否指向了可用的目标对象。
- Why it happens
  - sing-box 配置高度依赖 tag 引用；很多“配置没报错但行为不对”的问题本质上是引用链断裂。
  - Selector、URLTest、rule-set 这类对象本身不生效，除非别的对象正确引用它们。
- What to change
  - 先列一张 tag 清单：inbound tags、outbound tags、DNS server tags、rule-set tags。
  - 把所有引用项逐个和清单对照。
  - 临时移除 selector/urltest/detour，只保留直接指向单一 outbound 的配置，验证基本链路后再加回去。

## Symptom: route behavior is not taking effect
- Check
  - `route.rules` 是否存在，且实际匹配条件是否覆盖用户要测试的流量。
  - `route.final` 是否把流量兜底到一个用户没预期到的 outbound。
  - 是否引入了 `rule_set`，但 route rules 并没有真正引用对应 tag。
  - `auto_detect_interface`、`default_interface`、`default_domain_resolver` 等默认行为是否改变了路径。
- Why it happens
  - route 行为错误通常不是“route 没工作”，而是规则没命中、命中顺序不对，或最终兜底目标与预期不同。
  - 如果 DNS 解析路径已经不同，route 看到的结果也会和用户想象不一样。
- What to change
  - 先保留一条最简单的 route rule 和一个明确的 `final`。
  - 去掉不必要的 rule-set 和网络策略字段，确认基本命中后再逐项恢复。
  - 结合日志验证到底是哪条 rule 命中，以及最终走了哪个 outbound tag。

## Symptom: DNS results are not as expected
- Check
  - `dns.final` 指向的 DNS server tag 是否真实存在。
  - `dns.rules` 是否在把查询导向别的 server 或 action。
  - 是否启用了 `disable_cache`、`independent_cache`、`fakeip`、`client_subnet` 等会改变表现的字段。
  - route 是否又通过 `default_domain_resolver` 或其他字段影响了解析路径。
- Why it happens
  - DNS 在 sing-box 里是单独的对象体系，很多用户会把 DNS rule 和 route rule 混为一谈。
  - 用户看到的“解析结果不对”可能其实是 DNS server 选择、缓存、或 fake IP 行为导致的。
- What to change
  - 先只保留一个 DNS server，并让 `dns.final` 明确指向它。
  - 暂时去掉 DNS rules、fake IP、复杂缓存策略，先验证基础解析路径。
  - 再逐项恢复 DNS rules，并确认每条规则到底引用哪个 server tag。

## Symptom: TUN or platform-dependent behavior is failing
- Check
  - 是否真的在受支持的平台上使用了对应字段，例如 TUN、system proxy 或 experimental 下的 API / cache_file。
  - TUN 是否缺少必要的系统权限、路由条件或平台相关字段。
  - 是否把平台相关功能和普通 SOCKS/HTTP 代理行为混在一起，导致排查困难。
- Why it happens
  - TUN 和平台相关对象不是纯配置问题，常常还依赖系统权限、网络栈和版本能力。
  - 用户容易把“平台能力不满足”误判为“sing-box 配置错了”。
- What to change
  - 先退回到本地 SOCKS/HTTP inbound + direct outbound 的最小配置，证明基础路径可用。
  - 再单独加回 TUN 或 experimental 对象，一次只恢复一个平台相关能力。
  - 对照官方页面的 `Since` / `Changes in` 标记确认字段是否真能在当前版本上工作。

## Evidence to ask from the user
- 完整或最小化后的 sing-box 配置片段。
- 实际 sing-box 版本。
- 所在平台（Linux / Windows / macOS / Android / iOS / OpenWrt 等）。
- 一段启动日志或复现场景对应的 debug 日志。
- 一个明确的测试对象：域名、目标地址、期望 outbound、实际 outbound。
- 如果用了 selector、urltest、rule-set、TUN、experimental，要求用户把相关对象一并贴出。
