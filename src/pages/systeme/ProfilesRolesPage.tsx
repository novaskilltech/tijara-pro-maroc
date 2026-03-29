import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useRolesManagement } from "@/hooks/useRolesManagement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Pencil, Trash2, Shield, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import type { Role } from "@/hooks/usePermissions";

const MODULE_LABELS: Record<string, string> = {
  admin: "Administration",
  purchase: "Achats",
  stock: "Stock",
  sales: "Ventes",
  invoicing: "Facturation",
  treasury: "Trésorerie",
  dashboard: "Tableaux de Bord",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Créer", READ: "Voir", UPDATE: "Modifier", DELETE: "Supprimer",
  VALIDATE: "Valider", APPROVE: "Approuver", CANCEL: "Annuler",
  EXPORT: "Exporter", PRINT: "Imprimer", VIEW_DASHBOARD: "Dashboard",
};

const SCOPE_LABELS: Record<string, string> = {
  ALL: "Tous", OWN: "Propres", ASSIGNED: "Assignés", COMPANY_ONLY: "Société",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  READ: "bg-blue-100 text-blue-700 border-blue-200",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-red-100 text-red-700 border-red-200",
  VALIDATE: "bg-violet-100 text-violet-700 border-violet-200",
  APPROVE: "bg-purple-100 text-purple-700 border-purple-200",
  CANCEL: "bg-orange-100 text-orange-700 border-orange-200",
  EXPORT: "bg-teal-100 text-teal-700 border-teal-200",
  PRINT: "bg-cyan-100 text-cyan-700 border-cyan-200",
  VIEW_DASHBOARD: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export default function ProfilesRolesPage() {
  const {
    roles, permissions, rolePermissions, loading,
    createRole, updateRole, deleteRole, togglePermission,
    updateRolePermission, hasPermission, permissionsByResource, getRolePermissions,
  } = useRolesManagement();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleDialog, setRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);

  const MODULES = ["admin", "purchase", "stock", "sales", "invoicing", "treasury", "dashboard"];

  const handleSaveRole = async () => {
    if (!editingRole) return;
    let ok;
    if (editingRole.id) {
      ok = await updateRole(editingRole.id, editingRole);
    } else {
      ok = await createRole(editingRole);
    }
    if (ok) setRoleDialog(false);
  };

  const openNewRole = () => {
    setEditingRole({ name_fr: "", name_ar: "", code: "", module: "admin", is_active: true });
    setRoleDialog(true);
  };

  const openEditRole = (role: Role) => {
    setEditingRole({ ...role });
    setRoleDialog(true);
  };

  const isValidatorRole = (code: string) => code.endsWith("_VALIDATOR");

  const rolesByModule = MODULES.reduce((acc, mod) => {
    acc[mod] = roles.filter((r) => r.module === mod);
    return acc;
  }, {} as Record<string, Role[]>);

  return (
    <AppLayout title="Profils & Rôles" subtitle="Gestion des rôles et permissions granulaires">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Rôles disponibles</h2>
            <Button size="sm" onClick={openNewRole}>
              <Plus className="h-4 w-4 mr-1" /> Nouveau rôle
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {MODULES.map((mod) => {
                const modRoles = rolesByModule[mod] || [];
                if (modRoles.length === 0) return null;
                return (
                  <div key={mod}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 px-1">
                      {MODULE_LABELS[mod]}
                    </p>
                    <div className="space-y-1">
                      {modRoles.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => setSelectedRole(role)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                            selectedRole?.id === role.id
                              ? "bg-primary/10 border-primary/30 shadow-sm"
                              : "bg-card border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isValidatorRole(role.code) ? (
                              <ShieldCheck className="h-4 w-4 text-violet-500 shrink-0" />
                            ) : (
                              <Shield className="h-4 w-4 text-primary shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{role.name_fr}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{role.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!role.is_active && <Badge variant="outline" className="text-[10px]">Inactif</Badge>}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditRole(role); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteRole(role.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions editor */}
        <div className="lg:col-span-2">
          {!selectedRole ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              <Shield className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Sélectionnez un rôle pour éditer ses permissions</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedRole.name_fr}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{selectedRole.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{MODULE_LABELS[selectedRole.module]}</Badge>
                  {isValidatorRole(selectedRole.code) && (
                    <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-200">Validateur</Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[520px]">
                <div className="p-5 space-y-6">
                  {Object.entries(permissionsByResource).map(([resource, perms]) => {
                    const hasAny = perms.some((p) => hasPermission(selectedRole.id, p.id));
                    return (
                      <div key={resource}>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-sm font-semibold text-foreground capitalize">{resource.replace("_", " ")}</h4>
                          {hasAny && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {perms.map((perm) => {
                            const active = hasPermission(selectedRole.id, perm.id);
                            const rp = rolePermissions.find(
                              (r) => r.role_id === selectedRole.id && r.permission_id === perm.id
                            );
                            return (
                              <div
                                key={perm.id}
                                onClick={() => togglePermission(selectedRole.id, perm.id, rp?.scope || "COMPANY_ONLY", rp?.requires_validation || false)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${
                                  active
                                    ? `${ACTION_COLORS[perm.action] || "bg-primary/10 text-primary border-primary/20"} border`
                                    : "bg-muted/30 border-border hover:bg-muted/60 text-muted-foreground"
                                }`}
                              >
                                {active ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 shrink-0 opacity-40" />
                                )}
                                <span className="text-xs font-medium">{ACTION_LABELS[perm.action] || perm.action}</span>
                                {rp?.requires_validation && (
                                  <ShieldCheck className="h-3 w-3 ml-auto shrink-0 text-violet-500" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Scope selector for permissions of this resource */}
                        {hasAny && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">Portée :</span>
                            {(["COMPANY_ONLY", "OWN", "ASSIGNED", "ALL"] as string[]).map((scope) => {
                              const firstRp = rolePermissions.find(
                                (r) => r.role_id === selectedRole.id && perms.some((p) => p.id === r.permission_id)
                              );
                              const isSelected = firstRp?.scope === scope;
                              return (
                                <button
                                  key={scope}
                                  onClick={async () => {
                                    const toUpdate = rolePermissions.filter(
                                      (r) => r.role_id === selectedRole.id && perms.some((p) => p.id === r.permission_id)
                                    );
                                    for (const rp of toUpdate) {
                                      await updateRolePermission(rp.id, { scope });
                                    }
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                                    isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"
                                  }`}
                                >
                                  {SCOPE_LABELS[scope]}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Role create/edit dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole?.id ? "Modifier le rôle" : "Nouveau rôle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom FR</Label>
                <Input
                  value={editingRole?.name_fr || ""}
                  onChange={(e) => setEditingRole((prev) => ({ ...prev!, name_fr: e.target.value }))}
                  placeholder="ex: Acheteur"
                />
              </div>
              <div>
                <Label>Nom AR</Label>
                <Input
                  value={editingRole?.name_ar || ""}
                  onChange={(e) => setEditingRole((prev) => ({ ...prev!, name_ar: e.target.value }))}
                  placeholder="ex: مشتري"
                  dir="rtl"
                />
              </div>
            </div>
            <div>
              <Label>Code unique</Label>
              <Input
                value={editingRole?.code || ""}
                onChange={(e) => setEditingRole((prev) => ({ ...prev!, code: e.target.value.toUpperCase() }))}
                placeholder="ex: PURCHASE_USER"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Module</Label>
              <Select
                value={editingRole?.module || "admin"}
                onValueChange={(v) => setEditingRole((prev) => ({ ...prev!, module: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MODULE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={editingRole?.is_active ?? true}
                onCheckedChange={(v) => setEditingRole((prev) => ({ ...prev!, is_active: v }))}
              />
              <Label>Rôle actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveRole}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
