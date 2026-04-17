# 来源与覆盖范围

## 官方来源

本技能整理自以下官方 mosdns wiki 页面：

- `https://irine-sistiana.gitbook.io/mosdns-wiki/`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns/sequence-cha-jian`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns/fu-wu-qi-cha-jian`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns/ke-zhi-xing-cha-jian`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns/shu-ju-cha-jian`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns/yu-ming-pi-pei-gui-ze`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v5/ru-he-pei-zhi-mosdns/pi-pei-qi-cha-jian`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v4/ru-he-pei-zhi-mosdns`
- `https://irine-sistiana.gitbook.io/mosdns-wiki/mosdns-v4/cha-jian-ji-qi-can-shu`

## 本技能覆盖的配置面

- v5 顶层配置
- v5 `sequence`、服务器插件、数据插件、`forward`
- v5 域名匹配规则与“暂无独立匹配器插件”的限制
- v4 顶层配置
- v4 `data_providers`、`servers`、`sequence`
- v4 `fast_forward`、`query_matcher`、`response_matcher`
- 基于上述页面归纳的 v4 -> v5 迁移方法
- 两个版本的常见样例与排错点

## 未刻意覆盖的内容

以下内容不作为本技能的重点参考面，只有在用户明确追问时才应回到官方文档重新核对：

- API 详细接口
- Debug 内存与性能问题
- 编写新插件
- 文档未进入当前整理范围的插件细节

## 使用边界

- 本技能优先回答“官方页面已经明示”的配置事实
- 对于跨版本迁移建议，属于基于官方页面做的归纳，不是官方原文
- 如果用户需求超出本文件列出的页面覆盖范围，应明确说明需要补充核对官方页面
