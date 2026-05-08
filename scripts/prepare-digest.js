#!/usr/bin/env node

// ============================================================================
// Follow Builders — Prepare Digest
// ============================================================================
// Gathers everything the LLM needs to produce a digest:
// - Reads local feed-wechat.json (微信公众号，由 generate-feed.js 生成)
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

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// -- Constants ---------------------------------------------------------------

const USER_DIR = join(homedir(), '.follow-builders');
const CONFIG_PATH = join(USER_DIR, 'config.json');

// WeChat feed is produced locally by generate-feed.js.
// We don't fetch it from the central GitHub repo yet.
const SCRIPT_DIR_PATH = decodeURIComponent(new URL('.', import.meta.url).pathname);
const LOCAL_FEED_WECHAT = join(SCRIPT_DIR_PATH, '..', 'feed-wechat.json');

// Lightweight keyword bank used to extract `skills` tags from raw content.
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

// Extract 3~6 skill tags from text by matching the SKILL_KEYWORDS bank.
// Order is preserved (bank order = priority). Capped at 6.
function extractKeywords(text) {
  if (!text) return [];
  const found = [];
  const seen = new Set();
  const lower = text.toLowerCase();
  for (const kw of SKILL_KEYWORDS) {
    const lk = kw.toLowerCase();
    if (!seen.has(lk) && lower.includes(lk)) {
      seen.add(lk);
      found.push(kw);
    }
    if (found.length >= 6) break;
  }
  return found;
}

// Heuristic 200~500 字符的内容简介。Snap to a sentence boundary inside
// the window so the cut feels natural. The summarize_wechat prompt tells
// the LLM to overwrite this with a real distilled summary once wired in.
function buildSummary(content, title) {
  const text = (content || "").replace(/\s+/g, " ").trim();
  if (!text) return title || "";

  const window = text.slice(0, 600);
  const breaks = ["。", "！", "？"];
  let cut = -1;
  for (const ch of breaks) {
    const idx = window.lastIndexOf(ch);
    if (idx > 200 && idx < 500 && idx > cut) cut = idx;
  }
  return cut > 0 ? window.slice(0, cut + 1) : window.slice(0, 400);
}

const PROMPTS_BASE = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/prompts';
const PROMPT_FILES = ['digest-intro.md', 'translate.md'];

// -- Fetch helpers -----------------------------------------------------------

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
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

  // 2. Load local WeChat feed (produced by generate-feed.js)
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

  // Build Builder Cards. Each card has 4 fields by contract:
  //   builder_name / summary / source_url / skills
  // summary is pre-filled by a 200~500 字符 heuristic so the pipeline runs
  // without an LLM; the summarize_wechat prompt tells the LLM to overwrite
  // it with a real distilled summary once wired in.
  const wechatItems = (feedWechat?.wechat || []).map((it) => ({
    builder_name: it.builder_name,
    summary: buildSummary(it.content, it.title),
    source_url: it.source_url || null,
    skills: extractKeywords(`${it.title} ${it.content}`),
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

  // Builder Card prompt — 供 LLM 精炼字段；最终推文排版跟 prompts.digest_intro（每日推送三线格式）
  prompts.summarize_wechat = [
    '# 微信公众号 Builder Card',
    '',
    '把每条中文公众号文章整理成下列字段，供「每日推送」排版使用。',
    '',
    '## 字段',
    '',
    '1. builder_name — 公众号名称（与原文一致）',
    '2. summary — 文章简介，200~500 汉字；浓缩核心观点与信号，不要全文复述',
    '3. source_url — mp.weixin.qq.com 原文链接',
    '4. skills — 可选，3~6 个技术/方法类主题词（digest 正文可不展示，仅作检索）',
    '',
    '## JSON 示例',
    '',
    '{',
    '  "builder_name": "AI产品黄叔",',
    '  "summary": "…",',
    '  "source_url": "https://mp.weixin.qq.com/s/...",',
    '  "skills": ["MCP", "Agent", "工作流"]',
    '}',
    '',
    '## 规则',
    '',
    '- summary 禁止空话套话（如「本文讨论了」），直接写干货',
    '- skills 不放泛词（如单独「AI」「未来」）',
    '- 读不懂原文宁可 summary 略短，禁止编造',
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

    // Content to remix（仅微信公众号）
    wechat: wechatItems,

    stats: {
      wechatPosts: wechatItems.length,
      wechatPublishDayBeijing: feedWechat?.wechatPublishDayBeijing ?? null,
      wechatPublishWindowBeijing:
        feedWechat?.wechatPublishWindowBeijing ?? null,
      wechatLookbackDays: feedWechat?.wechatLookbackDays ?? null,
      feedGeneratedAt: feedWechat?.generatedAt || null
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
