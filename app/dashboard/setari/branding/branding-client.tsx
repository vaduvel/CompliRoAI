"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Palette, RefreshCw, Save } from "lucide-react"

import type { EffectiveBranding, WhiteLabelConfig } from "@/lib/server/white-label"

type Props = {
  initialConfig: WhiteLabelConfig | null
  initialEffective: EffectiveBranding
  suggestedBrandName: string
  orgName: string
}

type FormState = {
  brandName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  signerName: string
  signerTitle: string
  contactEmail: string
  address: string
  website: string
}

function configToForm(config: WhiteLabelConfig | null, fallbackBrandName: string): FormState {
  return {
    brandName: config?.brandName ?? fallbackBrandName,
    logoUrl: config?.logoUrl ?? "",
    primaryColor: config?.primaryColor ?? "#3b5bdb",
    secondaryColor: config?.secondaryColor ?? "#0ea5e9",
    signerName: config?.signerName ?? "",
    signerTitle: config?.signerTitle ?? "",
    contactEmail: config?.contactEmail ?? "",
    address: config?.address ?? "",
    website: config?.website ?? "",
  }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const URL_RE = /^https?:\/\/[^\s]+$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function BrandingSettingsClient({
  initialConfig,
  initialEffective,
  suggestedBrandName,
  orgName,
}: Props) {
  const [form, setForm] = useState<FormState>(() =>
    configToForm(initialConfig, suggestedBrandName)
  )
  const [effective, setEffective] = useState<EffectiveBranding>(initialEffective)
  const [hasOverride, setHasOverride] = useState<boolean>(Boolean(initialConfig))
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const validationError = useMemo<string | null>(() => {
    if (!form.brandName.trim()) return "Numele brand-ului este obligatoriu."
    if (!HEX_RE.test(form.primaryColor))
      return "Culoarea primară trebuie să fie hex valid (#rrggbb)."
    if (!HEX_RE.test(form.secondaryColor))
      return "Culoarea secundară trebuie să fie hex valid (#rrggbb)."
    if (form.logoUrl && !URL_RE.test(form.logoUrl))
      return "URL-ul logo-ului trebuie să înceapă cu http:// sau https://."
    if (form.website && !URL_RE.test(form.website))
      return "Website-ul trebuie să înceapă cu http:// sau https://."
    if (form.contactEmail && !EMAIL_RE.test(form.contactEmail))
      return "Emailul de contact nu este valid."
    return null
  }, [form])

  const previewBrandName = form.brandName.trim() || suggestedBrandName

  async function handleSave() {
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: form.brandName.trim(),
          logoUrl: form.logoUrl.trim() || null,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          signerName: form.signerName.trim() || null,
          signerTitle: form.signerTitle.trim() || null,
          contactEmail: form.contactEmail.trim() || null,
          address: form.address.trim() || null,
          website: form.website.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Eroare la salvare.")
        return
      }
      toast.success("Brandingul a fost salvat.")
      setEffective(data.effective as EffectiveBranding)
      setHasOverride(true)
    } catch {
      toast.error("Eroare de rețea. Reîncearcă.")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm("Sigur resetezi la brandingul implicit CompliRoAI?")) return
    setResetting(true)
    try {
      const res = await fetch("/api/branding", { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "Eroare la resetare.")
        return
      }
      toast.success("Brandingul a fost resetat la default.")
      setEffective(data.effective as EffectiveBranding)
      setForm(configToForm(null, suggestedBrandName))
      setHasOverride(false)
    } catch {
      toast.error("Eroare de rețea. Reîncearcă.")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="cr-page cr-stack">
      <header className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <Palette size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Setări</div>
            <h1 className="cr-title">Branding cabinet</h1>
            <p className="cr-subtitle">
            Personalizează documentele și emailurile trimise către clienții tăi.
            {hasOverride ? (
              <span style={{ marginLeft: 8, color: "var(--accent, #3b5bdb)", fontWeight: 500 }}>
                · Branding custom activ
              </span>
            ) : (
              <span style={{ marginLeft: 8, color: "var(--ink-dim)" }}>
                · Folosești brandingul implicit CompliRoAI
              </span>
            )}
            </p>
          </div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Identitate vizuală</h2>

          <Field label="Nume brand" required hint="Apare în emailuri, share pages, header documente.">
            <input
              className="cr-input"
              value={form.brandName}
              onChange={(e) => update("brandName", e.target.value)}
              placeholder={suggestedBrandName}
              maxLength={120}
            />
          </Field>

          <Field
            label="Logo (URL public)"
            hint="Recomandat: PNG transparent, sub 200KB. Pe Vercel, găzduiește pe imgur / Cloudinary / S3."
          >
            <input
              className="cr-input"
              value={form.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              placeholder="https://exemplu.ro/logo.png"
              type="url"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Culoare primară" hint="Butoane, header.">
              <ColorPicker
                value={form.primaryColor}
                onChange={(v) => update("primaryColor", v)}
              />
            </Field>
            <Field label="Culoare secundară" hint="Accente, badge-uri.">
              <ColorPicker
                value={form.secondaryColor}
                onChange={(v) => update("secondaryColor", v)}
              />
            </Field>
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: 22 }}>Semnătură document</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Nume semnatar" hint="Ex: Diana Popescu">
              <input
                className="cr-input"
                value={form.signerName}
                onChange={(e) => update("signerName", e.target.value)}
                maxLength={120}
              />
            </Field>
            <Field label="Funcție semnatar" hint="Ex: DPO Manager">
              <input
                className="cr-input"
                value={form.signerTitle}
                onChange={(e) => update("signerTitle", e.target.value)}
                maxLength={120}
              />
            </Field>
          </div>

          <h2 style={{ ...sectionTitleStyle, marginTop: 22 }}>Date de contact</h2>
          <Field label="Email contact">
            <input
              className="cr-input"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="contact@cabinet.ro"
              type="email"
            />
          </Field>
          <Field label="Website cabinet">
            <input
              className="cr-input"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://cabinet.ro"
              type="url"
            />
          </Field>
          <Field label="Adresă birou">
            <textarea
            className="cr-input cr-textarea"
              style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              maxLength={240}
              placeholder="Str. Exemplu nr. 1, București"
            />
          </Field>

          {validationError && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#b91c1c",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              {validationError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || Boolean(validationError)}
              className="cr-btn cr-btn--primary"
              style={{
                background: form.primaryColor,
                opacity: saving || validationError ? 0.7 : 1,
                cursor: saving || validationError ? "not-allowed" : "pointer",
              }}
            >
              {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} />}
              {saving ? "Se salvează…" : "Salvează brandingul"}
            </button>
            {hasOverride && (
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="cr-btn cr-btn--secondary"
              >
                {resetting ? (
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <RefreshCw size={14} />
                )}
                {resetting ? "Se resetează…" : "Resetează la CompliRoAI"}
              </button>
            )}
          </div>
        </section>

        {/* ── Preview ─────────────────────────────────────────────────────── */}
        <aside style={{ ...cardStyle, position: "sticky", top: 24, alignSelf: "start" }}>
          <h2 style={sectionTitleStyle}>Previzualizare</h2>
          <p style={{ margin: "0 0 12px", color: "var(--ink-dim)", fontSize: 12 }}>
            Așa apare brandingul tău în documente și emailuri.
          </p>

          {/* Email header preview */}
          <div
            style={{
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: form.primaryColor,
                padding: "14px 16px",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {form.logoUrl && URL_RE.test(form.logoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logoUrl}
                  alt="logo"
                  style={{
                    width: 28,
                    height: 28,
                    objectFit: "contain",
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.92)",
                    padding: 2,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.18)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {previewBrandName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{previewBrandName}</div>
                <div style={{ fontSize: 10, opacity: 0.85 }}>
                  Conformitate AI Act + GDPR
                </div>
              </div>
            </div>
            <div style={{ padding: 14, background: "#fff", color: "#0f172a" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>
                Raport AI Act disponibil
              </p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                Cabinetul tău a pregătit un raport de conformitate. Apasă pentru a-l accesa.
              </p>
              <button
                type="button"
                className="cr-btn cr-btn--primary cr-btn--sm"
                style={{ background: form.primaryColor }}
              >
                Deschide linkul
              </button>
              <p style={{ marginTop: 12, fontSize: 10, color: "#94a3b8" }}>
                Trimis de <strong>{previewBrandName}</strong>
                {form.contactEmail ? ` · ${form.contactEmail}` : ""}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 10, color: "#cbd5e1" }}>
                Powered by CompliRoAI
              </p>
            </div>
          </div>

          {/* Document signature preview */}
          <div
            style={{
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 8,
              padding: 14,
              background: "var(--bg-elevated, #f8fafc)",
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--ink, #0f172a)", marginBottom: 8 }}>
              Semnătură document
            </div>
            <div style={{ color: "var(--ink-dim, #64748b)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--ink, #0f172a)" }}>
                {form.signerName || "— Nume semnatar —"}
              </strong>
              {form.signerTitle && (
                <>
                  <br />
                  <span>{form.signerTitle}</span>
                </>
              )}
              <br />
              <span style={{ color: form.secondaryColor, fontWeight: 500 }}>
                {previewBrandName}
              </span>
              {form.contactEmail && (
                <>
                  <br />
                  <span>{form.contactEmail}</span>
                </>
              )}
              {form.website && (
                <>
                  <br />
                  <span>{form.website}</span>
                </>
              )}
              {form.address && (
                <>
                  <br />
                  <span style={{ fontSize: 11 }}>{form.address}</span>
                </>
              )}
            </div>
          </div>

          <p style={{ marginTop: 14, fontSize: 11, color: "var(--ink-dim, #94a3b8)" }}>
            Org curentă: <code>{orgName || "—"}</code>
            <br />
            Branding efectiv: {effective.isCustom ? "Custom cabinet" : "CompliRoAI default"}
          </p>
        </aside>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ink, #0f172a)",
          marginBottom: 4,
        }}
      >
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-dim, #94a3b8)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
            className="cr-input"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 42,
          height: 36,
          padding: 2,
          border: "1px solid var(--border, #cbd5e1)",
          borderRadius: 6,
          background: "transparent",
          cursor: "pointer",
        }}
      />
      <input
        className="cr-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, flex: 1, fontFamily: "ui-monospace, monospace" }}
        placeholder="#rrggbb"
        maxLength={7}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--bg-card, #fff)",
  border: "1px solid var(--border, #e2e8f0)",
  borderRadius: 12,
  padding: 22,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  margin: "0 0 12px",
  color: "var(--ink, #0f172a)",
  letterSpacing: "-0.01em",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--border, #cbd5e1)",
  borderRadius: 6,
  fontSize: 13,
  outline: "none",
  color: "var(--ink, #0f172a)",
  background: "var(--bg-input, #fff)",
  boxSizing: "border-box",
  fontFamily: "inherit",
}
