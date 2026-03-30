import { createContext, useContext, useEffect, useState, ReactNode, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/hooks/useCompany";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { TextSizeProvider } from "@/contexts/TextSizeContext";
import { ViewportProvider } from "@/contexts/ViewportContext";


// Pages avec Lazy Loading
const Index = lazy(() => import("./pages/Index"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const TableauxDeBord = lazy(() => import("./pages/TableauxDeBord"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unauthorized = lazy(() => import("./pages/Unauthorized"));

// Legal
const TermsOfUse = lazy(() => import("./pages/legal/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));

// Auth
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const MFAChallenge = lazy(() => import("./pages/auth/MFAChallenge"));
const Profil = lazy(() => import("./pages/Profil"));

// Administration
const SystemeUtilisateurs = lazy(() => import("./pages/SystemeUtilisateurs"));
const SystemeSociete = lazy(() => import("./pages/SystemeSociete"));
const SystemeParametres = lazy(() => import("./pages/SystemeParametres"));
const SystemeLogs = lazy(() => import("./pages/SystemeLogs"));
const CompaniesPage = lazy(() => import("./pages/systeme/CompaniesPage"));
const ProfilesRolesPage = lazy(() => import("./pages/systeme/ProfilesRolesPage"));
const ConceptionPage = lazy(() => import("./pages/systeme/ConceptionPage"));
const TemplateEditorPage = lazy(() => import("./pages/systeme/TemplateEditorPage"));

// Référentiel
const ProductsPage = lazy(() => import("./pages/master/ProductsPage"));
const CustomersPage = lazy(() => import("./pages/master/CustomersPage"));
const SuppliersPage = lazy(() => import("./pages/master/SuppliersPage"));
const WarehousesPage = lazy(() => import("./pages/master/WarehousesPage"));
const BankAccountsPage = lazy(() => import("./pages/master/BankAccountsPage"));
const CashRegistersPage = lazy(() => import("./pages/CashRegistersPage"));

// Configurations
// const CategoriesPage = lazy(() => import("./pages/master/CategoriesPage"));
const CategoriesPage = () => <div>Categories Dummy</div>;
const PaymentTermsPage = lazy(() => import("./pages/config/PaymentTermsPage"));
const UnitsOfMeasurePage = lazy(() => import("./pages/config/UnitsOfMeasurePage"));
const TvaRatesPage = lazy(() => import("./pages/config/TvaRatesPage"));
const BanksPage = lazy(() => import("./pages/config/BanksPage"));
const CurrenciesPage = lazy(() => import("./pages/config/CurrenciesPage"));

// Achats
const DemandesAchat = lazy(() => import("./pages/achats/DemandesAchat"));
const CommandesFournisseurs = lazy(() => import("./pages/achats/CommandesFournisseurs"));
const Receptions = lazy(() => import("./pages/achats/Receptions"));

// Stock
const NiveauxStock = lazy(() => import("./pages/stock/NiveauxStock"));
const Transferts = lazy(() => import("./pages/stock/Transferts"));
const Inventaires = lazy(() => import("./pages/stock/Inventaires"));

// Ventes
const Devis = lazy(() => import("./pages/ventes/Devis"));
const CommandesClients = lazy(() => import("./pages/ventes/CommandesClients"));
const BonsLivraison = lazy(() => import("./pages/ventes/BonsLivraison"));

// Facturation
const FacturesClients = lazy(() => import("./pages/facturation/FacturesClients"));
const FacturesFournisseurs = lazy(() => import("./pages/facturation/FacturesFournisseurs"));
const Avoirs = lazy(() => import("./pages/facturation/Avoirs"));
const ExportsJournaux = lazy(() => import("./pages/facturation/ExportsJournaux"));

// Règlements
const Encaissements = lazy(() => import("./pages/reglements/Encaissements"));
const Decaissements = lazy(() => import("./pages/reglements/Decaissements"));
const Rapprochement = lazy(() => import("./pages/reglements/Rapprochement"));
const Impayes = lazy(() => import("./pages/reglements/Impayes"));

// Dépenses & Documents
const Depenses = lazy(() => import("./pages/Depenses"));
const Documents = lazy(() => import("./pages/Documents"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);


// Persistance manuelle du cache
const PERSIST_KEY = "TIJARAPRO_QUERY_CACHE";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Restaurer le cache au démarrage
const savedCache = localStorage.getItem(PERSIST_KEY);
if (savedCache) {
  try {
    const parsedCache = JSON.parse(savedCache);
    // Note: On pourrait utiliser queryClient.setQueryData pour chaque entrée, 
    // mais pour un ERP, on préfère laisser le fetch initial se faire pour la fraîcheur, 
    // sauf si on est hors-ligne.
    console.log("Cache restauré (metadata seulement pour cet exemple simple)");
  } catch (e) {
    console.error("Erreur restauration cache", e);
  }
}

// Sauvegarder le cache lors des changements (optionnel: limiter la fréquence)
queryClient.getQueryCache().subscribe(() => {
  // Optionnel: implémenter une persistance sélective pour éviter de saturer le localStorage
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="tijara-theme">
      <ViewportProvider>
      <TextSizeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
          <PermissionsProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/auth/mfa" element={<MFAChallenge />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Public routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                {/* Protected routes */}
                <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/tableaux-de-bord" element={<ProtectedRoute><TableauxDeBord /></ProtectedRoute>} />
                <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />

                {/* Administration */}
                <Route path="/systeme/utilisateurs" element={<ProtectedRoute requiredRoles={["super_admin"]}><SystemeUtilisateurs /></ProtectedRoute>} />
                <Route path="/systeme/societe" element={<ProtectedRoute requiredRoles={["super_admin", "admin"]}><SystemeSociete /></ProtectedRoute>} />
                <Route path="/systeme/societes" element={<ProtectedRoute requiredRoles={["super_admin"]}><CompaniesPage /></ProtectedRoute>} />
                <Route path="/systeme/profils" element={<ProtectedRoute requiredRoles={["super_admin"]}><ProfilesRolesPage /></ProtectedRoute>} />
                <Route path="/systeme/parametres" element={<ProtectedRoute requiredRoles={["super_admin", "admin"]}><SystemeParametres /></ProtectedRoute>} />
                <Route path="/systeme/logs" element={<ProtectedRoute requiredRoles={["super_admin", "admin"]}><SystemeLogs /></ProtectedRoute>} />
                <Route path="/systeme/conception" element={<ProtectedRoute requiredRoles={["super_admin", "admin"]}><ConceptionPage /></ProtectedRoute>} />
                <Route path="/systeme/conception/:type" element={<ProtectedRoute requiredRoles={["super_admin", "admin"]}><TemplateEditorPage /></ProtectedRoute>} />

                {/* Référentiel */}
                <Route path="/referentiel/clients" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                <Route path="/referentiel/fournisseurs" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
                <Route path="/referentiel/produits" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
                <Route path="/referentiel/depots" element={<ProtectedRoute><WarehousesPage /></ProtectedRoute>} />
                <Route path="/referentiel/comptes-bancaires" element={<ProtectedRoute><BankAccountsPage /></ProtectedRoute>} />
                <Route path="/referentiel/caisses" element={<ProtectedRoute><CashRegistersPage /></ProtectedRoute>} />

                {/* Configurations */}
                <Route path="/config/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
                <Route path="/config/conditions-paiement" element={<ProtectedRoute><PaymentTermsPage /></ProtectedRoute>} />
                <Route path="/config/unites-mesure" element={<ProtectedRoute><UnitsOfMeasurePage /></ProtectedRoute>} />
                <Route path="/config/tva" element={<ProtectedRoute><TvaRatesPage /></ProtectedRoute>} />
                <Route path="/config/banques" element={<ProtectedRoute><BanksPage /></ProtectedRoute>} />
                <Route path="/config/devises" element={<ProtectedRoute><CurrenciesPage /></ProtectedRoute>} />

                {/* Achats, Stock, Ventes, Facturation, Reglements */}
                <Route path="/achats" element={<Navigate to="/achats/demandes" replace />} />
                <Route path="/achats/demandes" element={<ProtectedRoute><DemandesAchat /></ProtectedRoute>} />
                <Route path="/achats/commandes" element={<ProtectedRoute><CommandesFournisseurs /></ProtectedRoute>} />
                <Route path="/achats/depenses" element={<ProtectedRoute><Depenses /></ProtectedRoute>} />

                <Route path="/stock/niveaux" element={<ProtectedRoute><NiveauxStock /></ProtectedRoute>} />
                <Route path="/stock/transferts" element={<ProtectedRoute><Transferts /></ProtectedRoute>} />
                <Route path="/stock/receptions" element={<ProtectedRoute><Receptions /></ProtectedRoute>} />
                <Route path="/stock/livraisons" element={<ProtectedRoute><BonsLivraison /></ProtectedRoute>} />
                <Route path="/stock/inventaires" element={<ProtectedRoute><Inventaires /></ProtectedRoute>} />

                <Route path="/ventes/devis" element={<ProtectedRoute><Devis /></ProtectedRoute>} />
                <Route path="/ventes/commandes" element={<ProtectedRoute><CommandesClients /></ProtectedRoute>} />
                <Route path="/ventes/livraisons" element={<ProtectedRoute><BonsLivraison /></ProtectedRoute>} />

                <Route path="/facturation/clients" element={<ProtectedRoute><FacturesClients /></ProtectedRoute>} />
                <Route path="/facturation/fournisseurs" element={<ProtectedRoute><FacturesFournisseurs /></ProtectedRoute>} />
                <Route path="/facturation/avoirs" element={<ProtectedRoute><Avoirs /></ProtectedRoute>} />
                <Route path="/facturation/exports" element={<ProtectedRoute><ExportsJournaux /></ProtectedRoute>} />

                <Route path="/reglements/encaissements" element={<ProtectedRoute><Encaissements /></ProtectedRoute>} />
                <Route path="/reglements/decaissements" element={<ProtectedRoute><Decaissements /></ProtectedRoute>} />
                <Route path="/reglements/rapprochement" element={<ProtectedRoute><Rapprochement /></ProtectedRoute>} />
                <Route path="/reglements/impayes" element={<ProtectedRoute><Impayes /></ProtectedRoute>} />

                <Route path="/depenses" element={<ProtectedRoute><Depenses /></ProtectedRoute>} />
                <Route path="/achats/receptions" element={<ProtectedRoute><Receptions /></ProtectedRoute>} />

                <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </PermissionsProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </TextSizeProvider>
    </ViewportProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
