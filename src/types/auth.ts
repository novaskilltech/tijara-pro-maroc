// Local type definitions for auth until Supabase types regenerate
export type AppRole = 'super_admin' | 'admin' | 'accountant' | 'sales' | 'stock_manager' | 'purchase';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  accountant: "Comptable",
  sales: "Commercial",
  stock_manager: "Gestionnaire Stock",
  purchase: "Acheteur",
};

// Module access mapping
export const ROLE_MODULE_ACCESS: Record<string, AppRole[]> = {
  "/": ["super_admin", "admin", "accountant", "sales", "stock_manager"],
  "/tableaux-de-bord": ["super_admin", "admin"],
  "/referentiel": ["super_admin", "admin", "accountant", "sales", "stock_manager"],
  "/achats": ["super_admin", "admin", "accountant", "purchase"],
  "/achats/demandes": ["super_admin", "admin", "accountant", "purchase"],
  "/achats/commandes": ["super_admin", "admin", "accountant", "purchase"],
  "/achats/receptions": ["super_admin", "admin", "accountant", "stock_manager", "purchase"],
  "/stock": ["super_admin", "admin", "stock_manager"],
  "/stock/niveaux": ["super_admin", "admin", "stock_manager"],
  "/stock/mouvements": ["super_admin", "admin", "stock_manager"],
  "/stock/transferts": ["super_admin", "admin", "stock_manager"],
  "/stock/inventaires": ["super_admin", "admin", "stock_manager"],
  "/ventes": ["super_admin", "admin", "sales"],
  "/ventes/devis": ["super_admin", "admin", "sales"],
  "/ventes/commandes": ["super_admin", "admin", "sales"],
  "/ventes/livraisons": ["super_admin", "admin", "sales", "stock_manager"],
  "/facturation": ["super_admin", "admin", "accountant"],
  "/facturation/clients": ["super_admin", "admin", "accountant"],
  "/facturation/fournisseurs": ["super_admin", "admin", "accountant"],
  "/facturation/avoirs": ["super_admin", "admin", "accountant"],
  "/facturation/exports": ["super_admin", "admin", "accountant"],
  "/reglements": ["super_admin", "admin", "accountant"],
  "/reglements/encaissements": ["super_admin", "admin", "accountant"],
  "/reglements/decaissements": ["super_admin", "admin", "accountant"],
  "/reglements/rapprochement": ["super_admin", "admin", "accountant"],
  "/reglements/impayes": ["super_admin", "admin", "accountant"],
  "/depenses": ["super_admin", "admin", "accountant"],
  "/config": ["super_admin", "admin"],
  "/config/categories": ["super_admin", "admin"],
  "/config/conditions-paiement": ["super_admin", "admin"],
  "/config/unites-mesure": ["super_admin", "admin"],
  "/config/tva": ["super_admin", "admin"],
  "/config/banques": ["super_admin", "admin"],
  "/config/devises": ["super_admin", "admin"],
  "/documents": ["super_admin", "admin", "accountant", "sales"],
  "/systeme/utilisateurs": ["super_admin"],
  "/systeme/societe": ["super_admin", "admin"],
  "/systeme/parametres": ["super_admin", "admin"],
  "/systeme/logs": ["super_admin", "admin"],
  "/systeme/conception": ["super_admin", "admin"],
};

/**
 * Returns the first route that a user with the given roles can access.
 */
export function getFirstAccessibleRoute(roles: AppRole[]): string {
  const orderedRoutes = [
    "/tableaux-de-bord",
    "/referentiel/clients",
    "/achats/demandes",
    "/stock/niveaux",
    "/ventes/devis",
    "/facturation/clients",
    "/reglements/encaissements",
    "/depenses",
    "/config/categories",
    "/documents",
  ];
  for (const route of orderedRoutes) {
    const allowedRoles = ROLE_MODULE_ACCESS[route];
    if (!allowedRoles || allowedRoles.some((r) => roles.includes(r))) {
      return route;
    }
  }
  return "/";
}
