import { revalidatePath } from "next/cache";

export function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore error when invoked outside Next.js request context (e.g. in standalone test scripts)
  }
}
