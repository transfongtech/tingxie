import { prisma } from "../lib/prisma";
import { createWeek, addWordsToWeek, deleteWeek } from "../app/actions/manage";
import { fetchSyllableScaffolding } from "../app/actions/syllable";
import { logReview } from "../app/actions/review";
import {
  createPracticeSession,
  getPendingReviews,
  submitParentReview,
  runLazyEvaluationFallback,
} from "../app/actions/practice-session";

async function runClosedLoopTests() {
  console.log("==================================================");
  console.log("🧪 Tingxie 2.1 闭环自动化测试套件 (Closed-Loop Test Suite)");
  console.log("==================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
    }
  }

  // --- Test 1: SQLite WAL & Singleton Check ---
  try {
    const walResult = (await prisma.$queryRawUnsafe("PRAGMA journal_mode;")) as any[];
    const journalMode = walResult[0]?.journal_mode;
    assert(journalMode === "wal", "Test 1: SQLite WAL 并发日志模式开启", `Current mode: ${journalMode}`);
  } catch (err: any) {
    assert(false, "Test 1: SQLite WAL 并发日志模式开启", err.message);
  }

  // --- Test 2: Content Management CRUD ---
  let createdWeekId: number | null = null;
  try {
    // Clean up if week 999 already exists
    const existingWeek = await prisma.week.findUnique({
      where: {
        number_language_grade_term: {
          number: 999,
          language: "en",
          grade: 3,
          term: 1,
        },
      },
    });
    if (existingWeek) {
      await deleteWeek(existingWeek.id);
    }

    const weekRes = await createWeek({
      number: 999,
      language: "en",
      title: "Automated Test Unit",
    });
    assert(weekRes.success && !!weekRes.week, "Test 2.1: 创建测试周次 (createWeek)");
    if (weekRes.week) {
      createdWeekId = weekRes.week.id;

      const wordsRes = await addWordsToWeek(
        createdWeekId,
        "extraordinary\nbeautiful\nknowledge"
      );
      assert(
        wordsRes.success && wordsRes.addedCount === 3,
        "Test 2.2: 批量解析并入库词汇 (addWordsToWeek)",
        `Added: ${wordsRes.addedCount}`
      );
    }
  } catch (err: any) {
    assert(false, "Test 2: 内容管理 CRUD", err.message);
  }

  // --- Test 3: Dyslexia 音节拆解服务 (Syllable Scaffolding) ---
  try {
    const wordObj = await prisma.word.findUnique({
      where: { content: "extraordinary" },
    });
    assert(!!wordObj, "Test 3.1: 目标测试词汇存在性验证");

    if (wordObj) {
      const sylRes = await fetchSyllableScaffolding(wordObj.id, "extraordinary");
      assert(
        sylRes.success && !!sylRes.data?.syllableList?.length,
        "Test 3.2: 获取/生成音节拆解数据 (fetchSyllableScaffolding)",
        `Syllables: ${JSON.stringify(sylRes.data?.syllableList)}`
      );
    }
  } catch (err: any) {
    assert(false, "Test 3: Dyslexia 音节拆解服务", err.message);
  }

  // --- Test 4: 记忆曲线与 LogReview 测试 ---
  try {
    const wordObj = await prisma.word.findUnique({
      where: { content: "extraordinary" },
    });
    if (wordObj) {
      // Reset learning progress for predictable testing
      await prisma.learningProgress.deleteMany({
        where: { wordId: wordObj.id },
      });

      // 1. Correct review -> stage + 1 (stage 0 -> 1)
      const logCorrectRes = await logReview(wordObj.id, true);
      assert(logCorrectRes.success, "Test 4.1: 记录答对复习 (logReview true)");

      const progress1 = await prisma.learningProgress.findUnique({
        where: { wordId: wordObj.id },
      });
      assert(progress1?.stage === 1, "Test 4.2: 答对后阶段晋升 (Stage 1)", `Stage: ${progress1?.stage}`);

      // 2. Wrong review -> stage reset
      const logWrongRes = await logReview(wordObj.id, false);
      assert(logWrongRes.success, "Test 4.3: 记录答错复习 (logReview false)");

      const progress2 = await prisma.learningProgress.findUnique({
        where: { wordId: wordObj.id },
      });
      assert(progress2?.stage === 0, "Test 4.4: 答错后阶段重置 (Stage 0)", `Stage: ${progress2?.stage}`);
    }
  } catch (err: any) {
    assert(false, "Test 4: 记忆曲线更新", err.message);
  }

  // --- Test 5: 华文听写练习与家长标记 (Parent Review) ---
  let testSessionId: number | null = null;
  try {
    const wordObj = await prisma.word.findUnique({
      where: { content: "extraordinary" },
    });
    if (wordObj) {
      const sessRes = await createPracticeSession({
        language: "zh",
        weekId: createdWeekId || undefined,
        wordIds: [wordObj.id],
      });
      assert(sessRes.success && !!sessRes.sessionId, "Test 5.1: 创建华文待批改练习记录 (createPracticeSession)");

      if (sessRes.sessionId) {
        testSessionId = sessRes.sessionId;
        const pending = await getPendingReviews();
        const found = pending.sessions?.some((s) => s.id === testSessionId);
        assert(found === true, "Test 5.2: 家长侧成功查询到待批改列表 (getPendingReviews)");

        const submitRes = await submitParentReview(testSessionId, [
          { wordId: wordObj.id, isCorrect: true },
        ]);
        assert(submitRes.success, "Test 5.3: 家长提交批改标记 (submitParentReview)");

        const sessionAfter = await prisma.practiceSession.findUnique({
          where: { id: testSessionId },
        });
        assert(
          sessionAfter?.status === "completed",
          "Test 5.4: 练习记录状态更新为 completed",
          `Status: ${sessionAfter?.status}`
        );
      }
    }
  } catch (err: any) {
    assert(false, "Test 5: 华文听写与家长标记", err.message);
  }

  // --- Test 6: 24 小时惰性评估 Fallback 测试 ---
  try {
    const past25Hours = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const expiredSession = await prisma.practiceSession.create({
      data: {
        language: "zh",
        status: "pending_review",
        startedAt: past25Hours,
      },
    });

    await runLazyEvaluationFallback();

    const updated = await prisma.practiceSession.findUnique({
      where: { id: expiredSession.id },
    });
    assert(
      updated?.status === "skipped",
      "Test 6: 超过 24h 惰性评估自动标记为 skipped",
      `Status: ${updated?.status}`
    );

    // Clean up
    await prisma.practiceSession.delete({ where: { id: expiredSession.id } });
  } catch (err: any) {
    assert(false, "Test 6: 24h 惰性评估 Fallback", err.message);
  }

  // --- Teardown Cleanup ---
  try {
    if (createdWeekId) {
      await deleteWeek(createdWeekId);
    }
    if (testSessionId) {
      await prisma.practiceResult.deleteMany({ where: { sessionId: testSessionId } });
      await prisma.practiceSession.delete({ where: { id: testSessionId } });
    }
  } catch {
    // Silent teardown
  }

  console.log("\n==================================================");
  console.log(`📊 测试报告总结: ${passedTests} / ${totalTests} 项通过 (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==================================================\n");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runClosedLoopTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
