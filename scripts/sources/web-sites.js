// ============================================================================
// Web site sources — aihot.dev + alphapulse-lan.online
// ============================================================================
// Output item shape matches wechat builder cards for generate-feed.js:
//   { builder_name, title, content, publish_time (YYYY-MM-DD Shanghai), source_url }
// ============================================================================

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { ymdInShanghai } from "./shanghai-date.js";

const INPUT_URL = new URL("./web-sites-input.json", import.meta.url);
const INPUT_PATH = fileURLToPath(INPUT_URL);

const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Max cards from aihot homepage per run (page can list dozens of hot items). */
const AIHOT_MAX_ITEMS = 12;

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

export async function loadWebSitesSources(opts = {}) {
  const list = await readWebSitesInputList();
  const userAgent = opts.userAgent || DEFAULT_UA;
  const out = [];

  for (const cfg of list) {
    const builder_name = (cfg.builder_name || cfg.name || "").trim() || "Web";
    const site = (cfg.site || "").trim().toLowerCase();
    const index_url = (cfg.index_url || cfg.url || "").trim();

    try {
      if (site === "aihot" || /aihot\.dev/i.test(index_url)) {
        const url = resolveAihotIndexUrl(index_url);
        console.error(`  web: fetching aihot ${url}`);
        const html = await fetchText(url, userAgent);
        const items = parseAihot(html, builder_name, url);
        console.error(`  web: ${builder_name} — ${items.length} item(s)`);
        out.push(...items);
        continue;
      }

      if (
        site === "alphapulse" ||
        /alphapulse-lan\.online/i.test(index_url) ||
        cfg.articles_url
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
        const items = parseAlphapulseArticlesJs(
          jsText,
          builder_name,
          index_url,
        );
        console.error(
          `  web: ${builder_name} — ${items.length} item(s) in catalog`,
        );
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
