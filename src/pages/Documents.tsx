import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { DocumentTemplate, DocumentType } from "@/components/DocumentTemplate";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Printer } from "lucide-react";

const docTypes: { key: DocumentType; label: string }[] = [
  { key: "devis", label: "Devis" },
  { key: "bon-commande", label: "Bon de Commande" },
  { key: "bon-livraison", label: "Bon de Livraison" },
  { key: "facture", label: "Facture" },
  { key: "avoir", label: "Avoir" },
];

const sampleLines = [
  { ref: "ART-001", description: "Produit exemple A", qty: 10, unitPrice: 150.0, tva: 20 },
  { ref: "ART-002", description: "Service exemple B", qty: 5, unitPrice: 300.0, tva: 20 },
  { ref: "ART-003", description: "Produit exemple C", qty: 2, unitPrice: 1200.0, tva: 20 },
];

const sampleClient = {
  name: "Client Exemple SA",
  address: "456 Rue Hassan II, Rabat, Maroc",
  ice: "009876543000012",
};

const Documents = () => {
  const [activeType, setActiveType] = useState<DocumentType>("facture");
  const { settings } = useCompanySettings();

  return (
    <AppLayout title="Documents" subtitle="Modèles de documents commerciaux">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 no-print">
        {docTypes.map((dt) => (
          <button
            key={dt.key}
            onClick={() => setActiveType(dt.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === dt.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {dt.label}
          </button>
        ))}
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Printer className="h-4 w-4" />
          Imprimer / PDF
        </button>
      </div>

      {/* Document preview */}
      <DocumentTemplate
        type={activeType}
        docNumber={`${activeType.toUpperCase().slice(0, 3)}-2024-0001`}
        date="18/02/2026"
        client={sampleClient}
        lines={sampleLines}
        notes="Conditions de paiement : 30 jours fin de mois. Validité du devis : 30 jours."
        company={settings}
      />
    </AppLayout>
  );
};

export default Documents;
