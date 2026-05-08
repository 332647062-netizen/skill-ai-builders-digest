# 用户发给 AI 的指令词（Follow Builders / AI Builders Digest）

将下面整段或单条复制到你的智能体对话里即可。**技能名**：`follow-builders`（见根目录 `SKILL.md`）。适用于 **OpenClaw、Claude Code、Cursor** 等已加载该 Skill 的环境。

**还没装 Skill？** 只发 GitHub 链接不能完成安装，需要本机克隆或下载 ZIP + `npm install`。小白请先看 **[安装指南（小白）](./install-skill-beginners-zh.md)**。

---

## 1. 安装 Skill 之后 — 首次引导

任选其一（中英文皆可，智能体应进入 onboarding）：

- **中文**：`设置关注动态`
- **中文**：`帮我配置微信公众号摘要推送`
- **英文**：`set up follow builders`
- **斜杠命令**（若客户端支持）：`/follow-builders`

智能体会追问：**频率（每日/每周）与时间**、**时区**、**语言**、**发送方式**（非 OpenClaw 时可能是 Telegram / 邮件 / 仅对话内按需）。按提示回答即可。

---

## 2. 要一期摘要（手动 / 按需）

- **斜杠**（若支持）：`/ai`
- **中文**：`给我今天的 AI Builders 摘要` / `跑一期微信公众号 digest`
- **英文**：`Give me today's AI Builders digest`

（按需模式下没有定时任务时，主要靠这类指令触发「拉 feed → 准备 digest → 交付」流程。）

---

## 3. 改偏好（对话里改配置）

复制示例，按需改写：

- `改成每周一早上 9 点推送`
- `时区改成 Asia/Shanghai`
- `摘要改成中文`
- `摘要再短一点`
- `显示我当前的设置`

---

## 4. 公众号信源（重要）

Skill 说明里默认展示的是 `wechat-input.json`；若你使用 **WeWe RSS**，需要：

- 在 WeWe 里维护订阅；
- 同步/编辑 **`scripts/sources/wechat-rss-input.json`**（或让 AI 根据仓库文档执行 `npm run sync-wechat-rss`）。

**可发给 AI 的话：**

- `根据 docs/wechat-wewe-rss-iteration.md，用我的 WeWe 地址同步 wechat-rss-input.json，然后提交变更。`
- `我已在 WeWe 新增公众号，请执行 scripts 下的 sync-wechat-rss（必要时设置 WEWE_BASE_URL）。`

---

## 5. 给 AI 的「一句话角色提示」（可选）

需要明确技能范围时，可加上：

> 请按 Follow Builders（follow-builders）技能执行：只处理微信公众号 digest，使用仓库里的 `generate-feed.js` 与 `prepare-digest.js`，不要再去拉 X/播客/博客。

---

## 6. OpenClaw 定时任务（给 AI 运维时用）

若由 AI 代配 cron，需在对话里确认：**投递渠道名 + 目标 ID**（与 `SKILL.md` 中表格一致），并让 AI **不要用** `--channel last`（多通道时会失败）。用户侧可简单说：

- `请按 SKILL.md 里 OpenClaw 的步骤，把每日摘要定在我常用的这个聊天里，并试跑一次 cron。`

---

## 相关文件

| 说明     | 路径 |
|----------|------|
| 技能定义 | `SKILL.md` |
| 小白安装 | [install-skill-beginners-zh.md](./install-skill-beginners-zh.md) |
| WeWe 与同步 | `docs/wechat-wewe-rss-iteration.md` |
| 英文快速开始 | `README.md` |
| 中文说明 | `README.zh-CN.md` |
