# VyOS 1.5 排错与配置冲突指南 (Troubleshooting)

本文件归纳配置 VyOS 1.5 时最容易遇到的冲突点、故障排查操作命令以及系统验证最佳实践。

---

## 1. 提交与回滚故障排查

*   **远程调试防失联最佳实践**：
    在修改防火墙、接口 IP 或路由等极易导致远程 SSH 连接中断的配置时，**务必**使用带自动确认的提交：
    ```text
    commit-confirm 10
    ```
    *系统将在 10 分钟后自动重启并恢复为提交前的配置，除非你在操作模式下输入 `confirm` 命令确认本次修改。*
*   **如何查看提交失败的详细错误**：
    若 `commit` 报告配置冲突，可查看生成的具体报错信息。常见失败原因包括：
    1.  **DHCP 池网段冲突**：定义的 range 范围超出 subnet 本身。
    2.  **防火墙接口与 IP 格式错误**：在 rule 中使用了不合规的 IP 子网（如掩码位数错填成 `192.168.1.0/33`）。
    3.  **引用了不存在的节点**：例如防火墙规则组引用了不存在的 `address-group`。

---

## 2. 状态操作模式下的网络状态分析 (Diagnostics)

在操作模式下，以下命令是网络排错的“瑞士军刀”：

*   **检查接口状态与 IP 分配**：
    ```text
    show interfaces
    show interfaces ethernet eth0
    ```
*   **查看当前路由表**：
    ```text
    show ip route
    show ipv6 route
    ```
*   **查看动态路由协议邻居与状态**（OSPF / BGP）：
    ```text
    show ip ospf neighbor
    show ip bgp summary
    ```
*   **实时接口抓包 (TCPDUMP 等效)**：
    ```text
    # 监控接口 eth0 上的流量，支持类似 tcpdump 的过滤语法
    monitor traffic interface eth0
    # 过滤特定 IP 抓包
    monitor traffic interface eth0 filter "host 192.168.1.100 and port 80"
    ```
*   **查看防火墙命中数**：
    ```text
    show firewall statistics
    ```

---

## 3. 防火墙与 NAT 的经典冲突与避坑点

### 避坑点 A：目的 NAT (DNAT) 与防火墙 forward 链的执行顺序
*   **症状**：配置了 DNAT（端口转发），但外网无法访问，且防火墙丢弃包。
*   **原因**：在 VyOS/Linux Netfilter 中，**DNAT 的地址转换发生在防火墙规则评估之前**。
*   **解决办法**：防火墙的 `forward` 允许规则中，目标地址（destination address）**必须**填写**转换后的内网实际私有 IP**（如 `192.168.1.10`），而不是路由器的公网 IP。

### 避坑点 B：回流（NAT Loopback / Hairpin NAT）问题
*   **症状**：外网用户可以通过公网 IP 访问内网的 Web 服务器，但位于内网 LAN 的客户端却无法通过该公网 IP 访问同一台服务器。
*   **原因**：当内网主机向路由器的 WAN 口公网 IP 发起连接时，路由器完成了 DNAT 转换。但 Web 服务器收到请求后发现源 IP 是局域网内同一网段的主机，因而直接通过二层向客户端回复包。客户端收到一个未经过 NAT 逆向转换的私有 IP 响应，从而丢弃连接。
*   **解决办法**：
    在 `nat source` 规则中，增加一条允许 LAN 内部访问 LAN 服务器的回流 NAT 规则：
    ```text
    # 当源地址和目的地址都在 LAN 内部，且通过 LAN 接口回折时，强行做源地址伪装 (masquerade)
    set nat source rule 110 outbound-interface name 'eth1'
    set nat source rule 110 source address '192.168.1.0/24'
    set nat source rule 110 destination address '192.168.1.10'
    set nat source rule 110 translation address 'masquerade'
    ```

### 避坑点 C：定时更新脚本与 VyOS CLI 组配置冲突（内存冲刷问题）
*   **症状**：在 VyOS CLI 中手动向网络组（如 `chv6_list`）添加了特殊放行网段（如中科大教育网段 `2001:da8::/32`），但一旦定时自动拉取更新脚本运行后，该网段再次被拦截。
*   **原因**：外部拉取脚本（如 `load_china6_fw_group.sh`）在将获取的 IP 段注入底层时，通常先执行 `flush set ip6 vyos_filter N6_chv6_list` 强行清空内存集合。这会直接擦除由 VyOS CLI 在 Commit 时打入的占位段。如果拉取的运营商列表（如三大运营商库）遗漏了教育网或特定网段，它就会被误杀。
*   **解决办法**：在外部脚本中做硬编码追加。在脚本生成并管道输入 `nft` 拼接时，强行在最前方 Echo 写入必须保留的基础网段：
    ```bash
    # 在脚本的 nft 写入拼接处
    echo "flush set ip6 vyos_filter N6_chv6_list"
    echo "add element ip6 vyos_filter N6_chv6_list { "
    echo "    2001:da8::/32,"  # 强制硬编码常驻网段
    ...
    ```

