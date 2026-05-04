# myskill

这是一个收集 Codex skill 的私有仓库，当前包含网络配置类与铁路车次查询类 skill。

## Skills

- `smartdns-config/`：用于解释、生成、修改和排障 SmartDNS 配置
- `sing-box-config/`：用于解释、生成、修改和排障 sing-box 配置
- `mosdns-config/`：用于基于官方 mosdns wiki 解释、生成、修改和排障 mosdns 配置，覆盖 v4 / v5 差异以及 v4 -> v5 迁移
- `config-doc-skill-builder/`：用于把官方配置文档站整理成可复用、可校验、可自包含的配置类 Codex skill
- `12306/`：用于查询中国铁路 12306 车次、余票、车站信息，以及带到达截止时间的一次中转方案

## 便捷安装

仓库提供 `scripts/install-skills.sh`，用于把本仓库内的 skill 快速安装到本地 skill 目录（默认使用软链接，便于后续更新）。

扫描范围：

- 仓库根目录下包含 `SKILL.md` 的一级目录
- `.codex/skills/` 下包含 `SKILL.md` 的目录（同名时优先使用根目录版本）

### 快速开始

```bash
# 首次使用，增加执行权限
chmod +x scripts/install-skills.sh

# 查看可安装的 skill
./scripts/install-skills.sh --list

# 安装全部 skill（自动识别目标目录）
./scripts/install-skills.sh

# 仅安装指定 skill
./scripts/install-skills.sh smartdns-config sing-box-config
```

默认目标目录自动识别顺序：

1. `~/.codex/skills`
2. `~/.claude/skills`
3. 若都不存在，则默认创建并使用 `~/.codex/skills`

### 常用参数

- `--target auto|codex|claude`：指定目标类型（默认 `auto`）
- `--dest <path>`：自定义安装目录（优先级高于 `--target`）
- `--mode symlink|copy`：安装方式（默认 `symlink`）
- `--force`：覆盖目标目录同名 skill
- `--dry-run`：仅预览操作，不实际写入

### 示例

```bash
# 安装到 ~/.claude/skills
./scripts/install-skills.sh --target claude

# 使用复制模式并覆盖已存在版本
./scripts/install-skills.sh --mode copy --force 12306

# 先预览再执行
./scripts/install-skills.sh --dry-run china-hotel-comparison
```

### 卸载

若使用软链接安装，可直接删除目标目录中的对应条目：

```bash
rm -rf ~/.codex/skills/<skill-name>
# 或
rm -rf ~/.claude/skills/<skill-name>
```

## 说明

仓库仅包含 skill 成品，不包含构建阶段抓取的原始资料。

## mosdns Skill 说明

`mosdns-config/` 当前包含：

- 基于官方 wiki 整理的 v5 配置参考
- 基于官方 wiki 整理的 v4 配置参考
- v4 / v5 关键差异对照
- 常见配置配方与排错参考
- 基于官方页面归纳的 v4 -> v5 迁移参考

## 12306 Skill 用法

目录结构：

- `12306/SKILL.md`
- `12306/scripts/query.mjs`：直达车次查询
- `12306/scripts/stations.mjs`：车站查询
- `12306/scripts/transfer-query.mjs`：一次中转查询

示例：

```bash
# 查询直达车次
node 12306/scripts/query.mjs 北京 上海 -d 2026-05-01 -f md

# 查询车站列表
node 12306/scripts/stations.mjs 武汉

# 查询到达截止时间内的最佳直达/一次中转方案
node 12306/scripts/transfer-query.mjs 贵阳 泸州 -d 2026-05-01 --arrive-before 12:00 --view both
```
