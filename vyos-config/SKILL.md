---
name: vyos-config
description: Use when explaining VyOS 1.5 configuration, generating VyOS config snippets, modifying existing boot configs, or troubleshooting networking and firewall issues on VyOS routers.
---

# VyOS 1.5 配置技能 (vyos-config)

## 适用场景

本技能在以下场景中触发并激活：
- 用户需要解释、查看、理解 VyOS 1.5 (circinus) 的配置语法或整体架构时。
- 用户要求为特定的网络拓扑、网络服务（如 DHCP、DNS 转发、SSH、NAT）生成 VyOS 1.5 的 `set` 命令序列或层级配置文件时。
- 用户需要对现有的 VyOS 配置进行修改、优化、删除节点或安全性增强时。
- 用户遇到 VyOS 路由器排错、防火墙过滤失效、NAT 不回流等网络连通性故障时。

## 排除场景

本技能在以下场景中**不**应执行：
- 询问与 VyOS 配置无关的通用 Linux 系统运维命令。
- 与配置无关的 VyOS 镜像打包、内核驱动编译或底层代码修改。
- 涉及已废弃的 VyOS 老版本（如 1.1 或更早版本）特有且已被替代的命令语法。

## 核心规则与守则 (Hard Rules)

- **绝对真实**：严禁凭空编造 VyOS 不存在的配置项或字段。所有生成的命令必须严格遵守 VyOS 1.5 语法事实。
- **两阶段提交意识**：生成配置脚本时，在结尾必须显式包含 `commit` 和 `save` 步骤，以防修改在重启后丢失。
- **防止失联**：对于敏感配置修改（如防火墙 input 链、远程 SSH 管理或 WAN 口 IP 切换），应主动推荐使用 `commit-confirm`。
- **结构检索**：所有的产品底层知识必须来自 `references/` 目录下的参考文件。本文件仅规定流程与红线。

## 操作流程 (Workflow)

1. **意图识别**：判断用户请求属于以下哪一类：
   - 概念解释 (Lookup) -> 载入 [config-overview.md](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/config-overview.md) 并解释。
   - 基础系统/服务生成 (Services) -> 载入 [system-and-services.md](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/system-and-services.md)。
   - 接口与路由规划 (Routing) -> 载入 [interfaces-and-routing.md](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/interfaces-and-routing.md)。
   - 防火墙与 NAT (Firewall/NAT) -> 载入 [security-and-nat.md](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/security-and-nat.md)。
   - 经典场景套用 (Recipe) -> 载入 [recipes.md](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/recipes.md)。
   - 网络排错与冲突排查 (Troubleshooting) -> 载入 [troubleshooting.md](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/troubleshooting.md)。
2. **命令组装**：优先使用 `set` 式平铺命令序列输出，以便用户可以直接在配置模式下粘贴执行。
3. **安全审计**：对于防火墙规则和 DNS 转发规则，应检查是否存在安全隐患（如 `0.0.0.0/0` 的 DNS 放行或多余的 input 端口暴露）。
4. **最终验证**：在回复前，自检配置中引用的接口名（如 `eth0`）、网段范围是否保持一致。

## 载入参考列表

根据问题类型，加载对应的参考文件：
- [配置基础与工作流](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/config-overview.md)
- [系统及基础服务配置](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/system-and-services.md)
- [接口与路由配置](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/interfaces-and-routing.md)
- [防火墙与 NAT 配置](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/security-and-nat.md)
- [实用配置配方 (Recipes)](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/recipes.md)
- [排错与配置冲突指南](file:///C:/Users/xadin/.gemini/config/skills/vyos-config/references/troubleshooting.md)
