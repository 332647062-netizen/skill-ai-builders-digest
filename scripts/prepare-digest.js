#!/usr/bin/env node

// ============================================================================
// Follow Builders — Prepare Digest
// ============================================================================
// Gathers everything the LLM needs to produce a digest:
// - Fetches the central feeds (tweets + podcasts)
// - Fetches the latest prompts from GitHub
// - Reads the user's config (language, delivery method)
// - Outputs a single JSON blob to stdout
//
// The LLM's ONLY job is to read this JSON, remix the content, and output
// the digest text. Everything else is handled here deterministically.
//
// Usage: node prepare-digest.js
// Output: JSON to stdout
// ============================================================================

import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// -- Constants ---------------------------------------------------------------

const USER_DIR = join(homedir(), '.follow-builders');
const CONFIG_PATH = join(USER_DIR, 'config.json');

const FEED_X_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
const FEED_PODCASTS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json';
const FEED_BLOGS_URL = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-blogs.json';

// MVP: WeChat feed is produced locally by generate-feed.js (mock source).
// We don't fetch it from the central GitHub repo yet.
const SCRIPT_DIR_PATH = decodeURIComponent(new URL('.', import.meta.url).pathname);
const LOCAL_FEED_WECHAT = join(SCRIPT_DIR_PATH, '..', 'feed-wechat.json');

// Lightweight keyword bank used to extract `skills` from raw content.
// Keep this small and explicit — Stage 1 only needs to prove the pipeline.
const SKILL_KEYWORDS = [
  'Agent Workflow',
  'Agent',
  'MCP',
  'RAG',
  'LLM',
  'Prompt Engineering',
  'Prompt Chaining',
  'Prompt',
  'Fine-tuning',
  'Embedding',
  'Vector DB',
  'Tool Use',
  'Multi-Agent',
  'Function Calling',
  'Workflow',
  'AI Coding',
  'Coding Agent',
  // 中文常见技能词
  '工作流',
  '智能体',
  '提示词',
  '上下文',
  '微调',
  '向量',
];

function extractSkills(text) {
  if (!text) return [];
  const found = new Set();
  const lower = text.toLowerCase();
  for (const kw of SKILL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) found.add(kw);
  }
  return [...found];
}

// Heuristic: take the first ~150 Chinese chars, snap to a sentence boundary.
// This is a deterministic stand-in for the LLM's insight extraction so the
// pipeline can produce Builder Cards without an LLM call. The real
// summarize_wechat prompt below tells the LLM to overwrite this field.
function buildInsightSummary(content, title) {
  const text = (content || "").replace(/\s+/g, " ").trim();
  if (!text) return title || "";

  const window = text.slice(0, 250);
  const breaks = ["。", "！", "？"];
  let cut = -1;
  for (const ch of breaks) {
    const idx = window.lastIndexOf(ch);
    if (idx > 80 && idx < 200 && idx > cut) cut = idx;
  }
  return cut > 0 ? window.slice(0, cut + 1) : window.slice(0, 150);
}

// Heuristic signal_type. Order matters — first match wins.
function inferSignalType(title, content) {
  const text = `${title || ""} ${content || ""}`;
  if (/(工具|发布|上线|推出|开源|API|SDK|产品)/i.test(text)) return "工具";
  if (/(案例|实战|实践|经验|教训|复盘)/i.test(text)) return "案例";
  if (/(方法|步骤|流程|框架|how[- ]?to|如何|怎么)/i.test(text))
    return "方法论";
  return "观点";
}

const PROMPTS_BASE = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/prompts';
const PROMPT_FILES = [
  'summarize-podcast.md',
  'summarize-tweets.md',
  'summarize-blogs.md',
  'digest-intro.md',
  'translate.md'
];

// -- Fetch helpers -----------------------------------------------------------

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

// -- Main --------------------------------------------------------------------

