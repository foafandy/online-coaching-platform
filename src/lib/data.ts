import "server-only";
import { getDb } from "./db";
import type {
  Announcement,
  Assignment,
  ClientOnboarding,
  ClientProfile,
  ClientRow,
  Exercise,
  FileRow,
  MealItem,
  NotificationRow,
  NutritionMeal,
  NutritionPlan,
  WorkoutDay,
  WorkoutPlan,
} from "./types";

/* --------------------------------- clients -------------------------------- */

export const FIRST_MONTH_END_WINDOW_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

type ClientRowFromDb = Omit<ClientRow, "subscription_due_at" | "days_until_subscription_due">;

function subscriptionDueAt(startedAt: string | null): Date | null {
  if (!startedAt) return null;
  const normalized = startedAt.includes("T") ? startedAt : `${startedAt.replace(" ", "T")}Z`;
  const start = new Date(normalized);
  if (Number.isNaN(start.getTime())) return null;

  const due = new Date(start);
  const dayOfMonth = due.getUTCDate();
  due.setUTCDate(1);
  due.setUTCMonth(due.getUTCMonth() + 1);
  const lastDayOfDueMonth = new Date(
    Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0),
  ).getUTCDate();
  due.setUTCDate(Math.min(dayOfMonth, lastDayOfDueMonth));
  due.setUTCHours(start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), 0);
  return due;
}

export function managerCanAccessFile(userId: string, fileId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM file_assignments fa
       JOIN client_manager_assignments cma ON cma.client_id = fa.client_id
       WHERE fa.file_id = ? AND cma.manager_user_id = ? LIMIT 1`,
    )
    .get(fileId, userId);
  return Boolean(row);
}

function withSubscriptionDueDate(client: ClientRowFromDb): ClientRow {
  const dueAt = subscriptionDueAt(client.subscription_started_at);
  const daysUntilDue = dueAt
    ? Math.ceil((dueAt.getTime() - Date.now()) / DAY_MS)
    : null;
  return {
    ...client,
    subscription_due_at: dueAt?.toISOString() ?? null,
    days_until_subscription_due: daysUntilDue,
  };
}

export function getClientById(id: string): ClientRow | null {
  const row = getDb()
    .prepare(
      `SELECT p.*, u.email, u.created_at as user_created_at,
              (SELECT submitted_at FROM client_onboarding WHERE client_id = p.id) AS onboarding_submitted_at,
              (SELECT GROUP_CONCAT(COALESCE(manager.display_name, manager.email), ', ')
                 FROM client_manager_assignments cma
                 JOIN users manager ON manager.id = cma.manager_user_id
                WHERE cma.client_id = p.id) AS client_manager_names,
              (SELECT cma.manager_user_id FROM client_manager_assignments cma
                WHERE cma.client_id = p.id LIMIT 1) AS client_manager_user_id
       FROM client_profiles p JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
    )
    .get(id) as ClientRowFromDb | undefined;
  return row ? withSubscriptionDueDate(row) : null;
}

export function getClientByUserId(userId: string): ClientRow | null {
  const row = getDb()
    .prepare(
      `SELECT p.*, u.email, u.created_at as user_created_at,
              (SELECT submitted_at FROM client_onboarding WHERE client_id = p.id) AS onboarding_submitted_at,
              (SELECT GROUP_CONCAT(COALESCE(manager.display_name, manager.email), ', ')
                 FROM client_manager_assignments cma
                 JOIN users manager ON manager.id = cma.manager_user_id
                WHERE cma.client_id = p.id) AS client_manager_names,
              (SELECT cma.manager_user_id FROM client_manager_assignments cma
                WHERE cma.client_id = p.id LIMIT 1) AS client_manager_user_id
       FROM client_profiles p JOIN users u ON u.id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as ClientRowFromDb | undefined;
  return row ? withSubscriptionDueDate(row) : null;
}

export function getClientOnboarding(clientId: string): ClientOnboarding | null {
  const row = getDb()
    .prepare("SELECT * FROM client_onboarding WHERE client_id = ?")
    .get(clientId) as ClientOnboarding | undefined;
  return row ?? null;
}

export function listClients(
  options: {
    search?: string;
    status?: string;
    nearFirstMonthEnd?: boolean;
    managerUserId?: string;
  } = {},
): ClientRow[] {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.search) {
    clauses.push("(p.full_name LIKE ? OR u.email LIKE ?)");
    const term = `%${options.search}%`;
    params.push(term, term);
  }
  if (options.status && options.status !== "all") {
    clauses.push("p.status = ?");
    params.push(options.status);
  }
  if (options.managerUserId) {
    clauses.push(
      "EXISTS (SELECT 1 FROM client_manager_assignments cma WHERE cma.client_id = p.id AND cma.manager_user_id = ?)",
    );
    params.push(options.managerUserId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT p.*, u.email, u.created_at as user_created_at,
              (SELECT submitted_at FROM client_onboarding WHERE client_id = p.id) AS onboarding_submitted_at,
              (SELECT GROUP_CONCAT(COALESCE(manager.display_name, manager.email), ', ')
                 FROM client_manager_assignments cma
                 JOIN users manager ON manager.id = cma.manager_user_id
                WHERE cma.client_id = p.id) AS client_manager_names,
              (SELECT cma.manager_user_id FROM client_manager_assignments cma
                WHERE cma.client_id = p.id LIMIT 1) AS client_manager_user_id
       FROM client_profiles p JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC`,
    )
    .all(...params) as Array<
    ClientRowFromDb
  >;

  const clients = rows.map(withSubscriptionDueDate);
  if (!options.nearFirstMonthEnd) return clients;

  const now = Date.now();
  return clients.filter(
    (client) =>
      client.status === "active" &&
      client.subscription_due_at !== null &&
      new Date(client.subscription_due_at).getTime() >= now &&
      new Date(client.subscription_due_at).getTime() <=
        now + FIRST_MONTH_END_WINDOW_DAYS * DAY_MS,
  );
}

