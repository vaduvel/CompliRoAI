import { ShieldAlert } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function FRIAPage() {
  return (
    <ComingSoonPage
      title="FRIA — Fundamental Rights Impact Assessment"
      icon={ShieldAlert}
      sprintNumber={16}
      targetCopy="iunie 2026"
      legalReference="Art. 27 Regulament (UE) 2024/1689 — Evaluarea impactului asupra drepturilor fundamentale pentru sistemele AI high-risk în context deployer"
      description="FRIA este obligatorie pentru anumiți deployeri de sisteme AI high-risk (organisme publice, entități care prestează servicii publice, anumiți operatori privați din sectoare sensibile). Modulul va trigger-ui automat o evaluare când un sistem AI clasificat ca high-risk este înrolat în inventar pentru un deployer cu profil eligibil."
      bullets={[
        "Trigger automat din Inventar AI când scenario-ul high-risk se aplică",
        "Identificare persoane afectate (categorii, volumetrie, vulnerabilitate)",
        "Evaluare impact pe drepturi fundamentale (demnitate, non-discriminare, viață privată, libertate de expresie)",
        "Plan de mitigare cu măsuri tehnice + organizaționale",
        "Workflow review uman + aprobare DPO/responsabil",
        "Inclus automat în Audit Pack ZIP cu hash chain",
      ]}
    />
  )
}
