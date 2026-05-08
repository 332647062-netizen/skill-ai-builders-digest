[English](README.md) | **中文**

# 追踪建造者，而非网红

一个 AI 驱动的信息聚合工具，追踪 AI 领域最顶尖的建造者——研究员、创始人、产品经理和工程师——并将他们的最新动态整理成易于消化的摘要推送给你。

**理念：** 追踪那些真正在做产品、有独立见解的人，而非只会搬运信息的网红。

## 新手使用指令

**只把 GitHub 链接发给 AI 并不能完成安装。** 需要在你自己的电脑上执行（或授权会用终端的 Agent 执行）下面的克隆与 `npm install`，装好后再在对话里做首次引导。

### 1. 终端里：克隆本仓库并安装脚本依赖

**Claude Code**（常用路径）：

```bash
git clone https://github.com/332647062-netizen/skill-ai-builders-digest.git ~/.claude/skills/follow-builders
cd ~/.claude/skills/follow-builders/scripts && npm install
```

**OpenClaw**（示例路径，以你客户端说明为准）：

```bash
git clone https://github.com/332647062-netizen/skill-ai-builders-digest.git ~/skills/follow-builders
cd ~/skills/follow-builders/scripts && npm install
```

不会用 Git？在仓库页 **[Code → Download ZIP](https://github.com/332647062-netizen/skill-ai-builders-digest)** 下载解压，文件夹建议改名为 `follow-builders`，再放到 `~/.claude/skills/` 或 `~/skills/` 下，然后在 `follow-builders/scripts` 里执行 `npm install`。详见 [docs/install-skill-beginners-zh.md](docs/install-skill-beginners-zh.md)。

### 2. 安装 Skill 之后 — 首次引导

向 AI **任选一条**发送即可开始 onboarding：

- 中文：`设置关注动态` / `帮我配置微信公众号摘要推送`
- 英文：`set up follow builders`；若支持斜杠：`/follow-builders`

智能体会继续问你推送频率、时区、语言、发送方式等。更多可复制指令见 [docs/user-ai-prompts-zh.md](docs/user-ai-prompts-zh.md)。

### WeWe RSS（可选）

使用自建 [WeWe RSS](docs/wechat-wewe-rss-iteration.md) 时，请维护 `scripts/sources/wechat-rss-input.json`，或在 `scripts` 目录执行 `npm run sync-wechat-rss` 从 `GET /feeds` 同步订阅列表。

---

## 你会得到什么

每日或每周推送到你常用的通讯工具（Telegram、Discord、WhatsApp 等）的中文公众号 Builder
信号——不是文章全文摘要，而是 **Builder Card**：以"创作者"为单位的信号卡片，几秒就能扫完。

每张卡固定 4 个字段：

- `builder_name` — 公众号 / 创作者名称
- `summary` — 文章内容简介，200～500 字符（不是全文摘要）
- `source_url` — 原文链接
- `keywords` — 文章关键字数组，3～6 个

## 快速开始

1. 在你的 AI agent 中安装此 skill（OpenClaw 或 Claude Code）
2. 输入 "set up follow builders" 或执行 `/follow-builders`
3. Agent 会以对话方式引导你完成设置——不需要手动编辑任何配置文件

Agent 会询问你：
- 推送频率（每日或每周）和时间
- 语言偏好
- 推送方式（Telegram、邮件或直接在聊天中显示）

不需要公众号 API key——文章从你提供的公开链接抓取。
设置完成后，你的第一期摘要会立即推送。

## 修改设置

通过对话即可修改推送偏好。直接告诉你的 agent：

- "改成每周一早上推送"
- "语言换成中文"
- "把摘要写得更简短一些"
- "显示我当前的设置"

公众号信息源由你**自己维护**，编辑 [`scripts/sources/wechat-input.json`](scripts/sources/wechat-input.json) 即可。
随时增删文章 URL，下一次推送会自动生效。

## 自定义 Builder Card

Builder Card 的 prompt 写在 [`scripts/prepare-digest.js`](scripts/prepare-digest.js) 里（搜索 `summarize_wechat`）。
它指挥 LLM 覆写 `summary` 与 `keywords`，让卡片真正像"创作者信号"。
直接编辑这段 prompt 就能调整语气、长度、或者关键字选择方式。

## 信息源：公众号（WeChat）

内容来源就是**中文公众号文章**，由你自己维护：把公开的文章链接粘到一个 JSON 文件里，下一次运行时管线会自动抓取、解析并混编成 Builder Card。无需 API key。

### 维护公众号清单

编辑 [`scripts/sources/wechat-input.json`](scripts/sources/wechat-input.json)：

```json
[
  {
    "title": "为什么我玩MCP少了？",
    "url": "https://mp.weixin.qq.com/s/EAMCvEQxyvN_1flStlvUMg",
    "author": "AI产品黄叔"
  }
]
```

### Builder Card 输出格式

公众号内容在 digest 层以 **Builder Card**（创作者卡片）形式呈现——不是文章全文摘要，而是以"创作者"为单位的信号卡。每张卡固定 4 个字段：

| 字段           | 说明                                           |
|----------------|------------------------------------------------|
| `builder_name` | 公众号 / 创作者名称                            |
| `summary`      | 文章内容简介，200～500 字符（不是全文摘要）    |
| `source_url`   | 原文链接                                       |
| `keywords`     | 文章关键字数组，3～6 个                        |

`node prepare-digest.js` 的输出示例：

```json
{
  "builder_name": "AI产品黄叔",
  "summary": "2025 魔搭开发者大会分享：MCP 太爽了 / MCP 太难了 / MCP 很重要 …（200–500 字符）",
  "source_url": "https://mp.weixin.qq.com/s/EAMCvEQxyvN_1flStlvUMg",
  "keywords": ["Agent", "MCP", "Prompt", "智能体", "上下文"]
}
```

### 推送窗口（北京时间）

- `wechat-parser.js` 从网页解析 **`publish_time`**，统一为 **Asia/Shanghai（北京时间）下的日历日** `YYYY-MM-DD`。
- **`generate-feed.js` 只把「发布日历日 = 北京时间当天的前一天（昨天）」的文章写入 `feed-wechat.json`。**  
  换言之：**你今天生成的推送内容，对应的是北京时间昨天上架的那批公众号图文**（与推文「每日推送」节奏一致）。
- `feed-wechat.json` 里的 **`wechatPublishDayBeijing`** 标明这一次筛选使用的目标日期。
- 调试时可设环境变量 **`WECHAT_TARGET_PUBLISH_DAY=YYYY-MM-DD`** 临时指定目标日（不写则始终用昨天）。

### 内部流程

```
scripts/sources/wechat-input.json
        ↓
scripts/sources/wechat-parser.js   （抓取 mp.weixin.qq.com，解析 title / content / publish_time）
        ↓
feed-wechat.json                   （通过 state-feed.json:seenWechatPosts 去重）
        ↓
scripts/prepare-digest.js          （summary 200–500 字符 与 keywords 3–6 个先用 heuristic
                                     生成；summarize_wechat prompt 让 LLM 在接入后覆盖它们）
        ↓
Builder Card  { builder_name, summary, source_url, keywords }
```

本地运行：

```bash
cd scripts
npm install
node generate-feed.js
node prepare-digest.js
```

## 安装

本 fork 默认克隆地址：

- HTTPS：`https://github.com/332647062-netizen/skill-ai-builders-digest.git`
- SSH：`git@github.com:332647062-netizen/skill-ai-builders-digest.git`

上游模板：[zarazhangrui/follow-builders](https://github.com/zarazhangrui/follow-builders)。

### OpenClaw
```bash
# 从 ClawhHub 安装（即将上线）
clawhub install follow-builders

# 或手动安装（本仓库）
git clone https://github.com/332647062-netizen/skill-ai-builders-digest.git ~/skills/follow-builders
cd ~/skills/follow-builders/scripts && npm install
```

### Claude Code
```bash
git clone https://github.com/332647062-netizen/skill-ai-builders-digest.git ~/.claude/skills/follow-builders
cd ~/.claude/skills/follow-builders/scripts && npm install
```

## 系统要求

- 一个 AI agent（OpenClaw、Claude Code 或类似工具）
- 网络连接（用于获取中心化 feed）

仅此而已。不需要任何 API key——公众号文章直接从你提供的 `mp.weixin.qq.com` 链接抓取。

## 工作原理

1. 你在 `scripts/sources/wechat-input.json` 里维护要追踪的公众号文章 URL 列表
2. `generate-feed.js` 抓取每个 URL，解析出 title / content / publish_time，写入 `feed-wechat.json`（通过 `state-feed.json:seenWechatPosts` 去重）
3. `prepare-digest.js` 把每条内容转成 Builder Card，并输出 4 字段 JSON
4. 推送到你的通讯工具（或直接在聊天中显示）

## 隐私

- 不发送任何 API key——公众号内容从你提供的公开链接抓取
- 如果你使用 Telegram/邮件推送，相关 key 仅存储在本地 `~/.follow-builders/.env`
- Skill 只读取你显式加到清单里的公开公众号文章
- 你的配置、偏好和阅读记录都保留在你自己的设备上

## 许可证

MIT