async function main() {
  const errors = [];

  // 1. Read user config
  let config = {
    language: 'en',
    frequency: 'daily',
    delivery: { method: 'stdout' }
  };
  if (existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(await readFile(CONFIG_PATH, 'utf-8'));
    } catch (err) {
      errors.push(`Could not read config: ${err.message}`);
    }
  }

  // 2. Fetch all three feeds
  const [feedX, feedPodcasts, feedBlogs] = await Promise.all([
    fetchJSON(FEED_X_URL),
    fetchJSON(FEED_PODCASTS_URL),
    fetchJSON(FEED_BLOGS_URL)
  ]);

  if (!feedX) errors.push('Could not fetch tweet feed');
  if (!feedPodcasts) errors.push('Could not fetch podcast feed');
  if (!feedBlogs) errors.push('Could not fetch blog feed');

  // 2b. Load local WeChat feed (Stage 1 mock — produced by generate-feed.js)
  let feedWechat = null;
  if (existsSync(LOCAL_FEED_WECHAT)) {
    try {
      feedWechat = JSON.parse(await readFile(LOCAL_FEED_WECHAT, 'utf-8'));
    } catch (err) {
      errors.push(`Could not read local wechat feed: ${err.message}`);
    }
  } else {
    errors.push('Local feed-wechat.json not found — run generate-feed.js first');
  }

  // Build Builder Cards. Each card has 5 fields by contract:
  //   builder_name / insight_summary / source_url / skills / signal_type
  // We pre-fill insight_summary + signal_type with heuristics so the pipeline
  // is usable without an LLM. The summarize_wechat prompt instructs the LLM
  // to overwrite insight_summary with a real 100-150 字 insight提炼.
  const wechatItems = (feedWechat?.wechat || []).map((it) => ({
    builder_name: it.builder_name,
    insight_summary: buildInsightSummary(it.content, it.title),
    source_url: it.source_url || null,
    skills: extractSkills(`${it.title} ${it.content}`),
    signal_type: inferSignalType(it.title, it.content),
    // Raw fields kept for the LLM step that may want richer context:
    _title: it.title,
    _publish_time: it.publish_time,
  }));

  // 3. Load prompts with priority: user custom > remote (GitHub) > local default
  //
  // If the user has a custom prompt at ~/.follow-builders/prompts/<file>,
  // use that (they personalized it — don't overwrite with remote updates).
  // Otherwise, fetch the latest from GitHub so they get central improvements.
  // If GitHub is unreachable, fall back to the local copy shipped with the skill.
  const prompts = {};
  const scriptDir = decodeURIComponent(new URL('.', import.meta.url).pathname);
  const localPromptsDir = join(scriptDir, '..', 'prompts');
  const userPromptsDir = join(USER_DIR, 'prompts');

  for (const filename of PROMPT_FILES) {
    const key = filename.replace('.md', '').replace(/-/g, '_');
    const userPath = join(userPromptsDir, filename);
    const localPath = join(localPromptsDir, filename);

    // Priority 1: user's custom prompt (they personalized it)
    if (existsSync(userPath)) {
      prompts[key] = await readFile(userPath, 'utf-8');
      continue;
    }

    // Priority 2: latest from GitHub (central updates)
    const remote = await fetchText(`${PROMPTS_BASE}/${filename}`);
    if (remote) {
      prompts[key] = remote;
      continue;
    }

    // Priority 3: local copy shipped with the skill
    if (existsSync(localPath)) {
      prompts[key] = await readFile(localPath, 'utf-8');
    } else {
      errors.push(`Could not load prompt: ${filename}`);
    }
  }

  // Builder Card prompt. Output is creator-centric (a "signal"), not an
  // article summary. Each card has exactly 5 fields.
  prompts.summarize_wechat = [
    '# WeChat Builder Card Prompt',
    '',
    '你在把中文公众号文章转换为 Builder Card —— 这是一种以"创作者"为单位的信号卡片，',
    '不是文章全文摘要。',
    '',
    '## 针对每条内容，输出 5 个字段',
    '',
    '1. builder_name — 公众号 / 创作者名称',
    '2. insight_summary — 1~2 句洞察提炼 (100~150 字)，提取这位 builder 的核心观点或信号，',
    '   不要复述全文，不要"在本文中作者讨论了..."这种套话',
    '3. source_url — 原文链接',
    '4. skills — 技能 / 主题标签数组，如 ["Agent Workflow", "MCP", "Prompt Engineering"]',
    '5. signal_type — 信号类型，必须是以下之一: "观点" | "工具" | "案例" | "方法论"',
    '',
    '## 输出 JSON 结构',
    '',
    '{',
    '  "builder_name": "Builder Zara Zhang",',
    '  "insight_summary": "当开始写作时，80% 思考已完成；写作不是输出文字，而是思想落地。",',
    '  "source_url": "https://mp.weixin.qq.com/s/...",',
    '  "skills": ["Writing", "PRD", "Prototype"],',
    '  "signal_type": "观点"',
    '}',
    '',
    '## 规则',
    '',
    '- insight_summary 必须是 builder 的"洞察"，不是文章梗概',
    '- skills 只放技术 / 方法 / 角色相关的词，不要放泛词 (例如 不要 "AI" / "未来")',
    '- 如果你不能从原文里看出明显信号，不要瞎编，宁可让 insight_summary 短一点',
    ''
  ].join('\n');

  // 4. Build the output — everything the LLM needs in one blob
  const output = {
    status: 'ok',
    generatedAt: new Date().toISOString(),

    // User preferences
    config: {
      language: config.language || 'en',
      frequency: config.frequency || 'daily',
      delivery: config.delivery || { method: 'stdout' }
    },

    // Content to remix
    podcasts: feedPodcasts?.podcasts || [],
    x: feedX?.x || [],
    blogs: feedBlogs?.blogs || [],
    wechat: wechatItems,

    // Stats for the LLM to reference
    stats: {
      podcastEpisodes: feedPodcasts?.podcasts?.length || 0,
      xBuilders: feedX?.x?.length || 0,
      totalTweets: (feedX?.x || []).reduce((sum, a) => sum + a.tweets.length, 0),
      blogPosts: feedBlogs?.blogs?.length || 0,
      wechatPosts: wechatItems.length,
      feedGeneratedAt:
        feedX?.generatedAt ||
        feedPodcasts?.generatedAt ||
        feedBlogs?.generatedAt ||
        feedWechat?.generatedAt ||
        null
    },

    // Prompts — the LLM reads these and follows the instructions
    prompts,

    // Non-fatal errors
    errors: errors.length > 0 ? errors : undefined
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({
    status: 'error',
    message: err.message
  }));
  process.exit(1);
});
