[English](README.md) | **中文**

# 追踪建造者，而非网红

一个 AI 驱动的信息聚合工具，追踪 AI 领域最顶尖的建造者——研究员、创始人、产品经理和工程师——并将他们的最新动态整理成易于消化的摘要推送给你。

**理念：** 追踪那些真正在做产品、有独立见解的人，而非只会搬运信息的网红。

## 你会得到什么

每日或每周推送到你常用的通讯工具（Telegram、Discord、WhatsApp 等）的中文公众号 Builder
信号——不是文章全文摘要，而是 **Builder Card**：以"创作者"为单位的信号卡片，几秒就能扫完。

每张卡固定 5 个字段：

- `builder_name` — 公众号 / 创作者名称
- `insight_summary` — 1～2 句洞察提炼（100～150 字），不是全文摘要
- `source_url` — 原文链接
- `skills` — 技能 / 主题标签数组
- `signal_type` — `观点 / 工具 / 案例 / 方法论` 四选一

## 快速开始

1. 在你的 AI agent 中安装此 skill（OpenClaw 或 Claude Code）
2. 输入 "set up follow builders" 或执行 `/follow-builders`
3. Agent 会以对话方式引导你完成设置——不需要手动编辑任何配置文件

Agent 会询问你：
- 推送频率（每日或每周）和时间
- 语言偏好
- 推送方式（Telegram、邮件或直接在聊天中显示）

不需要任何 API key——所有内容由中心化服务统一抓取。
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
它指挥 LLM 覆写 `insight_summary` 与 `signal_type`，让卡片真正像"创作者信号"。
直接编辑这段 prompt 就能调整语气、长度、或者你希望的 `signal_type` 取值。

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

公众号内容在 digest 层以 **Builder Card**（创作者卡片）形式呈现——不是文章全文摘要，而是以"创作者"为单位的信号卡。每张卡固定 5 个字段：

| 字段              | 说明                                          |
|-------------------|-----------------------------------------------|
| `builder_name`    | 公众号 / 创作者名称                           |
| `insight_summary` | 1～2 句洞察提炼（100～150 字），不是全文摘要  |
| `source_url`      | 原文链接                                      |
| `skills`          | 技能 / 主题标签数组                           |
| `signal_type`     | `观点` / `工具` / `案例` / `方法论` 四选一    |

`node prepare-digest.js` 的输出示例：

```json
{
  "builder_name": "AI产品黄叔",
  "insight_summary": "MCP 太爽了 / 太难了 / 很重要 …",
  "source_url": "https://mp.weixin.qq.com/s/EAMCvEQxyvN_1flStlvUMg",
  "skills": ["Agent", "MCP", "Prompt", "智能体", "上下文"],
  "signal_type": "工具"
}
```

### 内部流程

```
scripts/sources/wechat-input.json
        ↓
scripts/sources/wechat-parser.js   （抓取 mp.weixin.qq.com，解析 title / content / publish_time）
        ↓
feed-wechat.json                   （通过 state-feed.json:seenWechatPosts 去重）
        ↓
scripts/prepare-digest.js          （insight_summary 与 signal_type 先用确定性 heuristic
                                     生成；summarize_wechat prompt 让 LLM 在接入后覆盖它们）
        ↓
Builder Card  { builder_name, insight_summary, source_url, skills, signal_type }
```

本地运行：

```bash
cd scripts
npm install
node generate-feed.js --wechat-only
node prepare-digest.js
```

## 安装

### OpenClaw
```bash
# 从 ClawhHub 安装（即将上线）
clawhub install follow-builders

# 或手动安装
git clone https://github.com/zarazhangrui/follow-builders.git ~/skills/follow-builders
cd ~/skills/follow-builders/scripts && npm install
```

### Claude Code
```bash
git clone https://github.com/zarazhangrui/follow-builders.git ~/.claude/skills/follow-builders
cd ~/.claude/skills/follow-builders/scripts && npm install
```

## 系统要求

- 一个 AI agent（OpenClaw、Claude Code 或类似工具）
- 网络连接（用于获取中心化 feed）

仅此而已。不需要任何 API key——公众号文章直接从你提供的 `mp.weixin.qq.com` 链接抓取。

## 工作原理

1. 你在 `scripts/sources/wechat-input.json` 里维护要追踪的公众号文章 URL 列表
2. `generate-feed.js` 抓取每个 URL，解析出 title / content / publish_time，写入 `feed-wechat.json`（通过 `state-feed.json:seenWechatPosts` 去重）
3. `prepare-digest.js` 把每条内容转成 Builder Card，并输出 5 字段 JSON
4. 推送到你的通讯工具（或直接在聊天中显示）

## 隐私

- 不发送任何 API key——所有内容由中心化服务获取
- 如果你使用 Telegram/邮件推送，相关 key 仅存储在本地 `~/.follow-builders/.env`
- Skill 只读取你显式加到清单里的公开公众号文章
- 你的配置、偏好和阅读记录都保留在你自己的设备上

## 许可证

MIT
