---
name: mosdns-config
description: Use when explaining, generating, editing, or troubleshooting mosdns configuration from the official mosdns wiki, especially when v4 and v5 syntax differences matter.
---

# Mosdns Config

## 何时使用

当用户需要基于 mosdns 官方 wiki 处理配置相关任务时使用本技能，包括：

- 解释某个配置字段、插件或规则的含义
- 按需求生成新的 mosdns 配置片段
- 修改现有配置并保持原有版本语法
- 排查配置错误、版本混用、规则不生效等问题

本技能同时覆盖 mosdns v5 和 mosdns v4。两者配置模型差异明显，必须先识别版本。

## 不适用

- 仅安装、编译、打包、服务管理，不涉及配置内容
- 需要依赖社区博客、issue 或非官方资料才能回答的问题
- 需要推断未在官方文档出现的字段、默认值或行为

## 工作流程

1. 先判断配置属于 v5 还是 v4。
   - v5 常见特征：顶层只有 `plugins`，服务端也是插件，如 `udp_server` / `tcp_server` / `http_server`。
   - v4 常见特征：顶层通常有 `data_providers`、`plugins`、`servers`。
2. 先读 `references/config-overview.md` 了解整体模型和来源边界。
3. 再读 `references/version-differences.md`，确认是否存在版本混用风险。
4. 按版本加载对应参考：
   - v5: `references/v5-reference.md`
   - v4: `references/v4-reference.md`
5. 如果任务是把 v4 配置迁到 v5，先读 `references/migration-v4-to-v5.md`。
6. 需要生成或改写配置时，再读 `references/recipes.md`。
7. 需要定位问题时，再读 `references/troubleshooting.md`。
8. 如需引用来源或核对覆盖范围，读 `references/sources.md`。

## 硬性规则

- 绝不混用 v4 和 v5 语法。
- 绝不编造文档未写明的字段、默认值、插件能力或兼容性结论。
- 文档标注了 `(实验性)`、`(v5.3+)`、`(v4.2+)`、`(v4.5.3+)` 等版本门槛时，必须原样保留这个限制。
- 如果用户没提供版本，先从现有配置形态推断；仍不确定时，明确说明风险，不把猜测当事实。
- 做版本对比或迁移建议时，可以做“基于官方页面结构的归纳”，但必须明确这是归纳，不是官方原句。
- 编辑用户配置时，优先保留现有目录拆分、命名风格和插件组织方式。
