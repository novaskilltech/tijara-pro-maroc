import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Role, EffectivePermission } from "@/hooks/usePermissions";

export interface Permission {
  id: string;
  resource: string;
  action: string;
  name_fr: string;
  name_ar: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  scope: string;
  requires_validation: boolean;
  approval_level: number | null;
  permissions?: Permission;
}

export function useRolesManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [rolesRes, permsRes, rpRes] = await Promise.all([
      supabase.from("roles" as any).select("*").order("module").order("code"),
      supabase.from("permissions" as any).select("*").order("resource").order("action"),
      supabase.from("role_permissions" as any).select("*, permissions(*)"),
    ]);

    if (rolesRes.error) {
      toast({ title: "Erreur", description: rolesRes.error.message, variant: "destructive" });
    } else {
      setRoles((rolesRes.data || []) as unknown as Role[]);
    }

    if (permsRes.error) {
      toast({ title: "Erreur", description: permsRes.error.message, variant: "destructive" });
    } else {
      setPermissions((permsRes.data || []) as unknown as Permission[]);
    }

    if (!rpRes.error) {
      setRolePermissions((rpRes.data || []) as unknown as RolePermission[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createRole = async (data: Partial<Role>) => {
    const { error } = await supabase.from("roles" as any).insert(data);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Rôle créé" });
    await fetchAll();
    return true;
  };

  const updateRole = async (id: string, data: Partial<Role>) => {
    const { error } = await supabase.from("roles" as any).update(data).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Rôle mis à jour" });
    await fetchAll();
    return true;
  };

  const deleteRole = async (id: string) => {
    const { error } = await supabase.from("roles" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Rôle supprimé" });
    await fetchAll();
    return true;
  };

  const togglePermission = async (
    roleId: string,
    permissionId: string,
    scope: string = "COMPANY_ONLY",
    requires_validation: boolean = false
  ) => {
    const existing = rolePermissions.find(
      (rp) => rp.role_id === roleId && rp.permission_id === permissionId
    );

    if (existing) {
      const { error } = await supabase.from("role_permissions" as any).delete().eq("id", existing.id);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return false;
      }
    } else {
      const { error } = await supabase.from("role_permissions" as any).insert({
        role_id: roleId,
        permission_id: permissionId,
        scope,
        requires_validation,
      });
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return false;
      }
    }

    await fetchAll();
    return true;
  };

  const updateRolePermission = async (id: string, data: Partial<RolePermission>) => {
    const { error } = await supabase.from("role_permissions" as any).update(data).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchAll();
    return true;
  };

  const getRolePermissions = (roleId: string) =>
    rolePermissions.filter((rp) => rp.role_id === roleId);

  const hasPermission = (roleId: string, permissionId: string) =>
    rolePermissions.some((rp) => rp.role_id === roleId && rp.permission_id === permissionId);

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {} as Record<string, Permission[]>);

  return {
    roles,
    permissions,
    rolePermissions,
    loading,
    fetchAll,
    createRole,
    updateRole,
    deleteRole,
    togglePermission,
    updateRolePermission,
    getRolePermissions,
    hasPermission,
    permissionsByResource,
  };
}

// User roles management
export function useUserRoles(userId: string | null) {
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_roles" as any)
      .select("*, roles(*)")
      .eq("user_id", userId);
    setUserRoles((data || []) as unknown as any[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const assignRole = async (roleId: string, companyId: string | null, isPrimary: boolean = false) => {
    const { error } = await supabase.from("user_roles" as any).insert({
      user_id: userId,
      role_id: roleId,
      company_id: companyId,
      is_primary: isPrimary,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Rôle assigné" });
    await fetch();
    return true;
  };

  const removeRole = async (userRoleId: string) => {
    const { error } = await supabase.from("user_roles" as any).delete().eq("id", userRoleId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Rôle retiré" });
    await fetch();
    return true;
  };

  const isValidator = userRoles.some((ur: any) => ur.roles?.code?.endsWith("_VALIDATOR"));

  return { userRoles, loading, assignRole, removeRole, refresh: fetch, isValidator };
}
