"use client"

/**
 * Sprint 008B — /dashboard/resolve/support
 *
 * FAQ + playbook scurt pentru utilizatori. 6 carduri collapsible cu
 * recomandari operationale despre lifecycle finding-uri si dovezi.
 *
 * Style: inline + v3 tokens.
 */

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
} from "lucide-react"

type FaqCard = {
  q: string
  a: string
}

const FAQS: FaqCard[] = [
  {
    q: "Cum decid Confirm vs Dismiss?",
    a: `Confirm = recunosti ca risc-ul e real si trebuie tratat (intra in pipeline cu deadline). Dismiss = stii ca nu se aplica organizatiei tale (de ex. furnizor exclus, lege irelevanta pe activitate). Ambele genereaza ledger entry hash-chained — auditorul vede de ce ai ales fiecare. Daca esti nesigur, Confirm si lasi-l ca "in lucru". Dismiss e DEFINITIV — daca te razgandesti, foloseste Redeschide.`,
  },
  {
    q: "Ce e o dovada buna?",
    a: `O dovada buna raspunde la "cum ai inchis problema". Bune: screenshot consola furnizor (DPA semnat), link la registru actualizat, contract uploaded, captura email cu IT. Slabe: "am verificat" fara link, "OK" fara timestamp, vorbarie generala. Regula: daca un auditor tert poate intelege in 60 secunde fara sa te intrebe, e buna. Nota se ataseaza timestamped si nu se sterge — chiar daca o stergi mai tarziu, evenimentul ramane in audit trail.`,
  },
  {
    q: "Ce inseamna under monitoring?",
    a: `Risc-ul nu e inchis, dar nici nu necesita actiune imediata. Exemplu: provider AI care a semnat DPA, dar trebuie reverificat in 90 zile pentru DPIA. Setam automat nextMonitoringDateISO = +90 zile; cand pasul vine, primesti un nudge in cockpit. Foloseste-l in loc de "deschis" pentru lucruri pe care le-ai tratat o data si vor reveni periodic.`,
  },
  {
    q: "Cum verific hash chain Audit Pack?",
    a: `Fiecare actiune (creare risc, schimbare status, atasare dovada) emite un eveniment cu SHA-256 chain (selfHash = SHA256(prevHash + payload)). In /dashboard/dosar > tab Audit trail, badge-ul verde "Hash chain verificat" confirma integritatea. Cand exporti Audit Pack ZIP (in /dashboard/audit-pack), verificarea ruleaza si la upload pe pagina publica /verify-pack — nu necesita autentificare. Daca cineva editeaza state-ul direct in DB, lantul se rupe si Dosar marcheaza eventul exact unde s-a tampered.`,
  },
  {
    q: "Ce face Mark resolved?",
    a: `Marcheaza finding-ul ca rezolvat: findingStatus="resolved", reviewState="closed". Devine read-only pentru pipeline-ul activ — pleaca din "De rezolvat" si intra in "Dosar" tab Inchise. Daca ai gresit, foloseste Redeschide; nu sterge — stergerea pierde dovezile asociate (chiar daca evenimentul ramane in audit trail, e mai curat sa redeschizi). Inainte de Mark resolved, ataseaza minim o dovada — altfel auditorul nu poate verifica.`,
  },
  {
    q: "Diferenta intre operational evidence si document URL?",
    a: `Operational evidence note = explicatie scurta scrisa de tine direct in cockpit ("am verificat DPA pe Notion, semnat de provider la 2026-04-15"). Document URL = link la asset extern (Google Drive, Notion, share intern) care contine dovada propriu-zisa. Nota e obligatorie chiar daca atasezi URL — auditorul vrea sa stie ce e in spatele link-ului fara sa-l deschida.`,
  },
]

export default function SupportPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "880px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <Link
        href="/dashboard/resolve"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          color: "var(--ink-muted)",
          textDecoration: "none",
        }}
      >
        <ArrowLeft size={13} /> Inapoi la De rezolvat
      </Link>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <HelpCircle size={20} style={{ color: "var(--cobalt-400)" }} />
          <h1
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Ghid lifecycle risc-uri
          </h1>
        </div>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "8px" }}>
          Decizii rapide despre cum sa folosesti cockpit-ul de rezolvare. Toate
          actiunile sunt audit-clean (hash chain SHA-256).
        </p>
      </div>

      <div
        style={{
          padding: "12px 16px",
          background: "rgba(96,165,250,0.08)",
          border: "1px solid rgba(96,165,250,0.2)",
          borderRadius: "8px",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          fontSize: "12px",
          color: "var(--cobalt-400)",
        }}
      >
        <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
        <div>
          <strong style={{ fontWeight: 600 }}>Regula de aur</strong> — orice
          actiune (Confirm, Dismiss, Resolve, dovada atasata) intra in audit
          trail cu timestamp + actor + hash. Nu poti sa stergi din ledger;
          poti doar sa adaugi.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {FAQS.map((card, i) => {
          const open = i === openIdx
          return (
            <div
              key={i}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-soft)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 18px",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--ink)",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "inherit",
                }}
              >
                <span style={{ flex: 1 }}>{card.q}</span>
                {open ? (
                  <ChevronUp size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={16} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
                )}
              </button>
              {open && (
                <div
                  style={{
                    padding: "0 18px 18px",
                    fontSize: "13px",
                    color: "var(--ink-muted)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {card.a}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div
        style={{
          marginTop: "16px",
          padding: "16px 18px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: "10px",
          fontSize: "12px",
          color: "var(--ink-muted)",
        }}
      >
        Daca un risc nu se incadreaza in flow-ul de mai sus, deschide-l pe{" "}
        <Link href="/dashboard/resolve" style={{ color: "var(--cobalt-400)" }}>
          /dashboard/resolve
        </Link>{" "}
        si lasa-l in "Open" — vom adauga ghidaj specific in sprint-urile
        viitoare (DPIA, RoPA, Breach).
      </div>
    </div>
  )
}
