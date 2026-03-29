import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AppRole } from "@/types/auth";

export interface ManagedUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  roles: AppRole[];
}

async function logAudit(action: string, recordId: string, details: string, oldData?: any, newData?: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    table_name: "profiles",
    record_id: recordId,
    details,
    old_data: oldData ?? null,
    new_data: newData ?? null,
  });
}

export function useUserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (pErr) {
      toast({ title: "Erreur", description: pErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: allRoles, error: rErr } = await supabase
      .from("user_roles" as any)
      .select("user_id, role");

    if (rErr) {
      toast({ title: "Erreur", description: rErr.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const roleMap = new Map<string, AppRole[]>();
    ((allRoles || []) as any[]).forEach((r: any) => {
      if (!r.role) return;
      const existing = roleMap.get(r.user_id) || [];
      existing.push(r.role as AppRole);
      roleMap.set(r.user_id, existing);
    });

    const merged: ManagedUser[] = (profiles || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      is_active: p.is_active,
      created_at: p.created_at,
      roles: roleMap.get(p.user_id) || [],
    }));

    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleActive = async (userId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !isActive })
      .eq("user_id", userId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    const user = users.find(u => u.user_id === userId);
    await logAudit(
      isActive ? "user_deactivated" : "user_activated",
      userId,
      `${user?.full_name || user?.email} ${isActive ? "désactivé" : "activé"}`,
      { is_active: isActive },
      { is_active: !isActive },
    );
    toast({ title: isActive ? "Utilisateur désactivé" : "Utilisateur activé" });
    await fetch();
    return true;
  };

  const setRole = async (userId: string, role: AppRole) => {
    const user = users.find(u => u.user_id === userId);
    const oldRoles = user?.roles || [];

    // Delete existing user_roles for this user (legacy rows only - those with role text and no role_id)
    await supabase.from("user_roles" as any).delete().eq("user_id", userId).is("role_id", null);
    const { error } = await supabase.from("user_roles" as any).insert({ user_id: userId, role, is_primary: true });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await logAudit(
      "role_changed",
      userId,
      `Rôle de ${user?.full_name || user?.email} changé: ${oldRoles.join(",")} → ${role}`,
      { roles: oldRoles },
      { roles: [role] },
    );
    toast({ title: "Rôle mis à jour" });
    await fetch();
    return true;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Email de réinitialisation envoyé", description: `Un email a été envoyé à ${email}` });
    return true;
  };

  const deleteUser = async (targetUserId: string) => {
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { target_user_id: targetUserId },
    });
    if (error || data?.error) {
      toast({ title: "Erreur", description: error?.message || data?.error, variant: "destructive" });
      return false;
    }
    toast({ title: "Utilisateur supprimé" });
    await fetch();
    return true;
  };

  return { users, loading, fetch, toggleActive, setRole, resetPassword, deleteUser };
}
