# 网页信源（替代公众号）

当 `scripts/sources/web-sites-input.json` 中存在有效 `index_url` / `feed_url` 时，`generate-feed.js` **优先拉网页源，不再拉 WeWe / wechat-input**。

默认推送窗口仍是北京时间 **昨天**；带 `rolling_daily` 的热榜会钉到窗口结束日。

## 当前站点

| 名称 | 地址 | 解析方式 | AI 过滤 |
|------|------|----------|--------|
| 独立开发日报 | https://aihot.dev/zh/ | 中文站 HTML：标题 / ~200 字简介 / 标题内嵌原文 URL；刊期取页面日期 | 关（本身为 AI 日刊） |
| 腾讯研究院 AI 研究情报库 | https://www.alphapulse-lan.online/ | `articles.js`；主链接为公开检索页（飞书私链仅备注） | 开 |
| AIHOT | https://aihot.news/all | **RSS** `https://aihot.news/feed.xml`（比 SPA `/all` 稳） | 关 |
| AIHOT (virxact) | https://aihot.virxact.com/ | **跳过**（已 301 到 aihot.news，避免重复） | — |
| 今日热榜·AI | https://tophub.today/c/ai | HTML 热榜条目；`rolling_daily` | 开 |
| SoPilot 热帖 | https://sopilot.net/zh/hot-tweets | SSR 中的 x.com/status 链接（客户端渲染较多，条数可能偏少）；`rolling_daily` | 开 |
| Ben's Bites | https://www.bensbites.com/ | RSS `https://www.bensbites.com/feed` | 开 |

`ai_filter: true` 时用关键词（AI / LLM / 大模型 / 智能体等）过滤标题与简介，只保留偏 AI 的资讯。

## 改关注列表

编辑 `scripts/sources/web-sites-input.json`。字段：

- `site`：`aihot` | `alphapulse` | `aihot-news` / `rss` | `tophub` | `sopilot` | `bensbites` | `aihot-virxact`
- `feed_url`：RSS 源（aihot.news / Ben's Bites）
- `ai_filter`：是否做 AI 关键词过滤
- `max_items`：单源最多条数（默认 12）

若要**改回公众号**：把该文件设为 `[]`，并恢复 `wechat-rss-input.json`。

## 本地测试

```bash
cd scripts
RESET_SEEN=true node generate-feed.js
# 或指定日
WECHAT_TARGET_PUBLISH_DAY=2026-10-11 RESET_SEEN=true node generate-feed.js
node prepare-digest.js
```
