# SmartDNS Recipes（可复制配置片段）

> 依据：官方 SmartDNS 文档（`.tmp/smartdns-docs/basic-config.md`、`.tmp/smartdns-docs/configuration.md`，抓取时间 2026-04-15）。
>  
> 目标：给出“能直接复制”的 `smartdns.conf` 片段，并明确**何时用**、**必须替换什么**。如与你安装的 SmartDNS 版本/平台不一致，请以本机版本支持的指令为准。

---

## 1) Minimal usable config（最小可用）

**何时用**：只想先跑起来（监听 + 上游），其余保持默认。

**可复制片段**（官方示例风格）：

```conf
# Listen on port 53
bind [::]:53

# One upstream server
server 8.8.8.8
```

**需要替换什么**
- `bind [::]:53`：如你的环境不允许占用 53（非 root / 端口冲突），改成 `bind 0.0.0.0:6053` 或仅本机 `bind 127.0.0.1:6053`（见后续配方）。
- `server*`：替换为你信任、可达的上游。

**注意**
- 如果没有配置任何 `server*`，官方说明会自动读取系统 `/etc/resolv.conf` 中的 DNS。你以为“用了 SmartDNS 的上游”，实际可能只是沿用系统 DNS。

---

## 2) Home router baseline（家用路由基线：稳 + 可观测 + 不太复杂）

**何时用**：路由器/家庭局域网常驻使用，希望有缓存、速度选择与基础日志。

**可复制片段**：

```conf
# 监听：UDP 53（大多数系统 [::]:53 同时覆盖 IPv4/IPv6）
bind [::]:53

# 上游：按需替换（UDP / DoT / DoH / QUIC 均可混用）
server 223.5.5.5
server 114.114.114.114
server-tls 1.1.1.1:853

# 缓存：路由器建议开启持久化（路径需可写）
cache-size 2048
cache-persist yes
cache-file /tmp/smartdns.cache
cache-checkpoint-time 3600

# 速度/返回策略：偏家庭常用的“综合最优”
speed-check-mode ping,tcp:80,tcp:443
response-mode first-ping
dualstack-ip-selection yes

# 日志：平时适度，出问题再调到 debug
log-level notice
log-console no
```

**需要替换什么**
- `cache-file /tmp/smartdns.cache`：换成你设备上“稳定可写”的路径（避免只读/空间不足）。
- `server*`：替换上游；如需要代理/分组/证书校验，见后续配方。

**可选增强（按需开启）**
- 想在上游不稳定时更“不断网”：可考虑 `serve-expired yes`、`prefetch-domain yes`（需理解“过期缓存”带来的新鲜度权衡）。

---

## 3) Domestic / International split + encrypted upstreams（国内/国外分流 + 加密上游）

**何时用**
- “国内域名”走国内解析（更贴近本地/更少误伤），其余默认走“加密国外上游”（DoH/DoT）。
- 你希望策略清晰：靠 `domain-set` + `nameserver` 完成分流，靠 `-group` 管理上游集合。

**思路**
- 让**默认组**（未显式 `-group` 的 `server*`）作为“国际/加密”上游。
- 把“国内”上游放到 `domestic` 组，并用 `nameserver /domain-set:cn/domestic` 把国内域名定向到该组。

**可复制片段**（模板 + 示例）：

```conf
bind [::]:53

# --- 默认：international（加密上游，示例为 DoH 直连 IP + 指定 Host/SNI/校验名）---
# 你必须把 <...> 替换成实际服务商参数；下面以 Cloudflare DoH 为示例。
server-https https://1.1.1.1/dns-query -host-name cloudflare-dns.com -http-host cloudflare-dns.com -tls-host-verify cloudflare-dns.com

# --- domestic 组：国内上游（示例为 UDP），并从默认组排除 ---
server 223.5.5.5 -group domestic -exclude-default-group
server 114.114.114.114 -group domestic -exclude-default-group

# --- 国内域名集合（文件内容：每行一个域名）---
domain-set -name cn -type list -file /etc/smartdns/cn.list

# --- 分流：命中 cn 集合的域名使用 domestic 组 ---
nameserver /domain-set:cn/domestic
```

**需要替换什么**
- `domain-set ... -file /etc/smartdns/cn.list`：换成你的列表文件路径（并确保文件存在、格式为“一行一个域名”）。
- `server-https https://1.1.1.1/dns-query ...`：按你的加密上游服务商替换：
  - URL（含路径）
  - `-host-name`（TLS SNI 名）
  - `-http-host`（HTTP Host 头）
  - `-tls-host-verify`（证书校验名）

**常见坑（分流“不生效”时优先查）**
- `nameserver` 的 “group 名”必须与上游 `server* ... -group <name>` 一致。
- 监听端 `bind` 上如果加了 `-no-rule-nameserver`，会跳过 `nameserver` 规则，导致分流失效。

---

## 4) OpenWrt / side-router friendly example（OpenWrt/旁路由更友好：避免抢占 53）

**何时用**
- OpenWrt 上常见已有 `dnsmasq` 占用 53；你打算让 SmartDNS 监听一个高端口，再由上层转发/指定客户端 DNS。
- 旁路由/软路由/容器里不想用特权端口（<1024）。

**可复制片段**：

```conf
# 仅本机监听（配合上层转发更安全）
bind 127.0.0.1:6053
bind [::1]:6053

# 上游（按需替换）
server 223.5.5.5
server-tls 1.1.1.1:853

# 路由器常用：缓存落到 /tmp（重启会丢，但写入更稳妥）
cache-persist yes
cache-file /tmp/smartdns.cache

log-level notice
```

**需要替换什么**
- 端口 `6053`：确保与你系统现有服务不冲突，并在上层把客户端查询转到该端口。
- `bind` 地址：如果你希望局域网其它机器直连 SmartDNS，把 `127.0.0.1` 改成你的 LAN IP（或 `0.0.0.0`），并自行处理防火墙放行。

---

## 5) Debug-friendly temporary config（临时排障：尽量“少变量”）

**何时用**
- “服务能启动，但行为不对/分流不对/上游看起来没用”，需要快速把问题缩到最小范围并抓证据。

**可复制片段**：

```conf
# 用一个不常见端口，避免和系统 DNS/其他服务抢占
bind 127.0.0.1:6053 -no-cache -no-speed-check -no-dualstack-selection -no-serve-expired

# 只保留 1~2 个上游，先验证最基本的转发路径
server 223.5.5.5
server-tls 1.1.1.1:853

# 最大化可观测性（排障期使用）
log-level debug
log-console yes
audit-enable yes
audit-console yes
```

**需要替换什么**
- `bind 127.0.0.1:6053`：如果你需要让局域网设备直接测，临时改为 `bind <LAN_IP>:6053`。
- `server*`：尽量选你确定“网络可达”的上游，避免引入不必要变量。

