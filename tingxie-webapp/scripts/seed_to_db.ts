import { prisma } from "../lib/prisma";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Starting DB seeding from vocabulary JSON files...");

  // 1. Seed Chinese vocabulary
  const zhPath = path.join(__dirname, "../data/vocabulary.json");
  if (fs.existsSync(zhPath)) {
    const zhData = JSON.parse(fs.readFileSync(zhPath, "utf-8"));
    for (const item of zhData) {
      const dictationDate = item.dictationDate ? new Date(item.dictationDate) : null;

      const week = await prisma.week.upsert({
        where: {
          number_language_grade_term: {
            number: item.id,
            language: "zh",
            grade: 3,
            term: 1,
          },
        },
        update: {
          title: item.title,
          dictationDate,
        },
        create: {
          number: item.id,
          language: "zh",
          grade: 3,
          term: 1,
          title: item.title,
          dictationDate,
          isActive: item.id === 1,
        },
      });

      for (const wStr of item.words || []) {
        const trimmed = wStr.trim();
        if (!trimmed) continue;

        const wordObj = await prisma.word.upsert({
          where: { content: trimmed },
          update: {},
          create: { content: trimmed },
        });

        await prisma.wordList.upsert({
          where: {
            weekId_wordId: {
              weekId: week.id,
              wordId: wordObj.id,
            },
          },
          update: {},
          create: {
            weekId: week.id,
            wordId: wordObj.id,
          },
        });
      }
    }
    console.log(`Seeded ${zhData.length} Chinese weeks.`);
  }

  // 2. Seed English vocabulary
  const enPath = path.join(__dirname, "../data/vocabulary_en.json");
  if (fs.existsSync(enPath)) {
    const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));
    for (const item of enData) {
      const dictationDate = item.dictationDate ? new Date(item.dictationDate) : null;

      const week = await prisma.week.upsert({
        where: {
          number_language_grade_term: {
            number: item.id,
            language: "en",
            grade: 3,
            term: 1,
          },
        },
        update: {
          title: item.title,
          dictationDate,
        },
        create: {
          number: item.id,
          language: "en",
          grade: 3,
          term: 1,
          title: item.title,
          dictationDate,
          isActive: item.id === 1,
        },
      });

      for (const wStr of item.words || []) {
        const trimmed = wStr.trim();
        if (!trimmed) continue;

        const wordObj = await prisma.word.upsert({
          where: { content: trimmed },
          update: {},
          create: { content: trimmed },
        });

        await prisma.wordList.upsert({
          where: {
            weekId_wordId: {
              weekId: week.id,
              wordId: wordObj.id,
            },
          },
          update: {},
          create: {
            weekId: week.id,
            wordId: wordObj.id,
          },
        });
      }
    }
    console.log(`Seeded ${enData.length} English weeks.`);
  }

  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