export function listClientManagers() {
  return getDb()
    .prepare(
      `SELECT id, email, display_name, created_at
       FROM users
       WHERE role = 'admin' AND admin_scope = 'clients'
       ORDER BY created_at DESC`,
    )
    .all() as Array<{
    id: string;
    email: string;
    display_name: string | null;
    created_at: string;
  }>;
}

export function listManagerClientIds(managerUserId: string): string[] {
  return (
    getDb()
      .prepare(
        "SELECT client_id FROM client_manager_assignments WHERE manager_user_id = ? ORDER BY created_at",
      )
      .all(managerUserId) as Array<{ client_id: string }>
  ).map((row) => row.client_id);
}

export function listChatConversations(managerUserId?: string) {
  const clauses = managerUserId
    ? "WHERE EXISTS (SELECT 1 FROM client_manager_assignments cma WHERE cma.client_id = p.id AND cma.manager_user_id = ?)"
    : "";
  const params = managerUserId ? [managerUserId] : [];
  return getDb()
    .prepare(
      `SELECT p.id AS client_id, p.full_name, u.email,
              m.body AS last_message,
              m.attachment_original_name AS last_attachment,
              m.created_at AS last_message_at
       FROM client_profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN chat_messages m ON m.id = (
         SELECT MAX(messages.id) FROM chat_messages messages WHERE messages.client_id = p.id
       )
       ${clauses}
       ORDER BY COALESCE(m.id, 0) DESC, p.created_at DESC`,
    )
    .all(...params) as Array<{
    client_id: string;
    full_name: string;
    email: string;
    last_message: string | null;
    last_attachment: string | null;
    last_message_at: string | null;
  }>;
}

export function getClientStats() {
  const db = getDb();
  const counts = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status IN ('inactive','suspended') THEN 1 ELSE 0 END) as inactive
       FROM client_profiles`,
    )
    .get() as { total: number; active: number | null; pending: number | null; inactive: number | null };

  const recent = listClients().slice(0, 5);
  return {
    total: counts.total ?? 0,
    active: counts.active ?? 0,
    pending: counts.pending ?? 0,
    inactive: counts.inactive ?? 0,
    recent,
  };
}

/* ------------------------------ nutrition -------------------------------- */

function mealsForPlan(planId: string): NutritionMeal[] {
  const db = getDb();
  const meals = db
    .prepare("SELECT * FROM nutrition_meals WHERE plan_id = ? ORDER BY sort_order, meal_number")
    .all(planId) as NutritionMeal[];
  const items = db
    .prepare(
      `SELECT * FROM meal_items WHERE meal_id IN (SELECT id FROM nutrition_meals WHERE plan_id = ?)
       ORDER BY sort_order`,
    )
    .all(planId) as MealItem[];
  return meals.map((meal) => ({
    ...meal,
    items: items.filter((item) => item.meal_id === meal.id),
  }));
}

export function getNutritionPlan(id: string): NutritionPlan | null {
  const plan = getDb().prepare("SELECT * FROM nutrition_plans WHERE id = ?").get(id) as
    | NutritionPlan
    | undefined;
  if (!plan) return null;
  return { ...plan, meals: mealsForPlan(id) };
}

export function listNutritionPlans(onlyTemplates = false): Array<
  NutritionPlan & { client_name?: string | null; meal_count: number }
> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM nutrition_meals m WHERE m.plan_id = p.id) as meal_count,
        (SELECT cp.full_name FROM assignments a
           JOIN client_profiles cp ON cp.id = a.client_id
          WHERE a.plan_id = p.id AND a.kind = 'nutrition' AND a.is_active = 1
          LIMIT 1) as client_name
       FROM nutrition_plans p
       ${onlyTemplates ? "WHERE p.is_template = 1" : ""}
       ORDER BY p.is_template DESC, p.updated_at DESC`,
    )
    .all() as Array<NutritionPlan & { client_name?: string | null; meal_count: number }>;
  return rows;
}

