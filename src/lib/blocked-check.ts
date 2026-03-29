import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Check if a customer is blocked before allowing operations.
 * Returns true if blocked (operation should be prevented).
 */
export async function isCustomerBlocked(customerId: string): Promise<boolean> {
  if (!customerId) return false;
  const { data } = await (supabase as any)
    .from("customers")
    .select("is_active, name")
    .eq("id", customerId)
    .single();
  if (data && data.is_active === false) {
    toast.error(`Ce client est bloqué (${data.name}). Opération interdite.`);
    return true;
  }
  return false;
}

/**
 * Check if a supplier is blocked before allowing operations.
 * Returns true if blocked (operation should be prevented).
 */
export async function isSupplierBlocked(supplierId: string): Promise<boolean> {
  if (!supplierId) return false;
  const { data } = await (supabase as any)
    .from("suppliers")
    .select("is_active, name")
    .eq("id", supplierId)
    .single();
  if (data && data.is_active === false) {
    toast.error(`Ce fournisseur est bloqué (${data.name}). Opération interdite.`);
    return true;
  }
  return false;
}
