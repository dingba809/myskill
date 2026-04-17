# v4 到 v5 迁移参考

本文件不是官方单独发布的升级手册，而是基于官方 v4 / v5 配置页、v5 `sequence` 页、v5 服务器插件页、v4 插件页整理出的迁移指南。

## 迁移前先确认目标文档分支

本文件默认针对当前官方 wiki 中的：

- `mosdns v4` 配置页与插件页
- `mosdns v5` 配置页与插件页

也就是说，它描述的是“从官方 v4 文档模型迁到官方 v5 文档模型”的方法，而不是某一篇单独升级公告的逐条翻译。

## 一句话判断迁移范围

如果现有配置含有以下任意特征，基本就不是“改几个字段”，而是需要重构：

- 顶层 `servers:`
- 顶层 `data_providers:`
- `query_matcher` / `response_matcher`
- v4 `sequence.args.exec` + `if` / `else_exec`
- `fast_forward`

对应地，v5 目标结构通常会变成：

- 顶层只保留 `log`、`api`、`include`、`plugins`
- 用 `udp_server` / `tcp_server` / `http_server` 等服务器插件取代顶层 `servers`
- 用 `sequence` 的 `matches` + `exec` 规则取代 v4 的 `if` 流水线
- 用 `domain_set` / `ip_set` 和 sequence 内建匹配器取代大量 v4 匹配器写法

## 推荐迁移步骤

### 1. 先重建骨架，不要原地替换

建议先从 v5 骨架开始，再逐段迁入旧逻辑：

1. 保留日志级别、API、include 需求
2. 把所有功能统一改写到 `plugins:`
3. 把 v4 `servers` 改成 v5 服务器插件
4. 最后重写主 `sequence`

原因：

- v4 和 v5 的顶层组织方式不同
- 原地替换容易留下 `servers`、`data_providers`、`query_matcher` 这类旧模型残留

### 2. 先迁服务器入口

#### v4

```yaml
servers:
  - exec: main
    listeners:
      - protocol: udp
        addr: 127.0.0.1:53
      - protocol: tcp
        addr: 127.0.0.1:53
```

#### v5

```yaml
plugins:
  - tag: main
    type: sequence
    args: []

  - type: udp_server
    args:
      entry: main
      listen: 127.0.0.1:53

  - type: tcp_server
    args:
      entry: main
      listen: 127.0.0.1:53
```

迁移要点：

- `exec` 迁成服务器插件的 `args.entry`
- `addr` 迁成服务器插件的 `args.listen`
- 原来一个 `servers` 条目下的多个 listener，通常要拆成多个服务器插件

## 常见映射表

### 顶层结构映射

| v4 | v5 |
| --- | --- |
| `data_providers` | 通常改成数据插件，如 `domain_set` / `ip_set` |
| `plugins` | 仍是 `plugins` |
| `servers` | 改成服务器插件 |
| `include` | 仍有 `include`，但 v5 文档只说明用于载入 `plugins` 设置 |

### 服务器映射

| v4 listener protocol | v5 目标 |
| --- | --- |
| `udp` | `udp_server` |
| `tcp` | `tcp_server` |
| `tls` | `tcp_server` + `cert` / `key` |
| `https` / `http` | `http_server` |

说明：

- 这是基于 v4/v5 官方配置模型做的映射归纳
- 遇到老配置里非常规监听参数时，应回到对应官方页逐项核对

### 转发插件映射

| v4 | v5 |
| --- | --- |
| `fast_forward` | 通常改成 `forward` |
| `forward` | 仍可能对应 `forward`，但参数和调用方式要重审 |
| `upstream` | 改为 `upstreams` |

### 数据与匹配映射

| v4 | v5 |
| --- | --- |
| `data_providers` 文件域名集 | `domain_set.files` |
| `data_providers` 文件 IP 集 | `ip_set.files` |
| `query_matcher.domain: provider:<tag>` | sequence 中 `qname $domain_set_tag` |
| `query_matcher.client_ip` | sequence 中 `client_ip ...` |
| `response_matcher` 的部分用途 | sequence 中 `resp_ip` / `rcode` / `cname` / `has_resp` 等 |

## `sequence` 重写思路

### v4 的典型写法

```yaml
- tag: query_is_cn
  type: query_matcher
  args:
    domain:
      - "provider:cn_domain"

- tag: main
  type: sequence
  args:
    exec:
      - if: query_is_cn
        exec:
          - forward_cn
        else_exec:
          - forward_global
```

### v5 的典型改写

```yaml
- tag: cn_domain
  type: domain_set
  args:
    files:
      - ./cn.txt

- tag: forward_cn
  type: forward
  args:
    upstreams:
      - addr: https://223.5.5.5/dns-query

- tag: forward_global
  type: forward
  args:
    upstreams:
      - addr: https://8.8.8.8/dns-query

- tag: main
  type: sequence
  args:
    - matches:
        - qname $cn_domain
      exec: $forward_cn
    - exec: $forward_global
```

迁移逻辑：

- 先把数据源改成 `domain_set`
- 再把 `query_matcher` 条件折叠到 `sequence.matches`
- `else_exec` 在 v5 里通常改成“前面条件命中即执行，最后一条做默认转发”

## 高风险迁移点

### 1. 不要照搬 `query_matcher`

官方 v5 匹配器页明确说明“暂时还没有独立的匹配器插件”。

迁移含义：

- v4 中单独定义的 `query_matcher` / `response_matcher`，多数都要并入 v5 `sequence`
- 不能试图在 v5 中保留 `type: query_matcher`

### 2. 不要保留顶层 `servers`

v5 的服务器是插件，不是顶层对象。只要还保留 `servers:`，说明迁移没做完。

### 3. 注意 v5 的初始化顺序

官方 v5 配置页明确写明：

- 插件按配置顺序初始化
- `sequence` 引用的插件必须先定义

迁移含义：

- 把 `domain_set`、`forward`、被 `goto` / `jump` 指向的 sequence 全部放到引用它们的 sequence 之前

### 4. `include` 的含义更收敛

官方 v4 页说 `include` 可载入 include、数据源、插件和服务器设置。
官方 v5 页只写“从其他配置文件载入 plugins 插件设置”。

迁移含义：

- 原来按 v4 习惯拆开的 `servers` / `data_providers` include 文件，迁移到 v5 时应重组为插件定义文件

### 5. 缓存与 EDNS0 语义要重审

官方 v5 `cache` 说明明确写了：

- 不支持扩展 DNS 协议，也就是 `EDNS0`
- 请求中的 `EDNS0` 部分会被无视
- 应答中的 `EDNS0` 会被略去

迁移含义：

- 如果旧 v4 配置强依赖 `EDNS0` 相关行为，需要单独复核缓存链路是否仍符合预期
- 不能直接假定“v4 里能这么组合，v5 也完全等价”

## 建议的迁移检查清单

迁移完成后，至少检查这些点：

1. 顶层是否还残留 `servers` 或 `data_providers`
2. 是否还残留 `query_matcher`、`response_matcher`、`fast_forward`
3. 所有 v5 `sequence` 引用的 tag 是否都定义在前面
4. 所有监听器是否都迁成了服务器插件
5. 旧条件分流是否都改写成 `matches` + `exec`
6. 任何 `(实验性)` 或版本门槛是否被保留

## 适合怎样使用本文件

- 当用户要求“把现有 v4 配置迁到 v5”时，优先加载本文件
- 当用户只是在问某个字段含义，不要先读本文件，直接读版本参考
- 当迁移涉及未在当前技能覆盖页中出现的插件细节，应回到官方 wiki 继续核对
