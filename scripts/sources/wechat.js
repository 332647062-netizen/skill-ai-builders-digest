// ============================================================================
// WeChat (公众号) Source — Stage 2
// ============================================================================
// Reads a list of article URLs from sources/wechat-input.json, calls the
// parser on each, and returns an array of normalized items consumed by
// generate-feed.js.
//
// Item shape (output, builder-card oriented):
//   {
//     builder_name: string,     // 公众号 / 创作者名称
//     title:        string,     // 文章标题 (raw, used by digest layer to craft insight)
//     content:      string,     // 文章正文 (raw, used by digest layer to craft insight)
//     publish_time: string,     // YYYY-MM-DD
//     source_url:   string,     // 原文链接
//     parseError?:  string      // present only when parser couldn't extract
//   }
//
// Stage 3 will replace the URL list with auto-discovery; this module's
// output contract stays the same.
// ============================================================================

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { parseWechatArticle } from "./wechat-parser.js";

const INPUT_URL = new URL("./wechat-input.json", import.meta.url);
const INPUT_PATH = fileURLToPath(INPUT_URL);

async function readInputList() {
  if (!existsSync(INPUT_PATH)) return [];
  try {
    const text = await readFile(INPUT_URL, "utf-8");
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

export async function loadWechatSources() {
  const list = await readInputList();
  if (list.length === 0) return [];

  const out = [];
  for (const it of list) {
    const url = it.url;
    if (!url || /REPLACE_WITH_REAL_ARTICLE_URL/i.test(url)) {
      console.error(
        `  wechat: skipping placeholder URL for "${it.title || it.author}"`,
      );
      continue;
    }

    console.error(`  wechat: parsing ${url}`);
    const parsed = await parseWechatArticle(url);

    const item = {
      builder_name: it.author || "",
      title: parsed.title || it.title || "",
      content: parsed.content || "",
      publish_time: parsed.publish_time || "",
      source_url: url,
    };
    if (parsed.error) item.parseError = parsed.error;

    out.push(item);
  }
  return out;
}

export default loadWechatSources;
