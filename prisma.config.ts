import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  seed: "ts-node prisma/seed.ts",
});
