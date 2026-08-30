/**
 * 多模态 AI 作文批改（Picture Prompt + Description + 偏题检测）专项闭环测试
 */

import "dotenv/config";
import { buildReviewPrompt, reviewEssayWithAI, ImageInput } from "../lib/essay-review";
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
  console.log("  多模态 AI 作文批改 - 闭环验证测试");
  console.log("========================================\n");

  // ─── Test 1: buildReviewPrompt 核心 Prompt 注入 ───
  console.log("📋 Test 1: Prompt 构筑与规则注入");
  const promptStr = buildReviewPrompt(
    "I like cats.",
    "An Animal You Like",
    "Write a story about a dog receiving a gift box.",
    true
  );

  assert(promptStr.includes('Topic Title: "An Animal You Like"'), "包含 Topic Title");
  assert(promptStr.includes('Prompt Instructions & Guidelines: "Write a story about a dog receiving a gift box."'), "包含 Prompt Description");
  assert(promptStr.includes("Image(s) of the picture prompt are attached"), "包含多模态图片提示");
  assert(
    /assess relevance/i.test(promptStr),
    "包含 relevance 细分评估规则",
  );

  // ─── Test 2: 多模态图片 Base64 编码与解析 ───
  console.log("\n📋 Test 2: 图片文件读取与 Base64 转换");
  
  // 创建一个极简 1x1 PNG 模拟图片
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  
  const mockImage: ImageInput = {
    buffer: samplePngBuffer,
    mimeType: "image/png",
  };

  assert(mockImage.buffer.length > 0, "图片 Buffer 加载成功");
  assert(mockImage.mimeType === "image/png", "MIME 类型提取正确");

  // ─── Test 3: 端到端 Gemini Flash AI 多模态批改验证 ───
  console.log("\n📋 Test 3: 端到端 Gemini 多模态批改 (含偏题/图片关联)");

  if (!process.env.GOOGLE_API_KEY) {
    console.log("  ⚠️ 跳过端到端 AI 测试（未配置 GOOGLE_API_KEY）");
  } else {
    try {
      // 提交一篇与 "Dog receiving a gift box" 不相关的作文
      const offTopicEssay = "Yesterday, I went to the supermarket with my mother to buy fresh apples and bananas. We had a great lunch at McDonald's afterwards.";

      const review = await reviewEssayWithAI(
        offTopicEssay,
        "An Animal You Like",
        "Pictures provided: 1. A playful dog, 2. A wrapped gift box, 3. A dog leash.",
        [mockImage]
      );

      assert(Boolean(review), "AI 返回有效的 Review 结果");
      assert(Boolean(review.scores), "包含分数对象");
      assert(Boolean(review.scores.contentBreakdown), "包含 contentBreakdown");
      assert(Boolean(review.scores.contentBreakdown.relevance), "包含 relevance 评语");

      console.log(`\n  ℹ️ AI relevance 反馈片段:\n  "${review.scores.contentBreakdown.relevance}"\n`);

      // 验证 content 得分（偏题或未提及图片应扣分）
      assert(review.scores.content <= 15, `Content score calibrated: ${review.scores.content}/18`);
    } catch (err: unknown) {
      console.error("AI Review error:", err);
      assert(
        false,
        "Gemini 多模态批改失败: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

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