/* ------------------------------- workouts -------------------------------- */

function daysForPlan(planId: string): WorkoutDay[] {
  const db = getDb();
  const days = db
    .prepare("SELECT * FROM workout_days WHERE plan_id = ? ORDER BY sort_order, day_number")
    .all(planId) as WorkoutDay[];
  const exercises = db
    .prepare(
      `SELECT * FROM exercises WHERE day_id IN (SELECT id FROM workout_days WHERE plan_id = ?)
       ORDER BY sort_order`,
    )
    .all(planId) as Exercise[];
  return days.map((day) => ({
    ...day,
    exercises: exercises.filter((ex) => ex.day_id === day.id),
  }));
}

export function getWorkoutPlan(id: string): WorkoutPlan | null {
  const plan = getDb().prepare("SELECT * FROM workout_plans WHERE id = ?").get(id) as
    | WorkoutPlan
    | undefined;
  if (!plan) return null;
  return { ...plan, days: daysForPlan(id) };
}

export function listWorkoutPlans(onlyTemplates = false): Array<
  WorkoutPlan & { client_name?: string | null; day_count: number }
> {
  return getDb()
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM workout_days d WHERE d.plan_id = p.id) as day_count,
        (SELECT cp.full_name FROM assignments a
           JOIN client_profiles cp ON cp.id = a.client_id
          WHERE a.plan_id = p.id AND a.kind = 'workout' AND a.is_active = 1
          LIMIT 1) as client_name
       FROM workout_plans p
       ${onlyTemplates ? "WHERE p.is_template = 1" : ""}
       ORDER BY p.is_template DESC, p.updated_at DESC`,
    )
    .all() as Array<WorkoutPlan & { client_name?: string | null; day_count: number }>;
}

/* ----------------------------- assignments ------------------------------- */

export function getActiveAssignment(
  clientId: string,
  kind: "nutrition" | "workout",
): Assignment | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM assignments WHERE client_id = ? AND kind = ? AND is_active = 1
       ORDER BY assigned_at DESC LIMIT 1`,
    )
    .get(clientId, kind) as Assignment | undefined;
  return row ?? null;
}

export function getClientActivePlans(clientId: string) {
  const nutritionAssignment = getActiveAssignment(clientId, "nutrition");
  const workoutAssignment = getActiveAssignment(clientId, "workout");
  return {
    nutritionAssignment,
    workoutAssignment,
    nutrition: nutritionAssignment ? getNutritionPlan(nutritionAssignment.plan_id) : null,
    workout: workoutAssignment ? getWorkoutPlan(workoutAssignment.plan_id) : null,
  };
}

export function getAssignmentHistory(clientId: string) {
  return getDb()
    .prepare(
      `SELECT a.*, 
        COALESCE(np.title, wp.title) as plan_title,
        COALESCE(np.is_template, wp.is_template) as is_template
       FROM assignments a
       LEFT JOIN nutrition_plans np ON a.kind = 'nutrition' AND np.id = a.plan_id
       LEFT JOIN workout_plans wp ON a.kind = 'workout' AND wp.id = a.plan_id
       WHERE a.client_id = ?
       ORDER BY a.assigned_at DESC`,
    )
    .all(clientId) as Array<
    Assignment & { plan_title: string | null; is_template: number | null }
  >;
}

/* --------------------------------- files --------------------------------- */

