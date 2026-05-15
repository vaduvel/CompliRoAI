import Link from "next/link"
import { SiteNav } from "@/components/marketing/site-nav"

export const metadata = {
  title: "Politica de Confidențialitate",
  description: "Cum colectăm, utilizăm și protejăm datele personale pe platforma AI Act Compliance.",
}

const h2: React.CSSProperties = {
  fontFamily: "var(--font-display-v3)",
  fontSize: 18,
  fontWeight: 600,
  color: "var(--ink-strong)",
  marginTop: 32,
  marginBottom: 10,
}

const p: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "var(--ink-muted)",
  margin: "0 0 12px",
}

const ul: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: "var(--ink-muted)",
  margin: "0 0 12px",
  paddingLeft: 20,
}

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body-v3)",
      }}
    >
      <SiteNav />
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div
          style={{
            background: "var(--amber-soft)",
            border: "1px solid rgba(251, 191, 36, 0.25)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            color: "var(--amber-400)",
            marginBottom: 32,
          }}
        >
          Acest document este o versiune draft. Pentru consultanță juridică, contactează un avocat.
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink-strong)",
            margin: 0,
          }}
        >
          Politica de Confidențialitate
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-dim)" }}>
          Ultima actualizare: 15 mai 2026
        </p>

        <section style={{ marginTop: 24 }}>
          <h2 style={h2}>1. Operatorul de Date</h2>
          <p style={p}>
            Operatorul datelor cu caracter personal este entitatea care operează platforma AI Act
            Compliance, cu sediul în România. Contact:{" "}
            <a href="mailto:privacy@aiact-compliance.ro" style={{ color: "var(--cobalt-400)" }}>
              privacy@aiact-compliance.ro
            </a>
            .
          </p>

          <h2 style={h2}>2. Categorii de Date Prelucrate</h2>
          <ul style={ul}>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Date de cont:</strong> adresă email,
              parolă (hash), nume organizație, CUI.
            </li>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Date de utilizare:</strong> logs de
              acces, IP, browser, acțiuni în aplicație.
            </li>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Date de conformitate:</strong>{" "}
              sistemele AI înregistrate, răspunsurile la evaluări, documente generate — aceste
              date aparțin utilizatorului.
            </li>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Date de facturare:</strong> procesate
              integral de furnizorul de plăți — nu stocăm date de card.
            </li>
          </ul>

          <h2 style={h2}>3. Scopurile Prelucrării</h2>
          <ul style={ul}>
            <li>Furnizarea și îmbunătățirea Serviciului</li>
            <li>Autentificarea și securizarea conturilor</li>
            <li>Facturarea și gestionarea abonamentelor</li>
            <li>Comunicări de serviciu (notificări, digest)</li>
            <li>Respectarea obligațiilor legale</li>
          </ul>

          <h2 style={h2}>4. Temeiurile Juridice (Art. 6 GDPR)</h2>
          <ul style={ul}>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Executarea contractului</strong> (Art.
              6(1)(b)) — pentru furnizarea Serviciului
            </li>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Consimțământ</strong> (Art. 6(1)(a)) —
              pentru emailuri de marketing (opțional)
            </li>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Obligație legală</strong> (Art.
              6(1)(c)) — pentru facturare și arhivare fiscală
            </li>
            <li>
              <strong style={{ color: "var(--ink-strong)" }}>Interes legitim</strong> (Art.
              6(1)(f)) — pentru securitate și detectarea fraudei
            </li>
          </ul>

          <h2 style={h2}>5. Destinatari și Transferuri</h2>
          <p style={p}>
            Datele pot fi accesate de subprocesori contractuali, toți cu sediul în UE sau cu
            garanții adecvate (SCC). Lista actualizată a subprocesorilor este disponibilă în{" "}
            <Link href="/dpa" style={{ color: "var(--cobalt-400)" }}>
              DPA
            </Link>
            .
          </p>

          <h2 style={h2}>6. Retenție</h2>
          <p style={p}>
            Datele de cont se păstrează pe durata contractului și 3 ani după închiderea contului
            (obligații fiscale). Datele de utilizare anonimizate pot fi păstrate nedefinit în
            scopuri statistice.
          </p>

          <h2 style={h2}>7. Drepturile Tale (Art. 15–22 GDPR)</h2>
          <p style={p}>
            Ai dreptul la: acces, rectificare, ștergere, portabilitate, restricționare, opoziție
            și retragerea consimțământului. Cereri la:{" "}
            <a href="mailto:privacy@aiact-compliance.ro" style={{ color: "var(--cobalt-400)" }}>
              privacy@aiact-compliance.ro
            </a>
            .
          </p>
          <p style={p}>
            Ai dreptul să depui plângere la ANSPDCP (Autoritatea Națională de Supraveghere a
            Prelucrării Datelor cu Caracter Personal).
          </p>

          <h2 style={h2}>8. Cookie-uri</h2>
          <p style={p}>
            Serviciul folosește cookie-uri strict necesare (sesiune autentificare) și, cu
            consimțământul tău, cookie-uri analitice. Nu folosim cookie-uri de tracking de la
            terți în absența consimțământului explicit.
          </p>

          <h2 style={h2}>9. Contact DPO</h2>
          <p style={p}>
            Pentru întrebări legate de protecția datelor:{" "}
            <a href="mailto:dpo@aiact-compliance.ro" style={{ color: "var(--cobalt-400)" }}>
              dpo@aiact-compliance.ro
            </a>
            .
          </p>
        </section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--ink-muted)", textDecoration: "none" }}>
            ← Înapoi la pagina principală
          </Link>
        </div>
      </main>
    </div>
  )
}
