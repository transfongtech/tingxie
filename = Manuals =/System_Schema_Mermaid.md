# Tingxie App 系统架构与模块图 (Mermaid)

本文件包含了 Tingxie App 的系统架构及其各模块之间的关系图。

> **注意 (Note)**: 
> 如果您使用 [Mermaid Live Editor](https://mermaid.live/)，请**仅复制**下方代码块（```mermaid ... ```）内部的内容，不要复制整个文件。每次只能渲染一个图表。

## 1. 系统整体架构图 (System Architecture)

```mermaid
graph TD
    subgraph Client_Side ["客户端 / 浏览器 (Client Side)"]
        UI["React/Next.js UI"]
        Canvas["手写识别画布 (Canvas)"]
        Audio["语音播放组件 (Audio)"]
    end

    subgraph Server_Side ["服务端 / Next.js Server"]
        Actions["Server Actions / API Routes"]
        Logic["业务逻辑层 - 复习算法"]
        Sync["同步脚本 - 词库导入"]
    end

    subgraph Data_Storage ["数据层 (Data Layer)"]
        DB[("SQLite / Prisma")]
    end

    subgraph External_Services ["外部服务 (External)"]
        Gemini["Google Gemini AI - 手写识别"]
    end

    UI --> Actions
    Canvas --> Actions
    Actions --> Gemini
    Actions --> Logic
    Logic --> DB
    Sync --> DB
    Actions --> Audio
```

## 2. 数据库模型关系图 (ER Diagram)

```mermaid
erDiagram
    WEEK ||--o{ WORDLIST : "contains"
    WORD ||--o{ WORDLIST : "listed_in"
    WORD ||--o{ REVIEWLOG : "generates"
    WORD ||--o| LEARNINGPROGRESS : "has"

    WEEK {
        int id PK
        int number
        string language
        string title
        boolean isActive
        datetime startDate
    }

    WORD {
        int id PK
        string content
        string notes
    }

    WORDLIST {
        int id PK
        int weekId FK
        int wordId FK
    }

    REVIEWLOG {
        int id PK
        int wordId FK
        datetime reviewDate
        string outcome
        int stage
    }

    LEARNINGPROGRESS {
        int id PK
        int wordId FK
        datetime nextReviewDate
        int stage
        boolean isMastered
    }
```

## 3. 听写练习流程图 (Logic Flow)

```mermaid
sequenceDiagram
    participant User as 用户
    participant App as 前端应用
    participant AI as Gemini AI
    participant DB as 数据库

    User->>App: 选择周次并点击开始
    App->>DB: 获取该周单词列表
    DB-->>App: 返回单词
    App->>User: 播报单词音频
    User->>App: 在手写板书写
    App->>AI: 发送手写图片进行识别
    AI-->>App: 返回识别出的汉字
    App->>App: 对比识别结果与标准答案
    App->>DB: 记录练习结果 (ReviewLog)
    App->>DB: 更新复习进度 (LearningProgress)
    App->>User: 显示对错反馈并播放下一个
```

## 4. 模块依赖图 (Module Dependencies)

```mermaid
graph LR
    App["app/"] --> Actions["app/actions/"]
    App --> Components["components/"]
    Actions --> Lib["lib/"]
    Actions --> Prisma["prisma/ - DB"]
    Lib --> GeminiAPI["lib/gemini.ts"]
    Lib --> Pinyin["pinyin-pro"]
    Sync["scripts/sync_vocab.ts"] --> Prisma
```
