import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env.local (Next.js convention); dotenv/config defaults to .env
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use the direct connection (not pgbouncer) for CLI operations:
    // db push, migrate deploy, migrate dev, etc.
    url: process.env.DIRECT_URL,
  },
});
