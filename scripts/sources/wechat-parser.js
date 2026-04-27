// ============================================================================
// WeChat Article Parser
// ============================================================================
// Stage 2 MVP: given a 公众号文章 URL, fetch the HTML and extract:
//   - title         (from og:title or #activity-name)
//   - content       (plain-text from #js_content)
//   - publish_time  (YYYY-MM-DD, from var ct / var publish_time / #publish_time)
//
// We do NOT attempt to bypass anti-bot. If the fetch fails or fields are
// missing, we return whatever we got — the caller can decide what to do.
// ============================================================================

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 20000;

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s) {
  return decodeHtmlEntities(
    s
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const og = html.match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  );
  if (og) return decodeHtmlEntities(og[1]).trim();

  const aname = html.match(
    /id=["']activity-name["'][^>]*>([\s\S]*?)<\/(?:h\d|div)>/i,
  );
  if (aname) return stripTags(aname[1]);

  const t = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (t) return stripTags(t[1]);

  return "";
}

function extractPublishTime(html) {
  // WeChat embeds a unix timestamp (seconds) as: var ct = "1704067200";
  const ct = html.match(/var\s+ct\s*=\s*["'](\d+)["']/);
  if (ct) {
    const ts = parseInt(ct[1], 10) * 1000;
    if (!Number.isNaN(ts)) return new Date(ts).toISOString().slice(0, 10);
  }

  // Some templates use: var publish_time = "2026-04-24" (YYYY-MM-DD or full ISO)
  const pt = html.match(/var\s+publish_time\s*=\s*["']([^"']+)["']/);
  if (pt) return pt[1].slice(0, 10);

  // Fallback: visible <em id="publish_time"> tag
  const em = html.match(/id=["']publish_time["'][^>]*>([^<]+)</);
  if (em) return em[1].trim().slice(0, 10);

  return "";
}

function extractContent(html) {
  // Primary: WeChat article body lives in <div id="js_content">…</div>
  const m = html.match(
    /<div[^>]*id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*(?:<script|<\/div)/i,
  );
  if (m) return stripTags(m[1]);

  // Fallback: og:description (short blurb if body extraction fails)
  const og = html.match(
    /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );
  if (og) return decodeHtmlEntities(og[1]).trim();

  return "";
}

export async function parseWechatArticle(url) {
  if (!url || typeof url !== "string") {
    return { title: "", content: "", publish_time: "", error: "invalid url" };
  }

  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    return {
      title: "",
      content: "",
      publish_time: "",
      error: `fetch failed: ${err.message}`,
    };
  }

  if (!res.ok) {
    return {
      title: "",
      content: "",
      publish_time: "",
      error: `HTTP ${res.status}`,
    };
  }

  const html = await res.text();

  return {
    title: extractTitle(html),
    content: extractContent(html),
    publish_time: extractPublishTime(html),
  };
}

export default parseWechatArticle;
