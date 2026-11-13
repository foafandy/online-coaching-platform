import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "./db";
import type { ClientProfile, ClientStatus, Role, SafeUser } from "./types";

export const SESSION_COOKIE = "cf_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  user: SafeUser;
  profile: ClientProfile | null;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 11);
}

export function verifyPassword(password: string, hash: string) {
  try {
    return bcrypt.compareSync(password, hash);
  } catch {
    return false;
  }
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sha256(token), userId, expires.toISOString());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
  }
  store.delete(SESSION_COOKIE);
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.created_at, s.expires_at,
              u.display_name,
              CASE WHEN u.role = 'admin' THEN COALESCE(u.admin_scope, 'full') ELSE NULL END AS admin_scope
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sha256(token)) as
    | {
        id: string;
        email: string;
        role: Role;
        admin_scope: "full" | "clients" | null;
        display_name: string | null;
        created_at: string;
        expires_at: string;
      }
    | undefined;

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sha256(token));
    return null;
  }

  const user: SafeUser = {
    id: row.id,
    email: row.email,
    role: row.role,
    admin_scope: row.admin_scope,
    display_name: row.display_name,
    created_at: row.created_at,
  };

  let profile: ClientProfile | null = null;
  if (user.role === "client") {
    profile =
      (db.prepare("SELECT * FROM client_profiles WHERE user_id = ?").get(user.id) as
        | ClientProfile
        | undefined) ?? null;
  }

  return { user, profile };
});

export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";
    redirect(target);
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fadmin");
  if (session.user.role !== "admin") redirect("/dashboard");
  if (session.user.admin_scope !== "full") redirect("/admin/clients");
  return session;
}

export async function requireAdminAccess(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fadmin");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

export async function requireClientManager(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fadmin/clients");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

export function canManageClient(userId: string, adminScope: "full" | "clients" | null, clientId: string) {
  if (adminScope === "full") return true;
  if (adminScope !== "clients") return false;
  const row = getDb()
    .prepare(
      "SELECT 1 FROM client_manager_assignments WHERE manager_user_id = ? AND client_id = ?",
    )
    .get(userId, clientId);
  return Boolean(row);
}

export async function requireAssignedClient(clientId: string): Promise<SessionUser> {
  const session = await requireClientManager();
  if (!canManageClient(session.user.id, session.user.admin_scope, clientId)) {
    redirect("/admin/clients");
  }
  return session;
}

export function canAccessClientChat(session: SessionUser, clientId: string): boolean {
  if (session.user.role === "admin") {
    return canManageClient(session.user.id, session.user.admin_scope, clientId);
  }
  if (session.profile?.id !== clientId) return false;
  const assigned = getDb()
    .prepare("SELECT 1 FROM client_manager_assignments WHERE client_id = ? LIMIT 1")
    .get(clientId);
  return Boolean(assigned);
}

export function canManageAssignedPlan(
  userId: string,
  adminScope: "full" | "clients" | null,
  kind: "nutrition" | "workout",
  planId: string,
) {
  if (adminScope === "full") return true;
  if (adminScope !== "clients") return false;
  const row = getDb()
    .prepare(
      `SELECT 1 FROM assignments a
       JOIN client_manager_assignments cma ON cma.client_id = a.client_id
       WHERE cma.manager_user_id = ? AND a.kind = ? AND a.plan_id = ? AND a.is_active = 1
       LIMIT 1`,
    )
    .get(userId, kind, planId);
  return Boolean(row);
}

export function canViewWorkoutPlan(session: SessionUser, planId: string): boolean {
  if (session.user.role === "admin") {
    return canManageAssignedPlan(session.user.id, session.user.admin_scope, "workout", planId);
  }
  if (!session.profile) return false;
  const row = getDb()
    .prepare(
      `SELECT 1 FROM assignments
       WHERE client_id = ? AND kind = 'workout' AND plan_id = ? AND is_active = 1`,
    )
    .get(session.profile.id, planId);
  return Boolean(row);
}

export async function requireAssignedPlan(
  kind: "nutrition" | "workout",
  planId: string,
): Promise<SessionUser> {
  const session = await requireClientManager();
  if (!canManageAssignedPlan(session.user.id, session.user.admin_scope, kind, planId)) {
    redirect("/admin/clients");
  }
  return session;
}

export async function requireClient(): Promise<SessionUser & { profile: ClientProfile }> {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=%2Fdashboard");
  if (session.user.role === "admin") {
    redirect(session.user.admin_scope === "clients" ? "/admin/clients" : "/admin");
  }
  if (!session.profile) {
    // Defensive: a client account must always have a profile row.
    getDb()
      .prepare(
        "INSERT OR IGNORE INTO client_profiles (id, user_id, full_name, status) VALUES (?, ?, ?, 'pending')",
      )
      .run(randomUUID(), session.user.id, session.user.email.split("@")[0]);
    const created = getDb()
      .prepare("SELECT * FROM client_profiles WHERE user_id = ?")
      .get(session.user.id) as ClientProfile;
    return { ...session, profile: created };
  }
  return { ...session, profile: session.profile };
}

/* ------------------------------- rate limiting ------------------------------ */

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;

export function tooManyAttempts(key: string) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordAttempt(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
    return;
  }
  entry.count += 1;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}

/* ----------------------------- password resets ----------------------------- */

export function createPasswordReset(userId: string) {
  const token = randomBytes(32).toString("hex");
  const db = getDb();
  db.prepare("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL").run(userId);
  db.prepare(
    "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
  ).run(
    randomUUID(),
    userId,
    sha256(token),
    new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  );
  return token;
}

export function consumePasswordReset(token: string, newPassword: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, user_id, expires_at FROM password_resets
       WHERE token_hash = ? AND used_at IS NULL`,
    )
    .get(sha256(token)) as
    | { id: string; user_id: string; expires_at: string }
    | undefined;

  if (!row) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;

  const password_hash = hashPassword(newPassword);
  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(
      password_hash,
      row.user_id,
    );
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(row.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(row.user_id);
  })();
  return true;
}

export function isClientStatusAllowed(status: ClientStatus) {
  return status === "active";
}

/** Invalidates every session for a user except the browser making the request. */
export async function dropOtherSessions(userId: string) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  getDb()
    .prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?")
    .run(userId, sha256(token));
}
