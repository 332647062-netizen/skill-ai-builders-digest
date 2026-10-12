// ============================================================================
// Web site sources — aihot.dev / alphapulse / aihot.news / tophub / sopilot / Ben's Bites …
// ============================================================================
// Output item shape matches wechat builder cards for generate-feed.js:
//   { builder_name, title, content, publish_time (YYYY-MM-DD Shanghai), source_url,
//     rolling_daily? }
// ============================================================================

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { ymdInShanghai } from "./shanghai-date.js";

const INPUT_URL = new URL("./web-sites-input.json", import.meta.url);
const INPUT_PATH = fileURLToPath(INPUT_URL);

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Max cards from aihot homepage / RSS / hot boards per run. */
const AIHOT_MAX_ITEMS = 12;
const DEFAULT_MAX_ITEMS = 12;

/** Soft AI topical filter (title+content). Sites with ai_filter:false skip this. */
const AI_TOPIC_RE =
  /\b(AI|AIGC|AGI|LLM|GPT|Claude|OpenAI|Anthropic|Gemini|DeepSeek|Grok|Codex|Cursor|MCP|RAG|Agent|Transformer|ChatGPT|Midjourney|Sora|Opus|Sonnet|Fable|Harness|Copilot|Perplexity|Ollama|LangChain|向量|embedding)\b|人工智能|大模型|智能体|多模态|生成式|机器学习|深度学习|提示词|文生图|文生视频|开源模型|推理模型|Agent|智能助手/i;

/** Prefer Chinese edition when index is aihot root. */
function resolveAihotIndexUrl(indexUrl) {
  try {
    const u = new URL(indexUrl);
    if (!/aihot\.dev$/i.test(u.hostname) && !/\.aihot\.dev$/i.test(u.hostname)) {
      return indexUrl;
    }
    // Already zh/en path
    if (/^\/(zh|en)(\/|$)/i.test(u.pathname)) return indexUrl;
    u.pathname = "/zh/";
    u.search = "";
    u.hash = "";
    return u.href;
  } catch {
    return indexUrl;
  }
}

