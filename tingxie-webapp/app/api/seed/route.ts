import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

const DICTATION_DATA = `
**听写（一）《一起看电视》：** 忍不住, 看新闻, 国内外, 舞蹈表演, 共有五集, 听得入迷, 一脸疲倦, 一群观众, 提出建议, 全岛各地, 精彩的节目, 心里的秘密 
**听写（二）《我们是兄弟姐妹》：** 紧接着, 吃苹果, 一串鱼丸, 背着小鼓, 递给姑姑, 感到温暖, 表示同意, 担心害怕, 乌云密布, 挤在一起, 靠得紧紧的, 忽然灵机一动 
**听写（三）《妈妈，对不起》：** 舍不得, 睁开眼睛, 后悔极了, 乱发脾气, 尊敬长辈, 三更半夜, 补习中心, 警察叔叔, 走在街上, 眼泪落下来, 煮一碗面, 迷上电脑游戏 
**听写（四）《今天我值日》：** 负责任, 擦干净, 今天值日, 提醒同学, 归还碗盘, 不能插队, 注意卫生, 皱着眉头, 影响学习, 保持安静, 向老师保证, 感到难为情 
**听写（五）《我不怕打针》：** 戴眼镜, 吃药打针, 表演结束, 回到课室, 继续上课, 伸出双手, 闷闷不乐, 胆子很大, 闭上眼睛, 说谎骗人, 痛得大哭, 视力变差 
**听写（六）《我要参加什么活动呢》：** 华乐团, 功夫厉害, 训练辛苦, 互相鼓励, 许多朋友, 内容丰富, 好久不见, 幸运号码, 分享快乐, 身体健康, 参加童子军, 欢迎新队员 
**听写（七）《他的脸红了》：** 地铁车厢, 巴士乘客, 不听劝告, 连忙道歉, 老师批评, 悄悄离开, 没有乱抢, 左右摇摆, 耐心等待, 参观企鹅馆, 拼命地往里钻, 有秩序地排队 
**听写（八）《马路如虎口》：** 指挥交通, 遵守规则, 发生车祸, 了解情况, 获得表扬, 见义勇为, 顺利完成, 受伤流血, 送往医院, 巨大的响声, 另一辆汽车, 司机被困在车里 
**听写（九）《爱心无障碍》：** 组屋居民, 熟食中心, 饮料摊位, 偷吃糖果, 提供便利, 其中一个, 没听清楚, 重复一遍, 笨手笨脚, 味道一般, 指着告示牌, 讨厌吃炸鸡 
`;

const RECITATION_DATA = `
* **默写（一）动作描写——看：**
1. 目睹了这一幕，他惊讶得目瞪口呆。 
2. 妹妹定睛一看，发现草丛里有一个黑色的钱包。 
3. 这部电影很精彩，观众都看得入迷了。 

* **默写（二）动作描写——行走：**
1. 我拖着沉重的双脚，慢慢地走回家。 
2. 电话铃声响了，大华三步并作两步地走去客厅接电话。 
3. 这时候，妈妈撑着伞，急急忙忙地赶来了。 

* **默写（三）心情描写——伤心：**
1. 她鼻子一酸，眼睛一红，不听话的眼泪顺着脸颊流了下来。 
2. 我心疼得像刀割一样，眼泪忍不住地往下流，哭得像个泪人似的。 
3. 我非常感动，眼泪就忍不住落了下来。 

* **默写（四）描写——后悔/惭愧：**
1. 我因为错怪了妹妹而感到后悔不已，但又不敢开口认错。 
2. “早知今日，何必当初”，如果世上真的有后悔药，我一定会吃下它。 
3. 这时，小安红着脸站了起来，难为情地说：“今天是我值日，我忘了。对不起！” 

* **默写（五）心情描写——开心：**
1. 听了校长的表扬，我心里甜滋滋的，比吃了蜜糖还要甜。 
2. 爸爸边看边点头，嘴角渐渐上扬，脸上露出欣慰的笑容。 
3. 得到了大家的称赞，我露出得意的微笑，走起路来轻飘飘的。 
`;

