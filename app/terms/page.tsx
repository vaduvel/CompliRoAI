import Link from "next/link"
import { SiteNav } from "@/components/marketing/site-nav"

export const metadata = {
  title: "Termeni și Condiții",
  description: "Termenii și condițiile de utilizare ale platformei AI Act Compliance.",
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

export default function TermsPage() {
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
          Termeni și Condiții de Utilizare
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-dim)" }}>
          Ultima actualizare: 15 mai 2026
        </p>

        <section style={{ marginTop: 24 }}>
          <h2 style={h2}>1. Serviciul AI Act Compliance</h2>
          <p style={p}>
            AI Act Compliance (denumit în continuare „Serviciul&rdquo;) este un instrument digital
            de asistență în pregătirea conformității cu Regulamentul (UE) 2024/1689 privind
            inteligența artificială (EU AI Act). Serviciul este operat din România.
          </p>

          <h2 style={h2}>2. Natura Serviciului — Disclamer Juridic</h2>
          <p style={p}>
            <strong style={{ color: "var(--ink-strong)" }}>
              AI Act Compliance NU oferă consultanță juridică.
            </strong>{" "}
            Conținutul generat de Serviciu — inclusiv documente Annex IV, JSON-uri pentru EU
            Database, clasificări de risc și recomandări — reprezintă instrumente de asistență
            și pregătire, nu avize juridice cu forță legală.
          </p>
          <p style={p}>
            Utilizatorii sunt responsabili pentru validarea finală a documentelor împreună cu un
            avocat sau consultant juridic calificat înainte de utilizare oficială. Serviciul nu
            garantează conformitatea deplină și nu se substituie consilierii juridice profesionale.
          </p>

          <h2 style={h2}>3. Eligibilitate și Conturi</h2>
          <p style={p}>
            Serviciul este destinat persoanelor juridice (societăți comerciale, ONG-uri, instituții
            publice) cu sediul sau activitate în Uniunea Europeană. Prin crearea unui cont,
            utilizatorul declară că are cel puțin 18 ani și autoritatea legală de a acționa în
            numele organizației.
          </p>

          <h2 style={h2}>4. Planuri și Facturare</h2>
          <p style={p}>
            Serviciul oferă o perioadă de trial gratuită de 14 zile, precum și planuri cu plată
            (Standard, Partner). Facturarea planurilor cu plată se realizează lunar. Prețurile
            afișate sunt în EUR și nu includ TVA, care se adaugă conform legislației aplicabile.
          </p>
          <p style={p}>
            La expirarea trial-ului, accesul la funcționalități este restricționat dacă nu a fost
            efectuată o plată.
          </p>

          <h2 style={h2}>5. Proprietate Intelectuală</h2>
          <p style={p}>
            Codul sursă, design-ul, algoritmii și modelele de date ale Serviciului sunt
            proprietatea operatorului platformei. Documentele generate de utilizator pe baza
            datelor proprii aparțin utilizatorului.
          </p>

          <h2 style={h2}>6. Protecția Datelor</h2>
          <p style={p}>
            Prelucrarea datelor cu caracter personal este descrisă în{" "}
            <Link href="/privacy" style={{ color: "var(--cobalt-400)" }}>
              Politica de Confidențialitate
            </Link>{" "}
            și în{" "}
            <Link href="/dpa" style={{ color: "var(--cobalt-400)" }}>
              Acordul de Prelucrare a Datelor (DPA)
            </Link>
            .
          </p>

          <h2 style={h2}>7. Limitarea Răspunderii</h2>
          <p style={p}>
            În măsura permisă de legea aplicabilă, AI Act Compliance nu este răspunzătoare pentru:
            decizii de afaceri luate pe baza informațiilor din Serviciu; amenzi, sancțiuni sau
            consecințe juridice rezultate din conformitate incompletă; pierderi indirecte sau
            daune consecvente.
          </p>

          <h2 style={h2}>8. Modificarea Termenilor</h2>
          <p style={p}>
            Operatorul poate modifica acești Termeni cu notificare de minim 30 de zile prin email
            sau în aplicație. Continuarea utilizării după notificare constituie acceptul noilor
            termeni.
          </p>

          <h2 style={h2}>9. Drept Aplicabil</h2>
          <p style={p}>
            Acești Termeni sunt guvernați de legea română. Litigiile se vor soluționa pe cale
            amiabilă sau, în caz de eșec, la instanțele competente din România.
          </p>

          <h2 style={h2}>10. Contact</h2>
          <p style={p}>
            Pentru întrebări juridice sau privind termenii:{" "}
            <a href="mailto:legal@aiact-compliance.ro" style={{ color: "var(--cobalt-400)" }}>
              legal@aiact-compliance.ro
            </a>
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
