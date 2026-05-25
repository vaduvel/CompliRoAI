import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "API public — CompliRoAI",
  description: "API gratuit CompliRoAI pentru clasificarea sistemelor AI conform Regulamentului UE 2024/1689 (AI Act). Pentru dezvoltatori români.",
}

const PURPOSES = [
  { value: "hr-screening", label: "Screening CV-uri, selecție personal", risc: "high_risk" },
  { value: "credit-scoring", label: "Evaluare creditare bancară", risc: "high_risk" },
  { value: "biometric-identification", label: "Recunoaștere biometrică în timp real", risc: "prohibited" },
  { value: "fraud-detection", label: "Detecție fraudă financiară", risc: "high_risk" },
  { value: "marketing-personalization", label: "Personalizare marketing, recomandări", risc: "limited_risk" },
  { value: "support-chatbot", label: "Chatbot suport clienți", risc: "limited_risk" },
  { value: "document-assistant", label: "Asistent generare documente", risc: "minimal_risk" },
  { value: "image-manipulation-intimate", label: "Generare/manipulare conținut intim (nudifier, deepfake sexual)", risc: "prohibited" },
  { value: "other", label: "Alt scop — necesită evaluare manuală", risc: "limited_risk" },
]

const RISK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  prohibited: { bg: "var(--red-soft)", text: "var(--red-400)", label: "Interzis" },
  high_risk: { bg: "var(--amber-soft)", text: "var(--amber-400)", label: "Risc Ridicat" },
  limited_risk: { bg: "var(--cobalt-soft)", text: "var(--cobalt-400)", label: "Risc Limitat" },
  minimal_risk: { bg: "var(--emerald-soft)", text: "var(--emerald-400)", label: "Risc Minim" },
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{
      background: "var(--bg-elev)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "16px 18px",
      overflowX: "auto",
      fontFamily: "var(--font-mono-v3)",
      fontSize: "13px",
      lineHeight: 1.6,
      color: "var(--ink)",
      margin: 0,
    }}>
      <code>{children}</code>
    </pre>
  )
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} style={{
      fontFamily: "var(--font-display-v3)",
      fontSize: "20px",
      fontWeight: 600,
      color: "var(--ink)",
      margin: "48px 0 16px",
      letterSpacing: "-0.01em",
    }}>
      {children}
    </h2>
  )
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "14px",
      color: "var(--ink-muted)",
      lineHeight: 1.7,
      margin: "0 0 12px",
    }}>
      {children}
    </p>
  )
}

function InlineCode({ children }: { children: string }) {
  return (
    <code style={{
      fontFamily: "var(--font-mono-v3)",
      fontSize: "12px",
      background: "var(--bg-hover)",
      padding: "2px 6px",
      borderRadius: "4px",
      color: "var(--cobalt-400)",
    }}>
      {children}
    </code>
  )
}

