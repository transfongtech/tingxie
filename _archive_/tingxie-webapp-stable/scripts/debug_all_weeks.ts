
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const weeks = await prisma.week.findMany({
        orderBy: { number: 'asc' },
        include: {
            wordLists: {
                include: {
                    word: true
                }
            }
        }
    });

    console.log(`Found ${weeks.length} total weeks.`);

    for (const week of weeks) {
        console.log(`\nWeek ID: ${week.id} | Number: ${week.number} | Lang: ${week.language} | Title: ${week.title}`);
        console.log(`Total Words: ${week.wordLists.length}`);

        const wordCounts = new Map<string, number>();
        let duplicates = 0;

        week.wordLists.forEach(wl => {
            const content = wl.word.content;
            wordCounts.set(content, (wordCounts.get(content) || 0) + 1);
        });

        wordCounts.forEach((count, word) => {
            if (count > 1) {
                console.error(`  [!] DUPLICATE: "${word}" (x${count})`);
                duplicates++;
            }
        });

        if (duplicates === 0) {
            console.log("  Status: OK");
        } else {
            console.error(`  Status: FAILED (${duplicates} duplicates)`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
