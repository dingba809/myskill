# VyOS 1.5 接口与路由配置

本文件提供物理网卡、VLAN 虚拟接口、Loopback、WireGuard 以及路由协议（静态路由及 OSPF/BGP 动态路由基础）的配置指南。

## 1. 物理接口配置 (Ethernet)

VyOS 中物理网卡一般命名为 `eth0`、`eth1` 等。
*   **基础 IP 地址配置**：
    ```text
    set interfaces ethernet eth0 address '192.168.1.1/24'
    set interfaces ethernet eth0 address '2001:db8::1/64'
    set interfaces ethernet eth0 description 'LAN Interface'
    ```
*   **启用/禁用接口**：
    默认接口是启用的。若需禁用：
    ```text
    set interfaces ethernet eth0 disable
    ```
*   **物理属性**（网卡速度、双工）：
    ```text
    set interfaces ethernet eth0 speed '1000'
    set interfaces ethernet eth0 duplex 'full'
    ```

## 2. 虚拟子接口与 VLAN (vif)

VyOS 使用 `vif` 关键字在物理接口上创建 802.1Q 标记的 VLAN 子接口。VLAN ID 的有效范围为 0 至 4094。
*   **配置 VLAN 子接口**：
    ```text
    # 在 eth0 上创建 VLAN 10 接口并配置 IP
    set interfaces ethernet eth0 vif 10 address '10.10.10.1/24'
    set interfaces ethernet eth0 vif 10 description 'Management VLAN 10'
    ```

## 3. 环回接口 (Loopback)

本地环回接口默认为 `lo`：
```text
set interfaces loopback lo address '127.0.0.1/8'
set interfaces loopback lo address '10.254.254.254/32'
```

## 4. WireGuard VPN 接口 (interfaces wireguard)

WireGuard 是现代且高效的 VPN。
*   **第一步：生成密钥对**（操作模式下运行）：
    ```text
    generate pki wireguard key-pair install interface wg0
    ```
    *这会自动为 wg0 生成并写入私钥配置，并在屏幕输出对应的公钥（用于配对端配置）。*
*   **第二步：配置本地接口属性**：
    ```text
    set interfaces wireguard wg0 address '10.100.0.1/30'
    set interfaces wireguard wg0 port '51820'
    set interfaces wireguard wg0 description 'VPN Tunnel to Branch'
    ```
*   **第三步：配置对端 (Peer)**：
    ```text
    # 指定对端的公钥（必须是远程对端生成的公钥）
    set interfaces wireguard wg0 peer to-branch-router public-key 'UxDsYT6EnpTIOKUzvMlw2p0sNOKQvFxEdSVrnNrX1Ro='
    
    # 限制对端允许传输的 IP 网段（allowed-ips）
    set interfaces wireguard wg0 peer to-branch-router allowed-ips '10.100.0.2/32'
    set interfaces wireguard wg0 peer to-branch-router allowed-ips '192.168.2.0/24'
    
    # 指定对端的公网出口 IP 和端口（若主动发起连接）
    set interfaces wireguard wg0 peer to-branch-router address '203.0.113.50'
    set interfaces wireguard wg0 peer to-branch-router port '51820'
    ```

## 5. 静态路由与默认网关 (protocols static)

*   **配置默认网关（默认路由）**：
    ```text
    set protocols static route 0.0.0.0/0 next-hop 203.0.113.1
    set protocols static route6 ::/0 next-hop 2001:db8:ffff::1
    ```
*   **配置指定网段的静态路由**：
    ```text
    set protocols static route 10.0.0.0/8 next-hop 192.168.100.1
    ```
*   **配置静态接口路由**（常用于点对点隧道接口）：
    ```text
    set protocols static route 192.168.2.0/24 interface wg0
    ```
*   **黑洞路由 (Blackhole)**（悄悄丢弃所有匹配的报文）：
    ```text
    set protocols static route 172.16.0.0/12 blackhole
    ```

## 6. 动态路由配置基础 (OSPF/BGP)

VyOS 的动态路由由 FRR 引擎驱动：
*   **OSPFv2 基础配置**：
    ```text
    # 声明 OSPF 路由器 ID
    set protocols ospf parameters router-id 10.254.254.254
    
    # 声明参与 OSPF 的网段及所属区域 (Area)
    set protocols ospf area 0 network 192.168.1.0/24
    set protocols ospf area 0 network 10.100.0.0/30
    ```
*   **BGP 基础配置**：
    ```text
    # 声明本地 AS 号及 Router ID
    set protocols bgp system-as 65001
    set protocols bgp parameters router-id 10.254.254.254
    
    # 声明邻居 (Neighbor)
    set protocols bgp neighbor 192.0.2.1 remote-as 65002
    set protocols bgp neighbor 192.0.2.1 description 'eBGP Peer'
    
    # 宣告本地网段
    set protocols bgp address-family ipv4-unicast network 192.168.1.0/24
    ```
