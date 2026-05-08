# 微信公众号采集：WeWe RSS 迭代说明

**版本焦点**：将公众号源从「手动维护单篇链接」升级为「WeWe RSS / Atom 自动订阅」，并扩展时间窗与测试用去重开关。

**提交信息（参考）**：`feat: add WeWe RSS source for WeChat builders digest`

---

## 背景与目标

- **此前**：依赖 `scripts/sources/wechat-input.json` 中的文章 URL，由 `wechat.js` 拉取并解析页面。
- **现在**：在自建 **WeWe RSS** 实例上订阅公众号后，通过 **Feed URL** 自动拉取条目，减少手工维护。
- **主数据流**：

  `wechat-rss-input.json` → `wechat-rss.js` → `generate-feed.js` → `feed-wechat.json` → `prepare-digest.js`

---

## 新增与变更文件

| 路径 | 说明 |
|------|------|
| `scripts/sources/wechat-rss-input.json` | RSS/Atom 订阅配置（每个公众号一条 `feed_url`） |
| `scripts/sources/wechat-rss.js` | 读取配置、拉取 Feed、解析 **Atom（WeWe 默认）** 与 **RSS 2.0**，输出与管线一致的 builder 条目 |
| `scripts/sources/shanghai-date.js` | 新增 `addCalendarDaysShanghai`，用于按北京日历计算时间窗 |
| `scripts/generate-feed.js` | 优先走 RSS；时间窗与 `RESET_SEEN`；`feed-wechat.json` 增加窗口元数据 |
| `scripts/prepare-digest.js` | Builder Card 对外字段 `keywords` 更名为 **`skills`**（抽取逻辑不变） |

`scripts/sources/wechat-input.json` 与 `wechat.js` **保留**，仅当 **未配置有效 RSS**（见下）时作为回退。

---

## 与 WeWe 订阅保持同步

在 WeWe 控制台 **新增 / 删除** 公众号后，本仓库 **不会**自动感知，需要更新 `wechat-rss-input.json`。

**方式 A — 一键同步（推荐）**

在 `scripts` 目录执行（`WEWE_BASE_URL` 为你的 WeWe 根地址，无尾斜杠）：

```bash
cd scripts
WEWE_BASE_URL=http://YOUR_HOST:4000 npm run sync-wechat-rss
```

若已能在 `wechat-rss-input.json` 里看到正确的 `feed_url`，也可 **省略** `WEWE_BASE_URL`，脚本会从第一条 `feed_url` 推断 `origin`。

然后提交变更的 `wechat-rss-input.json`（若走 GitHub Actions，需 push 后才会在 CI 里生效）。

**方式 B — 手工**

1. 浏览器或 `curl` 打开 `GET http://<host>:4000/feeds`，从 JSON 里取每个号的 `id`、`name`。  
2. 按下列格式在 `wechat-rss-input.json` 中增删条目，`feed_url` 为 `http://<host>:4000/feeds/<id>`。

---

## 订阅配置格式

文件：`scripts/sources/wechat-rss-input.json`

```json
[
  {
    "builder_name": "公众号或创作者名称",
    "platform": "wechat",
    "feed_url": "http://YOUR_HOST:4000/feeds/MP_WXS_xxxxxxxx"
  }
]
```

**WeWe 实例说明**：

- 可在 `GET http://<host>:4000/feeds` 获取已订阅列表（JSON，含公众号 `id`、`name` 等）。
- 单号 Feed 一般为：**`http://<host>:4000/feeds/<id>`**，响应类型多为 **`application/atom+xml`**（非必须带 `/rss` 后缀）。
- `wechat-rss.js` 会跳过明显占位地址（如路径中含 `/xxx/`）。

---

## 时间窗与去重

### 时间窗（北京时间、日历日）

- **默认**：`WECHAT_LOOKBACK_DAYS` 未设置或为 `1` 时，窗口为 **仅「昨天」一天**（与此前「只收昨天」语义一致）。
- **扩展**：例如 `WECHAT_LOOKBACK_DAYS=3` 时，窗口为 **`[昨天 - 2 天, 昨天]`**（含端点，共 3 个日历日）。
- **测试覆盖**：`WECHAT_TARGET_PUBLISH_DAY=YYYY-MM-DD` 时，只收录该日，忽略上述 lookback 区间。

### 去重

- 仍使用仓库根目录 **`state-feed.json`** 中的 `seenWechatPosts`。
- **`RESET_SEEN=true`**：当次运行**不**因已见记录跳过条目（便于重复测同一篇）；写入逻辑仍按原逻辑更新 state。

---

## 环境变量一览

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WECHAT_LOOKBACK_DAYS` | `1` | 从「昨天」起向前共 N 个北京日历日（含昨天） |
| `WECHAT_TARGET_PUBLISH_DAY` | 无 | 指定单日，用于本地/CI 精测 |
| `RESET_SEEN` | 未设置 | 设为 `true` / `1` / `yes` 时跳过 seen 过滤 |

---

## `feed-wechat.json` 元数据（新增字段）

除原有 `wechat` 数组与 `stats` 外，可包含：

- `wechatPublishDayBeijing`：窗口结束日（未覆盖时一般为「昨天」）。
- `wechatPublishWindowBeijing`：`{ "start", "end" }`。
- `wechatLookbackDays`：生效的 lookback 天数（单日覆盖时为 `1`）。

单条 `wechat` 项仍包含：`source`、`builder_name`、`title`、`content`、`publish_time`、`source_url` 等。

---

## `prepare-digest.js` 输出（Builder Card）

每条 `wechat` 卡片字段示例：

- `builder_name` — 公众号名称  
- `summary` — 由正文/摘要启发式生成（无正文时可能接近标题）  
- `source_url` — 原文链接  
- `skills` — 由关键词词库匹配的 0～6 个标签（原 `keywords`）  
- `_title`、`_publish_time` — 供 LLM 使用的原始字段  

---

## 本地验证命令

```bash
cd scripts

# 默认：RSS 优先（需 wechat-rss-input.json 中有效 feed_url）
node generate-feed.js

# 扩展窗口 + 忽略 seen（测录用）
WECHAT_LOOKBACK_DAYS=3 RESET_SEEN=true node generate-feed.js

# 指定单日
WECHAT_TARGET_PUBLISH_DAY=2026-05-08 RESET_SEEN=true node generate-feed.js

node prepare-digest.js
```

确认：`feed-wechat.json` 中含 `builder_name`、`title`、`source_url`、`publish_time`；`prepare-digest.js` 的 stdout JSON 中含 `builder_name`、`summary`、`source_url`、`skills`。

---

## 源选择逻辑（`generate-feed.js`）

1. 若 `wechat-rss-input.json` 中存在 **至少一条非占位** `feed_url` → **仅**走 `loadWechatRssSources()`。  
2. 否则 → 回退 `loadWechatSources()`（`wechat-input.json` + 单页解析）。

---

## 本阶段明确不包含

- 前端页面、数据库  
- 小红书 / 小宇宙 / 抖音 / 视频号  
- 自动登录微信、复杂反爬  

---

## 参考链接

- 仓库：<https://github.com/332647062-netizen/skill-ai-builders-digest>  
- WeWe RSS 部署与控制台以各自主机为准（例如 `http://<host>:4000`，常见路径 `/dash`、`/feeds`）。
