# 📱 Tingxie (听写) App - AI-Powered Practice Companion

![Vibe Coding](https://img.shields.io/badge/Developed_with-Agentic_AI-blue?style=for-the-badge&logo=google)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

这是一个通过 **Agentic AI (Vibe Coding)** 全自动开发和维护的现代化“听写与复习” Web 应用。旨在帮助学生以更生动、智能的方式练习中文和英文词汇。由于是强依赖大模型辅助生成的项目，这份文档不仅供人类开发者参考，更是为了**未来 Agentic AI 介入维护和二次开发时，能够实现“一秒钟光速上手”**。

---

## 🚀 愿景与目标 (Vision & Goals)
- **教育赋能**：告别枯燥的纸质抄写！融合 AI 智能造句、原生高质量 TTS (文本转语音)、甚至手写图像识别纠错。
- **现代化体验**：极致流畅的 UI、令人惊叹的动效（Framer Motion 驱动），媲美原生 App。
- **Agent 友好 (Vibe Coding)**：项目结构扁平透明，核心逻辑高度解耦，方便 AI Agent 以更细粒度的方式修改和部署。

---

## 🛠 技术栈 (Tech Stack)

| 领域 | 选型 | 优势与用途 |
|---|---|---|
| **核心框架** | `Next.js 16` (App Router) + `React 19` | 采用最新的 Server Components 架构，数据加载飞快，SEO 友好。 |
| **编程语言** | `TypeScript` | 严格的类型约束，使得 AI Agent 在编写组件时极少犯类型错误。 |
| **数据库** | `SQLite` + `Prisma` | 零配置、极简、本地化。Prisma 提供了极强的数据关系管理与迁移能力。 |
| **样式与动画** | `Tailwind CSS v4` + `Framer Motion` | Tailwind 保证了开发速度与样式隔离，Framer Motion 提供了物理规律级别的顺滑过渡。 |
| **原生语音** | `google-tts-api` | 轻量、无 Key 依赖，直接获取 Google 高质量的跨语言音频基地。我们使用本地文件系统进行了二次缓存 (`public/tts_cache`)。 |
| **AI 大神经元** | `@google/generative-ai` | 项目接入了 Gemini API，用于“生动造句”以及“手写拼写识别 (`vision`)”模块。 |
| **拼音库** | `pinyin-pro` | 处理复杂多音字与拼音渲染的核心。 |

---

## 🗺 工作流与架构图 (Workflow Scheme)

### 1. 数据同步流 (Data Synchronization)
- 系统词库(如 `data/vocabulary_zh.json`) 是 SSOT (Single Source of Truth，唯一数据源)。
- 执行 `npm run sync` (即 `tsx scripts/sync_vocab.ts`)。
- 脚本通过 Prisma 将词库（`Week` 和 `WordList`）完全幂等地平滑合并打入 SQLite `dev.db` 数据库。

### 2. 页面渲染与访问流 (Page Rendering)
1. 用户访问 `app/practice/[weekId]/page.tsx`。
2. **Server Component** 执行数据库查询，直接把词汇表结构化数据传递给 Client 组件 `<PracticeSession />`。
3. 如果是多音字，UI 自动挂载由 `pinyin-pro` 生成的 HTML 拼音注音。

### 3. TTS 语音缓存生成流 (Text-to-Speech)
- 当前端需要播放声音时：
  1. `<PracticeSession />` 拦截请求并向 `/api/tts?text={word}&lang={zh/en}` 发送 HTTP GET。
  2. 后端读取本地 `public/tts_cache/{md5_hash}.mp3`。
  3. **有缓存** -> 直接返回 MP3 数据流，延时几乎为零。
  4. **无缓存** -> 调用 Node 侧的 `google-tts-api` 去谷歌下载 Base64 格式音频，然后将其存入缓存并返回。

### 4. AI 诊断辅助流 (Handwriting & Story)
- **生动造句**：POST 请求发向 `/api/story/generate`，携带单词列表。后端调用 Gemini 动态返回创意连词成句结果。
- **手写体批改**：POST 图片(Base64) 发向 `/api/handwriting-recognize`。Gemini 视觉模型对孩子在纸上的听写结果进行识别纠错，返回 JSON 配置高亮错误单词。

---

## 🤖 Agentic AI 快速上手指南 (For Future Agents)

*“嘿，未来的 AI 同事。当你被赋予修改这个仓库的任务时，请牢记以下法则：”*

1. **先看结构再动手**：
   - 核心前端业务组件在 `components/`。最重磅的是 `PracticeSession.tsx`，它是用户交互的中枢引擎。
   - 所有后端路由在 `app/api/`，遵循 Next.js Route Handlers 的范式。
   - 数据库模型唯一入口在 `prisma/schema.prisma`。如果有修改，请运行 `npx prisma db push`，且永远要随后更新 `scripts/sync_vocab.ts`！

2. **绝对禁止的骚操作**：
   - **请勿**擅自改变 Next.js App Router 的目录规则（不要把 page 放在外层）。
   - **请勿**用复杂的 `bash` 或 `cat`/`sed` 对深层文件进行暴力破坏，老老实实调用 `replace_file_content`，保持原子性。
   - 在编辑 CSS / Tailwind 类名时，请坚决贯彻 **现代化美学基调**：多用 `backdrop-blur`, `bg-opacity`, 渐变与阴影（柔和的高端感）。

3. **常用本地运维指令集** (仅供参阅)：
   - 启动本地开发: `npm run dev`
   - 重建词库数据: `npm run sync`
   - UI 查看数据库: `npx prisma studio`
   - 生产环境构建: `npm run build`
   - 后台守护进程(PM2): `pm2 start ecosystem.config.js` -> `pm2 logs tingxie-webapp`

---

## 💣 故障排查血泪史 (Troubleshooting History)

在 Vibe Coding 的持续运行中，我们遇到过以下棘手问题，特在此备案，避免重复踩坑：

### 1. 英语发音集体罢工 (Missing English Audio)
- **现象**：`Week 7 (Unit 2)` 等外语发音完全无法发声，页面请求 Pending 到天荒地老。
- **溯源**：最初版本的 TTS 后端使用了外部 Python 子进程的 `edge_tts` 命令行工具。由于微软后端可能存在的并发/IP 阻断策略，导致 `edge_tts` 直接挂起（既不报错也不退出进程）。
- **终极解法**：全面重构了 `app/api/tts/route.ts`，彻底移除了跨语言依赖，全部拥抱原生的 Node.js 库 `google-tts-api`。本地缓存机制被完美继承。

### 2. Next.js "Standalone" 模式编译卡死 (Build Freeze)
- **现象**：在服务器上执行 `npm run build`，在最后阶段 “Finalizing page optimization” 发生无限悬停（卡死30分钟以上）。
- **溯源**：Next.js 针对 Node 25 或在 Turbopack/SQLite 下的 `output: "standalone"` 配置存在底层的 I/O 线程锁死 BUG。
- **终极解法**：修改 `next.config.ts`，删除了 `output: "standalone"`。修改 `ecosystem.config.js`，让 PM2 通过原生的 `npm run start` 启动应用。问题秒切解决。

### 3. 服务端无限奔溃重启循环 (Crash Loop)
- **现象**：服务部署后，访问提示 502 Bad Gateway，pm2 的重启次数 (↺) 疯狂上升。
- **溯源**：发现由于 Vibe Coding 时的环境污染，导致 `node_modules` 出现二进制破损 / 或 `.next` 构建缓存污染。
- **终极解法**：清理重塑宇宙 —— `rm -rf node_modules .next package-lock.json` -> `npm install` -> `npm run build`。

---

## 💡 FAQ (常见问题解答)

**Q: 为什么应用中没有任何关于认证 (Authentication) 的部分？**
<br>A: Tingxie 目前被设定为纯客户端的本地家庭学习工具。我们使用基于 Cookie或浏览器缓存的轻量身份跟踪（如果需要）。当前架构去掉了所有臃肿的扫码登录/鉴权流程，让核心聚焦于 **无感体验**。

**Q: 我想要新增每周的英语听写任务，怎么办？**
<br>A: 非常简单！只需要打开 `data/vocabulary_en.json`，在数组中新增一个 JSON 对象（格式参考内部现有结构）。然后执行 `npm run sync`，词汇就会被毫秒级注入到数据库并在前台呈现。

**Q: 想要修改发音大叔的声音？**
<br>A: 目前 `zh-CN` 和 `en` 两类发音参数分别在 `/api/tts/route.ts` 中写定。如果想微调速度或语调，请针对 `google-tts-api` 的选项参数 `speed` 传入浮点数（例如 `slow: false`）。

---
*Generated & maintained by Antigravity AI.* 🌌
