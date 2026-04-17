# 常用配置配方

以下示例只使用官方页面中出现过的字段和插件，并明确区分 v5 / v4。

## v5 最小转发器

```yaml
log:
  level: info

plugins:
  - tag: forward_google
    type: forward
    args:
      upstreams:
        - addr: https://8.8.8.8/dns-query

  - type: udp_server
    args:
      entry: forward_google
      listen: 127.0.0.1:5533

  - type: tcp_server
    args:
      entry: forward_google
      listen: 127.0.0.1:5533
```

适用场景：

- 只需要把本地 UDP/TCP 请求转到单个 DoH 上游
- 不需要缓存、拦截或复杂路由

## v5 广告域名拦截 + 转发

```yaml
log:
  level: info

plugins:
  - tag: ad_domain
    type: domain_set
    args:
      files:
        - ./oisd_dbl_basic.txt

  - tag: forward_google
    type: forward
    args:
      upstreams:
        - addr: https://8.8.8.8/dns-query

  - tag: main
    type: sequence
    args:
      - matches:
          - qname $ad_domain
        exec: reject 3
      - exec: $forward_google

  - type: udp_server
    args:
      entry: main
      listen: 127.0.0.1:5533

  - type: tcp_server
    args:
      entry: main
      listen: 127.0.0.1:5533
```

关键点：

- `domain_set` 先定义，再在 `sequence` 中通过 `$ad_domain` 引用
- 拦截规则应放在转发前面

## v5 指定部分上游转发

```yaml
plugins:
  - tag: upstream_group
    type: forward
    args:
      upstreams:
        - tag: google
          addr: https://dns.google/dns-query
          dial_addr: 8.8.8.8
        - tag: cf
          addr: https://1.1.1.1/dns-query

  - tag: main
    type: sequence
    args:
      - exec: forward google
```

适用场景：

- 一个 `forward` 插件定义多个上游
- 某条规则只想命中其中一部分上游

## v4 最小转发器

```yaml
log:
  level: info
  file: ""

plugins:
  - tag: forward_google
    type: fast_forward
    args:
      upstream:
        - addr: https://8.8.8.8/dns-query

servers:
  - exec: forward_google
    listeners:
      - protocol: udp
        addr: 127.0.0.1:5533
      - protocol: tcp
        addr: 127.0.0.1:5533
```

## v4 基于 data_provider 的条件分流

```yaml
log:
  level: info

data_providers:
  - tag: cn_domain
    file: ./cn.txt

plugins:
  - tag: forward_cn
    type: fast_forward
    args:
      upstream:
        - addr: https://223.5.5.5/dns-query

  - tag: forward_global
    type: fast_forward
    args:
      upstream:
        - addr: https://8.8.8.8/dns-query

  - tag: query_is_cn_domain
    type: query_matcher
    args:
      domain:
        - "provider:cn_domain"

  - tag: my_sequence
    type: sequence
    args:
      exec:
        - if: query_is_cn_domain
          exec:
            - forward_cn
          else_exec:
            - forward_global

servers:
  - exec: my_sequence
    listeners:
      - protocol: udp
        addr: 127.0.0.1:5533
      - protocol: tcp
        addr: 127.0.0.1:5533
```

## 从现有配置推断版本的简表

### 看到这些，优先按 v5 处理

- `type: udp_server`
- `type: tcp_server`
- `type: http_server`
- `type: domain_set`
- `matches:` + `exec:` 的 sequence 规则

### 看到这些，优先按 v4 处理

- 顶层 `servers:`
- 顶层 `data_providers:`
- `type: query_matcher`
- `args.exec:` 里的 `if` / `else_exec`
- `type: fast_forward`
