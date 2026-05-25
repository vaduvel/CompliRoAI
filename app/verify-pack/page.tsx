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
    <main className="cr-verify-page">
      <section className="cr-verify-shell">
        <header className="cr-verify-header">
          <div className="cr-verify-icon" aria-hidden="true">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="cr-section-label">
            CompliRoAI · Verificare audit pack
            </div>
            <h1 className="cr-verify-title">Verifică integritatea unui audit pack</h1>
            <p className="cr-verify-copy">
              Încarcă un fișier <code>.zip</code> emis de CompliRoAI. Pagina recalculează
              hash chain-ul și compară cu valorile din <code>MANIFEST.json</code>. Dacă
              rezultatul este <strong>valid</strong>, fișierele NU au fost modificate
              de la generare.
            </p>
          </div>
        </header>

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
        className={dragging ? "cr-verify-dropzone cr-verify-dropzone--dragging" : "cr-verify-dropzone"}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={onPick}
          className="cr-file-input"
        />
        {busy ? (
          <>
            <Loader2 size={32} className="cr-spin cr-verify-dropzone__icon cr-verify-dropzone__icon--active" />
            <div className="cr-verify-dropzone__title">Verificăm...</div>
          </>
        ) : (
          <>
            <Upload
              size={32}
              className={dragging ? "cr-verify-dropzone__icon cr-verify-dropzone__icon--active" : "cr-verify-dropzone__icon"}
            />
            <div className="cr-verify-dropzone__title">
              {fileName ?? "Trage un ZIP aici sau click pentru selectare"}
            </div>
            <div className="cr-verify-dropzone__hint">
              Acceptăm doar fișiere ZIP emise de CompliRoAI · max 25 MB
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="cr-alert cr-alert--danger cr-verify-alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {result && (
        <div className="cr-verify-result">
          <div className={result.valid ? "cr-verify-banner cr-verify-banner--valid" : "cr-verify-banner cr-verify-banner--invalid"}>
            {result.valid ? (
              <CheckCircle2 size={28} className="cr-verify-banner__icon" />
            ) : (
              <XCircle size={28} className="cr-verify-banner__icon" />
            )}
            <div className="cr-verify-banner__body">
              <div className="cr-verify-banner__title">
                {result.valid ? "Pachet valid — integritate confirmată" : "Pachet INVALID"}
              </div>
              <div className="cr-verify-banner__copy">
                {result.valid
                  ? "Hash chain corespunde — nimeni nu a modificat conținutul."
                  : "Hash chain rupt — conținutul a fost modificat sau este corupt."}
              </div>
            </div>
            <div className="cr-verify-badge">
              Verificat de CompliRoAI
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="cr-verify-panel">
              <div className="cr-verify-panel__title">
                Probleme detectate
              </div>
              <ul className="cr-verify-errors">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="cr-verify-panel">
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

          {result.fileChecks.length > 0 && (
            <div className="cr-verify-panel">
              <div className="cr-verify-panel__title cr-verify-panel__title--icon">
                <FileArchive size={12} />
                Verificare per fișier ({result.fileChecks.filter((c) => c.ok).length}/
                {result.fileChecks.length} OK)
              </div>
              <div className="cr-verify-files">
                {result.fileChecks.map((check) => (
                  <div key={check.path} className="cr-verify-file">
                    {check.ok ? (
                      <CheckCircle2 size={12} className="cr-verify-file__ok" />
                    ) : (
                      <XCircle size={12} className="cr-verify-file__fail" />
                    )}
                    <code>{check.path}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

        <footer className="cr-verify-footer">
        Verificarea folosește hash chain SHA-256: <code>h[i] = SHA-256(h[i-1] || file_i)</code>.
        Orice modificare a unui singur byte rupe lanțul. Această pagină rulează verificarea
        pe server și nu stochează ZIP-ul.
        </footer>
      </section>
    </main>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="cr-verify-row">
      <div className="cr-verify-row__label">
        {label}
      </div>
      <div className={mono ? "cr-verify-row__value cr-verify-row__value--mono" : "cr-verify-row__value"}>
        {value}
      </div>
    </div>
  )
}
