// YYYY-MM-DD in Asia/Shanghai (China Standard Time, 北京时间).

const TZ = "Asia/Shanghai";

/** @param {number | Date} msOrDate */
export function ymdInShanghai(msOrDate) {
  const d = msOrDate instanceof Date ? msOrDate : new Date(msOrDate);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

/**
 * 北京时间日历「昨天」的 YYYY-MM-DD。
 * 用于每日推送：今天跑的管线只收录昨天在上海时区落日历日发布的公众号文章。
 */
export function yesterdayShanghaiYmd() {
  const todayStr = ymdInShanghai(Date.now());
  const anchor = new Date(`${todayStr}T12:00:00+08:00`);
  return ymdInShanghai(anchor.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * 将北京时间日历 YYYY-MM-DD 加减若干天（按上海时区正午锚点，避免 DST 歧义）。
 * @param {string} ymd
 * @param {number} deltaDays 正数为往后，负数为往前
 */
export function addCalendarDaysShanghai(ymd, deltaDays) {
  const anchor = new Date(`${ymd}T12:00:00+08:00`);
  return ymdInShanghai(
    anchor.getTime() + deltaDays * 24 * 60 * 60 * 1000,
  );
}
