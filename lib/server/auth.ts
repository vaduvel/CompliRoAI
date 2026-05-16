import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

import { writeFileSafe } from "@/lib/server/fs-safe"
import {
  hasSupabaseAuthConfig,
  registerSupabaseIdentity,
  shouldUseSupabaseAuth,
  signInSupabaseIdentity,
} from "@/lib/server/supabase-auth"
import {
  hasSupabaseConfig,
  supabaseSelect,
  supabaseUpsert,
} from "@/lib/server/supabase-rest"

// Public surface used by route handlers:
//   - hashPassword / verifyPassword (still exported for local-backend fallback)
//   - createSessionToken / verifySessionToken / SESSION_COOKIE
//   - getUserByEmail / createUser (now Supabase-aware)

export type PersistedUserRecord = {
  id: string
  email: string
  passwordHash: string
  salt: string
  createdAtISO: string
  orgId?: string
  orgName?: string
  authProvider?: "local" | "supabase"
}

export type User = {
  id: string
  email: string
  passwordHash: string
  salt: string
  createdAtISO: string
  orgId: string
  orgName: string
}

export const SESSION_COOKIE = "aiact_session"
// 30 days — "recunoaște-mă mâine" pattern.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type WorkspaceMode = "solo" | "cabinet"

export type SessionPayload = {
  userId: string
  orgId: string
  email: string
  orgName: string
  workspaceMode: WorkspaceMode
  exp: number
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  }
}

// ---------------- session token ----------------

function getSessionSecret(): string {
  const s = process.env.AIACT_SESSION_SECRET?.trim()
  if (s) return s
  if (process.env.NODE_ENV === "production") {
    throw new Error("AIACT_SESSION_SECRET missing in production")
  }
  return "dev-secret-change-me"
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 32).toString("hex")
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 32).toString("hex")
    return derived === hash
  } catch {
    return false
  }
}

