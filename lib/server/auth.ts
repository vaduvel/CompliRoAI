import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

import { writeFileSafe } from "@/lib/server/fs-safe"

export type PersistedUserRecord = {
  id: string
  email: string
  passwordHash: string
  salt: string
  createdAtISO: string
  orgId?: string
  orgName?: string
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

const SESSION_COOKIE = "aiact_session"
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getUsersFile(): string {
  return path.join(process.cwd(), ".data", "users.json")
}

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

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8")
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
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
}): string {
  const full = { ...payload, exp: Date.now() + SESSION_TTL_MS }
  const encoded = Buffer.from(JSON.stringify(full)).toString("base64url")
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(encoded).digest("base64url")
  return `${encoded}.${signature}`
}

export function verifySessionToken(
  token: string
): { userId: string; orgId: string; email: string; orgName: string } | null {
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

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as {
      userId: string
      orgId: string
      email: string
      orgName: string
      exp: number
    }
    if (!payload || typeof payload !== "object") return null
    if (!payload.exp || payload.exp < Date.now()) return null
    if (!payload.userId || !payload.orgId || !payload.email) return null

    return {
      userId: payload.userId,
      orgId: payload.orgId,
      email: payload.email,
      orgName: payload.orgName ?? "",
    }
  } catch {
    return null
  }
}

export async function getUsers(): Promise<PersistedUserRecord[]> {
  return readJsonFile<PersistedUserRecord[]>(getUsersFile(), [])
}

export async function saveUsers(users: PersistedUserRecord[]): Promise<void> {
  await writeFileSafe(getUsersFile(), JSON.stringify(users, null, 2))
}

export async function getUserByEmail(email: string): Promise<PersistedUserRecord | undefined> {
  const users = await getUsers()
  return users.find((u) => normalizeEmail(u.email) === normalizeEmail(email))
}

export async function createUser(
  email: string,
  password: string,
  orgName: string
): Promise<{ user: PersistedUserRecord; orgId: string }> {
  const existing = await getUserByEmail(email)
  if (existing) {
    throw new Error("Adresa de email este deja înregistrată.")
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
    orgName: orgName.trim() || normalizeEmail(email).split("@")[0] || "Organizatie",
  }

  const users = await getUsers()
  await saveUsers([...users, user])

  return { user, orgId }
}

export { SESSION_COOKIE }
