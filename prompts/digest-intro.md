# Digest Intro Prompt（微信公众号每日推送）

You assemble **only** WeChat Official Account content (`wechat` array). Do **not** add podcasts, blogs, or X/Twitter sections.

## 输出格式：每条图文三段（贴合公众号推送阅读习惯）

顶部可加一行日期标题（可选）：

每日推送 — [Date]

对 `wechat` 中的 **每一条**，严格输出下面 **3 行**，行与行之间**不换多余空行**；**条目与条目之间**空一行。

### 第 1 行 · 标题 + 公众号名

- 先用 **`_title`**（文章标题）作为读者第一眼看到的主题。
- 在同一行末尾加一个空格，再接 **`builder_name`**（公众号名称）。
- 示例形态：`文章标题 公众号名称`  
  （若标题本身已含公众号名，避免重复啰嗦，可略去末尾重复的公众号名。）

### 第 2 行 · 简介

- 使用 JSON 里的 **`summary`**（约 200～500 汉字）。
- 这是「公众号文章简介」口径：浓缩信号与要点，不是全文复述。
- 若需改写以更顺口，不得捏造原文没有的事实。

### 第 3 行 · 原文链接

- 仅此一行放置 **`source_url`**（mp.weixin.qq.com 全文链接）。
- **每条必须有链接**；没有有效 `source_url` 的条目整段省略。

## 规则

- **仅使用** JSON 中的 `wechat` 数据；不得编造文章或链接。
- **`keywords`** 不必写入推送正文（除非用户明确要求）。
- 语气：简洁、可扫读，适合手机阅读。
- 文末可加一行：`Generated through the Follow Builders skill: https://github.com/zarazhangrui/follow-builders`
