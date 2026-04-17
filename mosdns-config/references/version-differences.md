# v5 与 v4 的关键差异

本文件是基于官方 v5/v4 配置页和插件页做的归纳，目的是避免生成配置时把两套语法混在一起。

## 1. 顶层结构不同

### v5

- 顶层主要是 `log`、`api`、`include`、`plugins`
- 服务器本身也是插件
- `include` 只说明用于载入 `plugins` 插件设置

### v4

- 顶层主要是 `log`、`include`、`data_providers`、`plugins`、`servers`
- 服务器在单独的 `servers` 顶层数组里
- `include` 会先于主配置初始化，并可包含 include、数据源、插件和服务器设置

## 2. 服务端配置位置不同

### v5

- 使用 `udp_server`、`tcp_server`、`quic_server`、`http_server` 等服务器插件
- 服务器插件通过 `args.entry` 指向可执行插件 tag

### v4

- 在 `servers:` 下配置 `exec`、超时和监听器
- 监听器声明 `protocol`、`addr`、证书、DoH 路径等

## 3. 主流程编排语法不同

### v5

- `sequence.args` 直接是规则数组
- 单条规则通常长这样：

```yaml
- matches:
    - qname $ad_domain
  exec: reject 3
```

- `matches` 是字符串列表，多个条件是 AND
- `exec` 是字符串，格式是“内建操作名或插件 tag + 参数”
- 支持 `accept`、`reject`、`jump`、`goto`、`return` 等跳转/终止动作

### v4

- `sequence.args.exec` 是执行流水线数组
- 可直接写插件 tag，也可写 `if`、`load_balance`、`fallback`
- 条件表达式支持 `&&`、`||`、`()` 和 `!`

## 4. 数据与匹配器模型不同

### v5

- 数据类主要是 `domain_set` 和 `ip_set`
- 域名匹配通常在 sequence 内通过 `qname` 等内建匹配器完成
- 官方页面明确说“暂时还没有独立的匹配器插件”

### v4

- 使用 `data_providers` 载入外部数据
- `query_matcher` / `response_matcher` 是独立插件
- 域名匹配可通过 `provider:<tag>` 引用数据源

## 5. 转发插件不同

### v5

- 用 `forward` 插件
- `args` 里是 `concurrent` 和 `upstreams`
- 单个上游支持 `addr`、`dial_addr`、`bootstrap`、`socks5`、`enable_pipeline`、`enable_http3` 等
- `sequence` 中还可以通过 `forward [upstream_tag] ...` 只选部分上游

### v4

- 常见是 `fast_forward`，也有 `forward`
- `fast_forward` 文档写明是“自带模块”
- `upstream` 为上游列表，可并发请求多个服务器

## 6. 版本门槛标注要保留

官方文档中有多个明确的版本门槛，例如：

- v5.3+: `tcp_server` / `http_server` 的 abstract domain socket 说明；`ecs_handler`；`forward.max_conns` 弃用说明
- v4.2+: `reverse_lookup`、`metrics_collector`、`client_limiter`
- v4.3+: `get_user_ip_from_header`、`proxy_protocol`
- v4.4.1+: `edns0_filter`
- v4.5.3+: `_query_summary`

生成配置时不能省略这些门槛。

## 7. 迁移时最容易犯的错

- 把 v4 的 `servers:` 直接放进 v5
- 把 v5 的 `udp_server` / `tcp_server` 当成 v4 插件使用
- 把 v4 的 `query_matcher` 思路原样搬到 v5
- 在 v5 的 `sequence` 里沿用 v4 的 `if` / `else_exec` 结构
- 忽略 v5 的插件初始化顺序要求

