"use client"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") ?? "/dashboard/sisteme"

  const [mode, setMode] = useState<"login" | "register">("login")
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

      const res = await fetch(endpoint, {
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

  const inputStyle = {
    width: "100%",
    background: "var(--bg-hover)",
    border: "1px solid var(--border-strong)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--ink)",
    fontSize: "14px",
    outline: "none",
  } as React.CSSProperties

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    color: "var(--ink-muted)",
    marginBottom: "6px",
    fontWeight: 500,
  } as React.CSSProperties

  return (
    <div style={{
      width: "100%",
      maxWidth: "400px",
      padding: "40px 32px",
      background: "var(--bg-raised)",
      borderRadius: "12px",
      border: "1px solid var(--border)",
      margin: "0 16px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "20px",
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          marginBottom: "6px",
        }}>
          AI Act Compliance
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)" }}>
          {mode === "login" ? "Intră în contul tău" : "Creează cont nou"}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {mode === "register" && (
          <div>
            <label style={labelStyle}>Nume organizație</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Firma SRL"
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@firma.ro"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Parolă</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            fontSize: "13px",
            color: "var(--red-400)",
            background: "var(--red-soft)",
            padding: "10px 12px",
            borderRadius: "6px",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "11px",
            borderRadius: "8px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: "var(--cobalt-600)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? (mode === "login" ? "Se conectează..." : "Se creează contul...")
            : (mode === "login" ? "Conectare" : "Creează cont")
          }
        </button>
      </form>

      {/* Toggle */}
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "var(--ink-dim)" }}>
        {mode === "login" ? (
          <>
            Nu ai cont?{" "}
            <button
              onClick={() => { setMode("register"); setError("") }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cobalt-400)", fontSize: "13px" }}
            >
              Creează unul
            </button>
          </>
        ) : (
          <>
            Ai deja cont?{" "}
            <button
              onClick={() => { setMode("login"); setError("") }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cobalt-400)", fontSize: "13px" }}
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
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