export function listFiles(options: { search?: string; category?: string } = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.search) {
    clauses.push("(f.title LIKE ? OR f.original_name LIKE ?)");
    params.push(`%${options.search}%`, `%${options.search}%`);
  }
  if (options.category && options.category !== "all") {
    clauses.push("f.category = ?");
    params.push(options.category);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT f.*,
        (SELECT COUNT(*) FROM file_assignments fa WHERE fa.file_id = f.id) as client_count
       FROM files f ${where}
       ORDER BY f.created_at DESC`,
    )
    .all(...params) as Array<FileRow & { client_count: number }>;
}

export function getFile(id: string): FileRow | null {
  const row = getDb().prepare("SELECT * FROM files WHERE id = ?").get(id) as FileRow | undefined;
  return row ?? null;
}

export function getFileClientIds(fileId: string): string[] {
  return (
    getDb()
      .prepare("SELECT client_id FROM file_assignments WHERE file_id = ?")
      .all(fileId) as Array<{ client_id: string }>
  ).map((r) => r.client_id);
}

export function clientCanAccessFile(userId: string, fileId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 as ok FROM file_assignments fa
       JOIN client_profiles cp ON cp.id = fa.client_id
       WHERE fa.file_id = ? AND cp.user_id = ? LIMIT 1`,
    )
    .get(fileId, userId) as { ok: number } | undefined;
  return Boolean(row);
}

export function listClientFiles(clientId: string) {
  return getDb()
    .prepare(
      `SELECT f.* FROM files f
       JOIN file_assignments fa ON fa.file_id = f.id
       WHERE fa.client_id = ?
       ORDER BY f.created_at DESC`,
    )
    .all(clientId) as FileRow[];
}

export function listFilesWithAssignments(clientId: string, managerOnly = false) {
  return getDb()
    .prepare(
      `SELECT f.*, CASE WHEN fa.id IS NULL THEN 0 ELSE 1 END as assigned
       FROM files f
       LEFT JOIN file_assignments fa ON fa.file_id = f.id AND fa.client_id = ?
       ${managerOnly
         ? "WHERE NOT EXISTS (SELECT 1 FROM file_assignments other WHERE other.file_id = f.id) OR fa.id IS NOT NULL"
         : ""}
       ORDER BY assigned DESC, f.created_at DESC`,
    )
    .all(clientId) as Array<FileRow & { assigned: number }>;
}

/* ----------------------------- notifications ----------------------------- */

export function createNotification(input: {
  userId: string;
  title: string;
  body?: string | null;
  type: NotificationRow["type"];
  link?: string | null;
}) {
  getDb()
    .prepare(
      "INSERT INTO notifications (id, user_id, title, body, type, link) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      crypto.randomUUID(),
      input.userId,
      input.title,
      input.body ?? null,
      input.type,
      input.link ?? null,
    );
}

export function listNotifications(userId: string, limit = 30) {
  return getDb()
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as NotificationRow[];
}

export function unreadNotificationCount(userId: string) {
  const row = getDb()
    .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0")
    .get(userId) as { c: number };
  return row.c;
}

/* ----------------------------- announcements ----------------------------- */

export function listActiveAnnouncements(limit = 10): Announcement[] {
  return getDb()
    .prepare("SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Announcement[];
}

export function listAllAnnouncements(): Announcement[] {
  return getDb()
    .prepare("SELECT * FROM announcements ORDER BY created_at DESC")
    .all() as Announcement[];
}

/* ------------------------------- admin feed ------------------------------ */

export function getRecentActivity(limit = 6) {
  return getDb()
    .prepare(
      `SELECT 'file' as kind, f.title as label, f.created_at
         FROM files f
       UNION ALL
       SELECT 'client' as kind, p.full_name as label, p.created_at
         FROM client_profiles p
       UNION ALL
       SELECT 'assignment' as kind, COALESCE(np.title, wp.title) as label, a.assigned_at as created_at
         FROM assignments a
         LEFT JOIN nutrition_plans np ON a.kind = 'nutrition' AND np.id = a.plan_id
         LEFT JOIN workout_plans wp ON a.kind = 'workout' AND wp.id = a.plan_id
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{ kind: string; label: string; created_at: string }>;
}

export function countAll() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  return {
    nutritionPlans: one("SELECT COUNT(*) as c FROM nutrition_plans"),
    workoutPlans: one("SELECT COUNT(*) as c FROM workout_plans"),
    files: one("SELECT COUNT(*) as c FROM files"),
    announcements: one("SELECT COUNT(*) as c FROM announcements WHERE is_active = 1"),
  };
}

export function getProfileForUpdate(id: string): ClientProfile | null {
  const row = getDb().prepare("SELECT * FROM client_profiles WHERE id = ?").get(id) as
    | ClientProfile
    | undefined;
  return row ?? null;
}
