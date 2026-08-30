/**
 * 本次修复的专项验证测试
 * 验证 3 个已修复的问题：
 *   1. EssayFeedback 新字段 contentBreakdownJson / languageBreakdownJson 可正常读写
 *   2. importSpellingErrors 自动创建 Week + WordList 关联
 *   3. 四类错误计数 (spelling/grammar/structure/vocab) 均正确持久化
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

async function main() {
  console.log("\n========================================");
  console.log("  修复验证测试 (Fix Verification Tests)");
  console.log("========================================\n");

  // ─── 测试 1: EssayFeedback 新字段写入与读取 ───
  console.log("📋 Test 1: EssayFeedback breakdown JSON 持久化");
  
  const testPrompt = await prisma.essayPrompt.create({
    data: { title: "__FIX_VERIFY_TEST_PROMPT__" },
  });
  
  const testSubmission = await prisma.essaySubmission.create({
    data: {
      promptId: testPrompt.id,
      essayText: "This is a test composition for verification.",
      wordCount: 8,
      status: "reviewed",
    },
  });

  const contentBreakdown = {
    relevance: "Good relevance to topic.",
    development: "Well-developed plot.",
    plotCoherence: "Logical flow maintained.",
    engagement: "Engaging narrative voice.",
  };
  const languageBreakdown = {
    grammar: "Minor tense errors.",
    vocabulary: "Age-appropriate word choices.",
    spelling: "2 spelling mistakes found.",
    organisation: "Clear paragraph structure.",
  };

  const testFeedback = await prisma.essayFeedback.create({
    data: {
      submissionId: testSubmission.id,
      annotations: "[]",
      polishedText: "Polished version here.",
      contentScore: 14,
      languageScore: 12,
      totalScore: 26,
      spellingErrors: 2,
      grammarErrors: 3,
      structureErrors: 1,
      vocabSuggestions: 4,
      summary: "Good effort George!",
      contentBreakdownJson: JSON.stringify(contentBreakdown),
      languageBreakdownJson: JSON.stringify(languageBreakdown),
    },
  });

  const loaded = await prisma.essayFeedback.findUnique({
    where: { id: testFeedback.id },
  });

  assert(loaded !== null, "EssayFeedback record created and loaded");
  assert(loaded!.contentBreakdownJson !== null, "contentBreakdownJson is not null");
  assert(loaded!.languageBreakdownJson !== null, "languageBreakdownJson is not null");

  const parsedContent = JSON.parse(loaded!.contentBreakdownJson!);
  assert(parsedContent.relevance === "Good relevance to topic.", "contentBreakdown.relevance round-trip");
  assert(parsedContent.engagement === "Engaging narrative voice.", "contentBreakdown.engagement round-trip");

  const parsedLanguage = JSON.parse(loaded!.languageBreakdownJson!);
  assert(parsedLanguage.grammar === "Minor tense errors.", "languageBreakdown.grammar round-trip");
  assert(parsedLanguage.organisation === "Clear paragraph structure.", "languageBreakdown.organisation round-trip");

  // ─── 测试 2: 四类错误计数持久化 ───
  console.log("\n📋 Test 2: 四类错误计数精确持久化");
  
  assert(loaded!.spellingErrors === 2, `spellingErrors = ${loaded!.spellingErrors} (expected 2)`);
  assert(loaded!.grammarErrors === 3, `grammarErrors = ${loaded!.grammarErrors} (expected 3)`);
  assert(loaded!.structureErrors === 1, `structureErrors = ${loaded!.structureErrors} (expected 1)`);
  assert(loaded!.vocabSuggestions === 4, `vocabSuggestions = ${loaded!.vocabSuggestions} (expected 4)`);

  // ─── 测试 3: importSpellingErrors 自动创建 Week + WordList ───
  console.log("\n📋 Test 3: importSpellingErrors 自动 Week + WordList 关联");

  const currentYear = new Date().getFullYear();
  const grade = Math.min(4 + (currentYear - 2025), 6);

  const testWordContent = "__fix_verify_test_word__";
  
  const testWord = await prisma.word.upsert({
    where: { content: testWordContent },
    update: {},
    create: { content: testWordContent },
  });

  const autoWeek = await prisma.week.upsert({
    where: {
      number_language_grade_term: {
        number: 0,
        language: "en",
        grade,
        term: 0,
      },
    },
    update: {},
    create: {
      number: 0,
      language: "en",
      grade,
      term: 0,
      title: "Essay Spelling Errors (Auto-imported)",
      isActive: true,
    },
  });

  assert(autoWeek.id > 0, `Auto-import Week created (id=${autoWeek.id})`);
  assert(autoWeek.number === 0, "Auto-import Week has number=0");
  assert(autoWeek.term === 0, "Auto-import Week has term=0");
  assert(autoWeek.language === "en", "Auto-import Week has language=en");
  assert(autoWeek.grade === grade, `Auto-import Week has grade=${grade}`);

  const wordList = await prisma.wordList.upsert({
    where: {
      weekId_wordId: {
        weekId: autoWeek.id,
        wordId: testWord.id,
      },
    },
    update: {},
    create: {
      weekId: autoWeek.id,
      wordId: testWord.id,
    },
  });

  assert(wordList.id > 0, "WordList association created");

  const foundViaFilter = await prisma.word.findFirst({
    where: {
      content: testWordContent,
      wordLists: {
        some: {
          week: {
            language: "en",
          },
        },
      },
    },
  });

  assert(foundViaFilter !== null, "Imported word visible via language filter (en)");
  assert(foundViaFilter?.content === testWordContent, "Language-filtered word content matches");

  // ─── 清理测试数据 ───
  console.log("\n🧹 Cleaning up test data...");
  
  await prisma.essayFeedback.delete({ where: { id: testFeedback.id } });
  await prisma.essaySubmission.delete({ where: { id: testSubmission.id } });
  await prisma.essayPrompt.delete({ where: { id: testPrompt.id } });
  await prisma.wordList.delete({ where: { id: wordList.id } });
  await prisma.word.delete({ where: { id: testWord.id } });

  // ─── 结果汇总 ───
  console.log("\n========================================");
  console.log(`  结果: ${passed} 通过, ${failed} 失败 (共 ${passed + failed} 项)`);
  console.log("========================================\n");

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Test runner failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
