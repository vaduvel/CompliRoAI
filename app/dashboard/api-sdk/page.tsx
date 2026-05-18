"use client"

/**
 * Sprint 023 — /dashboard/api-sdk
 *
 * Developer dashboard for AI builders:
 *   - Quickstart + SDK install snippet
 *   - API key management (create / list / revoke; full token shown ONCE)
 *   - Endpoint reference with copy buttons
 *   - Recent API call log table
 *
 * Visible only for ai-builder workspace (gate handled by sidebar nav-config).
 * Style: inline + v3 design tokens. No shadcn / no Tailwind utilities.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Terminal,
  X,
  XCircle,
} from "lucide-react"

import type { ApiCallLog, ApiKey, ApiKeyScope } from "@/lib/compliance/types"

// ─── Local types (API responses) ───────────────────────────────────────────

type ApiKeyView = Omit<ApiKey, "hmacHash">

type ListKeysResponse = { keys: ApiKeyView[]; apiVersion: "v1" }
type CreateKeyResponse = {
  key: ApiKeyView
  fullToken: string
  warning: string
  apiVersion: "v1"
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function APISDKPage() {
  const [keys, setKeys] = useState<ApiKeyView[]>([])
  const [callLog, setCallLog] = useState<ApiCallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create-key modal state
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyToken, setNewKeyToken] = useState<string | null>(null)
  const [revealToken, setRevealToken] = useState(false)
  const [formLabel, setFormLabel] = useState("")
  const [formScopes, setFormScopes] = useState<Set<ApiKeyScope>>(
    new Set(["classify", "gate", "deployment"]),
  )

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/keys", { credentials: "include" })
      if (!res.ok) {
        setError(`Eroare la încărcare chei: ${res.status}`)
        return
      }
      const json = (await res.json()) as ListKeysResponse
      setKeys(json.keys ?? [])
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const fetchCallLog = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { credentials: "include" })
      if (!res.ok) return
      const json = (await res.json()) as { state?: { apiCallLogs?: ApiCallLog[] } }
      setCallLog((json.state?.apiCallLogs ?? []).slice(0, 20))
    } catch {
      // Best-effort — call log surfaces in /dashboard already.
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchKeys(), fetchCallLog()]).finally(() => setLoading(false))
  }, [fetchKeys, fetchCallLog])

  const handleCreate = useCallback(async () => {
    if (!formLabel.trim()) {
      setError("Adaugă un nume pentru API key.")
      return
    }
    if (formScopes.size === 0) {
      setError("Selectează cel puțin un scope.")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: formLabel.trim(),
          scopes: Array.from(formScopes),
        }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        setError(errBody.error ?? `Eroare la creare (${res.status}).`)
        return
      }
      const json = (await res.json()) as CreateKeyResponse
      setNewKeyToken(json.fullToken)
      setRevealToken(true)
      setFormLabel("")
      await fetchKeys()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }, [formLabel, formScopes, fetchKeys])

  const handleRevoke = useCallback(
    async (id: string) => {
      if (!confirm("Confirmi revocarea acestei chei? Acțiunea este ireversibilă.")) {
        return
      }
      try {
        const res = await fetch(`/api/v1/keys/${id}`, {
          method: "DELETE",
          credentials: "include",
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          setError(errBody.error ?? `Eroare la revocare (${res.status}).`)
          return
        }
        await fetchKeys()
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [fetchKeys],
  )

  const closeModal = useCallback(() => {
    setShowCreateModal(false)
    setNewKeyToken(null)
    setRevealToken(false)
    setFormLabel("")
    setFormScopes(new Set(["classify", "gate", "deployment"]))
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={headerCard}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Code2 size={28} style={{ color: "var(--cobalt-400)" }} />
          <div>
            <h1 style={h1Style}>API / SDK pentru AI Builders</h1>
            <p style={subtitleStyle}>
              Integrează CompliRoAI în pipeline-ul tău de build/deploy.
              Clasifică sisteme AI, primește verdict pass/review/blocked și
              loghează deployments — tot prin REST + SDK TypeScript.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={versionBadge}>API v1 · stable</span>
          <a href="/docs/api" target="_blank" rel="noopener" style={linkBtn}>
            <ExternalLink size={14} /> Docs publice
          </a>
        </div>
      </div>

      {error && (
        <div style={errorBanner}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Quickstart */}
      <Section title="Quickstart" icon={<Terminal size={18} />}>
        <ol style={{ paddingLeft: "20px", color: "var(--ink)", fontSize: "14px", lineHeight: 1.7 }}>
          <li>Generează un API key (butonul de mai jos).</li>
          <li>Instalează SDK-ul TypeScript (snippet jos) sau apelează direct REST.</li>
          <li>Apelează <code style={code}>client.gate({"{"} systemName, purpose {"}"})</code> înainte de fiecare deployment.</li>
          <li>Dacă verdict ≠ <code style={code}>"pass"</code>, oprește deploymentul și remediază.</li>
        </ol>
        <CodeBlock
          title="SDK TypeScript — quickstart"
          language="ts"
          content={`import { CompliRoAIClient } from "@compliroai/client"

const client = new CompliRoAIClient({
  apiKey: process.env.COMPLIROAI_KEY!, // cra_...
})

const gate = await client.gate({
  systemName: "HR Screener",
  purpose: "hr-screening",
  humanOversightDocumented: true,
  loggingEnabled: true,
  processesPersonalData: true,
  dpaSigned: true,
})

if (gate.verdict !== "pass") {
  console.error("Deployment blocat:", gate.reasons)
  process.exit(1)
}`}
        />
        <CodeBlock
          title="curl — POST /api/v1/gate"
          language="bash"
          content={`curl -X POST $BASE_URL/api/v1/gate \\
  -H "Authorization: Bearer $COMPLIROAI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"systemName":"HR Bot","purpose":"hr-screening","humanOversightDocumented":true,"loggingEnabled":true}'`}
        />
      </Section>

      {/* API keys */}
      <Section
        title="Chei API"
        icon={<Key size={18} />}
        right={
          <button style={primaryBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> Generează cheie nouă
          </button>
        }
      >
        {loading ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center", color: "var(--ink-dim)" }}>
            <Loader2 size={14} className="spin" /> Se încarcă cheile...
          </div>
        ) : keys.length === 0 ? (
          <div style={emptyState}>
            <Key size={36} style={{ color: "var(--cobalt-400)", opacity: 0.6 }} />
            <p style={{ margin: "8px 0 4px", fontWeight: 600, color: "var(--ink)" }}>
              Nicio cheie API încă
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ink-dim)" }}>
              Generează prima cheie ca să integrezi CompliRoAI în CI/CD-ul tău.
            </p>
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Nume</Th>
                <Th>Prefix</Th>
                <Th>Scope-uri</Th>
                <Th>Status</Th>
                <Th>Folosit ultima dată</Th>
                <Th>Acțiuni</Th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <Td>{k.label}</Td>
                  <Td>
                    <code style={code}>{k.prefix}…</code>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {k.scopes.map((s) => (
                        <span key={s} style={scopeBadge}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <StatusBadge status={k.status} />
                  </Td>
                  <Td>
                    {k.lastUsedAtISO ? (
                      <time dateTime={k.lastUsedAtISO} style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
                        {new Date(k.lastUsedAtISO).toLocaleString("ro-RO")}
                      </time>
                    ) : (
                      <span style={{ color: "var(--ink-dim)" }}>—</span>
                    )}
                  </Td>
                  <Td>
                    {k.status === "active" ? (
                      <button onClick={() => handleRevoke(k.id)} style={dangerBtn}>
                        Revocă
                      </button>
                    ) : (
                      <span style={{ color: "var(--ink-dim)", fontSize: "12px" }}>—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Endpoint reference */}
      <Section title="Referință endpoint-uri" icon={<Code2 size={18} />}>
        <EndpointCard
          method="POST"
          path="/api/v1/classify"
          auth="Bearer cra_… (scope: classify)"
          requestExample={`{
  "systemName": "HR Screener",
  "purpose": "hr-screening",
  "humanOversightDocumented": true,
  "loggingEnabled": true,
  "processesPersonalData": true
}`}
          responseExample={`{
  "systemName": "HR Screener",
  "riskClass": "high",
  "aiActArticle": "Annex III 4(a)",
  "aiActReason": "Sistem AI folosit în recrutare...",
  "obligations": [ { "article": "Art. 14 AI Act", "description": "..." } ],
  "nextActions": [],
  "apiVersion": "v1",
  "classifiedAtISO": "2026-05-18T..."
}`}
        />
        <EndpointCard
          method="POST"
          path="/api/v1/gate"
          auth="Bearer cra_… (scope: gate)"
          requestExample={`{
  "systemName": "HR Screener",
  "purpose": "hr-screening",
  "humanOversightDocumented": true,
  "loggingEnabled": true,
  "processesPersonalData": true,
  "dpaSigned": true,
  "evidence": { "friaCompleted": true, "dpiaCompleted": true }
}`}
          responseExample={`{
  "verdict": "pass" | "review_required" | "blocked",
  "riskClass": "high",
  "aiActRole": "deployer",
  "reasons": [
    { "category": "...", "articleRef": "Art. 27", "severity": "warning",
      "message": "...", "nextAction": "..." }
  ],
  "obligations": [...],
  "missingEvidence": [...],
  "nextActions": [...],
  "auditPackHints": [...],
  "apiVersion": "v1"
}`}
        />
        <EndpointCard
          method="POST"
          path="/api/v1/deployment"
          auth="Bearer cra_… (scope: deployment)"
          requestExample={`{
  "systemName": "HR Screener",
  "purpose": "hr-screening",
  "deploymentRef": "git-sha-abc123",
  "humanOversightDocumented": true
}`}
          responseExample={`{
  "deploymentRef": "git-sha-abc123",
  "gate": { ... ComplianceGateResponse ... },
  "findingEmitted": true,
  "apiVersion": "v1"
}`}
        />
        <EndpointCard
          method="GET"
          path="/api/v1/health"
          auth="public — no auth required"
          requestExample="(no body)"
          responseExample={`{"ok":true,"version":"v1","docsUrl":"/docs/api","openapiUrl":"/api/v1/openapi"}`}
        />
        <EndpointCard
          method="GET"
          path="/api/v1/openapi"
          auth="public — OpenAPI 3.1 spec for SDK generators"
          requestExample="(no body)"
          responseExample="(OpenAPI JSON)"
        />
      </Section>

      {/* Recent calls */}
      <Section
        title="Apeluri API recente"
        icon={<Activity size={18} />}
        right={
          <button onClick={fetchCallLog} style={ghostBtn} aria-label="Reîncarcă">
            <RefreshCw size={14} /> Reîncarcă
          </button>
        }
      >
        {callLog.length === 0 ? (
          <p style={{ color: "var(--ink-dim)", fontSize: "13px", margin: 0 }}>
            Nu există apeluri recente. Trimite prima cerere și revii aici.
          </p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th>Endpoint</Th>
                <Th>Metodă</Th>
                <Th>Status</Th>
                <Th>Durată (ms)</Th>
                <Th>Sumar</Th>
                <Th>Când</Th>
              </tr>
            </thead>
            <tbody>
              {callLog.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <code style={code}>{row.endpoint}</code>
                  </Td>
                  <Td>{row.method}</Td>
                  <Td>
                    <span
                      style={{
                        ...statusPillBase,
                        background:
                          row.statusCode < 300
                            ? "var(--green-100)"
                            : row.statusCode < 500
                            ? "var(--amber-100)"
                            : "var(--red-100)",
                        color:
                          row.statusCode < 300
                            ? "var(--green-700)"
                            : row.statusCode < 500
                            ? "var(--amber-700)"
                            : "var(--red-700)",
                      }}
                    >
                      {row.statusCode}
                    </span>
                  </Td>
                  <Td>{row.durationMs}</Td>
                  <Td>
                    <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
                      {row.responseSummary}
                    </span>
                  </Td>
                  <Td>
                    <time dateTime={row.createdAtISO} style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
                      {new Date(row.createdAtISO).toLocaleString("ro-RO")}
                    </time>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Audit Pack note */}
      <div style={infoBanner}>
        <CheckCircle2 size={16} style={{ color: "var(--cobalt-400)", flexShrink: 0 }} />
        <span>
          Toate apelurile API sunt incluse în Audit Pack ZIP la export, sub
          secțiunea <code style={code}>api-sdk/</code> (chei active, ultimele 100
          apeluri, agregat verdict-uri Compliance Gate).
        </span>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <Modal onClose={closeModal} title="Generează API key nou">
          {!newKeyToken ? (
            <>
              <label style={labelStyle}>
                Nume cheie
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="ex: Production CI/CD"
                  style={inputStyle}
                  maxLength={64}
                />
              </label>
              <div style={{ marginTop: "16px" }}>
                <span style={labelTextStyle}>Scope-uri (alege ce poate face cheia)</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  {(["classify", "gate", "deployment", "read_state"] as ApiKeyScope[]).map((scope) => (
                    <label key={scope} style={checkboxRow}>
                      <input
                        type="checkbox"
                        checked={formScopes.has(scope)}
                        onChange={(e) => {
                          setFormScopes((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(scope)
                            else next.delete(scope)
                            return next
                          })
                        }}
                      />
                      <span>
                        <strong>{scope}</strong>
                        <span style={{ color: "var(--ink-dim)", fontSize: "12px", marginLeft: "6px" }}>
                          {scopeDescription(scope)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
                <button style={ghostBtn} onClick={closeModal} disabled={creating}>
                  Anulează
                </button>
                <button style={primaryBtn} onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 size={14} className="spin" /> Se creează...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Generează
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={tokenWarning}>
                <AlertCircle size={16} style={{ color: "var(--amber-700)", flexShrink: 0 }} />
                <span>
                  <strong>Salvează acest token acum.</strong> Nu va mai fi afișat
                  niciodată. Dacă îl pierzi, generează unul nou și revocă-l pe
                  acesta.
                </span>
              </div>
              <div style={{ marginTop: "16px" }}>
                <label style={labelTextStyle}>Full token</label>
                <div style={tokenDisplay}>
                  <code style={{ flex: 1, fontFamily: "var(--font-mono-v3)", fontSize: "13px", wordBreak: "break-all" }}>
                    {revealToken ? newKeyToken : maskToken(newKeyToken)}
                  </code>
                  <button
                    style={iconBtn}
                    onClick={() => setRevealToken((v) => !v)}
                    aria-label={revealToken ? "Ascunde" : "Arată"}
                  >
                    {revealToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    style={iconBtn}
                    onClick={() => {
                      void navigator.clipboard.writeText(newKeyToken)
                    }}
                    aria-label="Copiază"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button style={primaryBtn} onClick={closeModal}>
                  Am salvat token-ul
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      <style jsx global>{`
        .spin {
          animation: api-sdk-spin 1s linear infinite;
        }
        @keyframes api-sdk-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

// ─── Components ────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string
  icon?: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={card}>
      <header style={sectionHeader}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {icon}
          <h2 style={h2Style}>{title}</h2>
        </div>
        {right}
      </header>
      <div>{children}</div>
    </section>
  )
}

function CodeBlock({ title, content, language }: { title: string; content: string; language: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ marginTop: "12px" }}>
      <div style={codeBlockHeader}>
        <span style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
          {title} · {language}
        </span>
        <button
          style={iconBtn}
          onClick={() => {
            void navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          aria-label="Copiază snippet"
        >
          {copied ? <CheckCircle2 size={14} style={{ color: "var(--green-700)" }} /> : <Copy size={14} />}
        </button>
      </div>
      <pre style={preStyle}>
        <code>{content}</code>
      </pre>
    </div>
  )
}

function EndpointCard({
  method,
  path,
  auth,
  requestExample,
  responseExample,
}: {
  method: "GET" | "POST" | "DELETE"
  path: string
  auth: string
  requestExample: string
  responseExample: string
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={endpointWrap}>
      <button
        type="button"
        style={endpointHeaderBtn}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1 }}>
          <MethodBadge method={method} />
          <code style={{ ...code, fontSize: "13px" }}>{path}</code>
          <span style={{ fontSize: "11px", color: "var(--ink-dim)", marginLeft: "auto", marginRight: "8px" }}>
            {auth}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div style={{ padding: "12px 16px 16px" }}>
          <CodeBlock title="Request" content={requestExample} language="json" />
          <CodeBlock title="Response" content={responseExample} language="json" />
        </div>
      )}
    </div>
  )
}

function MethodBadge({ method }: { method: "GET" | "POST" | "DELETE" }) {
  const colors: Record<typeof method, { bg: string; fg: string }> = {
    GET: { bg: "var(--cobalt-100)", fg: "var(--cobalt-700)" },
    POST: { bg: "var(--green-100)", fg: "var(--green-700)" },
    DELETE: { bg: "var(--red-100)", fg: "var(--red-700)" },
  }
  return (
    <span
      style={{
        ...methodBadgeBase,
        background: colors[method].bg,
        color: colors[method].fg,
      }}
    >
      {method}
    </span>
  )
}

function StatusBadge({ status }: { status: ApiKey["status"] }) {
  if (status === "active") {
    return (
      <span style={{ ...statusPillBase, background: "var(--green-100)", color: "var(--green-700)" }}>
        <CheckCircle2 size={12} /> Activ
      </span>
    )
  }
  if (status === "expired") {
    return (
      <span style={{ ...statusPillBase, background: "var(--amber-100)", color: "var(--amber-700)" }}>
        Expirat
      </span>
    )
  }
  return (
    <span style={{ ...statusPillBase, background: "var(--red-100)", color: "var(--red-700)" }}>
      <XCircle size={12} /> Revocat
    </span>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div style={modalOverlay} onClick={onClose} role="presentation">
      <div
        style={modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-modal-title"
      >
        <header style={modalHeader}>
          <h2 id="api-modal-title" style={{ ...h2Style, margin: 0 }}>
            {title}
          </h2>
          <button type="button" style={iconBtn} onClick={onClose} aria-label="Închide">
            <X size={16} />
          </button>
        </header>
        <div style={{ padding: "16px" }}>{children}</div>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px 12px",
        fontSize: "11px",
        color: "var(--ink-dim)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderBottom: "1px solid var(--surface-border)",
      }}
    >
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "10px 12px",
        fontSize: "13px",
        color: "var(--ink)",
        borderBottom: "1px solid var(--surface-border)",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function maskToken(token: string): string {
  if (token.length <= 12) return "•".repeat(token.length)
  return `${token.slice(0, 8)}${"•".repeat(token.length - 12)}${token.slice(-4)}`
}

function scopeDescription(scope: ApiKeyScope): string {
  switch (scope) {
    case "classify":
      return "/api/v1/classify — clasificare risc + obligații"
    case "gate":
      return "/api/v1/gate — verdict pass/review/blocked"
    case "deployment":
      return "/api/v1/deployment — înregistrare deployment + findings"
    case "read_state":
      return "(rezervat pentru v2 — citiri read-only pe state)"
  }
}

// ─── Inline styles (v3 design tokens) ────────────────────────────────────

const pageWrap: CSSProperties = {
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  maxWidth: "1100px",
  margin: "0 auto",
}

const headerCard: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-border)",
  borderRadius: "12px",
  padding: "20px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap",
}

const h1Style: CSSProperties = {
  fontSize: "20px",
  fontWeight: 700,
  color: "var(--ink)",
  margin: 0,
}

const subtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  fontSize: "13px",
  color: "var(--ink-dim)",
  maxWidth: "600px",
}

const versionBadge: CSSProperties = {
  background: "var(--cobalt-100)",
  color: "var(--cobalt-700)",
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.03em",
}

const linkBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "8px",
  border: "1px solid var(--surface-border)",
  background: "transparent",
  color: "var(--ink)",
  fontSize: "12px",
  textDecoration: "none",
  fontWeight: 500,
}

const card: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-border)",
  borderRadius: "12px",
  padding: "20px 24px",
}

const sectionHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "12px",
  gap: "8px",
}

const h2Style: CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--ink)",
  margin: 0,
}

const errorBanner: CSSProperties = {
  background: "var(--red-100)",
  color: "var(--red-700)",
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid var(--red-300)",
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
}

const infoBanner: CSSProperties = {
  background: "var(--cobalt-50)",
  color: "var(--ink)",
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid var(--cobalt-300)",
  fontSize: "13px",
  display: "flex",
  alignItems: "center",
  gap: "8px",
}

const tokenWarning: CSSProperties = {
  background: "var(--amber-50)",
  border: "1px solid var(--amber-300)",
  color: "var(--ink)",
  padding: "10px 14px",
  borderRadius: "10px",
  fontSize: "12px",
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
}

const code: CSSProperties = {
  background: "var(--surface-2)",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "var(--font-mono-v3)",
  fontSize: "12px",
  color: "var(--ink)",
}

const preStyle: CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--surface-border)",
  borderRadius: "0 0 10px 10px",
  padding: "12px 14px",
  fontFamily: "var(--font-mono-v3)",
  fontSize: "12px",
  color: "var(--ink)",
  overflow: "auto",
  margin: 0,
  whiteSpace: "pre",
  lineHeight: 1.5,
}

const codeBlockHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--surface-3)",
  border: "1px solid var(--surface-border)",
  borderBottom: "none",
  borderRadius: "10px 10px 0 0",
  padding: "6px 14px",
}

const primaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "8px",
  background: "var(--cobalt-500)",
  color: "white",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
}

const ghostBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 14px",
  borderRadius: "8px",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--surface-border)",
  fontSize: "13px",
  cursor: "pointer",
}

const iconBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  borderRadius: "6px",
  background: "transparent",
  color: "var(--ink)",
  border: "1px solid var(--surface-border)",
  cursor: "pointer",
}

const dangerBtn: CSSProperties = {
  background: "transparent",
  color: "var(--red-700)",
  border: "1px solid var(--red-300)",
  borderRadius: "6px",
  padding: "4px 10px",
  fontSize: "12px",
  cursor: "pointer",
  fontWeight: 500,
}

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  borderRadius: "10px",
  overflow: "hidden",
}

const scopeBadge: CSSProperties = {
  background: "var(--surface-2)",
  color: "var(--ink)",
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.03em",
  border: "1px solid var(--surface-border)",
}

const statusPillBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  fontWeight: 600,
}

const methodBadgeBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: 700,
  fontFamily: "var(--font-mono-v3)",
}

const endpointWrap: CSSProperties = {
  border: "1px solid var(--surface-border)",
  borderRadius: "10px",
  marginBottom: "10px",
  background: "var(--surface-1)",
}

const endpointHeaderBtn: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  textAlign: "left",
  color: "var(--ink)",
}

const emptyState: CSSProperties = {
  textAlign: "center",
  padding: "32px 16px",
  border: "1px dashed var(--surface-border)",
  borderRadius: "12px",
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--ink)",
}

const labelTextStyle: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--ink)",
  marginBottom: "4px",
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "6px",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid var(--surface-border)",
  background: "var(--surface-1)",
  color: "var(--ink)",
  fontSize: "13px",
}

const checkboxRow: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "flex-start",
  fontSize: "13px",
  color: "var(--ink)",
  cursor: "pointer",
  padding: "6px 0",
}

const tokenDisplay: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  background: "var(--surface-2)",
  border: "1px solid var(--surface-border)",
  borderRadius: "8px",
  padding: "8px 10px",
}

const modalOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
}

const modalCard: CSSProperties = {
  background: "var(--surface-1)",
  borderRadius: "14px",
  width: "min(560px, 92vw)",
  maxHeight: "92vh",
  overflow: "auto",
  border: "1px solid var(--surface-border)",
}

const modalHeader: CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid var(--surface-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}
