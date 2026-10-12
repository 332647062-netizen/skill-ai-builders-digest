# 网页信源（替代公众号）

当 `scripts/sources/web-sites-input.json` 中存在有效 `index_url` 时，`generate-feed.js` **只拉网页源，不再拉 WeWe / wechat-input**。

## 当前站点

| 名称 | 地址 | 解析方式 |
|------|------|----------|
| 独立开发日报 | https://aihot.dev/zh/ | 抓**中文站** HTML：中文标题、约 200 字简介、标题内嵌的**原文独立 URL**；`publish_time` 取页面刊期（如「独立开发日报 2026/8/6」），**不再伪造成昨天** |
| 腾讯研究院 AI 研究情报库 | https://www.alphapulse-lan.online/ | 抓 `articles.js`；按文章日期过滤。站点数据里的原文是**飞书私有 wiki**（外人无权限），推送 `source_url` 改为公开情报库检索页 `?q=标题#library`，避免点开「没有权限访问」 |

## 改关注列表

编辑 `scripts/sources/web-sites-input.json`（增删对象即可）。示例：

```json
[
  {
    "builder_name": "AI Hot Daily",
    "platform": "web",
    "site": "aihot",
    "index_url": "https://aihot.dev/"
  },
  {
    "builder_name": "腾讯研究院 AI 研究情报库",
    "platform": "web",
    "site": "alphapulse",
    "index_url": "https://www.alphapulse-lan.online/",
    "articles_url": "https://www.alphapulse-lan.online/articles.js"
  }
]
```

若要**重新改回公众号**：把 `web-sites-input.json` 改成 `[]`，并在 `wechat-rss-input.json` 里恢复 WeWe 的 `feed_url`。

## 本地测试

```bash
cd scripts
WECHAT_LOOKBACK_DAYS=3 RESET_SEEN=true node generate-feed.js
node prepare-digest.js
```

产物仍是仓库根目录的 `feed-wechat.json`（字段形状不变，`source` 为 `"web"`）。
