# Tingxie App 技术实现文档

## 1. 项目概述
Tingxie App 是一个专为学生设计的听写练习 Web 应用程序，旨在通过科学的方法（系统化的周计划和艾宾浩斯记忆法）提高中英文词汇的听写能力。

## 2. 技术栈
### 前端 (Frontend)
- **框架**: Next.js 15+ (App Router)
- **UI 库**: React 19
- **样式**: Tailwind CSS (用于响应式设计和现代化 UI)
- **动画**: Framer Motion (用于平滑的交互过渡)
- **字体**: LXGW WenKai (霞鹜文楷) - 优化中文阅读体验，特别是针对教育场景。

### 后端 (Backend)
- **运行环境**: Node.js
- **API**: Next.js Server Actions & API Routes (处理业务逻辑和数据库交互)
- **ORM**: Prisma (用于类型安全的数据库操作)

### 数据库 (Database)
- **类型**: SQLite (本地轻量级文件数据库)
- **主要模型**:
    - `Week`: 管理每周的听写任务和语言类型。
    - `Word`: 存储词汇内容、拼音及注释。
    - `LearningProgress`: 记录词汇的掌握状态和下一次复习时间。
    - `ReviewLog`: 审计练习过程中的正确与错误记录。

### 外部集成 (Integrations)
- **AI 能力**: Google Generative AI (Gemini API) - 用于手写识别和辅助纠错。
- **拼音处理**: `pinyin-pro` - 用于自动从汉字生成准确的拼音。

## 3. 核心功能实现
### 3.1 复习算法 (Ebbinghaus Spaced Repetition)
系统内置了科学的复习机制：
- 每个词汇根据练习结果（正确/错误）分配不同的 `stage`。
- `stage` 对应的复习间隔通常为：1天、2天、4天、7天、15天。
- 只有成功通过所有阶段，词汇才会被标记为“已掌握”。

### 3.2 听写交互
- **音频播放**: 利用浏览器原生的 Web Speech API 或预录制的音频文件进行单词播报。
- **手写板**: 集成 Canvas 手写板，用户可以直接在屏幕上书写，识别结果通过 AI 接口进行比对。

### 3.3 数据管理
- **同步机制**: 提供了同步脚本 (`scripts/sync_vocab.ts`)，可通过解析 PDF 或 JSON 文件批量导入新加坡小学华文课本的词汇。

## 4. 目录结构说明
- `/app`: 页面路由和 API 逻辑。
- `/components`: 可复用的 UI 组件（如手写识别组件、单词卡片）。
- `/prisma`: 数据库架构定义和迁移文件。
- `/public`: 静态资源（字体、音频文件、图标）。
- `/lib`: 公共工具函数（如时间处理、AI 接口调用）。

## 5. 性能优化
- **字体优化**: 使用 Web Font 技术按需加载或提供 CDN 托管，确保在移动端（iPad/iPhone）也能正确显示。
- **静态生成**: 利用 Next.js 的静态生成能力提高首页和词表页面的响应速度。
