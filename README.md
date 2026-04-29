**English** | [中文](README.zh-CN.md)

# Follow Builders, Not Influencers

An AI-powered digest that tracks the top builders in AI — researchers, founders, PMs,
and engineers who are actually building things — and delivers curated summaries of
what they're saying.

**Philosophy:** Follow people who build products and have original opinions, not
influencers who regurgitate information.

## What You Get

A daily or weekly digest of **Chinese WeChat (公众号) AI builders**, delivered to your
preferred messaging app (Telegram, Discord, WhatsApp, etc.) — but instead of article
summaries, you get **Builder Cards**: creator-centric signals you can scan in seconds.

Each card has 4 fixed fields:

- `builder_name` — 公众号 / 创作者名称
- `summary` — 文章内容简介，200–500 字符（不是全文摘要）
- `source_url` — 原文链接
- `keywords` — 文章关键字数组，3–6 个

## Quick Start

1. Install the skill in your agent (OpenClaw or Claude Code)
2. Say "set up follow builders" or invoke `/follow-builders`
3. The agent walks you through setup conversationally — no config files to edit

The agent will ask you:
- How often you want your digest (daily or weekly) and what time
- What language you prefer
- How you want it delivered (Telegram, email, or in-chat)

No API keys needed — all content is fetched centrally.
Your first digest arrives immediately after setup.

## Changing Settings

Your delivery preferences are configurable through conversation. Just tell your agent:

- "Switch to weekly digests on Monday mornings"
- "Change language to Chinese"
- "Make the summaries shorter"
- "Show me my current settings"

The list of WeChat sources is **maintained by you** in
[`scripts/sources/wechat-input.json`](scripts/sources/wechat-input.json).
Add or remove article URLs whenever you want — the next digest picks them up.

## Customizing the Builder Card

The Builder Card prompt lives inline in
[`scripts/prepare-digest.js`](scripts/prepare-digest.js) (look for `summarize_wechat`).
It instructs the LLM to overwrite `summary` and `keywords` with real, on-brand
output once an LLM is wired in. You can edit that prompt directly to change
tone, length, or how keywords are picked.

## Source: WeChat (公众号)

The content channel is **Chinese WeChat (公众号) articles**, maintained by you:
you paste public article URLs into a small JSON file, and the pipeline fetches,
parses, and remixes them on the next run. No API key required.

### Maintaining your WeChat list

Edit [`scripts/sources/wechat-input.json`](scripts/sources/wechat-input.json):

```json
[
  {
    "title": "为什么我玩MCP少了？",
    "url": "https://mp.weixin.qq.com/s/EAMCvEQxyvN_1flStlvUMg",
    "author": "AI产品黄叔"
  }
]
```

### Builder Card output format

WeChat content is exposed in the digest as **Builder Cards** — creator-centric
signals, not article summaries. Each card has exactly 4 fields:

| Field          | Description                                      |
|----------------|--------------------------------------------------|
| `builder_name` | 公众号 / 创作者名称                              |
| `summary`      | 文章内容简介，200–500 字符（不是全文摘要）       |
| `source_url`   | 原文链接                                         |
| `keywords`     | 文章关键字数组，3–6 个                           |

Example output from `node prepare-digest.js`:

```json
{
  "builder_name": "AI产品黄叔",
  "summary": "2025 魔搭开发者大会分享：MCP 太爽了 / MCP 太难了 / MCP 很重要 …（200–500 字符）",
  "source_url": "https://mp.weixin.qq.com/s/EAMCvEQxyvN_1flStlvUMg",
  "keywords": ["Agent", "MCP", "Prompt", "智能体", "上下文"]
}
```

### How it works

```
scripts/sources/wechat-input.json
        ↓
scripts/sources/wechat-parser.js   (fetch mp.weixin.qq.com, extract title/content/publish_time)
        ↓
feed-wechat.json                   (deduped via state-feed.json:seenWechatPosts)
        ↓
scripts/prepare-digest.js          (heuristic 200–500 字符 summary + 3–6 keywords;
                                    summarize_wechat prompt lets an LLM overwrite them)
        ↓
Builder Card  { builder_name, summary, source_url, keywords }
```

Run it locally:

```bash
cd scripts
npm install
node generate-feed.js --wechat-only
node prepare-digest.js
```

## Installation

### OpenClaw
```bash
# From ClawhHub (coming soon)
clawhub install follow-builders

# Or manually
git clone https://github.com/zarazhangrui/follow-builders.git ~/skills/follow-builders
cd ~/skills/follow-builders/scripts && npm install
```

### Claude Code
```bash
git clone https://github.com/zarazhangrui/follow-builders.git ~/.claude/skills/follow-builders
cd ~/.claude/skills/follow-builders/scripts && npm install
```

## Requirements

- An AI agent (OpenClaw, Claude Code, or similar)
- Internet connection (to fetch the central feed)

That's it. No API keys needed — WeChat articles are fetched directly from
`mp.weixin.qq.com` URLs you supply.

## How It Works

1. You maintain a list of public WeChat article URLs in `scripts/sources/wechat-input.json`
2. `generate-feed.js` fetches each URL, extracts title / content / publish_time, and writes
   `feed-wechat.json` (deduped via `state-feed.json:seenWechatPosts`)
3. `prepare-digest.js` turns each item into a Builder Card and exposes the 4-field JSON
4. The digest is delivered to your messaging app (or shown in-chat)

## Privacy

- No API keys are sent anywhere — WeChat content is fetched from the public URLs you provide
- If you use Telegram/email delivery, those keys are stored locally in `~/.follow-builders/.env`
- The skill only reads public content (public WeChat articles you explicitly add to the input list)
- Your configuration, preferences, and reading history stay on your machine

## License

MIT

