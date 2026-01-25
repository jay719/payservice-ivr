// Prisma v7 config (CJS) for this package.
//
// Key points:
// - Keep the datasource URL out of schema.prisma (you've chosen to centralize it here).
// - Export the config as the module default (module.exports) so Prisma can load it cleanly.

require("dotenv/config");

const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // The datasource name must match the one in schema.prisma: `datasource db { ... }`
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
