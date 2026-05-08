// ============================================================================
// WeChat — WeWe RSS 订阅源
// ============================================================================
// 读取 wechat-rss-input.json，拉取各 feed_url，解析 RSS item，输出与
// generate-feed.js / prepare-digest.js 衔接的 builder-card 字段。
// ============================================================================

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { ymdInShanghai } from "./shanghai-date.js";

const INPUT_URL = new URL("./wechat-rss-input.json", import.meta.url);
const INPUT_PATH = fileURLToPath(INPUT_URL);

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
}

function stripHtml(html) {
  if (!html) return "";
  const noScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const text = noScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeXmlEntities(text);
}

/** @param {string} inner */
function unwrapCdata(inner) {
  const t = inner.trim();
  const m = t.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (m) return m[1].trim();
  return t;
}

/**
 * @param {string} block item 内 XML 片段
 * @param {string} localName 本地标签名，如 title、description；含命名空间用 content:encoded
 */
function extractTagInner(block, localName) {
  const safe = localName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(
    /:/g,
    ":",
  );
  const re = new RegExp(
    `<${safe}[^>]*>([\\s\\S]*?)<\\/${safe}>`,
    "i",
  );
  const m = block.match(re);
  if (!m) return "";
  return unwrapCdata(m[1].trim());
}

function extractLink(block) {
  const plain = extractTagInner(block, "link");
  if (plain) return plain.replace(/\s+/g, "").trim();

  const linkEl = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (linkEl) return linkEl[1].trim();

  const guid = extractTagInner(block, "guid");
  if (guid && /^https?:\/\//i.test(guid)) return guid.trim();
  return "";
}

function extractPubDate(block) {
  const raw = extractTagInner(block, "pubDate");
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractAtomLink(block) {
  const links = block.matchAll(/<link\s+([^>]+)\/?>/gi);
  for (const m of links) {
    const attrs = m[1];
    const hrefM = attrs.match(/\bhref=["']([^"']+)["']/i);
    if (hrefM && /mp\.weixin\.qq\.com/i.test(hrefM[1])) return hrefM[1].trim();
  }
  const any = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return any ? any[1].trim() : "";
}

function extractAtomUpdated(block) {
  const published = extractTagInner(block, "published");
  const updated = extractTagInner(block, "updated");
  const raw = published || updated;
  if (!raw) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 解析 Atom（WeWe RSS 默认输出 application/atom+xml）。
 * @param {string} xml
 */
export function parseWechatAtomItems(xml) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let im;
  while ((im = entryRegex.exec(xml)) !== null) {
    const block = im[1];
    let title = extractTagInner(block, "title");
    title = stripHtml(unwrapCdata(title)) || "Untitled";

    const summaryRaw = extractTagInner(block, "summary");
    const contentRaw = extractTagInner(block, "content");
    const descFromFeed =
      stripHtml(unwrapCdata(contentRaw)) ||
      stripHtml(unwrapCdata(summaryRaw)) ||
      "";

    const link = extractAtomLink(block);
    const pubDate = extractAtomUpdated(block);

    const bodyForSummary = descFromFeed || title;

    items.push({
      title,
      link,
      pubDate,
      descriptionText: bodyForSummary.slice(0, 20000),
    });
  }
  return items;
}

/**
 * 自动识别 Atom / RSS 2.0。
 * @param {string} xml
 */
export function parseWechatFeedItems(xml) {
  const s = xml.trim();
  if (
    /<\s*feed\b/i.test(s) &&
    /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2005\/Atom["']/i.test(s)
  ) {
    return parseWechatAtomItems(s);
  }
  return parseWechatRssItems(s);
}

/**
 * 解析 RSS 2.0 XML，返回 item 列表（原始字段）。
 * @param {string} xml
 */
export function parseWechatRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let im;
  while ((im = itemRegex.exec(xml)) !== null) {
    const block = im[1];
    let title = extractTagInner(block, "title");
    title = stripHtml(title) || "Untitled";

    const descriptionRaw = extractTagInner(block, "description");
    const encodedRaw = extractTagInner(block, "content:encoded");

    const descriptionText = stripHtml(unwrapCdata(descriptionRaw));
    const contentText = encodedRaw
      ? stripHtml(unwrapCdata(encodedRaw))
      : "";

    const bodyForSummary = contentText || descriptionText;

    const link = extractLink(block);
    const pubDate = extractPubDate(block);

    items.push({
      title,
      link,
      pubDate,
      descriptionText: bodyForSummary.slice(0, 20000),
    });
  }
  return items;
}

export async function readWechatRssInputList() {
  if (!existsSync(INPUT_PATH)) return [];
  try {
    const text = await readFile(INPUT_URL, "utf-8");
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

/**
 * 拉取 WeWe RSS，标准化为 generate-feed 消费的条目（含 content、publish_time）。
 *
 * @param {object} [options]
 * @param {string} [options.userAgent]
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function loadWechatRssSources(options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const userAgent = options.userAgent || DEFAULT_USER_AGENT;

  const list = await readWechatRssInputList();
  if (list.length === 0) return [];

  const out = [];
  for (const cfg of list) {
    const builder_name = (cfg.builder_name || "").trim();
    const platform = (cfg.platform || "wechat").trim();
    const feed_url = (cfg.feed_url || "").trim();

    if (!feed_url || /REPLACE_WITH_FEED_ID|\/xxx\//i.test(feed_url)) {
      console.error(
        `  wechat-rss: skip placeholder or empty feed_url for "${builder_name}"`,
      );
      continue;
    }

    console.error(`  wechat-rss: fetching ${feed_url}`);
    let xml;
    try {
      const res = await fetchImpl(feed_url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/rss+xml, application/xml, text/xml, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        console.error(`  wechat-rss: HTTP ${res.status} for ${feed_url}`);
        continue;
      }
      xml = await res.text();
    } catch (err) {
      console.error(
        `  wechat-rss: fetch error for ${feed_url}: ${err.message}`,
      );
      continue;
    }

    const items = parseWechatFeedItems(xml);
    console.error(
      `  wechat-rss: ${builder_name} — ${items.length} item(s) in feed`,
    );

    for (const it of items) {
      if (!it.link) continue;

      const publish_time = it.pubDate
        ? ymdInShanghai(it.pubDate)
        : "";

      const summary = it.descriptionText || "";
      const card = {
        builder_name: builder_name || "WeChat",
        platform,
        title: it.title,
        summary,
        source_url: it.link,
        publish_time,
        skills: [],
        // 下游 generate-feed / prepare-digest 仍使用正文型 content
        content: summary,
      };
      out.push(card);
    }
  }
  return out;
}

export default loadWechatRssSources;
