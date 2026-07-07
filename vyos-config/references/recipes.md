# VyOS 1.5 实用配置配方 (Recipes)

本文件提供直接可套用于生产与实验环境的经典网络配置模板。

---

## 1. 经典单 WAN 单 LAN 家用/企业网关模板

该模板实现如下场景：
*   `eth0` 连接外部网络（WAN 口，使用 DHCP 自动获取公网 IP 并启用 NAT 共享）。
*   `eth1` 连接内部网络（LAN 口，固定 IP `192.168.1.1/24`）。
*   启用 DHCP 服务器，为内网客户端分发 IP。
*   启用 DNS 转发器，提供局域网 DNS 解析。
*   应用基础状态防火墙保护路由器免受外网攻击。

```text
# === 1. 接口与地址配置 ===
set interfaces ethernet eth0 address 'dhcp'
set interfaces ethernet eth0 description 'WAN'
set interfaces ethernet eth1 address '192.168.1.1/24'
set interfaces ethernet eth1 description 'LAN'

# === 2. 系统时区与基础 DNS ===
set system time-zone 'Asia/Shanghai'
set system name-server '8.8.8.8'
set system name-server '1.1.1.1'

# === 3. 配置源 NAT (SNAT) ===
set nat source rule 100 outbound-interface name 'eth0'
set nat source rule 100 source address '192.168.1.0/24'
set nat source rule 100 translation address 'masquerade'

# === 4. 配置内网 DHCP 服务器 ===
set service dhcp-server shared-network-name LAN_POOL description 'LAN DHCP Pool'
set service dhcp-server shared-network-name LAN_POOL authoritative
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 option gateway '192.168.1.1'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 option name-server '192.168.1.1'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 range pool_1 start '192.168.1.100'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 range pool_1 stop '192.168.1.200'

# === 5. 配置本地 DNS 转发器 ===
set service dns forwarding listen-address '192.168.1.1'
set service dns forwarding allow-from '192.168.1.0/24'
set service dns forwarding cache-size '1000'
set service dns forwarding system

# === 6. 防火墙配置（外网阻断，内网放行） ===
# 创建 WAN 进站 IPv4 过滤链（保护路由器）
set firewall ipv4 input filter rule 10 action 'accept'
set firewall ipv4 input filter rule 10 description 'Allow established/related'
set firewall ipv4 input filter rule 10 state 'established'
set firewall ipv4 input filter rule 10 state 'related'

set firewall ipv4 input filter rule 20 action 'drop'
set firewall ipv4 input filter rule 20 description 'Drop invalid'
set firewall ipv4 input filter rule 20 state 'invalid'

set firewall ipv4 input filter rule 30 action 'accept'
set firewall ipv4 input filter rule 30 description 'Allow local icmp'
set firewall ipv4 input filter rule 30 protocol 'icmp'

set firewall ipv4 input filter rule 100 action 'drop'
set firewall ipv4 input filter rule 100 description 'Default Drop all other WAN input'
set firewall ipv4 input filter rule 100 inbound-interface name 'eth0'
```

---

## 2. 单臂路由多 VLAN 划分与网络隔离隔离模板

本模板实现如下场景：
*   物理网卡 `eth1` 作为 Trunk 口，承载 VLAN 10（办公网）与 VLAN 20（访客网）。
*   办公网网段：`10.10.10.0/24`（VLAN 网关 `10.10.10.1`）。
*   访客网网段：`10.10.20.0/24`（VLAN 网关 `10.10.20.1`）。
*   安全控制：阻止访客网（VLAN 20）主动访问办公网（VLAN 10）的任何设备，同时也禁止访客网通过 SSH 访问路由器。

