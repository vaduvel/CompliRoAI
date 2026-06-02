import Link from "next/link"
import { SiteNav } from "@/components/marketing/site-nav"

export const metadata = {
  title: "Acord de Prelucrare a Datelor (DPA)",
  description: "Acordul de prelucrare a datelor (Art. 28 GDPR) pentru utilizatorii CompliRoAI.",
}

export default function DpaPage() {
  return (
    <div className="cr-legal-page">
      <SiteNav />
      <main className="cr-legal-main">
        <div className="cr-legal-notice">
          Document informativ al platformei CompliRoAI. Pentru interpretare juridică aplicată
          situației tale, validează cu avocatul sau consultantul tău.
        </div>

        <h1 className="cr-legal-title">
          Acord de Prelucrare a Datelor (DPA)
        </h1>
        <p className="cr-legal-meta">
          Ultima actualizare: 15 mai 2026 · Art. 28 GDPR
        </p>

        <section className="cr-legal-content">
          <p>
            Prezentul Acord de Prelucrare a Datelor („DPA&rdquo;) se aplică automat tuturor
            utilizatorilor CompliRoAI care, prin utilizarea Serviciului, acționează în
            calitate de operatori de date conform GDPR și implică operatorul platformei în
            calitate de persoană împuternicită (procesator).
          </p>

          <h2>1. Definiții</h2>
          <ul>
            <li>
              <strong>Operator:</strong> organizația utilizatoare a Serviciului (clientul).
            </li>
            <li>
              <strong>Procesator:</strong> entitatea care operează CompliRoAI.
            </li>
            <li>
              <strong>Date Personale:</strong> orice date cu caracter personal introduse de
              Operator în Serviciu.
            </li>
            <li>
              <strong>GDPR:</strong> Regulamentul (UE) 2016/679.
            </li>
          </ul>

          <h2>2. Obiectul, Durata și Natura Prelucrării</h2>
          <p>
            Procesatorul prelucrează datele introduse de Operator exclusiv pentru furnizarea
            funcționalităților Serviciului: stocare AI Inventory, calcul clasificare risc,
            generare Annex IV, export JSON pentru EU Database, evidență training AI Literacy.
            DPA este valabil pe durata contractului de servicii.
          </p>

          <h2>3. Categoriile de Date și Subiecți</h2>
          <ul>
            <li>Date de identificare angajați (pentru evidența training-ului AI Literacy)</li>
            <li>Date de contact (email, telefon) ale persoanelor de contact</li>
            <li>Date operaționale (sisteme AI, evaluări de risc, dovezi de conformitate)</li>
          </ul>

          <h2>4. Instrucțiunile Operatorului</h2>
          <p>
            Procesatorul prelucrează datele conform instrucțiunilor documentate ale Operatorului,
            transmise prin interfața Serviciului. Dacă o instrucțiune încalcă GDPR, Procesatorul
            va notifica Operatorul înainte de executare.
          </p>

          <h2>5. Obligațiile Procesatorului (Art. 28(3) GDPR)</h2>
          <ul>
            <li>Confidențialitate: accesul personalului la datele Operatorului este limitat și documentat</li>
            <li>Securitate: măsuri tehnice și organizatorice conform Art. 32 GDPR</li>
            <li>Sub-procesori: notificare prealabilă cu 30 de zile la adăugarea de noi sub-procesori</li>
            <li>Asistență: sprijin pentru exercitarea drepturilor persoanelor vizate</li>
            <li>Ștergere: ștergerea sau returnarea datelor la finalizarea contractului</li>
            <li>Audit: informații și acces pentru verificarea conformității</li>
          </ul>

          <h2>6. Sub-procesori</h2>
          <p>
            Procesatorul utilizează sub-procesori contractuali pentru hosting, email tranzacțional
            și procesare plăți, toți cu sediul în UE sau cu garanții adecvate (SCC). Lista
            completă este disponibilă la cerere la{" "}
            <a href="mailto:dpo@compliro.ai">
              dpo@compliro.ai
            </a>
            .
          </p>

          <h2>7. Transferuri Internaționale</h2>
          <p>
            Transferurile de date în afara SEE se realizează exclusiv pe baza Clauzelor
            Contractuale Standard (SCC) aprobate de Comisia Europeană sau a altor mecanisme de
            transfer adecvate.
          </p>

          <h2>8. Notificare Incidente</h2>
          <p>
            Procesatorul va notifica Operatorul fără întârzieri nejustificate, și în cel mult 72
            de ore de la constatare, în cazul unui incident de securitate care afectează datele
            Operatorului.
          </p>

          <h2>9. Drepturile Părților</h2>
          <p>
            Operatorul rămâne responsabil pentru baza legală a prelucrării și pentru informarea
            persoanelor vizate. Procesatorul asistă Operatorul în îndeplinirea cererilor privind
            drepturile prevăzute la Art. 15–22 GDPR (acces, rectificare, ștergere, portabilitate,
            restricționare, opoziție).
          </p>

          <h2>10. Durata și Ștergerea</h2>
          <p>
            La terminarea contractului, Procesatorul va șterge sau returna datele în termen de 30
            de zile, conform opțiunii Operatorului, cu excepția datelor pe care le păstrează în
            baza unei obligații legale.
          </p>

          <h2>11. Contact DPO</h2>
          <p>
            Pentru exercitarea drepturilor sau solicitări DPA:{" "}
            <a href="mailto:dpo@compliro.ai">
              dpo@compliro.ai
            </a>
            .
          </p>
        </section>

        <div className="cr-legal-footer">
          <Link href="/">
            ← Înapoi la pagina principală
          </Link>
        </div>
      </main>
    </div>
  )
}