export default function ApiDocsPage() {
  const baseUrl = "https://eu-ai-act-beige.vercel.app"

  return (
    <div className="cr-docs-page" style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-body-v3)" }}>
      {/* Top nav */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--bg-shell)",
        borderBottom: "1px solid var(--border)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}>
            CompliRoAI
          </span>
          <span style={{
            fontSize: "11px",
            padding: "1px 6px",
            background: "var(--cobalt-soft)",
            color: "var(--cobalt-400)",
            borderRadius: "4px",
            fontFamily: "var(--font-mono-v3)",
          }}>
            API v1
          </span>
        </Link>
        <Link href="/login" style={{
          fontSize: "13px",
          color: "var(--ink-muted)",
          textDecoration: "none",
        }}>
          Conectează-te →
        </Link>
      </header>

      <main style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Hero */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            fontSize: "12px",
            color: "var(--cobalt-400)",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "8px",
          }}>
            API public · gratuit · fără cheie
          </div>
          <h1 style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "34px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "0 0 16px",
            color: "var(--ink)",
            lineHeight: 1.15,
          }}>
            Clasifică un sistem AI conform AI Act într-o singură linie de cod
          </h1>
          <p style={{ fontSize: "15px", color: "var(--ink-muted)", lineHeight: 1.6, margin: 0 }}>
            Trimite scopul sistemului AI, primești nivelul de risc, articolul aplicabil, deadline-ul și obligațiile —
            conform Regulamentului UE 2024/1689 actualizat cu Omnibus Agreement (7 mai 2026).
          </p>
        </div>

        {/* Quick try */}
        <SectionTitle id="exemplu-rapid">Exemplu rapid (curl)</SectionTitle>
        <Paragraph>Copiază în terminal și rulează:</Paragraph>
        <CodeBlock>{`curl -X POST ${baseUrl}/api/v1/clasifica \\
  -H "Content-Type: application/json" \\
  -d '{"scop": "hr-screening"}'`}</CodeBlock>

        <Paragraph>Răspuns așteptat:</Paragraph>
        <CodeBlock>{`{
  "scop": "hr-screening",
  "nivel_risc": "high_risk",
  "articol": "Annex III 4(a)",
  "motiv": "Sistem AI folosit în recrutare/selecție personal — high-risk conform Annex III.",
  "deadline": "2027-12-02",
  "obligatii": [
    "Documentație tehnică (Annex IV)",
    "Evaluare conformitate",
    "Înregistrare EU Database",
    "Human oversight obligatoriu"
  ],
  "sursa": {
    "regulament": "EU AI Act (Regulamentul UE 2024/1689)",
    "actualizat": "Omnibus Agreement 7 mai 2026 — high-risk Annex III mutat la 2027-12-02"
  },
  "disclaimer": "Clasificare automată orientativă. Pentru evaluare oficială consultă un avocat specializat în Tech/IT."
}`}</CodeBlock>

        {/* Endpoint */}
        <SectionTitle id="endpoint">Endpoint</SectionTitle>
        <div style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "14px 18px",
          fontFamily: "var(--font-mono-v3)",
          fontSize: "13px",
          marginBottom: "16px",
        }}>
          <span style={{
            color: "var(--emerald-400)",
            fontWeight: 600,
            marginRight: "10px",
          }}>POST</span>
          <span style={{ color: "var(--ink)" }}>{baseUrl}/api/v1/clasifica</span>
        </div>
        <Paragraph>
          Endpoint public. <strong style={{ color: "var(--ink)" }}>Fără autentificare</strong>, fără cheie API.
          Rate limit: <InlineCode>60 cereri / minut / IP</InlineCode>.
        </Paragraph>

        {/* Request */}
        <SectionTitle id="request">Body cerere</SectionTitle>
        <CodeBlock>{`{
  "scop": "hr-screening"   // obligatoriu, string, una din valorile acceptate
}`}</CodeBlock>

        <h3 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: "24px 0 12px",
        }}>
          Valori acceptate pentru <InlineCode>scop</InlineCode>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {PURPOSES.map((p) => {
            const risk = RISK_COLORS[p.risc]
            return (
              <div key={p.value} style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "10px 14px",
                background: "var(--bg-raised)",
                borderRadius: "6px",
              }}>
                <code style={{
                  fontFamily: "var(--font-mono-v3)",
                  fontSize: "12px",
                  color: "var(--cobalt-400)",
                  flexShrink: 0,
                  minWidth: "220px",
                }}>{p.value}</code>
                <span style={{ fontSize: "13px", color: "var(--ink-muted)", flex: 1 }}>{p.label}</span>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background: risk.bg,
                  color: risk.text,
                  flexShrink: 0,
                }}>
                  {risk.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Response */}
        <SectionTitle id="response">Schema răspuns (200 OK)</SectionTitle>
        <CodeBlock>{`{
  "scop": string,                  // ce ai trimis
  "nivel_risc": "prohibited" | "high_risk" | "limited_risc" | "minimal_risk",
  "articol": string,               // ex: "Annex III 4(a)" sau "Art. 5(1)(e)"
  "motiv": string,                 // explicație în română
  "deadline": string | null,       // ISO date (YYYY-MM-DD) pentru high-risk; null altfel
  "obligatii": string[],           // listă acțiuni concrete cerute de regulament
  "sursa": {
    "regulament": string,
    "actualizat": string           // ultima modificare relevantă
  },
  "disclaimer": string
}`}</CodeBlock>

        {/* Errors */}
        <SectionTitle id="erori">Coduri de eroare</SectionTitle>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { code: 400, name: "INVALID_JSON", desc: "Body-ul nu este JSON valid." },
            { code: 400, name: "MISSING_PURPOSE", desc: "Câmpul 'scop' lipsește sau nu e string." },
            { code: 400, name: "INVALID_PURPOSE", desc: "Valoarea 'scop' nu e una din cele acceptate." },
            { code: 429, name: "RATE_LIMITED", desc: "Ai depășit 60 cereri/minut. Așteaptă 60s (header Retry-After)." },
          ].map((e) => (
            <div key={e.name} style={{
              display: "flex",
              gap: "16px",
              padding: "12px 16px",
              background: "var(--bg-raised)",
              borderRadius: "6px",
              alignItems: "center",
            }}>
              <span style={{
                fontFamily: "var(--font-mono-v3)",
                fontSize: "13px",
                color: e.code === 429 ? "var(--amber-400)" : "var(--red-400)",
                fontWeight: 600,
                minWidth: "40px",
              }}>{e.code}</span>
              <code style={{
                fontFamily: "var(--font-mono-v3)",
                fontSize: "12px",
                color: "var(--cobalt-400)",
                minWidth: "180px",
              }}>{e.name}</code>
              <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>{e.desc}</span>
            </div>
          ))}
        </div>

        {/* Integration examples */}
        <SectionTitle id="exemple">Exemple de integrare</SectionTitle>

        <h3 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: "16px 0 10px",
        }}>
          Node.js / TypeScript
        </h3>
        <CodeBlock>{`// Verifică dacă un sistem AI necesită Annex IV înainte de deploy
const res = await fetch("${baseUrl}/api/v1/clasifica", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scop: "support-chatbot" }),
})

const result = await res.json()

if (result.nivel_risc === "high_risk") {
  throw new Error(\`AI Act blocant: \${result.motiv}\`)
}

console.log(\`Risc: \${result.nivel_risc}, deadline: \${result.deadline}\`)`}</CodeBlock>

        <h3 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: "24px 0 10px",
        }}>
          Python
        </h3>
        <CodeBlock>{`import requests

# Clasifică un sistem AI înainte să-l pui în producție
response = requests.post(
    "${baseUrl}/api/v1/clasifica",
    json={"scop": "fraud-detection"},
    timeout=10
)
data = response.json()

print(f"Nivel risc: {data['nivel_risc']}")
print(f"Articol: {data['articol']}")
print(f"Deadline: {data.get('deadline') or 'N/A'}")

for obligatie in data["obligatii"]:
    print(f"  - {obligatie}")`}</CodeBlock>

        <h3 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: "24px 0 10px",
        }}>
          GitHub Actions (compliance gate pe PR)
        </h3>
        <CodeBlock>{`# .github/workflows/ai-act-check.yml
name: CompliRoAI Compliance Gate
on: [pull_request]

jobs:
  classify:
    runs-on: ubuntu-latest
    steps:
      - name: Verifică clasificarea AI
        run: |
          RESPONSE=$(curl -s -X POST ${baseUrl}/api/v1/clasifica \\
            -H "Content-Type: application/json" \\
            -d '{"scop": "hr-screening"}')
          RISC=$(echo $RESPONSE | jq -r '.nivel_risc')
          if [ "$RISC" = "prohibited" ]; then
            echo "❌ Sistem AI INTERZIS conform Art. 5"
            exit 1
          fi
          echo "✓ Risc: $RISC"`}</CodeBlock>

        {/* CORS */}
        <SectionTitle id="cors">CORS & limitări</SectionTitle>
        <Paragraph>
          API-ul permite cereri <strong style={{ color: "var(--ink)" }}>din orice origine</strong> (browsere, servere, CI/CD).
        </Paragraph>
        <ul style={{ fontSize: "14px", color: "var(--ink-muted)", lineHeight: 1.8, paddingLeft: "20px", margin: "0 0 16px" }}>
          <li>Rate limit: <InlineCode>60 cereri/minut/IP</InlineCode> (header <InlineCode>X-RateLimit-Remaining</InlineCode>)</li>
          <li>Răspuns cache-able 24h (<InlineCode>Cache-Control: public, max-age=86400</InlineCode>)</li>
          <li>Method-uri permise: <InlineCode>POST</InlineCode>, <InlineCode>OPTIONS</InlineCode></li>
          <li>Fără autentificare necesară pentru v1</li>
        </ul>

        {/* Pricing/upgrade */}
        <SectionTitle id="urmatorii-pasi">Vrei mai mult decât clasificare?</SectionTitle>
        <Paragraph>
          API-ul public clasifică un sistem AI. Pentru complete: <strong style={{ color: "var(--ink)" }}>generare Annex IV,
          înregistrare EU Database, tracker AI Literacy (Art. 4) și raport conformitate</strong> —{" "}
          <Link href="/login" style={{ color: "var(--cobalt-400)", textDecoration: "none" }}>creează cont gratuit</Link>.
        </Paragraph>

        {/* Footer */}
        <div style={{
          marginTop: "64px",
          paddingTop: "24px",
          borderTop: "1px solid var(--border)",
          fontSize: "12px",
          color: "var(--ink-dim)",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
        }}>
          <Link href="/" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Acasă</Link>
          <Link href="/terms" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Termeni</Link>
          <Link href="/privacy" style={{ color: "var(--ink-dim)", textDecoration: "none" }}>Confidențialitate</Link>
          <span style={{ marginLeft: "auto" }}>© 2026 CompliRoAI</span>
        </div>
      </main>
    </div>
  )
}
