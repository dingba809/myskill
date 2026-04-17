# 配置排错要点

## 1. 最先排查版本混用

症状：

- v5 配置里出现顶层 `servers:`
- v4 配置里出现 `udp_server` / `tcp_server`
- v5 的 `sequence` 里写了 v4 风格 `if` / `else_exec`
- v4 里试图引用 `domain_set` / `ip_set`

处理：

- 先判定主版本，再按同一版本重写整段配置，不要只替换局部字段

## 2. v5 的 tag 顺序错误

官方 v5 文档明确写了：`sequence` 引用的所有已定义插件 tag 必须在 `sequence` 前定义。

症状：

- 初始化时报找不到插件
- `sequence` 中的 `$tag`、`goto`、`jump` 不生效

处理：

- 把被引用的 `domain_set`、`forward`、其他 `sequence` 等放到当前 `sequence` 前面

## 3. 上游写域名导致自解析死循环

官方 v5 `forward` 页明确提醒：

- 如果用系统方式解析上游域名，而 mosdns 本身又是系统 DNS，可能造成解析死循环

处理：

- 优先把上游写成 IP
- 上游必须写域名时，优先补 `dial_addr`
- 只在必要时用 `bootstrap`

## 4. 把实验性能力当成稳定接口

风险点：

- v5 `api.http`
- v5 `log.file`
- v5 `quic_server`
- v5 `enable_http3`
- v5 `fallback`
- v5 `rate_limiter`
- v5 `ecs_handler`
- v4 `redirect`
- v4 `arbitrary`
- v4 `_misc_optm`
- v4 `reverse_lookup`
- v4 `client_limiter`

处理：

- 生成配置时保留 `(实验性)` 说明
- 修改既有配置时不要无端升级到实验性写法

## 5. 缓存与跳转逻辑放置不当

### v5

官方示例常见顺序是：

1. 域名拦截
2. `cache`
3. `has_resp` 命中后 `accept`
4. `forward`

如果把 `accept` 或 `reject` 放得过早，后续规则不会执行。

### v4

官方示例常见顺序是：

1. `cache`
2. `if query_matcher ...`
3. `forward`

如果 `_return` 放错位置，会让后续转发链提前结束。

## 6. v4 文档存在 `listener` / `listeners` 呈现差异

症状：

- 用户按结构说明写了 `listener`
- 示例里却看到 `listeners`

处理：

- 这是官方页面中的文档差异，不要据此推断“两个字段都一定兼容”
- 以用户正在运行的版本和其现有配置为准
- 不确定时，维持已有写法，不做无必要字段名切换

## 7. v5 没有独立匹配器插件

官方页面明确说 v5 “暂时还没有独立的匹配器插件”。

症状：

- 想照搬 v4 的 `query_matcher`

处理：

- 改为在 `sequence` 中使用内建匹配器，如 `qname`、`qtype`、`client_ip`、`has_resp`
- 需要复用域名/IP 数据时，结合 `domain_set` / `ip_set`

## 8. 不是所有上游都支持 pipeline 或 HTTP/3

官方 v5 `forward` 页明确提醒：

- `enable_pipeline` 只应在确认服务器支持时启用
- `enable_http3` 只应在确认服务器支持时启用

处理：

- 默认关闭
- 只有用户明确要求并确认上游支持时才开启

