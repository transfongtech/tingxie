import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const DATA_FILE_ZH = path.join(process.cwd(), "data", "vocabulary.json");
const DATA_FILE_EN = path.join(process.cwd(), "data", "vocabulary_en.json");

async function syncFile(filePath: string, language: string) {
    if (!fs.existsSync(filePath)) {
        console.warn(`Warning: Data file not found: ${filePath}`);
        return;
    }

    console.log(`Syncing ${language.toUpperCase()} vocabulary from file:`, filePath);
    const rawData = fs.readFileSync(filePath, "utf-8");
    const weeksData = JSON.parse(rawData);

    for (const weekData of weeksData) {
        const weekNum = weekData.id;
        const title = weekData.title;
        // Parse date if present
        let dictationDate = null;
        if (weekData.dictationDate) {
            dictationDate = new Date(weekData.dictationDate);
        }

        console.log(`Syncing Week ${weekNum} (${language}): ${title}`);

        // 1. Upsert Week
        // Use findFirst + update or create because @@unique is [number, language]
        const week = await prisma.week.upsert({
            where: {
                number_language: {
                    number: weekNum,
                    language: language
                }
            },
            update: {
                title: weekData.title,
                dictationDate: dictationDate,
                isActive: true
            },
            create: {
                number: weekNum,
                language: language,
                title: weekData.title,
                isActive: true,
                dictationDate: dictationDate
            },
        });

        // 2. Sync Words (Dictation)
        if (weekData.words && Array.isArray(weekData.words)) {
            for (const wordText of weekData.words) {
                if (!wordText.trim()) continue;

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
        }

        // 3. Sync Sentences (Recitation)
        if (weekData.sentences && Array.isArray(weekData.sentences)) {
            for (const sent of weekData.sentences) {
                if (!sent.trim()) continue;

                const word = await prisma.word.upsert({
                    where: { content: sent },
                    update: {},
                    create: { content: sent, notes: language === 'zh' ? "默写" : "Dictation Sentence" },
                });

                await prisma.wordList.upsert({
                    where: { weekId_wordId: { weekId: week.id, wordId: word.id } },
                    update: {},
                    create: { weekId: week.id, wordId: word.id },
                });
            }
        }
    }
}

async function main() {
    await syncFile(DATA_FILE_ZH, "zh");
    await syncFile(DATA_FILE_EN, "en");
    console.log("Sync complete! 🎉");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
