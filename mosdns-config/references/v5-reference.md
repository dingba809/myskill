# mosdns v5 配置参考

## 顶层配置

官方 v5 配置页给出的基础结构包含：

- `log.level`
- `log.production`
- `log.file` `(实验性)`
- `api.http` `(实验性)`
- `include`
- `plugins`

注意事项：

- 文档明确说 `(实验性)` 的功能和设置项“不保证配置兼容性”。
- 文档明确说 mosdns 会按配置文件中的顺序初始化插件。
- `sequence` 引用到的 tag 必须先定义，否则初始化失败。

## v5 的插件大类

### 服务器插件

官方页面列出：

- `udp_server`
- `tcp_server`
- `quic_server` `(实验性)`
- `http_server`

共同点：

- 用来接收客户端请求，再转交给可执行插件
- 出错时服务器返回 `SERVFAIL`

常用字段：

- `entry`: 指向可执行插件 tag
- `listen`: 监听地址
- `cert` / `key`: TLS 所需证书
- `idle_timeout`: 连接空闲超时

版本注意：

- `(v5.3+)` `tcp_server` 和 `http_server` 说明了以 `@` 开头的监听地址可监听 Unix abstract domain socket

## 数据插件

### `domain_set`

- 用于载入域名表达式，供其他插件引用
- 可通过 `exps` 内联定义，也可通过 `files` 从文本文件载入
- 如果表达式不写前缀，默认是 `domain` 域匹配

### `ip_set`

- 用于载入 IP 或 CIDR，供其他插件引用
- 可通过 `ips` 内联定义，也可通过 `files` 从文本文件载入

## `sequence` 插件

### 基本形态

官方给出的结构是：

```yaml
tag: ""
type: "sequence"
args:
  - matches:
      - qname $ad_domain
      - "!qname $ad_domain"
    exec: reject 3
  - exec: $forward_google
```

关键规则：

- `args` 是规则数组
- `matches` 是字符串数组，多个条件为 AND
- `!` 前缀表示取反
- `exec` 是一个字符串，可调用内建操作或已定义插件 tag
- 官方示例里调用已定义插件 tag 的写法是 `$plugin_tag`

### 常见内建匹配器

官方页面明确列出的常见匹配器包括：

- `qname`: 匹配请求 QNAME
- `cname`: 匹配应答 CNAME
- `qclass`: 匹配请求 QCLASS
- `qtype`: 匹配请求 QTYPE
- `rcode`: 匹配应答 RCODE
- `resp_ip`: 匹配应答 A/AAAA 记录 IP
- `client_ip`: 匹配客户端 IP
- `ptr_ip`: 匹配 PTR 请求中的 IP
- `has_resp`: 是否已有应答
- `has_wanted_ans`: 是否已有与问题类型对应的 ANSWER

`qname` 支持三类输入：

- 域名表达式
- `$domain_set_tag`
- `&domain_list_file`

## 常见内建操作

官方页面列出的常用操作包括：

- `forward`
- `cache`
- `black_hole`
- `drop_resp`
- `ecs`
- `forward_edns0opt`
- `ipset`
- `nftset`
- `query_summary`
- `metrics_collector`
- `prefer_ipv4` / `prefer_ipv6`
- `ttl`
- `mark`
- `accept`
- `reject`
- `return`
- `goto`
- `jump`

其中：

- `accept` / `reject` / `return` / `goto` / `jump` 主要控制流程跳转
- `goto` / `jump` 适合在多个 sequence 之间拆分复杂逻辑

## `forward` 插件

### 功能

- 转发请求到上游，获取应答后放入请求上下文

### 主要字段

- `concurrent`: 每次请求随机挑选若干上游并发请求，默认 1，最多选 3 个
- `upstreams`: 上游列表，至少配置一个

单个上游常见字段：

- `tag`
- `addr`
- `dial_addr`
- `bootstrap`
- `bootstrap_version`
- `socks5`
- `idle_timeout`
- `enable_pipeline`
- `enable_http3`
- `max_conns`
- `insecure_skip_verify`
- `so_mark`
- `bind_to_device`

### 上游地址与连通性注意事项

- 文档建议优先使用 IP 而非域名作为服务器地址
- 如果上游必须写域名，可用 `dial_addr` 避免每次额外解析
- 用系统 DNS 去解析上游域名时，如果 mosdns 自己又是系统 DNS，可能造成解析死循环
- `enable_pipeline` 只应在确认上游支持时启用
- `enable_http3` 是实验性选项
- `(v5.3+)` `max_conns` 已弃用，最大连接数量交由插件自动控制

### sequence 中调用 `forward`

官方页面写明，在 sequence 中可以给 `forward` 传 `[upstream_tag] ...`，只让它转发到指定上游，而不是全部上游。

## 其他重要插件

### `hosts`

- 作用是“域名映射 IP”
- 文档特别提醒：它的文件格式和常见系统 `hosts` 文件不同
- 规则格式是“域名规则在前，IP 在后”
- 域名匹配方式省略时，默认 `full`

### `fallback` `(实验性)`

- `primary` 抛错、无应答，或在阈值内无响应时，执行 `secondary`
- `always_standby` 可让副链路始终待命
- 官方强调：绝大多数用户提高上游稳定性，只需在 `forward` 里并发多个上游，不需要 `fallback`

### `rate_limiter` `(非常实验性)`

- 是匹配器，不是传统意义上的可执行动作
- 超限时返回 false
- 文档明确说当前“不能抗恶意攻击”

## 域名匹配规则

v5 单独给了域名规则页，常见写法有：

- `domain:google.com`
- `full:google.com`
- `keyword:google.com`
- `regexp:.+\\.google\\.com$`

规则省略前缀时，默认值取决于具体插件，不应跨插件想当然。
