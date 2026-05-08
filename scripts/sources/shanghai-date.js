// YYYY-MM-DD in Asia/Shanghai (China Standard Time, 北京时间).

const TZ = "Asia/Shanghai";

/** @param {number | Date} msOrDate */
export function ymdInShanghai(msOrDate) {
  const d = msOrDate instanceof Date ? msOrDate : new Date(msOrDate);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/** Calendar "yesterday" in Asia/Shanghai (never UTC). */
export function yesterdayShanghaiYmd() {
  const todayStr = ymdInShanghai(Date.now());
  const anchor = new Date(`${todayStr}T12:00:00+08:00`);
  return ymdInShanghai(anchor.getTime() - 24 * 60 * 60 * 1000);
}
