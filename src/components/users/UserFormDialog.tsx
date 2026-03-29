import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCompany, type Company } from "@/hooks/useCompany";
import { Loader2, User, Shield, ShieldCheck, Building2, KeyRound, Mail } from "lucide-react";
import type { ManagedUser } from "@/hooks/useUserManagement";
import type { AppRole } from "@/types/auth";

// Functional profile groups matching roles table
const FUNCTIONAL_PROFILES = [
  { module: "purchase", label: "Achat", userCode: "PURCHASE_USER", validatorCode: "PURCHASE_VALIDATOR" },
  { module: "stock", label: "Stock", userCode: "STOCK_USER", validatorCode: "STOCK_VALIDATOR" },
  { module: "sales", label: "Vente", userCode: "SALES_USER", validatorCode: "SALES_VALIDATOR" },
  { module: "invoicing", label: "Facturation", userCode: "INVOICING_USER", validatorCode: "INVOICING_VALIDATOR" },
  { module: "treasury", label: "Règlements & Trésorerie", userCode: "TREASURY_USER", validatorCode: "TREASURY_VALIDATOR" },
];

const GLOBAL_ROLES: { value: AppRole; label: string; requiresSuperAdmin: boolean }[] = [
  { value: "super_admin", label: "Super Admin", requiresSuperAdmin: true },
  { value: "admin", label: "Admin", requiresSuperAdmin: true },
  { value: "accountant", label: "Comptable", requiresSuperAdmin: false },
  { value: "sales", label: "Commercial", requiresSuperAdmin: false },
  { value: "stock_manager", label: "Gestionnaire Stock", requiresSuperAdmin: false },
  { value: "purchase", label: "Acheteur", requiresSuperAdmin: false },
];

interface RoleEntry {
  id: string;
  code: string;
  name_fr: string;
  module: string;
}

interface ProfileSelection {
  module: string;
  enabled: boolean;
  level: "user" | "validator";
}

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "create" | "edit" | "duplicate";
  user?: ManagedUser | null;
}

