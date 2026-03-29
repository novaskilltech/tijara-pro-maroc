import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useUserManagement, ManagedUser } from "@/hooks/useUserManagement";
import { useAuth } from "@/hooks/useAuth";
import { useRolesManagement, useUserRoles } from "@/hooks/useRolesManagement";
import { useCompany } from "@/hooks/useCompany";
import { ROLE_LABELS, type AppRole } from "@/types/auth";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { ChangePasswordDialog } from "@/components/users/ChangePasswordDialog";
import {
  Search, Shield, RotateCcw, UserCheck, UserX, Loader2, Users, Trash2,
  Plus, ShieldCheck, Globe, Building2, CheckCircle2, XCircle, ShieldAlert,
  MoreHorizontal, Eye, Pencil, Copy, KeyRound,
} from "lucide-react";

const ALL_ROLES: AppRole[] = ["super_admin", "admin", "accountant", "sales", "stock_manager"];

const MODULE_LABELS: Record<string, string> = {
  admin: "Administration", purchase: "Achats", stock: "Stock",
  sales: "Ventes", invoicing: "Facturation", treasury: "Trésorerie", dashboard: "Tableaux de Bord",
};

// Effective permission matrix for a user (union of all their role permissions)
function EffectivePermissionsMatrix({ userId }: { userId: string }) {
  const { userRoles } = useUserRoles(userId);
  const { roles, permissions, rolePermissions, permissionsByResource } = useRolesManagement();

  const userRoleIds = userRoles.map((ur: any) => ur.role_id).filter(Boolean);
  const effectiveRp = rolePermissions.filter((rp) => userRoleIds.includes(rp.role_id));
  const effectivePermIds = new Set(effectiveRp.map((rp) => rp.permission_id));

  const ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE", "VALIDATE", "APPROVE", "CANCEL", "EXPORT", "PRINT"];
  const ACTION_LABELS: Record<string, string> = {
    CREATE: "Créer", READ: "Voir", UPDATE: "Modifier", DELETE: "Supprimer",
    VALIDATE: "Valider", APPROVE: "Approuver", CANCEL: "Annuler", EXPORT: "Exporter", PRINT: "Imprimer",
  };

  const resources = Object.keys(permissionsByResource);

  return (
    <ScrollArea className="h-80">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 bg-muted/50 font-semibold text-foreground sticky left-0">Ressource</th>
            {ACTIONS.map((a) => (
              <th key={a} className="py-2 px-1 bg-muted/50 font-semibold text-center text-muted-foreground" title={ACTION_LABELS[a]}>
                {ACTION_LABELS[a]?.slice(0, 4)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource} className="border-t border-border">
              <td className="py-1.5 px-3 font-medium text-foreground capitalize sticky left-0 bg-card">
                {resource.replace("_", " ")}
              </td>
              {ACTIONS.map((action) => {
                const perm = permissionsByResource[resource]?.find((p) => p.action === action);
                const has = perm ? effectivePermIds.has(perm.id) : false;
                return (
                  <td key={action} className="py-1.5 px-1 text-center">
                    {perm ? (
                      has ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mx-auto" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground/20">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

// User roles assignment panel (view-only detail)
function UserRolesPanel({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const { userRoles, isValidator, loading } = useUserRoles(user.user_id);
  const { roles } = useRolesManagement();
  const [tab, setTab] = useState("roles");

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="roles" className="flex-1">Rôles assignés</TabsTrigger>
          <TabsTrigger value="matrix" className="flex-1">Matrice permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type :</span>
            {isValidator ? (
              <Badge className="gap-1 bg-violet-100 text-violet-700 border-violet-200 border">
                <ShieldCheck className="h-3 w-3" /> Validateur
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" /> Utilisateur simple
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : userRoles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">Aucun rôle assigné</div>
          ) : (
            <div className="space-y-2">
              {userRoles.map((ur: any) => (
                <div key={ur.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-2">
                    {ur.roles?.code?.endsWith("_VALIDATOR") ? (
                      <ShieldCheck className="h-4 w-4 text-violet-500" />
                    ) : (
                      <Shield className="h-4 w-4 text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{ur.roles?.name_fr || ur.role || "—"}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{ur.roles?.code || ur.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {ur.company_id ? (
                        <><Building2 className="h-2.5 w-2.5" /> Société</>
                      ) : (
                        <><Globe className="h-2.5 w-2.5" /> Global</>
                      )}
                    </Badge>
                    {ur.is_primary && <Badge variant="secondary" className="text-[10px]">Principal</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="mt-3">
          <p className="text-xs text-muted-foreground mb-3">
            Permissions effectives — union de tous les rôles pour la société active
          </p>
          <EffectivePermissionsMatrix userId={user.user_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================
const SystemeUtilisateurs = () => {
  const { users, loading, toggleActive, setRole, resetPassword, deleteUser, fetch: refetchUsers } = useUserManagement();
  const { hasRole, user: currentUser } = useAuth();
  const { companies } = useCompany();
  const isSuperAdmin = hasRole("super_admin");
  const isAdmin = hasRole("admin") || isSuperAdmin;

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [rolesDialogUser, setRolesDialogUser] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "duplicate">("create");
  const [formUser, setFormUser] = useState<ManagedUser | null>(null);

  // Password dialog state
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? u.is_active : !u.is_active);
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.user_id);
    setDeleteTarget(null);
  };

  const openForm = (mode: "create" | "edit" | "duplicate", user?: ManagedUser) => {
    setFormMode(mode);
    setFormUser(user || null);
    setFormOpen(true);
  };

  // Load user companies for display
  const [userCompaniesMap, setUserCompaniesMap] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (companies.length === 0) return;
    (async () => {
      const { supabase: sb } = await import("@/integrations/supabase/client");
      const { data } = await sb
        .from("user_companies" as any)
        .select("user_id, company_id");
      if (data) {
        const map: Record<string, string[]> = {};
        (data as any[]).forEach((uc: any) => {
          if (!map[uc.user_id]) map[uc.user_id] = [];
          const company = companies.find((c) => c.id === uc.company_id);
          if (company) map[uc.user_id].push(company.raison_sociale);
        });
        setUserCompaniesMap(map);
      }
    })();
  }, [companies]);

  return (
    <AppLayout title="Utilisateurs & Rôles" subtitle="Gestion des utilisateurs, profils et permissions">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par nom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button onClick={() => openForm("create")} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter un utilisateur
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {users.length} utilisateurs</span>
          <span className="flex items-center gap-1"><UserCheck className="h-4 w-4 text-primary" /> {users.filter((u) => u.is_active).length} actifs</span>
          <span className="flex items-center gap-1"><UserX className="h-4 w-4 text-destructive" /> {users.filter((u) => !u.is_active).length} inactifs</span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Aucun utilisateur trouvé</div>
        ) : (
          <div className="bg-card rounded-xl border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nom complet</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  {companies.length > 1 && <TableHead>Société(s)</TableHead>}
                  <TableHead>Profils</TableHead>
                  <TableHead>Rôle global</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isSelf = currentUser?.id === u.user_id;
                  const isTargetSuperAdmin = u.roles.includes("super_admin");
                  const canToggle = isAdmin && !isSelf && !(isTargetSuperAdmin && !isSuperAdmin);
                  const canDelete = isSuperAdmin && !isSelf && !isTargetSuperAdmin;
                  const canEdit = isAdmin && !(isTargetSuperAdmin && !isSuperAdmin);

                  return (
                    <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "default" : "destructive"} className="text-xs">
                          {u.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      {companies.length > 1 && (
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(userCompaniesMap[u.user_id] || []).map((name) => (
                              <Badge key={name} variant="outline" className="text-[10px]">
                                {name}
                              </Badge>
                            ))}
                            {!(userCompaniesMap[u.user_id]?.length) && (
                              <span className="text-xs text-muted-foreground italic">Aucune</span>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <UserProfileBadges userId={u.user_id} />
                      </TableCell>
                      <TableCell>
                        {u.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"} className="text-xs">
                                {ROLE_LABELS[r] || r}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Aucun</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.created_at).toLocaleDateString("fr-MA")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => setRolesDialogUser(u)}>
                                <Eye className="h-4 w-4 mr-2" /> Voir
                              </DropdownMenuItem>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => openForm("edit", u)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Modifier
                                </DropdownMenuItem>
                              )}
                              {isAdmin && !(u.roles.some(r => r === "super_admin" || r === "admin") && !isSuperAdmin) && (
                                <DropdownMenuItem onClick={() => openForm("duplicate", u)}>
                                  <Copy className="h-4 w-4 mr-2" /> Dupliquer
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canToggle && (
                                <DropdownMenuItem onClick={() => toggleActive(u.user_id, u.is_active)}>
                                  {u.is_active ? (
                                    <><UserX className="h-4 w-4 mr-2" /> Désactiver</>
                                  ) : (
                                    <><UserCheck className="h-4 w-4 mr-2" /> Activer</>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <DropdownMenuItem onClick={() => setPasswordTarget(u)}>
                                  <KeyRound className="h-4 w-4 mr-2" /> Modifier mot de passe
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteTarget(u)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* User Form Dialog (Add/Edit/Duplicate) */}
      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={refetchUsers}
        mode={formMode}
        user={formUser}
      />

      {/* View Roles & Permissions dialog */}
      <Dialog open={!!rolesDialogUser} onOpenChange={() => setRolesDialogUser(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {rolesDialogUser?.full_name || rolesDialogUser?.email} — Rôles & Permissions
            </DialogTitle>
            <DialogDescription>
              Visualisez les rôles assignés et les permissions effectives de cet utilisateur.
            </DialogDescription>
          </DialogHeader>
          {rolesDialogUser && (
            <UserRolesPanel user={rolesDialogUser} onClose={() => setRolesDialogUser(null)} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesDialogUser(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={!!passwordTarget}
        onClose={() => setPasswordTarget(null)}
        user={passwordTarget}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

// Mini component to show user functional profile badges
function UserProfileBadges({ userId }: { userId: string }) {
  const { userRoles, isValidator } = useUserRoles(userId);

  const profileLabels = userRoles
    .filter((ur: any) => ur.roles?.code && !ur.roles.code.startsWith("ADMIN"))
    .map((ur: any) => {
      const code = ur.roles?.code as string;
      const isVal = code.endsWith("_VALIDATOR");
      const name = ur.roles?.name_fr || code;
      return { name, isVal, code };
    });

  if (profileLabels.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Aucun profil</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {profileLabels.map((p) => (
        <Badge
          key={p.code}
          variant="outline"
          className={`text-[10px] gap-0.5 ${
            p.isVal ? "border-violet-300 text-violet-700" : ""
          }`}
        >
          {p.isVal && <ShieldCheck className="h-2.5 w-2.5" />}
          {p.name}
        </Badge>
      ))}
    </div>
  );
}

export default SystemeUtilisateurs;
