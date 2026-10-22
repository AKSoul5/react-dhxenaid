// Applies prisma/migrations (copied into the app) the way `prisma migrate
// deploy` does, recording each in Prisma's _prisma_migrations table, so the
// desktop app needs no Prisma CLI and its migration engine.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

async function migrate(url, dir) {
  const client = new Client({ connectionString: url.replace(/\?.*$/, "") });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0)`);
    const { rows } = await client.query(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`);
    const done = new Set(rows.map((r) => r.migration_name));
    const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, "migration.sql"))).sort();
    const applied = [];
    for (const name of names) {
      if (done.has(name)) continue;
      const sql = fs.readFileSync(path.join(dir, name, "migration.sql"), "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
           VALUES ($1, $2, now(), $3, 1)`, [crypto.randomUUID(), checksum, name]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed: ${err.message}`);
      }
      applied.push(name);
    }
    return applied;
  } finally {
    await client.end();
  }
}

module.exports = { migrate };
