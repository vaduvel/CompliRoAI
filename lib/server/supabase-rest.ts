// Slim Supabase REST client for eu-ai-act.
// Mirrors the API surface used in CompliAI's supabase-rest.ts but without the
// fetchWithOperationalGuard wrapper — plain fetch with a timeout is enough here.

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY)
}

export async function supabaseSelect<T>(
  table: string,
  queryString: string,
  schema = "public"
): Promise<T[]> {
  return request<T[]>("GET", table, { queryString, schema })
}

export async function supabaseInsert<TBody extends object, TResult>(
  table: string,
  body: TBody | TBody[],
  schema = "public"
): Promise<TResult[]> {
  return request<TResult[]>("POST", table, {
    body,
    schema,
    prefer: "return=representation",
  })
}

export async function supabaseUpsert<TBody extends object, TResult>(
  table: string,
  body: TBody | TBody[],
  schema = "public",
  queryString?: string
): Promise<TResult[]> {
  return request<TResult[]>("POST", table, {
    body,
    schema,
    queryString,
    prefer: "resolution=merge-duplicates,return=representation",
  })
}

export async function supabaseUpdate<TResult>(
  table: string,
  queryString: string,
  body: object,
  schema = "public"
): Promise<TResult[]> {
  return request<TResult[]>("PATCH", table, {
    body,
    queryString,
    schema,
    prefer: "return=representation",
  })
}

export async function supabaseDelete(
  table: string,
  queryString: string,
  schema = "public"
): Promise<void> {
  await request<unknown>("DELETE", table, { queryString, schema })
}

async function request<T>(
  method: HttpMethod,
  table: string,
  options: {
    body?: object | object[]
    queryString?: string
    schema: string
    prefer?: string
  }
): Promise<T> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Supabase env vars lipsă.")
  }

  const url = new URL(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}`)
  if (options.queryString) {
    const query = new URLSearchParams(options.queryString)
    query.forEach((value, key) => url.searchParams.set(key, value))
  }

  const headers: Record<string, string> = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    Accept: "application/json",
    "Accept-Profile": options.schema,
    "Content-Profile": options.schema,
    "Content-Type": "application/json",
  }
  if (options.prefer) headers.Prefer = options.prefer

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error ${res.status}: ${text}`)
  }

  // DELETE may return empty body
  if (method === "DELETE") {
    return undefined as T
  }

  const text = await res.text()
  if (!text.trim()) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch (error) {
    const snippet = text.slice(0, 300)
    throw new Error(
      `Supabase invalid JSON (${method} ${table}): ${
        error instanceof Error ? error.message : String(error)
      }; body=${JSON.stringify(snippet)}`,
    )
  }
}
