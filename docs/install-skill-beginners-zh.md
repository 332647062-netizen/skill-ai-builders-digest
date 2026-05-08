# 小白安装指南：把 skill-ai-builders-digest 装成 AI 里的 Skill

面向 **OpenClaw、Claude Code** 等需要「本地有一份技能仓库」的环境。仓库示例：[332647062-netizen/skill-ai-builders-digest](https://github.com/332647062-netizen/skill-ai-builders-digest)。

---

## 一句话结论

**不能只把 Git 地址发给 AI 就装好了。**

- 地址 `https://github.com/332647062-netizen/skill-ai-builders-digest.git` 是用来 **用 Git 下载代码** 的（`git clone`）。
- **或者用网页上的「Download ZIP」** 下载压缩包，效果等价于「没有 Git 时手动拷代码」。
- 装 Skill 还至少需要：**把代码放到智能体认的目录里** + 在 `scripts` 里执行一次 **`npm install`**。  
  做完这些之后，再对 AI 说「设置关注动态」等指令才有用（见 [user-ai-prompts-zh.md](./user-ai-prompts-zh.md)）。

---

## 你需要准备什么

- 能上网的电脑（克隆或下载 ZIP 时要联网）。
- **任选其一**：已安装 [Git](https://git-scm.com/)，或不会用 Git 就只用浏览器下载 ZIP。
- 已安装 **Node.js**（建议 LTS），终端里能运行 `node -v` 和 `npm -v`。

---

## 方式 A：用 Git 克隆（推荐）

在终端执行（下面路径以 **Claude Code** 为例；OpenClaw 可把目录改成你文档里要求的 skills 路径，例如 `~/skills`）：

```bash
# 克隆到「技能目录」，文件夹名建议叫 follow-builders，和技能说明一致
git clone https://github.com/332647062-netizen/skill-ai-builders-digest.git ~/.claude/skills/follow-builders

# 安装脚本依赖
cd ~/.claude/skills/follow-builders/scripts && npm install
```

若你更习惯放到别的路径，只要 **客户端里把该文件夹注册为 Skill**，并保证里面有根目录的 **`SKILL.md`** 即可。

---

## 方式 B：不会 Git — 用「Download ZIP」

1. 打开仓库页：**[skill-ai-builders-digest](https://github.com/332647062-netizen/skill-ai-builders-digest)**。
2. 点绿色 **Code** → **Download ZIP**，下载压缩包。
3. 解压后你会看到一个文件夹（名字里常带 `-main`）。**建议重命名为 `follow-builders`**。
4. 把整个文件夹移动到智能体要求的 Skill 目录，例如：
   - **Claude Code**：`~/.claude/skills/follow-builders`（若 `skills` 不存在可先新建）。
5. 打开终端，进入 **`follow-builders/scripts`**，执行：

```bash
cd ~/.claude/skills/follow-builders/scripts
npm install
```

ZIP 与克隆的本质区别：**没有 `.git` 历史**，不影响日常使用；以后要更新需重新下载解压覆盖或再学 `git pull`。

---

## 装好之后怎么验证

1. 确认目录里有 **`SKILL.md`**、**`scripts/generate-feed.js`** 等。
2. 在已加载该 Skill 的智能体里发一句：`设置关注动态` 或 `set up follow builders`（更多复制文案见 [user-ai-prompts-zh.md](./user-ai-prompts-zh.md)）。
3. 若使用 **WeWe RSS**，还需维护 `scripts/sources/wechat-rss-input.json`，详见 [wechat-wewe-rss-iteration.md](./wechat-wewe-rss-iteration.md)。

---

## 常见误区

| 误区 | 说明 |
|------|------|
| 把 `.git` 链接丢给 AI 就当安装完成 | AI 无法替你在本机创建目录、执行 `git clone` / `npm install`，除非它有你机器上的终端权限且你明确让它执行这些命令。 |
| 只下载 ZIP 不解压、不 `npm install` | 脚本跑不起来，`prepare-digest` / `generate-feed` 可能缺依赖。 |
| 仓库 GitHub 描述和实际功能不一致 | 以本仓库 **`README` / `SKILL.md`** 为准；当前主线是 **微信公众号 + Builder Card**，不是光靠「给个 URL」自动订阅全网。 |

---

## 和上游仓库的关系

本仓库可能是 **fork**（例如来自 `zarazhangrui/follow-builders`）。安装时用 **你信任的 fork 地址** 或上游地址均可，步骤相同：都是 **克隆或 ZIP + 放对目录 + `npm install`**。
