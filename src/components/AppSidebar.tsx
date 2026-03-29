import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCompany } from "@/hooks/useCompany";
import {
  Settings,
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  FileText,
  Wallet,
  BarChart3,
  ChevronDown,
  Menu,
  Users,
  Building2,
  Cog,
  ClipboardList,
  Database,
  Warehouse,
  UserCheck,
  Landmark,
  CreditCard,
  FileCheck,
  Truck,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Link2,
  AlertTriangle,
  ArrowRightLeft,
  ClipboardCheck,
  Activity,
  ReceiptText,
  BarChart2,
  ScrollText,
  ShieldCheck,
  Tag,
  SlidersHorizontal,
  Clock,
  Percent,
  Building,
  Coins,
  Ruler,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions, PermissionResource } from "@/hooks/usePermissions";
import logo from "@/assets/logo-tijarapro-white.png";

interface SubItem {
  title: string;
  icon: any;
  path: string;
  resource?: PermissionResource;
}

interface SidebarSection {
  label: string;
  icon: any;
  basePath: string;
  adminOnly?: boolean;
  moduleKey?: string;
  subItems: SubItem[];
}

const sections: SidebarSection[] = [
  {
    label: "Tableaux de Bord",
    icon: BarChart3,
    basePath: "/tableaux-de-bord",
    moduleKey: "dashboard",
    subItems: [],
  },
  {
    label: "Achats",
    icon: ShoppingCart,
    basePath: "/achats",
    moduleKey: "purchase",
    subItems: [
      { title: "Demandes d'achat", icon: FileCheck, path: "/achats/demandes", resource: "purchase_orders" },
      { title: "Bons de commande", icon: ScrollText, path: "/achats/commandes", resource: "purchase_orders" },
      { title: "Dépenses", icon: TrendingDown, path: "/achats/depenses", resource: "payments" },
    ],
  },
  {
    label: "Stock",
    icon: Package,
    basePath: "/stock",
    moduleKey: "stock",
    subItems: [
      { title: "Niveaux de stock", icon: Activity, path: "/stock/niveaux", resource: "products" },
      { title: "Réceptions", icon: Package, path: "/stock/receptions", resource: "stock_moves" },
      { title: "Livraisons", icon: Truck, path: "/stock/livraisons", resource: "stock_moves" },
      { title: "Transferts", icon: ArrowRightLeft, path: "/stock/transferts", resource: "stock_moves" },
      { title: "Inventaires", icon: ClipboardCheck, path: "/stock/inventaires", resource: "stock_moves" },
    ],
  },
  {
    label: "Ventes",
    icon: TrendingUp,
    basePath: "/ventes",
    moduleKey: "sales",
    subItems: [
      { title: "Devis", icon: FileText, path: "/ventes/devis", resource: "sales_orders" },
      { title: "Commandes clients", icon: ScrollText, path: "/ventes/commandes", resource: "sales_orders" },
    ],
  },
  {
    label: "Facturation",
    icon: Receipt,
    basePath: "/facturation",
    moduleKey: "invoicing",
    subItems: [
      { title: "Factures clients", icon: ReceiptText, path: "/facturation/clients", resource: "invoices" },
      { title: "Factures fournisseurs", icon: ReceiptText, path: "/facturation/fournisseurs", resource: "invoices" },
      { title: "Avoirs", icon: ArrowDownCircle, path: "/facturation/avoirs", resource: "invoices" },
      { title: "Exports & Journaux", icon: BarChart2, path: "/facturation/exports", resource: "invoices" },
    ],
  },
  {
    label: "Règlements",
    icon: Wallet,
    basePath: "/reglements",
    moduleKey: "treasury",
    subItems: [
      { title: "Encaissements", icon: ArrowDownCircle, path: "/reglements/encaissements", resource: "payments" },
      { title: "Décaissements", icon: ArrowUpCircle, path: "/reglements/decaissements", resource: "payments" },
      { title: "Rapprochement", icon: Link2, path: "/reglements/rapprochement", resource: "bank_deposits" },
      { title: "Impayés", icon: AlertTriangle, path: "/reglements/impayes", resource: "payments" },
    ],
  },
  {
    label: "Configurations",
    icon: SlidersHorizontal,
    basePath: "/config",
    moduleKey: "admin",
    subItems: [
      { title: "Catégories", icon: Tag, path: "/config/categories", resource: "products" },
      { title: "Conditions de Paiement", icon: Clock, path: "/config/conditions-paiement", resource: "sales_orders" },
      { title: "Unités de Mesure", icon: Ruler, path: "/config/unites-mesure", resource: "products" },
      { title: "Liste des TVA", icon: Percent, path: "/config/tva", resource: "invoices" },
      { title: "Banques", icon: Building, path: "/config/banques", resource: "bank_deposits" },
      { title: "Devises", icon: Coins, path: "/config/devises", resource: "dashboard" },
    ],
  },
  {
    label: "Référentiels",
    icon: Database,
    basePath: "/referentiel",
    subItems: [
      { title: "Clients", icon: UserCheck, path: "/referentiel/clients", resource: "customers" },
      { title: "Fournisseurs", icon: Truck, path: "/referentiel/fournisseurs", resource: "suppliers" },
      { title: "Produits", icon: Package, path: "/referentiel/produits", resource: "products" },
      { title: "Dépôts", icon: Warehouse, path: "/referentiel/depots", resource: "stock_moves" },
      { title: "Comptes Bancaires", icon: Landmark, path: "/referentiel/comptes-bancaires", resource: "bank_deposits" },
      { title: "Caisses", icon: CreditCard, path: "/referentiel/caisses", resource: "payments" },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    basePath: "/systeme",
    adminOnly: true,
    moduleKey: "admin",
    subItems: [
      { title: "Vue d'ensemble", icon: BarChart3, path: "/home" },
      { title: "Utilisateurs", icon: Users, path: "/systeme/utilisateurs" },
      { title: "Profils & Rôles", icon: ShieldCheck, path: "/systeme/profils" },
      { title: "Gestion des Sociétés", icon: Building2, path: "/systeme/societes" },
      { title: "Paramètres Société", icon: Building2, path: "/systeme/societe" },
      { title: "Paramètres Système", icon: Cog, path: "/systeme/parametres" },
      { title: "Conception", icon: SlidersHorizontal, path: "/systeme/conception" },
      { title: "Logs d'activité", icon: ClipboardList, path: "/systeme/logs" },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const [openSection, setOpenSection] = useState<string | null>(() => {
    const path = window.location.pathname;
    const active = sections.find(s => s.subItems.length > 0 && (
      s.basePath === "/systeme"
        ? (path === "/" || path.startsWith("/systeme"))
        : path.startsWith(s.basePath)
    ));
    return active?.label ?? null;
  });
  const { roles } = useAuth();
  const { activeCompany } = useCompany();
  const isSuperAdmin = roles.includes("super_admin");

  // Sync open section when route changes via sub-link click
  useEffect(() => {
    const active = sections.find(s => s.subItems.length > 0 && (
      s.basePath === "/systeme"
        ? (location.pathname === "/" || location.pathname.startsWith("/systeme"))
        : location.pathname.startsWith(s.basePath)
    ));
    if (active) setOpenSection(active.label);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const isSectionActive = (section: SidebarSection) => {
    if (section.basePath === "/systeme") {
      return location.pathname === "/home" || location.pathname.startsWith("/systeme");
    }
    return location.pathname.startsWith(section.basePath);
  };

  const { can, canAccessModule } = usePermissions();

  const hasAccess = (section: SidebarSection) => {
    // Super admins always have access
    if (isSuperAdmin) return true;
    
    // Check module-level access if defined
    if (section.moduleKey) {
      return canAccessModule(section.moduleKey);
    }

    // Default to true for sections without moduleKey (will be filtered by subItems anyway)
    return true;
  };

  const hasSubItemAccess = (sub: SubItem) => {
    if (isSuperAdmin) return true;
    if (sub.resource) {
      return can("READ", sub.resource);
    }
    return true;
  };

  const toggleSection = (label: string) => {
    if (collapsed) return;
    setOpenSection(prev => prev === label ? null : label);
  };

  const isOpen = (section: SidebarSection) => openSection === section.label;

  const activeItemClass = "bg-gradient-to-r from-[rgba(38,182,231,0.2)] to-[rgba(38,182,231,0.08)] text-white border-l-[3px] border-[hsl(197,100%,53%)] shadow-[0_0_10px_rgba(38,182,231,0.12)]";
  const inactiveItemClass = "text-[hsl(210,20%,72%)] hover:bg-gradient-to-r hover:from-[rgba(38,182,231,0.12)] hover:to-[rgba(38,182,231,0.03)] hover:text-white border-l-[3px] border-transparent";

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo TijaraPro */}
      <div className="flex items-center justify-center px-5 py-5 border-b border-white/[0.08]">
        {!collapsed && (
          <img src={logo} alt="TijaraPro" className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(38,182,231,0.35)]" />
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_rgba(38,182,231,0.25)]"
            style={{ background: "linear-gradient(135deg, hsl(197,90%,50%), hsl(208,60%,30%))" }}>
            T
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto scrollbar-thin">
        {sections.map((section) => {
          if (!hasAccess(section)) return null;
          if (section.adminOnly && !isSuperAdmin) return null;

          // For sections with sub-items, check if at least one is accessible
          const accessibleSubItems = section.subItems.filter(hasSubItemAccess);
          if (section.subItems.length > 0 && accessibleSubItems.length === 0) return null;

          const sectionIsOpen = isOpen(section);
          const sectionActive = isSectionActive(section);
          const Icon = section.icon;

          // Simple link (no sub-items) like Tableaux de Bord
          if (section.subItems.length === 0) {
            return (
              <Link
                key={section.label}
                to={section.basePath}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200
                  ${sectionActive ? activeItemClass : inactiveItemClass}
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? section.label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{section.label}</span>}
              </Link>
            );
          }

          // Collapsible section
          return (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 w-full
                  ${sectionActive ? activeItemClass : inactiveItemClass}
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? section.label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{section.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-in-out ${sectionIsOpen ? "rotate-180" : ""}`} />
                  </>
                )}
              </button>

              {!collapsed && (
                <div
                  className="ml-4 border-l border-white/[0.08] pl-3 overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: sectionIsOpen ? `${section.subItems.length * 34 + 6}px` : "0px",
                    opacity: sectionIsOpen ? 1 : 0,
                    marginTop: sectionIsOpen ? "4px" : "0px",
                  }}
                >
                  <div className="space-y-0.5">
                  {accessibleSubItems.map(sub => {
                      const SubIcon = sub.icon;
                      const subActive = sub.path === "/" ? location.pathname === "/" : isActive(sub.path);
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200
                            ${subActive ? "bg-white/[0.1] text-white" : "text-[hsl(210,20%,65%)] hover:bg-white/[0.06] hover:text-white"}
                          `}
                        >
                          <SubIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{sub.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer: active company logo */}
      {!collapsed && activeCompany?.logo_url && (
        <div className="px-4 py-3 border-t border-white/[0.08] shrink-0">
          <div className="w-full flex items-center justify-center rounded-xl bg-white/[0.05] px-3 py-2.5 overflow-hidden">
            <img
              src={activeCompany.logo_url}
              alt={activeCompany.raison_sociale}
              className="w-full max-h-10 object-contain object-center opacity-80 hover:opacity-100 transition-opacity duration-200"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-md bg-secondary text-secondary-foreground shadow-card"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-foreground/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`} />

      <aside
        className={`
          fixed z-50 top-0 left-0 h-screen text-white
          transition-all duration-300 flex flex-col shrink-0
          overflow-y-auto overflow-x-hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "w-16" : "w-64"}
        `}
        style={{
          background: `
            radial-gradient(circle at 10% 5%, rgba(38,182,231,0.08), transparent 40%),
            linear-gradient(180deg, #0B2A45 0%, #0F2E4D 35%, #163E63 70%, #1A4B78 100%)
          `,
          boxShadow: "inset -1px 0 0 0 rgba(255,255,255,0.04), 3px 0 24px -6px rgba(0,0,0,0.3)",
          height: "100vh",
          minHeight: "100vh",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
