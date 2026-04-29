**English** | [中文](README.zh-CN.md)

# Follow Builders, Not Influencers

An AI-powered digest that tracks the top builders in AI — researchers, founders, PMs,
and engineers who are actually building things — and delivers curated summaries of
what they're saying.

**Philosophy:** Follow people who build products and have original opinions, not
influencers who regurgitate information.

## What You Get

A daily or weekly digest delivered to your preferred messaging app (Telegram, Discord,
WhatsApp, etc.) with:

- Summaries of new podcast episodes from top AI podcasts
- Key posts and insights from 25 curated AI builders on X/Twitter
- Full articles from official AI company blogs (Anthropic Engineering, Claude Blog)
- Links to all original content
- Available in English, Chinese, or bilingual

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

The source list (builders and podcasts) is curated centrally and updates
automatically — you always get the latest sources without doing anything.

## Customizing the Summaries

The skill uses plain-English prompt files to control how content is summarized.
You can customize them two ways:

**Through conversation (recommended):**
Tell your agent what you want — "Make summaries more concise," "Focus on actionable
insights," "Use a more casual tone." The agent updates the prompts for you.

**Direct editing (power users):**
Edit the files in the `prompts/` folder:
- `summarize-podcast.md` — how podcast episodes are summarized
- `summarize-tweets.md` — how X/Twitter posts are summarized
- `summarize-blogs.md` — how blog posts are summarized
- `digest-intro.md` — the overall digest format and tone
- `translate.md` — how English content is translated to Chinese

These are plain English instructions, not code. Changes take effect on the next digest.

## Default Sources

### Podcasts (6)
- [Latent Space](https://www.youtube.com/@LatentSpacePod)
- [Training Data](https://www.youtube.com/playlist?list=PLOhHNjZItNnMm5tdW61JpnyxeYH5NDDx8)
- [No Priors](https://www.youtube.com/@NoPriorsPodcast)
- [Unsupervised Learning](https://www.youtube.com/@RedpointAI)
- [The MAD Podcast with Matt Turck](https://www.youtube.com/@DataDrivenNYC)
- [AI & I by Every](https://www.youtube.com/playlist?list=PLuMcoKK9mKgHtW_o9h5sGO2vXrffKHwJL)

### AI Builders on X (25)
[Andrej Karpathy](https://x.com/karpathy), [Swyx](https://x.com/swyx), [Josh Woodward](https://x.com/joshwoodward), [Kevin Weil](https://x.com/kevinweil), [Peter Yang](https://x.com/petergyang), [Nan Yu](https://x.com/thenanyu), [Madhu Guru](https://x.com/realmadhuguru), [Amanda Askell](https://x.com/AmandaAskell), [Cat Wu](https://x.com/_catwu), [Thariq](https://x.com/trq212), [Google Labs](https://x.com/GoogleLabs), [Amjad Masad](https://x.com/amasad), [Guillermo Rauch](https://x.com/rauchg), [Alex Albert](https://x.com/alexalbert__), [Aaron Levie](https://x.com/levie), [Ryo Lu](https://x.com/ryolu_), [Garry Tan](https://x.com/garrytan), [Matt Turck](https://x.com/mattturck), [Zara Zhang](https://x.com/zarazhangrui), [Nikunj Kothari](https://x.com/nikunj), [Peter Steinberger](https://x.com/steipete), [Dan Shipper](https://x.com/danshipper), [Aditya Agarwal](https://x.com/adityaag), [Sam Altman](https://x.com/sama), [Claude](https://x.com/claudeai)

### Official Blogs (2)
- [Anthropic Engineering](https://www.anthropic.com/engineering) — technical deep-dives from the Anthropic team
- [Claude Blog](https://claude.com/blog) — product announcements and updates from Claude

## WeChat (公众号) Source

In addition to the centrally-curated podcasts, X accounts, and blogs above, this fork
adds a fourth content channel: **Chinese WeChat (公众号) articles**.

Unlike the other sources, the WeChat channel is **maintained by you**: you paste
public article URLs into a small JSON file, and the pipeline fetches, parses, and
remixes them on the next run. No API key required.

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
signals, not article summaries. Each card has exactly 5 fields:

| Field             | Description                                      |
|-------------------|--------------------------------------------------|
| `builder_name`    | 公众号 / 创作者名称                              |
| `insight_summary` | 1–2 句洞察提炼 (100–150 字)，不是全文摘要        |
| `source_url`      | 原文链接                                         |
| `skills`          | 技能 / 主题标签数组                              |
| `signal_type`     | One of `观点 / 工具 / 案例 / 方法论`             |

Example output from `node prepare-digest.js`:

```json
{
  "builder_name": "AI产品黄叔",
  "insight_summary": "MCP 太爽了 / 太难了 / 很重要 …",
  "source_url": "https://mp.weixin.qq.com/s/EAMCvEQxyvN_1flStlvUMg",
  "skills": ["Agent", "MCP", "Prompt", "智能体", "上下文"],
  "signal_type": "工具"
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
scripts/prepare-digest.js          (heuristic insight_summary + signal_type;
                                    summarize_wechat prompt lets an LLM overwrite them)
        ↓
Builder Card  { builder_name, insight_summary, source_url, skills, signal_type }
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

That's it. No API keys needed. All content (blog articles + YouTube transcripts + X/Twitter posts)
is fetched centrally and updated daily.

## How It Works

1. A central feed is updated daily with the latest content from all sources
   (blog articles via web scraping, YouTube transcripts via Supadata, X/Twitter via official API)
2. Your agent fetches the feed — one HTTP request, no API keys
3. Your agent remixes the raw content into a digestible summary using your preferences
4. The digest is delivered to your messaging app (or shown in-chat)

See [examples/sample-digest.md](examples/sample-digest.md) for what the output looks like.

## Privacy

- No API keys are sent anywhere — all content is fetched centrally
- If you use Telegram/email delivery, those keys are stored locally in `~/.follow-builders/.env`
- The skill only reads public content (public blog posts, public YouTube videos, public X posts)
- Your configuration, preferences, and reading history stay on your machine

## License

MIT

