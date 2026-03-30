import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Administration",
  systeme: "Administration",
  utilisateurs: "Utilisateurs & Rôles",
  societe: "Paramètres Société",
  parametres: "Paramètres Système",
  logs: "Logs d'activité",
  achats: "Achats",
  demandes: "Demandes d'achat",
  commandes: "Bons de commande",
  receptions: "Réceptions",
  stock: "Stock",
  niveaux: "Niveaux de stock",
  transferts: "Transferts",
  inventaires: "Inventaires",
  produits: "Produits",
  depots: "Dépôts",
  ventes: "Ventes",
  devis: "Devis",
  livraisons: "Bons de livraison",
  clients: "Clients",
  fournisseurs: "Fournisseurs",
  facturation: "Facturation",
  avoirs: "Avoirs",
  exports: "Exports & Journaux",
  reglements: "Règlements & Trésorerie",
  encaissements: "Encaissements",
  decaissements: "Décaissements",
  rapprochement: "Rapprochement",
  impayes: "Impayés & Relances",
  "comptes-bancaires": "Comptes Bancaires",
  caisses: "Caisses",
  "tableaux-de-bord": "Tableaux de Bord & Analyses",
  documents: "Documents",
  referentiel: "Référentiel",
};

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/home" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const label = routeLabels[segment] || segment;
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
