"use client"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? "/dashboard/sisteme"
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login"

  const [mode, setMode] = useState<"login" | "register">(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [orgName, setOrgName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body = mode === "login"
        ? { email, password }
        : { email, password, orgName }

      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "A apărut o eroare")
        return
      }

      if (mode === "register") {
        router.push("/onboarding")
      } else {
        router.push(nextPath)
      }
      router.refresh()
    } catch {
      setError("Eroare de rețea. Încearcă din nou.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cr-auth-card cr-card">
      <div className="cr-auth-brand">
        <div className="cr-auth-logo" aria-hidden="true">
          C
        </div>
        <div className="cr-auth-title">
          CompliRoAI
        </div>
        <div className="cr-auth-subtitle">
          {mode === "login" ? "Intră în contul tău" : "Creează cont nou"}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="cr-auth-form">
        {mode === "register" && (
          <div>
            <label className="cr-field-label">Nume organizație</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Firma SRL"
              className="cr-input"
            />
          </div>
        )}

        <div>
          <label className="cr-field-label">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@firma.ro"
            className="cr-input"
          />
        </div>

        <div>
          <label className="cr-field-label">Parolă</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="cr-input"
          />
        </div>

        {error && (
          <div className="cr-alert cr-alert--danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="cr-btn cr-btn--primary cr-auth-submit"
        >
          {loading
            ? (mode === "login" ? "Se conectează..." : "Se creează contul...")
            : (mode === "login" ? "Conectare" : "Creează cont")
          }
        </button>
      </form>

      <div className="cr-auth-toggle">
        {mode === "login" ? (
          <>
            Nu ai cont?{" "}
            <button
              type="button"
              onClick={() => { setMode("register"); setError("") }}
              className="cr-link-button"
            >
              Creează unul
            </button>
          </>
        ) : (
          <>
            Ai deja cont?{" "}
            <button
              type="button"
              onClick={() => { setMode("login"); setError("") }}
              className="cr-link-button"
            >
              Conectează-te
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="cr-auth-page">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}
