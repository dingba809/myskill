# VyOS 1.5 系统及基础服务配置

本文件提供系统基础属性（主机名、DNS、用户管理、SSH 服务、DHCP 服务器以及 DNS 转发服务）的配置指南。

## 1. 系统基础属性与网络解析

*   **配置主机名与域名**：
    ```text
    set system host-name 'vyos-router'
    set system domain-name 'example.com'
    ```
*   **配置系统 DNS 服务器**（支持多个，支持 IPv4/IPv6）：
    ```text
    set system name-server 8.8.8.8
    set system name-server 1.1.1.1
    set system name-server 2001:4860:4860::8888
    ```
*   **静态 Host 映射**（相当于 `/etc/hosts`，不可直接修改该文件）：
    ```text
    set system static-host-mapping host-name 'myhost' inet '192.168.1.100'
    set system static-host-mapping host-name 'myhost' alias 'myhost.local'
    ```
*   **配置时区**（默认为 UTC，配置为中国标准时间）：
    ```text
    set system time-zone 'Asia/Shanghai'
    ```

## 2. 用户管理与安全性 (Login)

*   **创建管理账号并配置密码与 SSH 公钥**：
    ```text
    # 创建用户 admin-user 并设置密码（交互式提示或明文/加密）
    set system login user admin-user authentication plaintext-password 'MyPassword123'
    
    # 允许该用户使用 sudo 获取 root 权限
    set system login user admin-user privilege 'admin'
    
    # 配置 SSH 公钥免密登录
    set system login user admin-user authentication public-keys my-key-id type 'ssh-rsa'
    set system login user admin-user authentication public-keys my-key-id key 'AAAAB3NzaC1yc2EAAAADAQABAAABAQC...'
    ```

## 3. 系统基础服务配置 (SSH, DHCP, DNS Forwarding)

### SSH 服务配置 (`service ssh`)
*   **基本配置与安全强化**：
    ```text
    # 启用 SSH 服务
    set service ssh port '22'
    
    # 限制仅监听内网 IP
    set service ssh listen-address '192.168.1.1'
    
    # 禁用 root 账号直接登录
    set service ssh disable-password-authentication
    ```

### DHCP 服务器配置 (`service dhcp-server`)
VyOS 1.5 提供功能完善的 DHCPv4 服务器：
```text
# 1. 声明共享网络组名（shared-network-name）
set service dhcp-server shared-network-name LAN_POOL description 'LAN DHCP Pool'
set service dhcp-server shared-network-name LAN_POOL authoritative

# 2. 声明子网段
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 option gateway '192.168.1.1'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 option name-server '192.168.1.1'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 option name-server '8.8.8.8'

# 3. 指定分配范围 (Range)
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 range pool_1 start '192.168.1.100'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 range pool_1 stop '192.168.1.200'

# 4. 静态 IP/MAC 绑定 (Static Mapping)
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 static-mapping pc1 ip-address '192.168.1.50'
set service dhcp-server shared-network-name LAN_POOL subnet 192.168.1.0/24 static-mapping pc1 mac-address 'aa:bb:cc:dd:ee:ff'
```

### DNS 转发服务配置 (`service dns forwarding`)
配置路由器作为局域网的轻量级 DNS 转发/递归缓存服务器：
```text
# 1. 设置监听的本地接口或 IP 地址
set service dns forwarding listen-address '192.168.1.1'

# 2. 设置允许发送 DNS 请求的内网网段（安全防护，严禁使用 0.0.0.0/0）
set service dns forwarding allow-from '192.168.1.0/24'

# 3. 配置缓存大小（0 代表禁用缓存，非 0 开启本地缓存）
set service dns forwarding cache-size '1000'

# 4. 指定上游 DNS 转发源
# 选项 A：使用系统配置的 system name-servers
set service dns forwarding system
# 选项 B：显式指定特定的上游公共 DNS 服务器
set service dns forwarding name-server 8.8.8.8
set service dns forwarding name-server 1.1.1.1

# 5. 特定域名定向转发 (Split-Horizon DNS)
set service dns forwarding domain company.local name-server 10.0.0.50
```