const cnNumMap: Record<string, number> = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10
};

export async function GET() {
    try {
        let log = [];

        // 1. Process Dictation
        const dictLines = DICTATION_DATA.split("\n").filter(l => l.trim().length > 0);
        for (const line of dictLines) {
            // Adjusted regex to match the input format correctly
            // Format: **听写（一）《一起看电视》：** word1, word2...
            const match = line.match(/听写（([一二三四五六七八九十]+)）《(.+)》：\*\*(.+)/) ||
                line.match(/听写（([一二三四五六七八九十]+)）《(.+)》：\s*(.+)/); // Fallback

            if (match) {
                const numStr = match[1];
                const title = match[2];
                const contentRaw = match[3];
                const weekNum = cnNumMap[numStr];

                if (weekNum) {
                    // Upsert Week
                    const week = await prisma.week.upsert({
                        where: {
                            number_language: {
                                number: weekNum,
                                language: "zh"
                            }
                        },
                        update: { title: `Week ${weekNum} - ${title}` },
                        create: {
                            number: weekNum,
                            title: `Week ${weekNum} - ${title}`,
                            isActive: true,
                            language: "zh"
                        },
                    });

                    // Process Words
                    const words = contentRaw.trim().split(/[,，]\s*/).map(w => w.trim()).filter(w => w);
                    for (const wordText of words) {
                        const word = await prisma.word.upsert({
                            where: { content: wordText },
                            update: {},
                            create: { content: wordText },
                        });

                        await prisma.wordList.upsert({
                            where: { weekId_wordId: { weekId: week.id, wordId: word.id } },
                            update: {},
                            create: { weekId: week.id, wordId: word.id },
                        });
                    }
                    log.push(`Processed Dictation Week ${weekNum}: ${words.length} words`);
                }
            }
        }

        // 2. Process Recitation
        const recitationBlocks = RECITATION_DATA.split(/\* \*\*默写（/);
        for (const block of recitationBlocks) {
            if (!block.trim()) continue;

            // block starts like: "一）动作描写——看：**\n1. sentence...\n2. sentence..."
            const firstLineEnd = block.indexOf("\n");
            const headerObj = block.substring(0, firstLineEnd);
            const contentObj = block.substring(firstLineEnd);

            const numMatch = headerObj.match(/^([一二三四五六七八九十]+)）(.+)：/);
            if (numMatch) {
                const numStr = numMatch[1];
                const topic = numMatch[2].replace(/\*\*/g, "").trim(); // Remove ** if present
                const weekNum = cnNumMap[numStr];

                if (weekNum) {
                    // Find Week (Should exist from Dictation, but upsert to be safe)
                    const week = await prisma.week.upsert({
                        where: {
                            number_language: {
                                number: weekNum,
                                language: "zh"
                            }
                        },
                        update: {}, // Don't overwrite title from dictation, just append? Or leave it.
                        create: {
                            number: weekNum,
                            title: `Week ${weekNum}`, // Fallback title
                            isActive: true,
                            language: "zh"
                        },
                    });

                    // Extract sentences (lines starting with digit dot)
                    const sentences = contentObj.match(/^\d+\.\s*(.+)/gm)?.map(s => s.replace(/^\d+\.\s*/, "").trim()) || [];

                    for (const sent of sentences) {
                        // Treat sentence as a "word" for now
                        const word = await prisma.word.upsert({
                            where: { content: sent },
                            update: {},
                            create: { content: sent, notes: `默写: ${topic}` },
                        });

                        await prisma.wordList.upsert({
                            where: { weekId_wordId: { weekId: week.id, wordId: word.id } },
                            update: {},
                            create: { weekId: week.id, wordId: word.id },
                        });
                    }
                    log.push(`Processed Recitation Week ${weekNum}: ${sentences.length} sentences`);
                }
            }
        }

        return NextResponse.json({ success: true, log });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
