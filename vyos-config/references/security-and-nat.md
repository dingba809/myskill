# VyOS 1.5 防火墙与 NAT 配置

本文件提供 VyOS 1.5 升级版防火墙结构（基于 nftables）以及 NAT44（源 NAT 和目的 NAT/端口转发）的配置指南。

## 1. 防火墙结构 (Firewall)

在 VyOS 1.5 中，防火墙采用模块化的 nftables 结构，规则按流量方向与协议划分为不同的过滤链（Filter Chain）。

### 防火墙过滤链分类
*   **`input`**：控制发送到路由器自身的流量（例如 SSH、BGP、DNS 请求等）。
*   **`forward`**：控制穿越路由器转发的流量（例如内网穿过防火墙访问外网，或内网不同 VLAN 之间的隔离）。
*   **`output`**：控制从路由器自身发出的流量。

*在命令行中，根据协议选择前缀：`ipv4` 或 `ipv6`。*

### 防火墙配置示例：保护路由器本身 (Input Filter)
```text
# 1. 允许已建立的（Established）和相关联的（Related）会话流量通过（状态防火墙基础规则）
set firewall ipv4 input filter rule 10 action 'accept'
set firewall ipv4 input filter rule 10 description 'Allow established/related'
set firewall ipv4 input filter rule 10 state 'established'
set firewall ipv4 input filter rule 10 state 'related'

# 2. 丢弃无效（Invalid）的状态包
set firewall ipv4 input filter rule 20 action 'drop'
set firewall ipv4 input filter rule 20 description 'Drop invalid packets'
set firewall ipv4 input filter rule 20 state 'invalid'

# 3. 允许来自特定接口（如环回 lo 和内网 eth1）的 ICMP 乒测
set firewall ipv4 input filter rule 30 action 'accept'
set firewall ipv4 input filter rule 30 description 'Allow ICMP'
set firewall ipv4 input filter rule 30 protocol 'icmp'

# 4. 允许特定的管理端口（如 TCP 22 - SSH）仅从内网（192.168.1.0/24）访问
set firewall ipv4 input filter rule 40 action 'accept'
set firewall ipv4 input filter rule 40 description 'Allow local SSH'
set firewall ipv4 input filter rule 40 protocol 'tcp'
set firewall ipv4 input filter rule 40 destination port '22'
set firewall ipv4 input filter rule 40 source address '192.168.1.0/24'

# 5. 默认策略（未匹配流量全部丢弃 - 隐式或显式）
# 通常可以在最末尾配置一条拒绝规则，或者设置全局默认动作
```

### 防火墙配置示例：控制转发流量 (Forward Filter)
```text
# 1. 允许内网 VLAN 10 访问 VLAN 20，但阻止 VLAN 20 访问 VLAN 10
# 1.1 允许 VLAN 10 主动发起连接到 VLAN 20
set firewall ipv4 forward filter rule 100 action 'accept'
set firewall ipv4 forward filter rule 100 source address '10.10.10.0/24'
set firewall ipv4 forward filter rule 100 destination address '10.10.20.0/24'

# 1.2 允许 VLAN 20 回复 VLAN 10 已建立的连接
set firewall ipv4 forward filter rule 110 action 'accept'
set firewall ipv4 forward filter rule 110 source address '10.10.20.0/24'
set firewall ipv4 forward filter rule 110 destination address '10.10.10.0/24'
set firewall ipv4 forward filter rule 110 state 'established'
set firewall ipv4 forward filter rule 110 state 'related'

# 1.3 显式阻止 VLAN 20 主动发起连接到 VLAN 10
set firewall ipv4 forward filter rule 120 action 'drop'
set firewall ipv4 forward filter rule 120 source address '10.10.20.0/24'
set firewall ipv4 forward filter rule 120 destination address '10.10.10.0/24'
```

---

## 2. NAT44 配置 (Source NAT & Destination NAT)

NAT 用于在私有地址空间（RFC 1918）与公共网络地址空间之间进行映射。VyOS 中 NAT 规则以递增的规则 ID 顺序进行匹配评估，建议在配置时在规则 ID 之间留出余量（如 10、20、30...）。

### 源 NAT (SNAT - 隐藏内网 IP 并共享外网 IP 访问)
最常见的是 IP 动态伪装（IP Masquerading），自动使用外网接口的当前 IP。

```text
# 配置规则 100：对来自 192.168.1.0/24 网段从 eth0（假设为 WAN 口）流出的流量进行 SNAT Masquerade
set nat source rule 100 outbound-interface name 'eth0'
set nat source rule 100 source address '192.168.1.0/24'
set nat source rule 100 translation address 'masquerade'
```

如果拥有多个静态公网 IP，也可以指定具体的 IP 地址或 IP 池进行转换：
```text
# 将源地址转换为公网特定静态 IP
set nat source rule 110 outbound-interface name 'eth0'
set nat source rule 110 source address '192.168.1.0/24'
set nat source rule 110 translation address '203.0.113.10'

# 使用 IP 地址范围池负载平衡转换
set nat source rule 120 outbound-interface name 'eth0'
set nat source rule 120 source address '192.168.1.0/24'
set nat source rule 120 translation address '203.0.113.11-203.0.113.15'
```

### 目的 NAT (DNAT - 端口转发)
允许外部主机访问内部私有网络中的服务器与服务。

```text
# 配置规则 10：将从外网 eth0 接口进来的、访问公网 IP 且目标端口为 TCP 80 的流量，转发到内网 Web 服务器 192.168.1.10
set nat destination rule 10 inbound-interface name 'eth0'
set nat destination rule 10 protocol 'tcp'
set nat destination rule 10 destination port '80'
set nat destination rule 10 translation address '192.168.1.10'

# 端口映射（将外网 8080 端口映射到内网服务器的 80 端口）
set nat destination rule 20 inbound-interface name 'eth0'
set nat destination rule 20 protocol 'tcp'
set nat destination rule 20 destination port '8080'
set nat destination rule 20 translation address '192.168.1.10'
set nat destination rule 20 translation port '80'
```

> [!IMPORTANT]
> **状态防火墙下的匹配**：DNAT（目的 NAT）在防火墙的 `forward` 链评估之前执行。因此，当为 DNAT 规则配置对应的防火墙放行规则时，防火墙的 destination address 应该填写**转换后（即内部私有网络）的实际目标 IP**（如上例中的 `192.168.1.10`），而不是路由器的公网 IP。
