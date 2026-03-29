/**
 * useStockEngine.ts — Stock management engine for TIJARAPRO
 *
 * Manages the full stock lifecycle:
 *   - Stock levels (on-hand, reserved, available per product × warehouse)
 *   - Stock movements (in/out records with traceability)
 *   - Stock transfers between warehouses
 *   - Inventory adjustments (physical counts vs system counts)
 *
 * Key concepts:
 *   - stock_available = stock_on_hand - stock_reserved
 *   - CMUP (Coût Moyen Unitaire Pondéré): weighted average cost, recalculated on every stock-in
 *   - Reservations: placed when a sales order is confirmed, released on delivery
 *   - ensureStockLevel: auto-creates stock_levels row if it doesn't exist for a product × warehouse pair
 *
 * All operations are company-scoped via companyId.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StockLevel {
  id: string;
  product_id: string;
  warehouse_id: string;
  stock_on_hand: number;
  stock_reserved: number;
  stock_available: number; // Computed client-side: on_hand - reserved
  cmup: number;
  product?: { name: string; code: string; sale_price: number; purchase_price: number };
  warehouse?: { name: string; code: string };
}

export interface StockMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  movement_type: string; // "in" | "out"
  quantity: number;
  unit_cost: number;
  reference_type: string | null; // "reception" | "delivery" | "transfer" | "adjustment"
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: { name: string; code: string };
  warehouse?: { name: string };
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  from_warehouse?: { name: string };
  to_warehouse?: { name: string };
  lines?: StockTransferLine[];
}

export interface StockTransferLine {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  product?: { name: string; code: string };
}

export interface InventoryAdjustment {
  id: string;
  adjustment_number: string;
  warehouse_id: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  warehouse?: { name: string };
  lines?: InventoryAdjustmentLine[];
}

export interface InventoryAdjustmentLine {
  id: string;
  adjustment_id: string;
  product_id: string;
  system_qty: number;
  counted_qty: number;
  difference: number; // counted_qty - system_qty
  product?: { name: string; code: string };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useStockEngine() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  // ── Data fetching ──

  const fetchStockLevels = useCallback(async () => {
    if (!companyId) { setStockLevels([]); return; }
    const { data, error } = await (supabase as any)
      .from("stock_levels")
      .select("*, product:products(name, code, sale_price, purchase_price), warehouse:warehouses(name, code)")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setStockLevels((data || []).map((d: any) => ({
      ...d,
      stock_available: Number(d.stock_on_hand) - Number(d.stock_reserved),
    })));
  }, [companyId]);

  const fetchMovements = useCallback(async () => {
    if (!companyId) { setMovements([]); return; }
    const { data } = await (supabase as any)
      .from("stock_movements")
      .select("*, product:products(name, code), warehouse:warehouses(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(200);
    setMovements(data || []);
  }, [companyId]);

  const fetchTransfers = useCallback(async () => {
    if (!companyId) { setTransfers([]); return; }
    const { data } = await (supabase as any)
      .from("stock_transfers")
      .select("*, from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey(name), to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setTransfers(data || []);
  }, [companyId]);

  const fetchAdjustments = useCallback(async () => {
    if (!companyId) { setAdjustments([]); return; }
    const { data } = await (supabase as any)
      .from("inventory_adjustments")
      .select("*, warehouse:warehouses(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setAdjustments(data || []);
  }, [companyId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStockLevels(), fetchMovements(), fetchTransfers(), fetchAdjustments()]);
    setLoading(false);
  }, [fetchStockLevels, fetchMovements, fetchTransfers, fetchAdjustments]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Core stock operations ──

  /** Ensure a stock_levels row exists for a product × warehouse pair */
  const ensureStockLevel = async (productId: string, warehouseId: string) => {
    const { data } = await (supabase as any)
      .from("stock_levels").select("id")
      .eq("product_id", productId).eq("warehouse_id", warehouseId)
      .maybeSingle();
    if (!data) {
      await (supabase as any).from("stock_levels").insert({ product_id: productId, warehouse_id: warehouseId, company_id: companyId });
    }
  };

  /**
   * Add stock (e.g., reception).
   * Recalculates CMUP using weighted average formula:
   *   newCmup = (currentQty × currentCmup + addedQty × unitCost) / newTotalQty
   */
  const addStock = async (productId: string, warehouseId: string, qty: number, unitCost: number, refType: string, refId?: string) => {
    await ensureStockLevel(productId, warehouseId);
    const { data: sl } = await (supabase as any)
      .from("stock_levels").select("stock_on_hand, cmup")
      .eq("product_id", productId).eq("warehouse_id", warehouseId).single();

    const currentQty = Number(sl?.stock_on_hand || 0);
    const currentCmup = Number(sl?.cmup || 0);
    const newQty = currentQty + qty;
    const newCmup = newQty > 0 ? ((currentQty * currentCmup) + (qty * unitCost)) / newQty : unitCost;

    await (supabase as any).from("stock_levels")
      .update({ stock_on_hand: newQty, cmup: Math.round(newCmup * 100) / 100 })
      .eq("product_id", productId).eq("warehouse_id", warehouseId);

    await (supabase as any).from("stock_movements").insert({
      product_id: productId, warehouse_id: warehouseId, movement_type: "in",
      quantity: qty, unit_cost: unitCost, reference_type: refType, reference_id: refId || null,
      created_by: (await supabase.auth.getUser()).data.user?.id, company_id: companyId,
    });
  };

  /** Deduct stock (e.g., delivery). Returns false if insufficient stock. */
  const deductStock = async (productId: string, warehouseId: string, qty: number, refType: string, refId?: string): Promise<boolean> => {
    await ensureStockLevel(productId, warehouseId);
    const { data: sl } = await (supabase as any)
      .from("stock_levels").select("stock_on_hand, stock_reserved, cmup")
      .eq("product_id", productId).eq("warehouse_id", warehouseId).single();

    const onHand = Number(sl?.stock_on_hand || 0);
    if (qty > onHand) return false;

    await (supabase as any).from("stock_levels")
      .update({ stock_on_hand: onHand - qty })
      .eq("product_id", productId).eq("warehouse_id", warehouseId);

    await (supabase as any).from("stock_movements").insert({
      product_id: productId, warehouse_id: warehouseId, movement_type: "out",
      quantity: qty, unit_cost: Number(sl?.cmup || 0), reference_type: refType, reference_id: refId || null,
      created_by: (await supabase.auth.getUser()).data.user?.id, company_id: companyId,
    });
    return true;
  };

  /** Reserve stock for a confirmed sales order. Returns false if insufficient available stock. */
  const reserveStock = async (productId: string, warehouseId: string, qty: number): Promise<boolean> => {
    await ensureStockLevel(productId, warehouseId);
    const { data: sl } = await (supabase as any)
      .from("stock_levels").select("stock_on_hand, stock_reserved")
      .eq("product_id", productId).eq("warehouse_id", warehouseId).single();

    const available = Number(sl?.stock_on_hand || 0) - Number(sl?.stock_reserved || 0);
    if (qty > available) return false;

    await (supabase as any).from("stock_levels")
      .update({ stock_reserved: Number(sl?.stock_reserved || 0) + qty })
      .eq("product_id", productId).eq("warehouse_id", warehouseId);
    return true;
  };

  /** Release previously reserved stock (on delivery or order cancellation) */
  const releaseReservation = async (productId: string, warehouseId: string, qty: number) => {
    const { data: sl } = await (supabase as any)
      .from("stock_levels").select("stock_reserved")
      .eq("product_id", productId).eq("warehouse_id", warehouseId).single();
    if (sl) {
      const newReserved = Math.max(0, Number(sl.stock_reserved) - qty);
      await (supabase as any).from("stock_levels")
        .update({ stock_reserved: newReserved })
        .eq("product_id", productId).eq("warehouse_id", warehouseId);
    }
  };

  // ── Stock Transfers ──

  const createTransfer = async (
    fromWarehouseId: string, toWarehouseId: string,
    lines: { product_id: string; quantity: number }[], notes?: string
  ) => {
    const { data: num } = await supabase.rpc("next_document_number", { p_type: "TRF", p_company_id: companyId } as any);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data: transfer, error } = await (supabase as any)
      .from("stock_transfers")
      .insert({ transfer_number: num, from_warehouse_id: fromWarehouseId, to_warehouse_id: toWarehouseId, notes, created_by: userId, company_id: companyId })
      .select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    for (const line of lines) {
      await (supabase as any).from("stock_transfer_lines").insert({ transfer_id: transfer.id, product_id: line.product_id, quantity: line.quantity, company_id: companyId });
    }
    toast({ title: "Transfert créé", description: num as string });
    await fetchAll();
    return transfer;
  };

  /** Validate transfer: deduct from source warehouse, add to destination */
  const validateTransfer = async (transferId: string) => {
    const { data: lines } = await (supabase as any).from("stock_transfer_lines").select("product_id, quantity").eq("transfer_id", transferId);
    const { data: transfer } = await (supabase as any).from("stock_transfers").select("from_warehouse_id, to_warehouse_id").eq("id", transferId).single();
    if (!transfer || !lines) return false;

    for (const line of lines) {
      const ok = await deductStock(line.product_id, transfer.from_warehouse_id, Number(line.quantity), "transfer", transferId);
      if (!ok) {
        toast({ title: "Stock insuffisant", description: "Transfert impossible", variant: "destructive" });
        return false;
      }
      await addStock(line.product_id, transfer.to_warehouse_id, Number(line.quantity), 0, "transfer", transferId);
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    await (supabase as any).from("stock_transfers").update({ status: "validated", validated_by: userId }).eq("id", transferId);
    
    await (supabase as any).from("audit_logs").insert({
      action: "validate_transfer", table_name: "stock_transfers", record_id: transferId,
      details: "Transfert de stock validé",
      user_id: userId,
      company_id: companyId,
    });
    toast({ title: "Transfert validé" });
    await fetchAll();
    return true;
  };

  // ── Inventory Adjustments ──

  const createAdjustment = async (
    warehouseId: string,
    lines: { product_id: string; system_qty: number; counted_qty: number }[],
    notes?: string
  ) => {
    const { data: num } = await supabase.rpc("next_document_number", { p_type: "INV", p_company_id: companyId } as any);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data: adj, error } = await (supabase as any)
      .from("inventory_adjustments")
      .insert({ adjustment_number: num, warehouse_id: warehouseId, notes, created_by: userId, company_id: companyId })
      .select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    for (const line of lines) {
      await (supabase as any).from("inventory_adjustment_lines").insert({
        adjustment_id: adj.id, product_id: line.product_id,
        system_qty: line.system_qty, counted_qty: line.counted_qty,
        difference: line.counted_qty - line.system_qty, company_id: companyId,
      });
    }
    toast({ title: "Inventaire créé", description: num as string });
    await fetchAll();
    return adj;
  };

  /** Validate adjustment: apply stock differences (positive = addStock, negative = deductStock) */
  const validateAdjustment = async (adjustmentId: string) => {
    const { data: adj } = await (supabase as any).from("inventory_adjustments").select("warehouse_id").eq("id", adjustmentId).single();
    const { data: lines } = await (supabase as any).from("inventory_adjustment_lines").select("product_id, difference").eq("adjustment_id", adjustmentId);
    if (!adj || !lines) return false;

    const userId = (await supabase.auth.getUser()).data.user?.id;

    for (const line of lines) {
      const diff = Number(line.difference);
      if (diff > 0) {
        await addStock(line.product_id, adj.warehouse_id, diff, 0, "adjustment", adjustmentId);
      } else if (diff < 0) {
        await deductStock(line.product_id, adj.warehouse_id, Math.abs(diff), "adjustment", adjustmentId);
      }
    }

    await (supabase as any).from("inventory_adjustments").update({ status: "validated", validated_by: userId }).eq("id", adjustmentId);

    await (supabase as any).from("audit_logs").insert({
      action: "validate_adjustment", table_name: "inventory_adjustments", record_id: adjustmentId,
      details: "Inventaire physique validé",
      user_id: userId,
      company_id: companyId,
    });
    toast({ title: "Inventaire validé" });
    await fetchAll();
    return true;
  };

  return {
    stockLevels, movements, transfers, adjustments, loading,
    fetchAll, addStock, deductStock, reserveStock, releaseReservation,
    createTransfer, validateTransfer, createAdjustment, validateAdjustment,
  };
}
