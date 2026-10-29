import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Sprint 1: seed minimo (admin, clientes, catalogo base).
    // El seed masivo de RNF-05 se completa en el Sprint 4.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Fallback por defecto al contenedor de docker-compose.yml para que
    // `prisma generate` (ejecutado en `npm install` via postinstall) funcione
    // incluso en un repositorio recien clonado antes de crear el archivo .env.
    url:
      process.env.DATABASE_URL ??
      "postgresql://sneaker:sneaker_dev@localhost:5433/sneaker?schema=public",
  },
});
