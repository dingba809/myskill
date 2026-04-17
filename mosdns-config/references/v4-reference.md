# mosdns v4 配置参考

## 顶层配置

官方 v4 配置页给出的基础结构包含：

- `log`
- `include`
- `data_providers`
- `plugins`
- `servers`
- `api`

其中：

- `include` 会比主配置中的设置先初始化
- `data_providers` 负责文件数据源
- `servers` 负责监听和把请求交给插件链

## `servers`

官方页面中 `servers` 每项常见字段包括：

- `exec`: 本服务器运行的插件 tag
- `timeout`: 请求处理超时时间，默认 5 秒
- `listener` / `listeners`: 监听器数组

监听器常见字段：

- `protocol`: 支持 `udp`、`tcp`、`tls`、`https`、`http`
- `addr`
- `cert`
- `key`
- `url_path`
- `get_user_ip_from_header` `(v4.3+)`
- `proxy_protocol` `(v4.3+)`
- `idle_timeout`

注意：

- v4 配置页的结构说明写的是 `listener`，示例写的是 `listeners`。这是官方页面中的文档呈现差异。
- 编辑现有配置时，优先沿用用户当前配置和其对应版本的已验证写法。

## `data_providers`

官方页面示例包含：

- `tag`
- `file`
- `auto_reload`

常见用途是配合 `provider:<tag>` 供域名/IP 匹配器读取。

## v4 的插件流水线模型

官方把 v4 配置解释为“插件接收并返回请求上下文”，多个插件串起来就是流水线。

### `sequence`

常见结构：

```yaml
tag: ""
type: "sequence"
args:
  exec:
    - "cache"
    - if: "matcher && ! matcher"
      exec:
        - "ecs"
        - "forward"
      else_exec:
        - "ecs"
        - "forward"
```

特征：

- `args.exec` 是流水线数组
- 可以直接写插件 tag
- 可以写 `if`
- 可以写 `load_balance`
- 可以写 `fallback`

条件表达式支持：

- `&&`
- `||`
- `()`
- `!`

预定义插件 tag 以 `_` 开头，文档说明需要用 `[]` 括住。

## 常见可执行插件

官方插件页列出的主要插件包括：

- `cache`
- `hosts`
- `_prefer_ipv4` / `_prefer_ipv6`
- `ecs`
- `_no_ecs`
- `ttl`
- `blackhole`
- `fast_forward`
- `forward`
- `ipset`
- `nftset`
- `bufsize`
- `padding`
- `redirect` `(实验性)`
- `arbitrary` `(实验性, v4.0+)`
- `_misc_optm` `(实验性, v4.0+)`
- `reverse_lookup` `(实验性, v4.2+)`
- `metrics_collector` `(实验性, v4.2+)`
- `client_limiter` `(实验性, v4.2+)`
- `edns0_filter` `(实验性, v4.4.1+)`
- `_query_summary` `(v4.5.3+)`
- `sleep`

## `fast_forward`

### 作用

- 转发请求至上游，是文档中最常见的基础转发插件

### 常见字段

- `upstream`: 上游列表，至少一个

上游项常见字段：

- `addr`
- `dial_addr`
- `bootstrap`
- `socks5`
- `trusted`
- `idle_timeout`
- `enable_pipeline`
- `enable_http3`
- `max_conns`
- `insecure_skip_verify`
- `so_mark`
- `bind_to_device`

地址格式示例覆盖：

- UDP
- TCP
- DoT
- DoH
- `udpme` `(v3.5.1+, 实验性)`

## 匹配器插件

### `query_matcher`

官方页面给出的常见字段：

- `qtype`
- `qclass`
- `domain`
- `client_ip`
- `ecs`

预初始化可直接使用的 tag 包括：

- `_qtype_AAAA`
- `_qtype_A_AAAA`
- `_query_edns0`

如果一个匹配器内设定多个条件，则必须全部满足才为 true。

### `response_matcher`

预初始化可直接使用的 tag 包括：

- `_response_valid_answer` `(v4.0.0+)`

## 域名和 IP 匹配

v4 文档把域名规则单独整理出来，规则形式包括：

- `domain:`
- `full:`
- `keyword:`
- `regexp:`

如果没有指定匹配方式，不同插件的默认值可能不同。

`query_matcher.domain` 常见写法既可以直接写规则，也可以写：

- `provider:<data_provider_tag>`

## v4 的排布习惯

v4 官方示例常见顺序是：

1. `data_providers`
2. 功能插件，如 `cache`、`fast_forward`
3. 匹配器插件
4. `sequence`
5. `servers`

这不是官方的强制语法规则，而是更稳定、可读的组织方式。

