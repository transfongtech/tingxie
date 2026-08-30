import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const client = new PrismaClient();
  // Enable WAL mode for SQLite to handle concurrency and eliminate SQLITE_BUSY deadlocks
  client.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch((err) => {
    console.error("Failed to enable WAL mode on SQLite:", err);
  });
  return client;
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

export default prisma;
