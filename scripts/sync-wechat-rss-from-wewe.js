#!/usr/bin/env node
// 从 WeWe RSS 的 GET /feeds 拉取当前订阅列表，重写 sources/wechat-rss-input.json。
//
// Usage (在 scripts 目录下):
//   WEWE_BASE_URL=http://HOST:4000 node sync-wechat-rss-from-wewe.js
//
// 若未设置 WEWE_BASE_URL，会尝试从现有 wechat-rss-input.json 里第一条 feed_url 解析出 origin（便于本机已配过 host 时直接跑）。

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const RSS_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SCRIPT_DIR = decodeURIComponent(new URL(".", import.meta.url).pathname);
const INPUT_JSON = fileURLToPath(
  new URL("./sources/wechat-rss-input.json", import.meta.url),
);

function trimSlash(s) {
  return s.replace(/\/+$/, "");
}

async function resolveBaseUrl() {
  const fromEnv = process.env.WEWE_BASE_URL?.trim();
  if (fromEnv) return trimSlash(fromEnv);

  if (existsSync(INPUT_JSON)) {
    try {
      const raw = await readFile(INPUT_JSON, "utf-8");
      const list = JSON.parse(raw);
      const first = Array.isArray(list) ? list[0] : null;
      const u = first?.feed_url;
      if (typeof u === "string" && u.length > 0) {
        const url = new URL(u);
        return trimSlash(`${url.protocol}//${url.host}`);
      }
    } catch {
      /* fall through */
    }
  }

  console.error(
    "缺少 WEWE_BASE_URL，且无法从 wechat-rss-input.json 推断。例如：\n  WEWE_BASE_URL=http://127.0.0.1:4000 node sync-wechat-rss-from-wewe.js",
  );
  process.exit(1);
}

async function main() {
  const base = await resolveBaseUrl();
  const listUrl = `${base}/feeds`;
  console.error(`  sync-wechat-rss: GET ${listUrl}`);

  const res = await fetch(listUrl, {
    headers: { "User-Agent": RSS_USER_AGENT },
  });
  if (!res.ok) {
    console.error(`  sync-wechat-rss: HTTP ${res.status}`);
    process.exit(1);
  }

  const rows = await res.json();
  if (!Array.isArray(rows)) {
    console.error("  sync-wechat-rss: /feeds 响应不是 JSON 数组");
    process.exit(1);
  }

  const out = rows
    .map((row) => {
      const id = (row.id || "").trim();
      const name = (row.name || "").trim();
      if (!id) return null;
      return {
        builder_name: name || id,
        platform: "wechat",
        feed_url: `${base}/feeds/${id}`,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      a.builder_name.localeCompare(b.builder_name, "zh-Hans-CN", {
        sensitivity: "base",
      }),
    );

  await writeFile(INPUT_JSON, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
  console.error(
    `  sync-wechat-rss: 已写入 ${out.length} 条 → sources/wechat-rss-input.json`,
  );
}

main().catch((err) => {
  console.error(`  sync-wechat-rss: ${err.message}`);
  process.exit(1);
});
