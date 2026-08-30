import { prisma } from "@/lib/prisma";
import { CompositionWritingArea } from "@/components/essay/CompositionWritingArea";
import { PromptHeader } from "@/components/essay/PromptHeader";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompositionWritingPage({ params }: PageProps) {
  const { id } = await params;
  const promptId = parseInt(id, 10);

  if (isNaN(promptId)) {
    notFound();
  }

  const prompt = await prisma.essayPrompt.findUnique({
    where: { id: promptId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      submissions: {
        include: {
          feedbacks: {
            where: { isCurrent: true, status: "success" },
            take: 1,
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!prompt) {
    notFound();
  }

  const pastSubmissions = prompt.submissions.filter((s) => s.status === "reviewed");

  return (
    <main className="max-w-[1600px] mx-auto p-3 md:px-6 md:py-3 h-screen flex flex-col space-y-3 text-[#2D2D2D] overflow-hidden">
      {/* Navigation & Header */}
      <PromptHeader
        promptId={prompt.id}
        initialTitle={prompt.title}
        initialDescription={prompt.description}
        pastSubmissionsCount={pastSubmissions.length}
        latestSubmissionId={pastSubmissions[0]?.id || null}
      />

      {/* Main Resizable Split View Writing Area (Left: Prompt + Helpers | Right: Editor) */}
      <CompositionWritingArea
        promptId={prompt.id}
        promptTitle={prompt.title}
        promptDescription={prompt.description}
        images={prompt.images}
        lastSubmittedAt={pastSubmissions[0]?.submittedAt.toISOString() || null}
      />
    </main>
  );
}
