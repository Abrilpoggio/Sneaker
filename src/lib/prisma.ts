import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Instancia unica de Prisma Client.
 *
 * Prisma abre un pool de conexiones por cada instancia. En desarrollo
 * el modulo se recarga en cada cambio de archivo (Fast Refresh), asi que
 * sin este cache cada recarga abriria un pool nuevo hasta agotar el
 * limite de conexiones de Postgres.
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env y completa los valores.",
    );
  }

  // Prisma 7 exige un driver adapter explicito en lugar del motor Rust.
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
