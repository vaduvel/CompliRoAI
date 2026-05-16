"use client"

import { useState, useRef, useCallback } from "react"
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Upload,
  FileArchive,
  Loader2,
  AlertTriangle,
} from "lucide-react"

type ManifestSummary = {
  schema?: string
  version?: string
  generatedAt?: string
  org?: { name?: string; id?: string; cui?: string | null }
  issuedBy?: { brandName?: string; signerName?: string | null; signerTitle?: string | null }
  summary?: {
    aiSystemsCount?: number
    annexIvDocumentsCount?: number
    literacyRecordsCount?: number
    overallCompliancePct?: number
  }
  hashChainRoot?: string
  signature?: string
}

type VerifyResponse = {
  valid: boolean
  errors: string[]
  computedHash: string | null
  expectedHash: string | null
  manifest: ManifestSummary | null
  fileChecks: { path: string; expected: string; actual: string; ok: boolean }[]
}

export default function VerifyPackPage() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setResult(null)
    setFileName(file.name)
    setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const res = await fetch("/api/audit-pack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: buf,
      })
      const data = (await res.json()) as VerifyResponse | { error: string }
      if (!res.ok || "error" in data) {
        setError(("error" in data ? data.error : null) ?? `Eroare ${res.status}`)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la verificare.")
    } finally {
      setBusy(false)
    }
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: "720px", width: "100%", marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              background: "var(--cobalt-soft)",
              color: "var(--cobalt-400)",
              padding: "8px",
              borderRadius: "8px",
              display: "inline-flex",
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div style={{ fontSize: "14px", color: "var(--ink-dim)" }}>
            CompliRoAI · Verificare audit pack
          </div>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "28px",
            fontWeight: 600,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
          }}
        >
          Verifică integritatea unui audit pack
        </h1>
        <p style={{ fontSize: "14px", color: "var(--ink-muted)", margin: 0, lineHeight: 1.6 }}>
          Încarcă un fișier <code>.zip</code> emis de CompliRoAI. Pagina recalculează
          hash chain-ul și compară cu valorile din <code>MANIFEST.json</code>. Dacă
          rezultatul este <strong>valid</strong>, fișierele NU au fost modificate
          de la generare.
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
        }}
        style={{
          width: "100%",
          maxWidth: "720px",
          border: `2px dashed ${dragging ? "var(--cobalt-400)" : "var(--border-strong)"}`,
          background: dragging ? "var(--cobalt-soft)" : "var(--bg-card)",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={onPick}
          style={{ display: "none" }}
        />
        {busy ? (
          <>
            <Loader2 size={32} className="spin" style={{ color: "var(--cobalt-400)" }} />
            <div style={{ marginTop: "12px", fontSize: "14px", color: "var(--ink)" }}>
              Verificăm…
            </div>
          </>
        ) : (
          <>
            <Upload
              size={32}
              style={{ color: dragging ? "var(--cobalt-400)" : "var(--ink-dim)" }}
            />
            <div
              style={{
                marginTop: "12px",
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--ink)",
              }}
            >
              {fileName ?? "Trage un ZIP aici sau click pentru selectare"}
            </div>
            <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--ink-dim)" }}>
              Acceptăm doar fișiere ZIP emise de CompliRoAI · max 25 MB
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            width: "100%",
            maxWidth: "720px",
            marginTop: "16px",
            padding: "12px 16px",
            background: "var(--red-soft)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: "8px",
            color: "var(--red-400)",
            fontSize: "13px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ width: "100%", maxWidth: "720px", marginTop: "24px" }}>
          {/* Verdict banner */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: "10px",
              background: result.valid ? "var(--emerald-soft)" : "var(--red-soft)",
              border: `1px solid ${
                result.valid ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"
              }`,
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            {result.valid ? (
              <CheckCircle2 size={28} style={{ color: "var(--emerald-400)" }} />
            ) : (
              <XCircle size={28} style={{ color: "var(--red-400)" }} />
            )}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: result.valid ? "var(--emerald-400)" : "var(--red-400)",
                }}
              >
                {result.valid ? "Pachet valid — integritate confirmată" : "Pachet INVALID"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "2px" }}>
                {result.valid
                  ? "Hash chain corespunde — nimeni nu a modificat conținutul."
                  : "Hash chain rupt — conținutul a fost modificat sau este corupt."}
              </div>
            </div>
            <div
              style={{
                background: "var(--bg-card)",
                padding: "4px 10px",
                borderRadius: "12px",
                fontSize: "11px",
                color: "var(--ink-dim)",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              Verificat de CompliRoAI
            </div>
          </div>

          {/* Errors list */}
          {result.errors.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "12px 16px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: "6px",
                }}
              >
                Probleme detectate
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--red-400)" }}>
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hash details */}
          <div
            style={{
              marginTop: "12px",
              padding: "16px 20px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
            }}
          >
            <Row label="Hash root calculat" value={result.computedHash ?? "—"} mono />
            <Row label="Hash root așteptat" value={result.expectedHash ?? "—"} mono />
            {result.manifest?.signature && (
              <Row label="Signature (HMAC-SHA256)" value={result.manifest.signature} mono />
            )}
            {result.manifest?.generatedAt && (
              <Row
                label="Generat la"
                value={new Date(result.manifest.generatedAt).toLocaleString("ro-RO")}
              />
            )}
            {result.manifest?.org && (
              <Row
                label="Organizație"
                value={`${result.manifest.org.name ?? "?"}${
                  result.manifest.org.cui ? ` · ${result.manifest.org.cui}` : ""
                }`}
              />
            )}
            {result.manifest?.issuedBy?.brandName && (
              <Row
                label="Emis de"
                value={`${result.manifest.issuedBy.brandName}${
                  result.manifest.issuedBy.signerName
                    ? ` · ${result.manifest.issuedBy.signerName}`
                    : ""
                }`}
              />
            )}
            {result.manifest?.summary && (
              <Row
                label="Conținut"
                value={`${result.manifest.summary.aiSystemsCount ?? 0} sisteme AI · ${
                  result.manifest.summary.annexIvDocumentsCount ?? 0
                } documente Annex IV · ${
                  result.manifest.summary.literacyRecordsCount ?? 0
                } training-uri · scor ${result.manifest.summary.overallCompliancePct ?? 0}%`}
              />
            )}
          </div>

          {/* File checks */}
          {result.fileChecks.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "16px 20px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FileArchive size={12} />
                Verificare per fișier ({result.fileChecks.filter((c) => c.ok).length}/
                {result.fileChecks.length} OK)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {result.fileChecks.map((check) => (
                  <div
                    key={check.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px",
                      padding: "4px 0",
                    }}
                  >
                    {check.ok ? (
                      <CheckCircle2 size={12} style={{ color: "var(--emerald-400)" }} />
                    ) : (
                      <XCircle size={12} style={{ color: "var(--red-400)" }} />
                    )}
                    <code style={{ color: "var(--ink)", fontSize: "11px" }}>{check.path}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "48px",
          fontSize: "11px",
          color: "var(--ink-dim)",
          textAlign: "center",
          maxWidth: "560px",
        }}
      >
        Verificarea folosește hash chain SHA-256: <code>h[i] = SHA-256(h[i-1] || file_i)</code>.
        Orice modificare a unui singur byte rupe lanțul. Această pagină rulează verificarea
        pe server și nu stochează ZIP-ul.
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "6px 0",
        borderBottom: "1px solid var(--border-soft)",
        alignItems: "baseline",
      }}
    >
      <div style={{ fontSize: "11px", color: "var(--ink-dim)", minWidth: "150px", flexShrink: 0 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--ink)",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : "inherit",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  )
}
