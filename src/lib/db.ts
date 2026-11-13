import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { seedDatabase } from "./seed";

const globalForDb = globalThis as unknown as { __coachDb?: Database.Database };

export const STORAGE_DIR = path.join(process.cwd(), "storage", "uploads");
export const DB_PATH =
  process.env.DATABASE_PATH || path.join(process.cwd(), "storage", "coach-fouad.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  admin_scope TEXT CHECK (admin_scope IN ('full','clients')),
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  goal TEXT,
  avatar_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive','suspended')),
  coach_notes TEXT,
  subscription_started_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_manager_assignments (
  manager_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (manager_user_id, client_id)
);

CREATE TABLE IF NOT EXISTS client_onboarding (
  client_id TEXT PRIMARY KEY REFERENCES client_profiles(id) ON DELETE CASCADE,
  weight_kg REAL NOT NULL,
  height_cm REAL NOT NULL,
  age INTEGER NOT NULL,
  experience TEXT NOT NULL CHECK (experience IN ('beginner','some','experienced')),
  goal TEXT NOT NULL,
  training_days INTEGER NOT NULL,
  training_location TEXT NOT NULL CHECK (training_location IN ('gym','home','other')),
  health_flag TEXT NOT NULL CHECK (health_flag IN ('yes','no')),
  health_notes TEXT NOT NULL DEFAULT '',
  dietary_notes TEXT NOT NULL DEFAULT '',
  photo_front TEXT NOT NULL,
  photo_side TEXT NOT NULL,
  photo_back TEXT NOT NULL,
  photo_consent_at TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutrition_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fats_g INTEGER,
  notes TEXT,
  is_template INTEGER NOT NULL DEFAULT 0,
  source_plan_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nutrition_meals (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  meal_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meal_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES nutrition_meals(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  quantity TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  split_type TEXT,
  notes TEXT,
  is_template INTEGER NOT NULL DEFAULT 0,
  source_plan_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_days (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  day_id TEXT NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets TEXT,
  reps TEXT,
  rest_seconds INTEGER,
  video_url TEXT,
  image_path TEXT,
  instructions TEXT,
  coach_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('nutrition','workout')),
  plan_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_assignments_client ON assignments(client_id, kind, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_plan ON assignments(plan_id);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('nutrition','workout','progress','exercise','supplements','other')),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS file_assignments (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (file_id, client_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'account',
  link TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  ensureMigrations(db);

  const seeded = db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get() as
    | { value: string }
    | undefined;
  if (!seeded) {
    seedDatabase(db);
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded', ?)").run(
      new Date().toISOString(),
    );
  }
  return db;
}

function ensureMigrations(db: Database.Database) {
  const exerciseColumns = db.pragma("table_info(exercises)") as Array<{ name: string }>;
  if (!exerciseColumns.some((column) => column.name === "video_stored_name")) {
    db.exec("ALTER TABLE exercises ADD COLUMN video_stored_name TEXT");
  }
  if (!exerciseColumns.some((column) => column.name === "video_original_name")) {
    db.exec("ALTER TABLE exercises ADD COLUMN video_original_name TEXT");
  }
  if (!exerciseColumns.some((column) => column.name === "video_mime_type")) {
    db.exec("ALTER TABLE exercises ADD COLUMN video_mime_type TEXT");
  }
  if (!exerciseColumns.some((column) => column.name === "video_size_bytes")) {
    db.exec("ALTER TABLE exercises ADD COLUMN video_size_bytes INTEGER");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
      sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT,
      attachment_stored_name TEXT,
      attachment_original_name TEXT,
      attachment_mime_type TEXT,
      attachment_size_bytes INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (body IS NOT NULL OR attachment_stored_name IS NOT NULL)
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_client_id ON chat_messages(client_id, id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS client_manager_assignments (
      manager_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
      assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (manager_user_id, client_id)
    )
  `);
  const assignmentIndexes = db.pragma("index_list(client_manager_assignments)") as Array<{
    name: string;
  }>;
  if (!assignmentIndexes.some((index) => index.name === "idx_client_manager_one_per_client")) {
    db.exec(`
      DELETE FROM client_manager_assignments
      WHERE manager_user_id NOT IN (
        SELECT MIN(manager_user_id) FROM client_manager_assignments GROUP BY client_id
      );
      CREATE UNIQUE INDEX idx_client_manager_one_per_client
        ON client_manager_assignments(client_id);
    `);
  }
  const userColumns = db.pragma("table_info(users)") as Array<{ name: string }>;
  if (!userColumns.some((column) => column.name === "admin_scope")) {
    db.exec("ALTER TABLE users ADD COLUMN admin_scope TEXT");
  }
  if (!userColumns.some((column) => column.name === "display_name")) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT");
  }
  db.exec(
    "UPDATE users SET admin_scope = 'full' WHERE role = 'admin' AND admin_scope IS NULL",
  );
  const onboardingColumns = db.pragma("table_info(client_onboarding)") as Array<{ name: string }>;
  if (!onboardingColumns.some((column) => column.name === "photo_consent_at")) {
    db.exec("ALTER TABLE client_onboarding ADD COLUMN photo_consent_at TEXT");
  }
  const profileColumns = db.pragma("table_info(client_profiles)") as Array<{ name: string }>;
  if (!profileColumns.some((column) => column.name === "subscription_started_at")) {
    db.exec("ALTER TABLE client_profiles ADD COLUMN subscription_started_at TEXT");
  }
  if (!profileColumns.some((column) => column.name === "country")) {
    db.exec("ALTER TABLE client_profiles ADD COLUMN country TEXT");
  }
  db.exec(
    "UPDATE client_profiles SET subscription_started_at = created_at WHERE status = 'active' AND subscription_started_at IS NULL",
  );
}

export function getDb(): Database.Database {
  if (!globalForDb.__coachDb) {
    globalForDb.__coachDb = open();
  } else {
    ensureMigrations(globalForDb.__coachDb);
  }
  return globalForDb.__coachDb;
}