export async function readWebSitesInputList() {
  if (!existsSync(INPUT_PATH)) return [];
  try {
    const text = await readFile(INPUT_URL, "utf-8");
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function stripTags(html) {
  return (html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&#x26;/gi, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse Chinese calendar date like「2026 年 5 月 7 日」→ YYYY-MM-DD */
export function parseChineseDateToYmd(dateStr) {
  const m = String(dateStr || "").match(
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
  );
  if (!m) return null;
  return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
}

function parseIsoToShanghaiYmd(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return ymdInShanghai(t);
}

/**
 * 中文简介约 200 字：优先在 160–220 字内按句号截断。
 */
export function buildChineseSummary(content, title, target = 200) {
  const text = (content || "").replace(/\s+/g, " ").trim() || (title || "").trim();
  if (!text) return "";
  if (text.length <= target) return text;

  const window = text.slice(0, Math.min(text.length, target + 40));
  const breaks = ["。", "！", "？", "；"];
  let cut = -1;
  for (const ch of breaks) {
    const idx = window.lastIndexOf(ch);
    if (idx >= 160 && idx <= target + 20 && idx > cut) cut = idx;
  }
  if (cut > 0) return window.slice(0, cut + 1);
  return text.slice(0, target);
}

async function fetchText(url, userAgent) {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent || DEFAULT_UA },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function extractHrefFromHeadingHtml(headingInnerHtml) {
  const m = headingInnerHtml.match(/href=["']?([^"'>\s]+)["']?/i);
  if (!m) return null;
  let href = m[1].trim();
  // decode common entities in URLs
  href = href.replace(/&amp;/g, "&").replace(/&#x26;/gi, "&");
  if (!/^https?:\/\//i.test(href)) return null;
  return href;
}

function isBlockedAihotTitle(title) {
  // 跳过不当/敏感标题，避免进入 digest
  return /性虐待|儿童色情|CSAM/i.test(title || "");
}

/**
 * 解析 aihot 页面真实刊期，例如「独立开发日报 2026/8/6」或 dateModified。
 * 禁止用「今天/昨天」冒充——首页可能长期停在旧刊。
 */
function parseAihotIssueYmd(html) {
  const heading = html.match(
    /独立开发日报\s*(\d{4})\s*[\/\-年]\s*(\d{1,2})\s*[\/\-月]\s*(\d{1,2})/,
  );
  if (heading) {
    return `${heading[1]}-${String(Number(heading[2])).padStart(2, "0")}-${String(Number(heading[3])).padStart(2, "0")}`;
  }
  const dm =
    html.match(/itemprop=["']?dateModified["']?\s+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*itemprop=["']?dateModified/i) ||
    html.match(/dateModified["']?\s+content=["']([^"']+)["']/i);
  return parseIsoToShanghaiYmd(dm?.[1]);
}

/**
 * aihot.dev/zh — 中文日刊首页。
 * h4 标题内嵌原文链接；正文为中文简介；publish_time = 页面刊期（非滚动伪日期）。
 */
function parseAihot(html, builderName, indexUrl) {
  const publish_time = parseAihotIssueYmd(html);
  if (!publish_time) {
    console.error(
      `  web: aihot could not parse issue date from ${indexUrl} — skip site`,
    );
    return [];
  }
  console.error(`  web: aihot issue date = ${publish_time}`);

  const items = [];
  const seenUrls = new Set();
  // 仅用 h4：每条热点；h3 多为「AI 技术与产品」等栏目名
  const headingRe = /<h4[^>]*>([\s\S]*?)<\/h4>/gi;
  const matches = [...html.matchAll(headingRe)];
  for (const m of matches) {
    const headingInner = m[1];
    const titleRaw = stripTags(headingInner);
    if (!titleRaw) continue;
    if (/summary|今日汇总|今日摘要|^AI Hot|^Daily curated|独立开发日报/i.test(titleRaw)) {
      continue;
    }
    if (isBlockedAihotTitle(titleRaw)) continue;

    const itemUrl = extractHrefFromHeadingHtml(headingInner);
    if (!itemUrl) {
      // 无单独原文链接则跳过（满足「需要单独 URL」）
      continue;
    }
    if (seenUrls.has(itemUrl)) continue; // 同页多栏目会重复同一条
    seenUrls.add(itemUrl);

    const after = html.slice(m.index + m[0].length);
    const nextHeading = after.search(/<h[34][\s>]/i);
    const chunk =
      nextHeading >= 0 ? after.slice(0, nextHeading) : after.slice(0, 2000);
    const paras = [...chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((p) => stripTags(p[1]))
      .filter((t) => t && t.length > 20);
    const contentRaw = paras[0] || titleRaw;
    const title = titleRaw.replace(/\s*⭐\s*[\d.]+\s*$/, "").trim() || titleRaw;
    const content = buildChineseSummary(contentRaw, title, 200);

    items.push({
      builder_name: builderName,
      title,
      content,
      publish_time,
      source_url: itemUrl,
    });
    if (items.length >= AIHOT_MAX_ITEMS) break;
  }

  if (items.length === 0) {
    console.error(
      `  web: aihot parse produced 0 items with per-item URLs from ${indexUrl}`,
    );
  }

  return items;
}

/**
 * alphapulse — articles.js 里的 url 全是飞书 wiki（需权限，外人打不开）。
 * 推送主链接改用公开情报库页面；飞书地址只写进简介备注。
 */
function parseAlphapulseArticlesJs(jsText, builderName, publicIndexUrl) {
  const m = jsText.match(/window\.ARTICLES\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) return [];
  let arts;
  try {
    arts = JSON.parse(m[1]);
  } catch {
    return [];
  }
  if (!Array.isArray(arts)) return [];

  const indexBase = (publicIndexUrl || "https://www.alphapulse-lan.online/").replace(
    /\/?$/,
    "/",
  );

  return arts
    .map((a) => {
      const publish_time = parseChineseDateToYmd(a.date);
      if (!publish_time) return null;
      const title = (a.title || a.fullTitle || "").trim();
      const theme = (a.theme || "").trim();
      const full = (a.fullTitle || title).trim();
      const feishuUrl = (a.url || "").trim();
      // 公开可打开：情报库检索页（带标题关键词）；不再把飞书私链当作 source_url
      const source_url = `${indexBase}?q=${encodeURIComponent(title)}#library`;
      const body = [
        theme && `【${theme}】`,
        full,
        feishuUrl && `飞书原文需权限，可在情报库检索同标题：${feishuUrl}`,
      ]
        .filter(Boolean)
        .join("");
      const content = buildChineseSummary(body, title, 200);
      return {
        builder_name: builderName,
        title,
        content,
        publish_time,
        source_url,
      };
    })
    .filter(Boolean);
}

function wantsAiFilter(cfg) {
  if (cfg.ai_filter === false || cfg.ai_filter === "false") return false;
  return true;
}

function isAiRelated(title, content) {
  const text = `${title || ""} ${content || ""}`;
  return AI_TOPIC_RE.test(text);
}

function applyAiFilter(items, cfg, label) {
  if (!wantsAiFilter(cfg)) return items;
  const kept = items.filter((it) => isAiRelated(it.title, it.content));
  const dropped = items.length - kept.length;
  if (dropped > 0) {
    console.error(`  web: ${label} AI-filter dropped ${dropped} non-AI item(s)`);
  }
  return kept;
}

function capItems(items, cfg) {
  const n = Number(cfg.max_items) || DEFAULT_MAX_ITEMS;
  return items.slice(0, Math.max(1, n));
}

function decodeXmlEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseRssOrAtom(xml, builderName) {
  const items = [];
  const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  const entries = blocks.length
    ? blocks
    : [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];

  for (const m of entries) {
    const b = m[1];
    const title = decodeXmlEntities(
      (b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "",
    ).replace(/<[^>]+>/g, "");
    const link =
      (b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      decodeXmlEntities((b.match(/<link[^>]*>([^<]+)<\/link>/i) || [])[1] || "");
    const pubRaw =
      (b.match(/<pubDate>([^<]+)<\/pubDate>/i) || [])[1] ||
      (b.match(/<updated>([^<]+)<\/updated>/i) || [])[1] ||
      (b.match(/<published>([^<]+)<\/published>/i) || [])[1] ||
      "";
    const descHtml = decodeXmlEntities(
      (b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] ||
        (b.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] ||
        (b.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1] ||
        "",
    );
    const content = buildChineseSummary(stripTags(descHtml), title, 200);
    const publish_time = parseIsoToShanghaiYmd(pubRaw);
    if (!title || !link || !publish_time) continue;
    items.push({
      builder_name: builderName,
      title,
      content,
      publish_time,
      source_url: link.trim(),
    });
  }
  return items;
}

/**
 * tophub.today/c/ai — 今日热榜 AI 频道；无稳定单日归档 → rolling_daily。
 */
function parseTophubAi(html, builderName) {
  const items = [];
  const seen = new Set();
  const re =
    /<a\s+href="(https?:\/\/[^"]+)"[^>]*itemid="\d+"[^>]*>[\s\S]*?<span class="t">\s*([^<]+?)\s*<\/span>/gi;
  for (const m of html.matchAll(re)) {
    const source_url = m[1].trim();
    const title = stripTags(m[2]);
    if (!title || !source_url || seen.has(source_url)) continue;
    seen.add(source_url);
    items.push({
      builder_name: builderName,
      title,
      content: buildChineseSummary(title, title, 200),
      publish_time: ymdInShanghai(Date.now()),
      source_url,
      rolling_daily: true,
    });
    if (items.length >= DEFAULT_MAX_ITEMS) break;
  }
  return items;
}

/**
 * sopilot.net/zh/hot-tweets — Next.js 页；尽量从 SSR HTML 抽 x.com/status 链接。
 * 完整列表偏客户端渲染；能抽到的条目标记 rolling_daily。
 */
function parseSopilotHotTweets(html, builderName) {
  const items = [];
  const seen = new Set();
  const re =
    /href="(https?:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)[^"]*)"/gi;
  for (const m of html.matchAll(re)) {
    // 归一化为无 query 的推文链接，便于去重与打开
    const source_url = `https://x.com/${m[2]}/status/${m[3]}`;
    if (seen.has(source_url)) continue;
    seen.add(source_url);
    const handle = m[2];
    // 尝试在附近 HTML 取一段可见文本作简介
    const idx = m.index ?? 0;
    const near = html.slice(Math.max(0, idx - 1200), idx + 400);
    const texts = [...near.matchAll(/>([^<]{12,160})</g)]
      .map((x) => stripTags(x[1]))
      .filter(
        (t) =>
          t &&
          !/^(http|Follow|登录|Sign|View|打开|分享|复制)/i.test(t) &&
          !/inline-flex|rounded|font-medium/.test(t),
      );
    const snippet =
      texts.find((t) => /[\u4e00-\u9fff]/.test(t) || t.length > 24) ||
      texts.at(-1) ||
      "";
    const title = snippet
      ? snippet.length > 48
        ? `${snippet.slice(0, 48)}…`
        : snippet
      : `SoPilot 热帖 @${handle}`;
    items.push({
      builder_name: builderName,
      title: snippet ? `@${handle}: ${title}` : title,
      content: buildChineseSummary(
        snippet
          ? `${snippet}（SoPilot AI 热帖）`
          : `SoPilot 收录的 X 热帖，作者 @${handle}。原文：${source_url}`,
        title,
        200,
      ),
      publish_time: ymdInShanghai(Date.now()),
      source_url,
      rolling_daily: true,
    });
    if (items.length >= DEFAULT_MAX_ITEMS) break;
  }
  return items;
}

export async function loadWebSitesSources(opts = {}) {
  const list = await readWebSitesInputList();
  const userAgent = opts.userAgent || DEFAULT_UA;
  const out = [];
  const seenFeeds = new Set();

  for (const cfg of list) {
    const builder_name = (cfg.builder_name || cfg.name || "").trim() || "Web";
    const site = (cfg.site || "").trim().toLowerCase();
    const index_url = (cfg.index_url || cfg.url || "").trim();
    const feed_url = (cfg.feed_url || "").trim();

    try {
      // aihot.virxact.com 已迁到 aihot.news — 跳过，避免重复
      if (/aihot\.virxact\.com/i.test(index_url) || site === "aihot-virxact") {
        console.error(
          `  web: skip "${builder_name}" (aihot.virxact.com → aihot.news, use aihot-news feed)`,
        );
        continue;
      }

      if (site === "aihot" || /aihot\.dev/i.test(index_url)) {
        const url = resolveAihotIndexUrl(index_url);
        console.error(`  web: fetching aihot ${url}`);
        const html = await fetchText(url, userAgent);
        let items = parseAihot(html, builder_name, url);
        items = capItems(applyAiFilter(items, cfg, builder_name), cfg);
        console.error(`  web: ${builder_name} — ${items.length} item(s)`);
        out.push(...items);
        continue;
      }

      if (
        site === "alphapulse" ||
        /alphapulse-lan\.online/i.test(index_url)
      ) {
        const articlesUrl = (
          cfg.articles_url ||
          new URL(
            "articles.js",
            index_url.endsWith("/") ? index_url : `${index_url}/`,
          ).href
        ).trim();
        console.error(`  web: fetching alphapulse ${articlesUrl}`);
        const jsText = await fetchText(articlesUrl, userAgent);
        let items = parseAlphapulseArticlesJs(
          jsText,
          builder_name,
          index_url,
        );
        items = capItems(applyAiFilter(items, cfg, builder_name), cfg);
        console.error(
          `  web: ${builder_name} — ${items.length} item(s) after filter/cap`,
        );
        out.push(...items);
        continue;
      }

      if (
        site === "rss" ||
        site === "aihot-news" ||
        site === "bensbites" ||
        feed_url ||
        /aihot\.news/i.test(index_url) ||
        /bensbites\.com/i.test(index_url)
      ) {
        let rssUrl = feed_url;
        if (!rssUrl && /aihot\.news/i.test(index_url)) {
          rssUrl = "https://aihot.news/feed.xml";
        }
        if (!rssUrl && /bensbites\.com/i.test(index_url)) {
          rssUrl = "https://www.bensbites.com/feed";
        }
        if (!rssUrl) {
          console.error(`  web: "${builder_name}" missing feed_url, skip`);
          continue;
        }
        if (seenFeeds.has(rssUrl)) {
          console.error(`  web: skip duplicate feed ${rssUrl}`);
          continue;
        }
        seenFeeds.add(rssUrl);
        console.error(`  web: fetching RSS ${rssUrl}`);
        const xml = await fetchText(rssUrl, userAgent);
        let items = parseRssOrAtom(xml, builder_name);
        items = capItems(applyAiFilter(items, cfg, builder_name), cfg);
        console.error(`  web: ${builder_name} — ${items.length} item(s)`);
        out.push(...items);
        continue;
      }

      if (site === "tophub" || /tophub\.today/i.test(index_url)) {
        console.error(`  web: fetching tophub ${index_url}`);
        const html = await fetchText(index_url, userAgent);
        if (/安全验证|验证码/.test(html)) {
          console.error(
            `  web: tophub returned captcha page — skip "${builder_name}"`,
          );
          continue;
        }
        let items = parseTophubAi(html, builder_name);
        items = capItems(applyAiFilter(items, cfg, builder_name), cfg);
        console.error(`  web: ${builder_name} — ${items.length} item(s)`);
        out.push(...items);
        continue;
      }

      if (site === "sopilot" || /sopilot\.net/i.test(index_url)) {
        console.error(`  web: fetching sopilot ${index_url}`);
        const html = await fetchText(index_url, userAgent);
        let items = parseSopilotHotTweets(html, builder_name);
        items = capItems(applyAiFilter(items, cfg, builder_name), cfg);
        console.error(`  web: ${builder_name} — ${items.length} item(s)`);
        out.push(...items);
        continue;
      }

      console.error(`  web: unknown site type for "${builder_name}", skip`);
    } catch (err) {
      console.error(`  web: error for "${builder_name}": ${err.message}`);
    }
  }

  return out;
}

export default loadWebSitesSources;
