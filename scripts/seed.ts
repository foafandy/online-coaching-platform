import fs from "node:fs";
import path from "node:path";

async function main() {
  const reset = process.argv.includes("--reset");
  const dbPath =
    process.env.DATABASE_PATH || path.join(process.cwd(), "storage", "coach-fouad.db");

  if (reset) {
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    }
    console.log(`[seed] removed ${dbPath}`);
  }

  // Imported after the reset so the database is created fresh.
  const { getDb } = await import("../src/lib/db");
  const db = getDb();

  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

  console.log(
    [
      "[seed] database ready",
      `  users:            ${count("users")}`,
      `  client profiles:  ${count("client_profiles")}`,
      `  nutrition plans:  ${count("nutrition_plans")}`,
      `  workout plans:    ${count("workout_plans")}`,
      `  files:            ${count("files")}`,
      `  announcements:    ${count("announcements")}`,
      `  notifications:    ${count("notifications")}`,
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
