// Sprint 023 — Public docs page for the /api/v1 developer surface.
// Server component — pure HTML+inline styles. No auth required.

import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "API & SDK CompliRoAI v1 — pentru AI Builders",
  description:
    "Documentație publică pentru CompliRoAI API v1: clasifică sisteme AI, primește verdict Compliance Gate (pass/review/blocked) și înregistrează deployments. SDK TypeScript zero-dep + exemple curl/Python/Node.",
}

export default function ApiDocsPage() {
  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <p style={breadcrumb}>
          <Link href="/" style={linkStyle}>← Acasă</Link>
          {" · "}
          <Link href="/docs" style={linkStyle}>Docs</Link>
          {" · "}
          API v1
        </p>
        <h1 style={h1Style}>API & SDK CompliRoAI · v1</h1>
        <p style={leadStyle}>
          Integrează CompliRoAI în pipeline-ul tău de build/deploy: clasifică
          sisteme AI conform EU AI Act, primește verdict Compliance Gate
          (<strong>pass</strong> / <strong>review_required</strong> / <strong>blocked</strong>) și
          înregistrează deployments cu emitere automată de findings când sunt
          identificate riscuri.
        </p>
        <p style={leadStyle}>
          API public stabil pe versiunea <code style={inlineCode}>v1</code>. Breaking
          changes vor fi publicate la <code style={inlineCode}>/api/v2</code> ulterior;
          v1 rămâne disponibilă forever.
        </p>
      </header>

      <Section title="Autentificare">
        <p>
          Toate endpoint-urile <strong>/api/v1/*</strong> (cu excepția{" "}
          <code style={inlineCode}>/health</code> și{" "}
          <code style={inlineCode}>/openapi</code>) necesită un API key în
          header-ul <code style={inlineCode}>Authorization</code>:
        </p>
        <pre style={preStyle}>
          <code>{`Authorization: Bearer cra_<32 hex chars>`}</code>
        </pre>
        <p>
          Generezi un key din <Link href="/dashboard/api-sdk" style={linkStyle}>/dashboard/api-sdk</Link>{" "}
          (necesită cont CompliRoAI cu workspace <em>AI Builder</em>). Token-ul
          este afișat <strong>o singură dată</strong> — salvează-l imediat.
        </p>
      </Section>

      <Section title="Rate limit">
        <p>
          60 cereri / minut / organizație / endpoint. Când limita este depășită
          primești <code style={inlineCode}>429 Too Many Requests</code> cu header{" "}
          <code style={inlineCode}>Retry-After</code> indicând câte secunde să
          aștepți.
        </p>
      </Section>

      <Section title="Endpoint-uri">
        <Endpoint
          method="POST"
          path="/api/v1/classify"
          scope="classify"
          summary="Clasifică un sistem AI (risc + obligații + rol AI Act)."
          requestExample={`{
  "systemName": "HR Screener",
  "purpose": "hr-screening",
  "sector": "hr",
  "humanOversightDocumented": true,
  "loggingEnabled": true,
  "processesPersonalData": true,
  "vendorRegion": "EU",
  "modelProvider": "OpenAI",
  "deploymentContext": "production",
  "dpaSigned": true
}`}
          responseExample={`{
  "systemName": "HR Screener",
  "riskClass": "high",
  "aiActArticle": "Annex III 4(a)",
  "aiActReason": "Sistem AI folosit în recrutare/selecție personal — high-risk Annex III.",
  "aiActDeadline": "2027-12-02",
  "aiActRole": "provider",
  "obligations": [
    { "article": "Art. 14 AI Act", "description": "Human oversight obligatoriu pentru sisteme high-risk." },
    { "article": "Art. 12 AI Act", "description": "Logging events sistem high-risk, min 6 luni retenție." }
  ],
  "nextActions": [],
  "apiVersion": "v1",
  "classifiedAtISO": "2026-05-18T12:00:00.000Z"
}`}
        />
        <Endpoint
          method="POST"
          path="/api/v1/gate"
          scope="gate"
          summary="Compliance Gate verdict: pass / review_required / blocked."
          requestExample={`{
  "systemName": "HR Screener",
  "purpose": "hr-screening",
  "humanOversightDocumented": false,
  "evidence": {
    "friaCompleted": false,
    "dpiaCompleted": false
  }
}`}
          responseExample={`{
  "verdict": "review_required",
  "riskClass": "high",
  "aiActRole": "deployer",
  "reasons": [
    {
      "category": "fria_required",
      "articleRef": "Art. 27 AI Act",
      "severity": "warning",
      "message": "Deployer al unui sistem high-risk — FRIA obligatorie înainte de deployment.",
      "nextAction": "Rulează FRIA în /dashboard/fria și atașează raportul ca dovadă."
    }
  ],
  "obligations": [
    { "article": "Art. 14 AI Act", "description": "...", "status": "missing" }
  ],
  "missingEvidence": [ "FRIA semnată Art. 27", "Human Oversight Protocol semnat (Art. 14)" ],
  "nextActions": [ "Completează FRIA pentru sistem (/dashboard/fria)" ],
  "auditPackHints": [ "Include FRIA în Audit Pack pentru 'HR Screener'." ],
  "apiVersion": "v1",
  "classifiedAtISO": "2026-05-18T12:00:00.000Z"
}`}
        />
        <Endpoint
          method="POST"
          path="/api/v1/deployment"
          scope="deployment"
          summary="Înregistrează un deployment. Emite finding pe verdict ≠ pass."
          requestExample={`{
  "systemName": "HR Screener",
  "purpose": "hr-screening",
  "deploymentRef": "git-sha-abc123",
  "humanOversightDocumented": true,
  "loggingEnabled": true
}`}
          responseExample={`{
  "deploymentRef": "git-sha-abc123",
  "systemName": "HR Screener",
  "gate": { ... ComplianceGateResponse complet ... },
  "findingEmitted": false,
  "apiVersion": "v1",
  "loggedAtISO": "2026-05-18T12:00:00.000Z"
}`}
        />
        <Endpoint
          method="GET"
          path="/api/v1/health"
          scope="public"
          summary="Health check public — verifică versiunea API-ului."
          requestExample="(no body)"
          responseExample={`{
  "ok": true,
  "version": "v1",
  "apiVersion": "v1",
  "docsUrl": "/docs/api",
  "openapiUrl": "/api/v1/openapi",
  "timestamp": "2026-05-18T12:00:00.000Z"
}`}
        />
        <Endpoint
          method="GET"
          path="/api/v1/openapi"
          scope="public"
          summary="OpenAPI 3.1 spec — folosește-o pentru a regenera SDK-uri."
          requestExample="(no body)"
          responseExample="(OpenAPI JSON conform 3.1)"
        />
      </Section>

      <Section title="SDK TypeScript">
        <p>
          Zero dependencies. Funcționează în Node 18+ și browsers. Distribuit
          inițial prin copy în repo-ul tău; pachet npm{" "}
          <code style={inlineCode}>@compliroai/client</code> va fi publicat în
          Sprint 24.
        </p>
        <h3 style={h3Style}>Install</h3>
        <pre style={preStyle}>
          <code>{`# Copiază lib/sdk/{client.ts,index.ts} în repo-ul tău,
# sau (Sprint 24+) instalează pachet npm:
# npm install @compliroai/client`}</code>
        </pre>
        <h3 style={h3Style}>Quickstart</h3>
        <pre style={preStyle}>
          <code>{`import { CompliRoAIClient } from "@compliroai/client"

const client = new CompliRoAIClient({
  apiKey: process.env.COMPLIROAI_KEY!,
})

const gate = await client.gate({
  systemName: "HR Screener",
  purpose: "hr-screening",
  humanOversightDocumented: true,
  loggingEnabled: true,
  processesPersonalData: true,
  dpaSigned: true,
})

if (gate.verdict === "blocked") {
  console.error("DEPLOYMENT BLOCAT:", gate.reasons)
  process.exit(1)
}

if (gate.verdict === "review_required") {
  console.warn("Review necesar:", gate.missingEvidence)
}`}</code>
        </pre>
      </Section>

      <Section title="Exemple curl / Python">
        <h3 style={h3Style}>curl</h3>
        <pre style={preStyle}>
          <code>{`curl -X POST $BASE_URL/api/v1/gate \\
  -H "Authorization: Bearer $COMPLIROAI_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"systemName":"HR Bot","purpose":"hr-screening","humanOversightDocumented":true}'`}</code>
        </pre>
        <h3 style={h3Style}>Python (stdlib urllib)</h3>
        <pre style={preStyle}>
          <code>{`import json, os, urllib.request

req = urllib.request.Request(
    "https://compliscanag.vercel.app/api/v1/gate",
    method="POST",
    headers={
        "Authorization": f"Bearer {os.environ['COMPLIROAI_KEY']}",
        "Content-Type": "application/json",
    },
    data=json.dumps({
        "systemName": "HR Bot",
        "purpose": "hr-screening",
        "humanOversightDocumented": True,
    }).encode(),
)
with urllib.request.urlopen(req) as res:
    gate = json.loads(res.read())

if gate["verdict"] != "pass":
    raise SystemExit(f"Gate failed: {gate['reasons'][0]['message']}")`}</code>
        </pre>
      </Section>

      <Section title="Verdict ladder & explainability">
        <p>
          Compliance Gate este <strong>determinist</strong> și{" "}
          <strong>explicabil</strong>. Verdict-ul este calculat din 10 reguli cu
          referințe la articole legale (Art. 5, Art. 14, Art. 27, GDPR Art. 28
          etc.) — fără scoring „magic" 0-100. Verdict-ul final este worst-wins
          peste toate regulile aplicabile.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>Verdict</Th>
              <Th>Semnificație</Th>
              <Th>CI/CD acțiune sugerată</Th>
            </tr>
          </thead>
          <tbody>
            <Tr verdict="pass" meaning="Toate obligațiile sunt acoperite sau non-applicable." action="Continuă deploymentul." />
            <Tr verdict="review_required" meaning="Lipsesc dovezi (FRIA / DPIA / DPA / transfer SCC etc.)." action="Continuă cu warning sau oprește pipeline pentru review uman." />
            <Tr verdict="blocked" meaning="Practică interzisă Art. 5 sau lipsă human oversight pe high-risk." action="Oprește deploymentul imediat. Genereză memo Art. 5(2) dacă există excepție." />
          </tbody>
        </table>
      </Section>

      <Section title="Versionare">
        <p>
          API-ul respectă <strong>semver simplificat</strong> pe path:
        </p>
        <ul style={ulStyle}>
          <li><code style={inlineCode}>/api/v1/*</code> este stabil — câmpurile existente nu sunt nici eliminate, nici redenumite.</li>
          <li>Câmpurile <em>opționale noi</em> pot fi adăugate fără bump (additive change).</li>
          <li>Breaking changes ship la <code style={inlineCode}>/api/v2</code> — v1 rămâne disponibilă cel puțin 12 luni după v2 GA.</li>
          <li><code style={inlineCode}>apiVersion</code> apare în orice response — verifică-l defensiv.</li>
        </ul>
      </Section>

      <footer style={footerStyle}>
        <Link href="/api/v1/openapi" style={linkStyle}>OpenAPI 3.1 spec JSON →</Link>
        {" · "}
        <Link href="/dashboard/api-sdk" style={linkStyle}>Dashboard API keys →</Link>
        {" · "}
        <Link href="/docs" style={linkStyle}>Docs index →</Link>
      </footer>
    </main>
  )
}

// ─── Components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={sectionStyle}>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
  )
}

function Endpoint({
  method,
  path,
  scope,
  summary,
  requestExample,
  responseExample,
}: {
  method: "GET" | "POST" | "DELETE"
  path: string
  scope: string
  summary: string
  requestExample: string
  responseExample: string
}) {
  return (
    <div style={endpointCardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <span style={{ ...methodBadge, ...(method === "POST" ? methodPOST : method === "DELETE" ? methodDELETE : methodGET) }}>
          {method}
        </span>
        <code style={{ ...inlineCode, fontSize: "14px" }}>{path}</code>
        <span style={{ fontSize: "11px", color: "#666", marginLeft: "auto" }}>scope: {scope}</span>
      </div>
      <p style={{ margin: "8px 0", color: "#444", fontSize: "14px" }}>{summary}</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "8px" }}>
        <div>
          <p style={labelStyle}>Request body</p>
          <pre style={preStyle}><code>{requestExample}</code></pre>
        </div>
        <div>
          <p style={labelStyle}>Response (200)</p>
          <pre style={preStyle}><code>{responseExample}</code></pre>
        </div>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "8px 12px",
        textAlign: "left",
        fontSize: "11px",
        textTransform: "uppercase",
        color: "#666",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {children}
    </th>
  )
}

function Tr({
  verdict,
  meaning,
  action,
}: {
  verdict: "pass" | "review_required" | "blocked"
  meaning: string
  action: string
}) {
  const colors = {
    pass: { bg: "#dcfce7", fg: "#166534" },
    review_required: { bg: "#fef3c7", fg: "#92400e" },
    blocked: { bg: "#fee2e2", fg: "#991b1b" },
  }
  return (
    <tr>
      <td style={tdStyle}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: "999px",
            background: colors[verdict].bg,
            color: colors[verdict].fg,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {verdict}
        </span>
      </td>
      <td style={tdStyle}>{meaning}</td>
      <td style={tdStyle}>{action}</td>
    </tr>
  )
}

// ─── Inline styles ───────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: "960px",
  margin: "0 auto",
  padding: "48px 24px 80px",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  color: "#1f2937",
  lineHeight: 1.6,
}

const headerStyle: React.CSSProperties = { marginBottom: "32px" }
const breadcrumb: React.CSSProperties = { color: "#6b7280", fontSize: "13px", margin: "0 0 16px" }
const h1Style: React.CSSProperties = { fontSize: "32px", fontWeight: 700, margin: "0 0 12px" }
const leadStyle: React.CSSProperties = { fontSize: "16px", color: "#4b5563", margin: "0 0 12px" }

const sectionStyle: React.CSSProperties = {
  marginTop: "32px",
  paddingTop: "20px",
  borderTop: "1px solid #e5e7eb",
}
const h2Style: React.CSSProperties = { fontSize: "20px", fontWeight: 700, margin: "0 0 12px" }
const h3Style: React.CSSProperties = { fontSize: "15px", fontWeight: 700, margin: "16px 0 8px", color: "#4b5563" }

const inlineCode: React.CSSProperties = {
  background: "#f3f4f6",
  padding: "1px 6px",
  borderRadius: "4px",
  fontFamily: "ui-monospace, SF Mono, monospace",
  fontSize: "13px",
}

const preStyle: React.CSSProperties = {
  background: "#0f172a",
  color: "#e2e8f0",
  borderRadius: "8px",
  padding: "16px 18px",
  overflow: "auto",
  fontSize: "12.5px",
  lineHeight: 1.55,
  fontFamily: "ui-monospace, SF Mono, monospace",
  margin: "8px 0",
}

const ulStyle: React.CSSProperties = {
  paddingLeft: "20px",
  color: "#374151",
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "12px",
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  overflow: "hidden",
}

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "13px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
}

const linkStyle: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 500,
}

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase",
  color: "#6b7280",
  letterSpacing: "0.05em",
  margin: "0 0 4px",
}

const endpointCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px 18px",
  marginBottom: "12px",
  background: "white",
}

const methodBadge: React.CSSProperties = {
  padding: "2px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 700,
  fontFamily: "ui-monospace, SF Mono, monospace",
}

const methodGET: React.CSSProperties = { background: "#dbeafe", color: "#1e40af" }
const methodPOST: React.CSSProperties = { background: "#dcfce7", color: "#166534" }
const methodDELETE: React.CSSProperties = { background: "#fee2e2", color: "#991b1b" }

const footerStyle: React.CSSProperties = {
  marginTop: "48px",
  paddingTop: "20px",
  borderTop: "1px solid #e5e7eb",
  color: "#6b7280",
  fontSize: "13px",
}
