import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

export type PermissionAction =
  | "CREATE" | "READ" | "UPDATE" | "DELETE"
  | "VALIDATE" | "APPROVE" | "CANCEL"
  | "EXPORT" | "PRINT" | "VIEW_DASHBOARD";

export type PermissionResource =
  | "products" | "customers" | "suppliers"
  | "purchase_orders" | "sales_orders" | "stock_moves"
  | "invoices" | "payments" | "bank_deposits" | "cheques" | "dashboard";

export interface Role {
  id: string;
  code: string;
  name_fr: string;
  name_ar: string;
  module: string;
  is_active: boolean;
}

export interface UserRoleEntry {
  id: string;
  user_id: string;
  role_id: string | null;
  role: string | null; // legacy
  company_id: string | null;
  is_primary: boolean;
  roles?: Role;
}

export interface EffectivePermission {
  resource: PermissionResource;
  action: PermissionAction;
  scope: string;
  requires_validation: boolean;
}

interface PermissionsState {
  userRoles: UserRoleEntry[];
  effectivePermissions: EffectivePermission[];
  loading: boolean;
}

// Module to resource mapping for sidebar visibility
export const MODULE_RESOURCES: Record<string, PermissionResource[]> = {
  purchase: ["purchase_orders", "suppliers"],
  stock: ["stock_moves", "products"],
  sales: ["sales_orders", "customers"],
  invoicing: ["invoices"],
  treasury: ["payments", "bank_deposits", "cheques"],
  dashboard: ["dashboard"],
};

export function usePermissions(): PermissionsState & {
  can: (action: PermissionAction, resource: PermissionResource) => boolean;
  isValidator: (module?: string) => boolean;
  canAccessModule: (module: string) => boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const [userRoles, setUserRoles] = useState<UserRoleEntry[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setUserRoles([]);
      setEffectivePermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Load user_roles with role join
    const { data: urData } = await supabase
      .from("user_roles" as any)
      .select("*, roles(*)")
      .eq("user_id", user.id);

    const allUserRoles: UserRoleEntry[] = (urData || []) as unknown as UserRoleEntry[];

    // Filter: global roles (company_id IS NULL) + roles for current company
    const applicableRoles = allUserRoles.filter(
      (ur) => ur.company_id === null || ur.company_id === companyId
    );

    setUserRoles(applicableRoles);

    // Get role_ids that have new-style roles
    const roleIds = applicableRoles
      .map((ur) => ur.role_id)
      .filter(Boolean) as string[];

    let perms: EffectivePermission[] = [];

    if (roleIds.length > 0) {
      const { data: rpData } = await supabase
        .from("role_permissions" as any)
        .select("*, permissions(*)")
        .in("role_id", roleIds);

      perms = ((rpData || []) as any[]).map((rp: any) => ({
        resource: rp.permissions?.resource as PermissionResource,
        action: rp.permissions?.action as PermissionAction,
        scope: rp.scope,
        requires_validation: rp.requires_validation,
      })).filter((p) => p.resource && p.action);
    }

    setEffectivePermissions(perms);
    setLoading(false);
  }, [user?.id, companyId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Check if user has permission for action+resource
   * Super admin and admin always have all permissions (via legacy role system)
   */
  const can = useCallback(
    (action: PermissionAction, resource: PermissionResource): boolean => {
      if (!user) return false;

      // Legacy role check for super_admin/admin
      const legacyRoles = userRoles.map((ur) => ur.role).filter(Boolean);
      if (legacyRoles.includes("super_admin") || legacyRoles.includes("admin")) {
        return true;
      }

      // New permissions system
      return effectivePermissions.some(
        (p) => p.resource === resource && p.action === action
      );
    },
    [user, userRoles, effectivePermissions]
  );

  /**
   * Check if user is a validator for a given module (or any module)
   */
  const isValidator = useCallback(
    (module?: string): boolean => {
      if (!user) return false;

      const legacyRoles = userRoles.map((ur) => ur.role).filter(Boolean);
      if (legacyRoles.includes("super_admin") || legacyRoles.includes("admin")) {
        return true;
      }

      return userRoles.some((ur) => {
        const role = ur.roles as Role | undefined;
        if (!role) return false;
        const isValidatorRole = role.code.endsWith("_VALIDATOR");
        if (!module) return isValidatorRole;
        return isValidatorRole && role.module === module;
      });
    },
    [user, userRoles]
  );

  /**
   * Check if user can access a module (has READ on any of its resources)
   */
  const canAccessModule = useCallback(
    (module: string): boolean => {
      if (!user) return false;

      const legacyRoles = userRoles.map((ur) => ur.role).filter(Boolean);
      if (legacyRoles.includes("super_admin") || legacyRoles.includes("admin")) {
        return true;
      }

      const resources = MODULE_RESOURCES[module] ?? [];
      return resources.some((r) => can("READ", r));
    },
    [user, userRoles, can]
  );

  return {
    userRoles,
    effectivePermissions,
    loading,
    can,
    isValidator,
    canAccessModule,
    refresh: load,
  };
}