export function createSessionToken(payload: {
  userId: string
  orgId: string
  email: string
  orgName: string
  workspaceMode?: WorkspaceMode
}): string {
  const full: SessionPayload = {
    userId: payload.userId,
    orgId: payload.orgId,
    email: payload.email,
    orgName: payload.orgName,
    workspaceMode: payload.workspaceMode ?? "solo",
    exp: Date.now() + SESSION_TTL_MS,
  }
  const encoded = Buffer.from(JSON.stringify(full)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(encoded)
    .digest("base64url")
  return `${encoded}.${signature}`
}

function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === "solo" || value === "cabinet"
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const dotIndex = token.lastIndexOf(".")
    if (dotIndex === -1) return null

    const encoded = token.slice(0, dotIndex)
    const signature = token.slice(dotIndex + 1)
    const expectedSignature = crypto
      .createHmac("sha256", getSessionSecret())
      .update(encoded)
      .digest("base64url")

    if (signature !== expectedSignature) return null

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as Partial<SessionPayload>
    if (!payload || typeof payload !== "object") return null
    if (!payload.exp || payload.exp < Date.now()) return null
    if (!payload.userId || !payload.orgId || !payload.email) return null

    return {
      userId: payload.userId,
      orgId: payload.orgId,
      email: payload.email,
      orgName: payload.orgName ?? "",
      workspaceMode: isWorkspaceMode(payload.workspaceMode) ? payload.workspaceMode : "solo",
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

// ---------------- local JSON backend (dev fallback) ----------------

function getUsersFile(): string {
  return path.join(process.cwd(), ".data", "users.json")
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function getLocalUsers(): Promise<PersistedUserRecord[]> {
  return readJsonFile<PersistedUserRecord[]>(getUsersFile(), [])
}

async function saveLocalUsers(users: PersistedUserRecord[]): Promise<void> {
  await writeFileSafe(getUsersFile(), JSON.stringify(users, null, 2))
}

// ---------------- Supabase backend (shared with CompliAI) ----------------
//
// User identity lives in Supabase Auth (auth.users — managed by Supabase).
// Org / membership / profile records live in `public.organizations`,
// `public.memberships`, `public.profiles` — same shape used by CompliAI.

type OrganizationRow = {
  id: string
  name: string | null
  created_at?: string | null
}

type MembershipRow = {
  id: string
  user_id: string
  org_id: string
  role: string | null
  status: string | null
  created_at?: string | null
}

type ProfileRow = {
  id: string
  email: string | null
  display_name?: string | null
  created_at?: string | null
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "org"
}

async function lookupSupabaseMembershipByUserId(
  userId: string
): Promise<{ orgId: string; orgName: string } | null> {
  const memberships = await supabaseSelect<MembershipRow>(
    "memberships",
    `select=id,user_id,org_id,role,status,created_at&user_id=eq.${encodeURIComponent(
      userId
    )}&status=eq.active&order=created_at.asc&limit=1`,
    "public"
  )
  const membership = memberships[0]
  if (!membership) return null

  const orgs = await supabaseSelect<OrganizationRow>(
    "organizations",
    `select=id,name,created_at&id=eq.${encodeURIComponent(membership.org_id)}&limit=1`,
    "public"
  )
  const organization = orgs[0]
  return {
    orgId: membership.org_id,
    orgName: organization?.name ?? "",
  }
}

async function lookupSupabaseProfileByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const rows = await supabaseSelect<ProfileRow>(
    "profiles",
    `select=id,email,display_name,created_at&email=eq.${encodeURIComponent(
      normalizeEmail(email)
    )}&limit=1`,
    "public"
  )
  const profile = rows[0]
  if (!profile?.id || !profile?.email) return null
  return { id: profile.id, email: profile.email }
}

async function provisionSupabaseOrgForUser(
  userId: string,
  email: string,
  orgName: string
): Promise<{ orgId: string; orgName: string }> {
  const normalizedEmail = normalizeEmail(email)
  const resolvedOrgName =
    orgName.trim() || normalizedEmail.split("@")[0] || "Organizatie"
  const createdAtISO = new Date().toISOString()

  // Profile
  await supabaseUpsert(
    "profiles",
    {
      id: userId,
      email: normalizedEmail,
      display_name: normalizedEmail.split("@")[0] || normalizedEmail,
      updated_at: createdAtISO,
    },
    "public"
  )

  // Re-use existing active membership if present (idempotent register).
  const existing = await lookupSupabaseMembershipByUserId(userId)
  if (existing) return existing

  const organizationId = `org-${userId.replace(/-/g, "").slice(0, 16)}`
  const membershipId = `membership-${userId.replace(/-/g, "").slice(0, 12)}-${organizationId.slice(-8)}`

  // Organization (retry with id-suffixed slug if slug conflict).
  try {
    await supabaseUpsert(
      "organizations",
      {
        id: organizationId,
        slug: slugify(resolvedOrgName),
        name: resolvedOrgName,
        created_at: createdAtISO,
        updated_at: createdAtISO,
      },
      "public"
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("23505") && msg.includes("slug")) {
      await supabaseUpsert(
        "organizations",
        {
          id: organizationId,
          slug: `${slugify(resolvedOrgName)}-${organizationId.slice(-8)}`,
          name: resolvedOrgName,
          created_at: createdAtISO,
          updated_at: createdAtISO,
        },
        "public"
      )
    } else {
      throw err
    }
  }

  // Membership
  await supabaseUpsert(
    "memberships",
    {
      id: membershipId,
      user_id: userId,
      org_id: organizationId,
      role: "owner",
      status: "active",
      created_at: createdAtISO,
      updated_at: createdAtISO,
    },
    "public"
  )

  return { orgId: organizationId, orgName: resolvedOrgName }
}

// ---------------- public API used by routes ----------------

export async function getUserByEmail(
  email: string
): Promise<PersistedUserRecord | undefined> {
  // Supabase path: we cannot retrieve a password hash from Supabase Auth.
  // Sign-in is performed via signInSupabaseIdentity() below; this helper only
  // returns enough metadata to bridge with the legacy local-route code path.
  if (shouldUseSupabaseAuth()) {
    const profile = await lookupSupabaseProfileByEmail(email)
    if (!profile) return undefined
    const membership = await lookupSupabaseMembershipByUserId(profile.id)
    return {
      id: profile.id,
      email: profile.email,
      passwordHash: "",
      salt: "",
      createdAtISO: new Date().toISOString(),
      orgId: membership?.orgId,
      orgName: membership?.orgName,
      authProvider: "supabase",
    }
  }

  // Local JSON fallback
  const users = await getLocalUsers()
  return users.find((u) => normalizeEmail(u.email) === normalizeEmail(email))
}

/**
 * Authenticates an existing user.
 * - When Supabase is configured: validates credentials against Supabase Auth and
 *   returns the resolved identity (NO password hash needed in the caller).
 * - Otherwise (local backend): caller uses `getUserByEmail` + `verifyPassword`.
 *
 * Returns the resolved user (with orgId/orgName) on success, throws on failure.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ userId: string; email: string; orgId: string; orgName: string }> {
  if (shouldUseSupabaseAuth()) {
    const identity = await signInSupabaseIdentity(email, password)
    let membership = await lookupSupabaseMembershipByUserId(identity.id)
    if (!membership) {
      // First sign-in after a failed-mid-register or an externally created user:
      // provision an org so the user has a workspace.
      membership = await provisionSupabaseOrgForUser(
        identity.id,
        identity.email,
        identity.email.split("@")[0] || "Organizatie"
      )
    }
    return {
      userId: identity.id,
      email: identity.email,
      orgId: membership.orgId,
      orgName: membership.orgName,
    }
  }

  // Local fallback
  const user = await getUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    throw new Error("AUTH_INVALID_CREDENTIALS")
  }
  return {
    userId: user.id,
    email: user.email,
    orgId: user.orgId ?? `org-${user.id}`,
    orgName: user.orgName ?? "",
  }
}

export async function createUser(
  email: string,
  password: string,
  orgName: string
): Promise<{ user: PersistedUserRecord; orgId: string }> {
  // Supabase path
  if (shouldUseSupabaseAuth()) {
    if (!hasSupabaseConfig() || !hasSupabaseAuthConfig()) {
      throw new Error("SUPABASE_NOT_CONFIGURED")
    }
    const identity = await registerSupabaseIdentity(email, password)
    const membership = await provisionSupabaseOrgForUser(
      identity.id,
      identity.email,
      orgName
    )
    const record: PersistedUserRecord = {
      id: identity.id,
      email: normalizeEmail(identity.email),
      passwordHash: "",
      salt: "",
      createdAtISO: new Date().toISOString(),
      orgId: membership.orgId,
      orgName: membership.orgName,
      authProvider: "supabase",
    }
    return { user: record, orgId: membership.orgId }
  }

  // Local fallback
  const existing = await getUserByEmail(email)
  if (existing) {
    throw new Error("AUTH_EMAIL_ALREADY_REGISTERED")
  }

  const { hash, salt } = hashPassword(password)
  const userId = crypto.randomBytes(8).toString("hex")
  const orgId = `org-${userId}`
  const createdAtISO = new Date().toISOString()

  const user: PersistedUserRecord = {
    id: userId,
    email: normalizeEmail(email),
    passwordHash: hash,
    salt,
    createdAtISO,
    orgId,
    orgName:
      orgName.trim() ||
      normalizeEmail(email).split("@")[0] ||
      "Organizatie",
    authProvider: "local",
  }

  const users = await getLocalUsers()
  await saveLocalUsers([...users, user])

  return { user, orgId }
}