export function UserFormDialog({ open, onClose, onSuccess, mode, user }: UserFormDialogProps) {
  const { hasRole } = useAuth();
  const { companies } = useCompany();
  const isSuperAdmin = hasRole("super_admin");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [useInvite, setUseInvite] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [globalRole, setGlobalRole] = useState<AppRole | "">("sales");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileSelection[]>(
    FUNCTIONAL_PROFILES.map((p) => ({ module: p.module, enabled: false, level: "user" as const }))
  );
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load roles from DB
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("roles" as any).select("id, code, name_fr, module");
      if (data) setRoles(data as unknown as RoleEntry[]);
    })();
  }, [open]);

  // Populate form for edit/duplicate
  useEffect(() => {
    if (!open) {
      // Reset on close
      setFullName(""); setEmail(""); setPhone(""); setPassword("");
      setUseInvite(true); setIsActive(true); setGlobalRole("sales");
      setSelectedCompanyIds([]); setErrors({});
      setProfiles(FUNCTIONAL_PROFILES.map((p) => ({ module: p.module, enabled: false, level: "user" as const })));
      return;
    }

    if ((mode === "edit" || mode === "duplicate") && user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setIsActive(mode === "duplicate" ? true : user.is_active);
      
      if (mode === "edit") {
        setEmail(user.email);
      } else {
        setEmail(""); // Duplicate must get new email
      }

      // Set global role from legacy roles
      const legacyRole = user.roles.find((r) => GLOBAL_ROLES.some((gr) => gr.value === r));
      setGlobalRole(legacyRole || "sales");

      // Load user's functional roles and companies
      loadUserDetails(user.user_id);
    }
  }, [open, mode, user]);

  const loadUserDetails = async (userId: string) => {
    const [rolesRes, companiesRes] = await Promise.all([
      supabase.from("user_roles" as any).select("role_id, roles(code, module)").eq("user_id", userId),
      supabase.from("user_companies" as any).select("company_id").eq("user_id", userId),
    ]);

    // Map functional roles to profile selections
    const userRoleCodes = ((rolesRes.data || []) as any[])
      .filter((r: any) => r.roles?.code)
      .map((r: any) => r.roles.code as string);

    const newProfiles = FUNCTIONAL_PROFILES.map((fp) => {
      const hasValidator = userRoleCodes.includes(fp.validatorCode);
      const hasUser = userRoleCodes.includes(fp.userCode);
      return {
        module: fp.module,
        enabled: hasUser || hasValidator,
        level: (hasValidator ? "validator" : "user") as "user" | "validator",
      };
    });
    setProfiles(newProfiles);

    // Map companies
    const companyIds = ((companiesRes.data || []) as any[]).map((c: any) => c.company_id);
    setSelectedCompanyIds(companyIds);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) errs.fullName = "Le nom complet est requis";
    if (!email.trim()) {
      errs.email = "L'adresse email est requise";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Adresse email invalide";
    }

    if (mode === "create" || mode === "duplicate") {
      if (!useInvite && !password.trim()) {
        errs.password = "Le mot de passe est requis";
      } else if (!useInvite && password.length < 8) {
        errs.password = "Le mot de passe doit contenir au moins 8 caractères";
      }
    }

    if (mode !== "duplicate") {
      const enabledProfiles = profiles.filter((p) => p.enabled);
      if (enabledProfiles.length === 0) {
        errs.profiles = "Veuillez sélectionner au moins un profil";
      }
    }

    // Check validator requires at least one profile
    const hasValidatorWithoutProfile = profiles.some((p) => p.level === "validator" && !p.enabled);
    // This is fine - validator level only applies to enabled profiles

    // Prevent role escalation
    if (!isSuperAdmin && (globalRole === "super_admin" || globalRole === "admin")) {
      errs.globalRole = "Action non autorisée";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      // Build role_ids from profile selections
      const roleIds: string[] = [];
      for (const profile of profiles) {
        if (!profile.enabled) continue;
        const fp = FUNCTIONAL_PROFILES.find((f) => f.module === profile.module)!;
        const code = profile.level === "validator" ? fp.validatorCode : fp.userCode;
        const role = roles.find((r) => r.code === code);
        if (role) roleIds.push(role.id);
      }

      if (mode === "create" || mode === "duplicate") {
        const { data, error } = await supabase.functions.invoke("manage-user", {
          body: {
            action: "create",
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            password: useInvite ? null : password,
            is_active: isActive,
            global_role: globalRole || null,
            role_ids: roleIds,
            company_ids: selectedCompanyIds,
            ...(mode === "duplicate" && user ? { source_user_id: user.user_id } : {}),
          },
        });

        if (error || data?.error) {
          const msg = data?.error || error?.message || "Erreur lors de la création";
          console.error("[manage-user] Error:", msg, { error, data });
          if (msg.includes("existe déjà")) {
            setErrors({ email: "Cette adresse email existe déjà" });
          } else {
            toast({
              title: "Erreur",
              description: mode === "duplicate"
                ? "Une erreur est survenue lors de la duplication. Veuillez réessayer."
                : msg,
              variant: "destructive",
            });
          }
          setSaving(false);
          return;
        }

        toast({
          title: mode === "duplicate" ? "Utilisateur dupliqué avec succès" : "Utilisateur créé avec succès",
        });
      } else {
        // Edit mode
        const { data, error } = await supabase.functions.invoke("manage-user", {
          body: {
            action: "update",
            target_user_id: user!.user_id,
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            is_active: isActive,
            global_role: globalRole || null,
            role_ids: roleIds,
            company_ids: selectedCompanyIds,
          },
        });

        if (error || data?.error) {
          toast({ title: "Erreur", description: data?.error || error?.message, variant: "destructive" });
          setSaving(false);
          return;
        }

        toast({ title: "Utilisateur modifié avec succès" });
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleProfile = (module: string) => {
    setProfiles((prev) =>
      prev.map((p) => p.module === module ? { ...p, enabled: !p.enabled } : p)
    );
    setErrors((prev) => ({ ...prev, profiles: "" }));
  };

  const setProfileLevel = (module: string, level: "user" | "validator") => {
    setProfiles((prev) =>
      prev.map((p) => p.module === module ? { ...p, level } : p)
    );
  };

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId]
    );
  };

  const title = mode === "create" ? "Ajouter un utilisateur" : mode === "edit" ? "Modifier l'utilisateur" : "Dupliquer l'utilisateur";

  return (
    <Dialog open={open} onOpenChange={() => !saving && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" && "Renseignez les informations du nouvel utilisateur."}
            {mode === "edit" && "Modifiez les informations de l'utilisateur."}
            {mode === "duplicate" && "Un nouvel utilisateur sera créé avec les mêmes profils et rôles. Une nouvelle adresse email est requise."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Section: Informations générales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4" /> Informations générales
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nom complet *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: "" })); }}
                    placeholder="Ex: Ahmed Benali"
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                    placeholder="utilisateur@entreprise.ma"
                    disabled={mode === "edit"}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06 XX XX XX XX"
                  />
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
                  <Label htmlFor="isActive">Utilisateur actif</Label>
                </div>
              </div>

              {/* Password section for create/duplicate */}
              {(mode === "create" || mode === "duplicate") && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Méthode d'accès</Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={useInvite}
                        onChange={() => setUseInvite(true)}
                        className="accent-primary"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> Envoyer un email d'invitation
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!useInvite}
                        onChange={() => setUseInvite(false)}
                        className="accent-primary"
                      />
                      <span className="text-sm">Mot de passe temporaire</span>
                    </label>
                  </div>
                  {!useInvite && (
                    <div className="space-y-1.5">
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                        placeholder="Mot de passe temporaire (min. 6 caractères)"
                      />
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Section: Sociétés */}
            {companies.length > 0 && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Société(s) assignée(s)
                    {mode === "duplicate" && <Badge variant="outline" className="text-[10px]">Copié — non modifiable</Badge>}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {companies.map((company) => (
                      <label
                        key={company.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                          selectedCompanyIds.includes(company.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        } ${mode === "duplicate" ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
                      >
                        <Checkbox
                          checked={selectedCompanyIds.includes(company.id)}
                          onCheckedChange={() => toggleCompany(company.id)}
                          disabled={mode === "duplicate"}
                        />
                        <span className="text-sm">{company.raison_sociale}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Section: Profils fonctionnels */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Profils fonctionnels
                {mode === "duplicate" && <Badge variant="outline" className="text-[10px]">Copié — non modifiable</Badge>}
              </h3>
              <p className="text-xs text-muted-foreground">
                {mode === "duplicate" ? "Les profils sont copiés de l'utilisateur source. Modifiables après création via \"Modifier\"." : "Sélectionnez les modules accessibles et le niveau de droit pour chacun."}
              </p>
              {errors.profiles && <p className="text-xs text-destructive">{errors.profiles}</p>}

              <div className="space-y-2">
                {FUNCTIONAL_PROFILES.map((fp) => {
                  const profile = profiles.find((p) => p.module === fp.module)!;
                  return (
                    <div
                      key={fp.module}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        profile.enabled ? "border-primary/50 bg-primary/5" : "border-border"
                      } ${mode === "duplicate" ? "pointer-events-none opacity-70" : ""}`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <Checkbox
                          checked={profile.enabled}
                          onCheckedChange={() => toggleProfile(fp.module)}
                          disabled={mode === "duplicate"}
                        />
                        <span className="text-sm font-medium">{fp.label}</span>
                      </label>

                      {profile.enabled && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setProfileLevel(fp.module, "user")}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                              profile.level === "user"
                                ? "bg-secondary text-secondary-foreground border-secondary"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            Utilisateur simple
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileLevel(fp.module, "validator")}
                            className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                              profile.level === "validator"
                                ? "bg-violet-100 text-violet-700 border-violet-300"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" /> Validateur
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Section: Rôle global */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Rôle global
                {mode === "duplicate" && <Badge variant="outline" className="text-[10px]">Copié — non modifiable</Badge>}
              </h3>
              <p className="text-xs text-muted-foreground">
                {mode === "duplicate" ? "Le rôle global est copié de l'utilisateur source." : "Le rôle global détermine le niveau d'accès système de l'utilisateur."}
              </p>
              {errors.globalRole && <p className="text-xs text-destructive">{errors.globalRole}</p>}

              <Select
                value={globalRole || ""}
                onValueChange={(v) => { setGlobalRole(v as AppRole); setErrors((p) => ({ ...p, globalRole: "" })); }}
                disabled={mode === "duplicate"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle global" />
                </SelectTrigger>
                <SelectContent>
                  {GLOBAL_ROLES.map((role) => (
                    <SelectItem
                      key={role.value}
                      value={role.value}
                      disabled={role.requiresSuperAdmin && !isSuperAdmin}
                    >
                      <span className="flex items-center gap-2">
                        {role.label}
                        {role.requiresSuperAdmin && !isSuperAdmin && (
                          <span className="text-[10px] text-muted-foreground">(Super Admin requis)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === "create" ? "Créer l'utilisateur" : mode === "edit" ? "Enregistrer" : "Dupliquer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
