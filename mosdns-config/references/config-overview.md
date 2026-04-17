# mosdns 配置总览

## 来源适用性判断

本技能基于 mosdns 官方 GitBook 文档整理，来源站点为 `https://irine-sistiana.gitbook.io/mosdns-wiki/`。

- 这是官方 wiki，而不是社区转载页。
- v5 和 v4 都有独立的“如何配置 mosdns”入口。
- 文档同时覆盖顶层配置结构、插件分类、匹配规则和示例，足以支撑解释、生成、修改和排错这四类配置任务。

## 先做版本识别

这是最重要的第一步。mosdns v5 和 v4 不是“字段略有差异”，而是配置组织方式本身不同。

### 快速识别信号

| 信号 | 更像 v5 | 更像 v4 |
| --- | --- | --- |
| 顶层结构 | `log` / `api` / `include` / `plugins` | `log` / `include` / `data_providers` / `plugins` / `servers` |
| 服务端监听 | 作为插件出现，如 `udp_server`、`tcp_server`、`http_server` | 放在顶层 `servers:` 里 |
| 主流程表达 | `sequence` 的 `args` 是规则列表，规则里有 `matches` 和 `exec` | `sequence` 的 `args.exec` 是流水线列表，可嵌 `if` / `load_balance` / `fallback` |
| 域名数据 | `domain_set` / `ip_set` 数据插件 | `data_providers` + `provider:xxx` |
| 匹配器 | v5 当前没有独立匹配器插件，主要用 sequence 内建匹配器 | v4 有 `query_matcher`、`response_matcher`、域名/IP 匹配器 |

## 两个版本的心智模型

### v5

- 顶层配置主要负责日志、API、`include` 和 `plugins`。
- 服务端、转发器、缓存、数据集都属于插件。
- `sequence` 是主编排器，规则形态接近“匹配条件 + 执行动作”的链式处理。
- 文档明确要求：`sequence` 引用的其他插件 tag 必须先定义。

### v4

- 顶层配置除了日志和 `include` 外，还有 `data_providers`、`plugins`、`servers`。
- `servers` 接收请求，`plugins` 处理请求，`data_providers` 提供外部数据。
- `sequence` 是流水线编排器，常与 `cache`、`fast_forward`、`query_matcher` 等插件组合。
- v4 文档把插件流水线解释为“多个插件串联处理请求上下文”。

## 建议的参考文件读取顺序

1. 版本未知：先读本文件，再读 `version-differences.md`
2. 明确是 v5：读 `v5-reference.md`
3. 明确是 v4：读 `v4-reference.md`
4. 需要直接产出配置：补读 `recipes.md`
5. 需要修错：补读 `troubleshooting.md`

## 常见任务映射

- “这个字段什么意思”：按版本读对应 reference 文件
- “给我一个最小可用配置”：读 `recipes.md`
- “把现有配置改成另一种写法”：先读 `version-differences.md`，确认是否是跨版本迁移
- “为什么不生效”：读 `troubleshooting.md`

