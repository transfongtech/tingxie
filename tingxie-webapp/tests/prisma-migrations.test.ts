import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { PrismaClient } from "@prisma/client";

test("migrate deploy creates the complete schema from an empty SQLite database", async () => {
  const root = path.resolve(__dirname, "..");
  const artifactDir = path.join(root, ".test-artifacts");
  const databasePath = path.join(artifactDir, "empty-migrate.db");
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.rmSync(databasePath, { force: true });

  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      cwd: root,
      env: { ...process.env, DATABASE_URL: `file:${databasePath}` },
      stdio: "pipe",
    });

    const db = new PrismaClient({
      datasources: { db: { url: `file:${databasePath}` } },
    });
    try {
      const columns = await db.$queryRawUnsafe<Array<{ name: string }>>(
        'PRAGMA table_info("EssayFeedback")',
      );
      const submissionColumns = await db.$queryRawUnsafe<
        Array<{ name: string }>
      >('PRAGMA table_info("EssaySubmission")');
      assert(columns.some(({ name }) => name === "reviewResultJson"));
      assert(
        submissionColumns.some(({ name }) => name === "reviewLeaseExpiresAt"),
      );
    } finally {
      await db.$disconnect();
    }
  } finally {
    fs.rmSync(artifactDir, { recursive: true, force: true });
  }
});
