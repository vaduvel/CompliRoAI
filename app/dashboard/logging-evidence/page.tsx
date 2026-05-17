import { Activity } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function LoggingEvidencePage() {
  return (
    <ComingSoonPage
      title="Evidență logging"
      icon={Activity}
      sprintNumber={18}
      targetCopy="august 2026"
      legalReference="Art. 12 Regulament (UE) 2024/1689 — Cerințe de logging pentru sistemele AI high-risk"
      description="Sistemele AI high-risk trebuie să genereze loguri suficiente pentru a permite trasabilitatea funcționării lor pe întreaga durată de viață. Modulul te ajută să declari ce loguri colectezi pentru fiecare sistem, să încarci dovezi (samples, scheme, retention policy) și să gestionezi retenția conform Art. 19."
      bullets={[
        "Definire requirements logging per sistem (event types, retenție minimă, format)",
        "Upload evidență (sample loguri, scheme JSON/XML, politici de retenție)",
        "Verificare automată că retention durata respectă cerințele Art. 19",
        "Export loguri/evidență către autoritate la cerere",
        "Finding automat dacă lipsește dovada logging pentru un sistem high-risk",
        "Integrare cu Post-Market Monitoring pentru analiza incidentelor",
      ]}
    />
  )
}