```text
# === 1. 接口 VLAN 配置 ===
set interfaces ethernet eth1 vif 10 address '10.10.10.1/24'
set interfaces ethernet eth1 vif 10 description 'Office Network'
set interfaces ethernet eth1 vif 20 address '10.10.20.1/24'
set interfaces ethernet eth1 vif 20 description 'Guest Network'

# === 2. 配置 DHCP 地址池 ===
set service dhcp-server shared-network-name OFFICE subnet 10.10.10.0/24 option gateway '10.10.10.1'
set service dhcp-server shared-network-name OFFICE subnet 10.10.10.0/24 option name-server '8.8.8.8'
set service dhcp-server shared-network-name OFFICE subnet 10.10.10.0/24 range pool_1 start '10.10.10.50'
set service dhcp-server shared-network-name OFFICE subnet 10.10.10.0/24 range pool_1 stop '10.10.10.200'

set service dhcp-server shared-network-name GUEST subnet 10.10.20.0/24 option gateway '10.10.20.1'
set service dhcp-server shared-network-name GUEST subnet 10.10.20.0/24 option name-server '1.1.1.1'
set service dhcp-server shared-network-name GUEST subnet 10.10.20.0/24 range pool_1 start '10.10.20.50'
set service dhcp-server shared-network-name GUEST subnet 10.10.20.0/24 range pool_1 stop '10.10.20.200'

# === 3. 防火墙配置：限制访客网络访问办公网 (Forward Filter) ===
# 允许已建立和关联的回复包通过（允许办公网主动访问访客网）
set firewall ipv4 forward filter rule 10 action 'accept'
set firewall ipv4 forward filter rule 10 state 'established'
set firewall ipv4 forward filter rule 10 state 'related'

# 丢弃所有从 Guest 主动流向 Office 的跨 VLAN 包
set firewall ipv4 forward filter rule 110 action 'drop'
set firewall ipv4 forward filter rule 110 description 'Block Guest to Office'
set firewall ipv4 forward filter rule 110 source address '10.10.20.0/24'
set firewall ipv4 forward filter rule 110 destination address '10.10.10.0/24'

# === 4. 防火墙配置：限制访客访问路由器管理服务 (Input Filter) ===
# 禁止 Guest 访问路由器的 SSH (TCP 22) 端口
set firewall ipv4 input filter rule 50 action 'drop'
set firewall ipv4 input filter rule 50 description 'Block Guest SSH access'
set firewall ipv4 input filter rule 50 protocol 'tcp'
set firewall ipv4 input filter rule 50 destination port '22'
set firewall ipv4 input filter rule 50 source address '10.10.20.0/24'
```

---

## 3. Site-to-Site WireGuard 隧道点对点互联模板

本模板实现两地局域网通过公网在 VyOS 间打通 WireGuard 加密隧道的场景。
*   **站点 A**: 外部 IP `203.0.113.10`，内部网段 `192.168.1.0/24`，WireGuard 隧道 IP `10.99.0.1/30`。
*   **站点 B**: 外部 IP `203.0.113.20`，内部网段 `192.168.2.0/24`，WireGuard 隧道 IP `10.99.0.2/30`。

### 站点 A 配置：
```text
# 1. 配置 WG 接口（注意：私钥由 'generate pki wireguard key-pair' 安装）
set interfaces wireguard wg0 address '10.99.0.1/30'
set interfaces wireguard wg0 port '51820'

# 2. 配置对端站点 B 的信息
set interfaces wireguard wg0 peer to-site-b public-key '站点B生成的公钥xxxxxxxxxx='
set interfaces wireguard wg0 peer to-site-b address '203.0.113.20'
set interfaces wireguard wg0 peer to-site-b port '51820'
set interfaces wireguard wg0 peer to-site-b allowed-ips '10.99.0.2/32'
set interfaces wireguard wg0 peer to-site-b allowed-ips '192.168.2.0/24'

# 3. 配置路由将站点 B 网段指向隧道
set protocols static route 192.168.2.0/24 interface wg0
```

### 站点 B 配置：
```text
# 1. 配置 WG 接口
set interfaces wireguard wg0 address '10.99.0.2/30'
set interfaces wireguard wg0 port '51820'

# 2. 配置对端站点 A 的信息
set interfaces wireguard wg0 peer to-site-a public-key '站点A生成的公钥yyyyyyyyyy='
set interfaces wireguard wg0 peer to-site-a address '203.0.113.10'
set interfaces wireguard wg0 peer to-site-a port '51820'
set interfaces wireguard wg0 peer to-site-a allowed-ips '10.99.0.1/32'
set interfaces wireguard wg0 peer to-site-a allowed-ips '192.168.1.0/24'

# 3. 配置路由将站点 A 网段指向隧道
set protocols static route 192.168.1.0/24 interface wg0
```
