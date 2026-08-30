import path from "node:path";

export const MAX_PROMPT_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PROMPT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PROMPT_ID_PATTERN = /^(?:temp|[1-9]\d{0,9})$/;
const STORED_FILENAME_PATTERN = /^\d{13}_[a-z0-9]{8}\.jpg$/;

export function parsePromptImageId(value: FormDataEntryValue | null): string | null {
  if (value === null) return "temp";
  if (typeof value !== "string" || !PROMPT_ID_PATTERN.test(value)) return null;
  return value;
}

export function createPromptImageFilename(
  now = Date.now(),
  random = crypto.randomUUID(),
): string {
  const suffix = random.replace(/-/g, "").slice(0, 8).toLowerCase();
  const filename = `${now}_${suffix}.jpg`;
  if (!STORED_FILENAME_PATTERN.test(filename)) {
    throw new Error("Unable to create a safe prompt image filename");
  }
  return filename;
}

export function resolvePromptImagePath(
  root: string,
  promptId: string,
  filename: string,
): { directory: string; filePath: string } | null {
  if (!PROMPT_ID_PATTERN.test(promptId) || !STORED_FILENAME_PATTERN.test(filename)) {
    return null;
  }

  const allowedRoot = path.resolve(root);
  const directory = path.resolve(allowedRoot, promptId);
  const filePath = path.resolve(directory, filename);
  const rootPrefix = `${allowedRoot}${path.sep}`;
  if (!directory.startsWith(rootPrefix) || !filePath.startsWith(`${directory}${path.sep}`)) {
    return null;
  }
  return { directory, filePath };
}
