import { Eye } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function HumanOversightPage() {
  return (
    <ComingSoonPage
      title="Protocoale Oversight uman"
      icon={Eye}
      sprintNumber={17}
      targetCopy="iulie 2026"
      legalReference="Art. 14 Regulament (UE) 2024/1689 — Supraveghere umană pentru sistemele AI high-risk"
      description="Pentru fiecare sistem AI high-risk vei putea defini un protocol concret de oversight: cine este responsabil, cum se escalează un caz, cum se contestă o decizie automată, ce procedură de stop/fallback se aplică. Modulul generează checklist evidentă pe care un auditor o poate verifica direct."
      bullets={[
        "Definire protocol oversight per sistem AI (responsabil + backup)",
        "Workflow escalare pe nivele (operator → manager → DPO)",
        "Mecanism de contestare a deciziilor automate pentru persoanele afectate",
        "Procedură stop/fallback documentată (când se oprește sistemul, cine decide)",
        "Checklist evidență per auditor + integrare în Audit Pack",
        "Finding automat dacă lipsește protocolul pentru un sistem high-risk",
      ]}
    />
  )
}
