// Slim Supabase Auth client for eu-ai-act.
// Provides registerSupabaseIdentity + signInSupabaseIdentity using the admin API
// (service role for create, anon key for password grant).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

export type SupabaseIdentity = {
  id: string
  email: string
}

export function hasSupabaseAuthConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY)
}

export function shouldUseSupabaseAuth(): boolean {
  if (!hasSupabaseAuthConfig()) return false
  const backend = process.env.COMPLISCAN_AUTH_BACKEND?.trim().toLowerCase()
  return backend === "supabase" || backend === "hybrid"
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 10_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function signInSupabaseIdentity(
  email: string,
  password: string
): Promise<SupabaseIdentity> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_AUTH_NOT_CONFIGURED")
  }

  const response = await fetchWithTimeout(
    `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new Error("AUTH_INVALID_CREDENTIALS")
    }
    const text = await response.text()
    throw new Error(`SUPABASE_AUTH_LOGIN_FAILED:${response.status}:${text}`)
  }

  const payload = (await response.json()) as {
    user?: { id?: string; email?: string | null }
  }
  if (!payload.user?.id || !payload.user.email) {
    throw new Error("SUPABASE_AUTH_LOGIN_INVALID_RESPONSE")
  }

  return { id: payload.user.id, email: payload.user.email }
}

async function lookupSupabaseUserByEmail(email: string): Promise<SupabaseIdentity | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null

  const normalized = email.toLowerCase().trim()

  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users?page=1&per_page=200`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        cache: "no-store",
      }
    )
    if (!response.ok) return null

    const data = (await response.json()) as {
      users?: Array<{ id?: string; email?: string }>
    }
    const match = data.users?.find(
      (u) => u.email?.toLowerCase().trim() === normalized
    )
    if (!match?.id || !match.email) return null
    return { id: match.id, email: match.email }
  } catch {
    return null
  }
}

export async function registerSupabaseIdentity(
  email: string,
  password: string
): Promise<SupabaseIdentity> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_AUTH_NOT_CONFIGURED")
  }

  const response = await fetchWithTimeout(
    `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
      cache: "no-store",
    }
  )

  if (!response.ok) {
    const text = await response.text()
    const normalized = text.toLowerCase()
    if (response.status === 400 || response.status === 422) {
      if (
        normalized.includes("already") ||
        normalized.includes("exists") ||
        normalized.includes("registered")
      ) {
        // Idempotent: if user already exists in Supabase auth, return existing identity.
        const existing = await lookupSupabaseUserByEmail(email)
        if (existing) return existing
        throw new Error("AUTH_EMAIL_ALREADY_REGISTERED")
      }
    }
    throw new Error(`SUPABASE_AUTH_REGISTER_FAILED:${response.status}:${text}`)
  }

  const payload = (await response.json()) as {
    id?: string
    email?: string | null
    user?: { id?: string; email?: string | null }
  }

  const userId = payload.user?.id || payload.id
  const userEmail = payload.user?.email || payload.email
  if (!userId || !userEmail) {
    throw new Error("SUPABASE_AUTH_REGISTER_INVALID_RESPONSE")
  }

  return { id: userId, email: userEmail }
}