### 避坑点 D：局域网内 DNS 强制劫持（DNAT & SNAT 组合避坑）
*   **症状**：为了使特定需要走分流网关的内网设备强制使用旁路由（如 `.253`）的 DNS，配置了 DNAT 劫持 53 端口到该旁路由后，设备发生断网或 DNS 丢包。
*   **原因**：同网段 NAT 回流问题。由于源设备与旁路 DNS 服务器在同一二层局域网内，DNAT 后的 DNS 请求到达旁路由后，旁路由会直接二层向源主机发回响应。源主机因为收到的回复源 IP 不是它当初发往的目标网关（而变成了旁路由私有 IP），直接判定该报文非法并丢弃。
*   **解决办法**：必须采用 **“目的 NAT (DNAT) + 源 NAT (SNAT) 回流伪装”** 双向机制。在重写目标 IP 的同时，将所有发往 `.253` 的 DNS 请求源 IP 伪装为网关 IP，强迫旁路由将回包送回主路由：
    ```text
    # 1. DNAT 劫持（排除目的地本身为 .253 的环路）
    set nat destination rule 120 inbound-interface name 'eth1'
    set nat destination rule 120 destination address '!192.168.100.253'
    set nat destination rule 120 destination port '53'
    set nat destination rule 120 protocol 'tcp_udp'
    set nat destination rule 120 translation address '192.168.100.253'

    # 2. SNAT 伪装（强制回折）
    set nat source rule 120 outbound-interface name 'eth1'
    set nat source rule 120 destination address '192.168.100.253'
    set nat source rule 120 destination port '53'
    set nat source rule 120 protocol 'tcp_udp'
    set nat source rule 120 translation address 'masquerade'
    ```

### 避坑点 E：IPv6 PPPoE 拨号获取不到前缀委派（PD）与防火墙安全锁死
*   **症状**：主路由自身能够 Ping 通外网 IPv6，但内网接口和下挂客户端完全分不到公网 IPv6 地址。查看 dhcp6c 客户端日志，显示正常发送 Solicit 报文，却始终没有任何 Reply（或日志陷入无限重试）。
*   **原因**：主路由在 `firewall ipv6 input filter` 链中配置了默认动作 `default-action drop` 用于安全加固。而运营商 DHCPv6 服务器返回的前缀分配响应（发送到路由器的 UDP 546 端口）属于全新的 UDP 会话，被路由器自身的 Input 防火墙在入口处直接丢弃，导致 DHCP 协商失败。
*   **解决办法**：必须在 `firewall ipv6 input filter` 防火墙链中，显式放行来自 WAN 口的 DHCPv6 客户端端口（UDP 546）：
    ```text
    set firewall ipv6 input filter rule 25 action 'accept'
    set firewall ipv6 input filter rule 25 destination port '546'
    set firewall ipv6 input filter rule 25 inbound-interface name 'pppoe0'
    set firewall ipv6 input filter rule 25 protocol 'udp'
    ```

### 避坑点 F：客户端保留多重过期 IPv6 前缀导致连接超时
*   **症状**：路由器侧一切正常，防火墙放行规则完备，但客户端无法连接外网 IPv6 资源（请求超时）。
*   **原因**：中国宽带在频繁重新拨号后，运营商下发的 IPv6 PD 前缀会发生改变。但客户端（特别是 Windows 操作系统）对过期前缀的释放有严重滞后，导致网卡上同时堆积了多达 5~7 个不同前缀的 GUA IPv6 地址。系统在发起连接时，错误地选择了一个已过期的 IP 作为源 IP 发包，由于局域网和运营商回程路由已不复存在，从而超时。
*   **解决办法**：在客户端网卡上“禁用”再“启用”以彻底清除历史过期租约，或直接重启设备以刷新唯一的有效 GUA 地址。

---

## 4. SSH 远程登录连接失败排查

若在外网或特定网段无法连入 SSH 服务：
1.  **检查 SSH 监听 IP**：若配置了 `set service ssh listen-address '192.168.1.1'`，则该 SSH 服务**只**监听此 IP。如果从 WAN 口访问，将无法连接。应根据需要修改或添加多个监听地址。
2.  **检查防火墙 `input` 过滤**：确保防火墙的 `ipv4 input filter` 链中，有显式放行目标端口（通常为 TCP 22）以及来源 IP 的 accept 规则。
