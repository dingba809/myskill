# myskill

这是一个收集 Codex skill 的私有仓库，当前包含网络配置类与铁路车次查询类 skill。

## Skills

- `smartdns-config/`：用于解释、生成、修改和排障 SmartDNS 配置
- `sing-box-config/`：用于解释、生成、修改和排障 sing-box 配置
- `config-doc-skill-builder/`：用于把官方配置文档站整理成可复用、可校验、可自包含的配置类 Codex skill
- `12306/`：用于查询中国铁路 12306 车次、余票、车站信息，以及带到达截止时间的一次中转方案

## 说明

仓库仅包含 skill 成品，不包含构建阶段抓取的原始资料。

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
