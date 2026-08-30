import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRESET_PHRASES = [
  // 😨 Fear & Shock
  { content: "heart pounded wildly", category: "fear" },
  { content: "froze on the spot", category: "fear" },
  { content: "a chill ran down my spine", category: "fear" },
  { content: "trembled with fear", category: "fear" },
  { content: "swallowed hard before speaking", category: "fear" },

  // 😊 Happiness
  { content: "eyes lit up with joy", category: "happiness" },
  { content: "grinned from ear to ear", category: "happiness" },
  { content: "jumped for joy", category: "happiness" },
  { content: "beamed with pride", category: "happiness" },
  { content: "felt on top of the world", category: "happiness" },

  // 😢 Sadness
  { content: "tears rolled down his cheeks", category: "sadness" },
  { content: "hung his head in shame", category: "sadness" },
  { content: "felt a lump in his throat", category: "sadness" },
  { content: "shoulders slumped in defeat", category: "sadness" },
  { content: "blinked back tears", category: "sadness" },

  // 😡 Anger
  { content: "clenched his fists tightly", category: "anger" },
  { content: "face turned red with fury", category: "anger" },
  { content: "glared with dagger-like eyes", category: "anger" },
  { content: "stomped his foot in anger", category: "anger" },
  { content: "shouted at the top of his voice", category: "anger" },

  // 🏃 Urgency & Action
  { content: "dashed towards the scene", category: "urgency" },
  { content: "without a moment's hesitation", category: "urgency" },
  { content: "as fast as his legs could carry him", category: "urgency" },
  { content: "raced against time", category: "urgency" },
  { content: "called out desperately for help", category: "urgency" },

  // 😮 Surprise & Relief
  { content: "gasped in utter disbelief", category: "surprise" },
  { content: "heaved a long sigh of relief", category: "surprise" },
  { content: "could not believe his eyes", category: "surprise" },
  { content: "stood rooted to the ground", category: "surprise" },
  { content: "let out a shaky breath", category: "surprise" },

  // 🌤️ Weather & Setting
  { content: "the sun beat down mercilessly", category: "weather" },
  { content: "dark clouds gathered overhead", category: "weather" },
  { content: "a gentle breeze blew across", category: "weather" },
  { content: "heavy rain poured down", category: "weather" },
  { content: "the sky turned grey and gloomy", category: "weather" },

  // 👀 Actions & Description
  { content: "whispered softly in his ear", category: "description" },
  { content: "nodded his head slowly", category: "description" },
  { content: "took a deep breath to calm down", category: "description" },
  { content: "looked around nervously", category: "description" },
  { content: "scratched his head in confusion", category: "description" },
];

async function main() {
  console.log("Seeding preset P4 English phrases...");
  let count = 0;

  for (const item of PRESET_PHRASES) {
    await prisma.phrase.upsert({
      where: {
        content_language: {
          content: item.content.toLowerCase().trim(),
          language: "en",
        },
      },
      create: {
        content: item.content.toLowerCase().trim(),
        category: item.category,
        source: "preset",
        language: "en",
      },
      update: {},
    });
    count++;
  }

  console.log(`Successfully seeded ${count} preset P4 phrases!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
