import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
  category: "quantity" | "weight" | "volume" | "length" | "time";
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface UomConversion {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  from_unit?: UnitOfMeasure;
  to_unit?: UnitOfMeasure;
}

export const UOM_CATEGORIES: Record<string, string> = {
  quantity: "Quantité",
  weight: "Poids",
  volume: "Volume",
  length: "Longueur",
  time: "Temps",
};

export function useUnitsOfMeasure() {
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [conversions, setConversions] = useState<UomConversion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("units_of_measure")
      .select("*")
      .order("category")
      .order("sort_order")
      .order("name");
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setUnits(data || []);
  }, []);

  const fetchConversions = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("uom_conversions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setConversions(data || []);
  }, []);

  useEffect(() => {
    fetchUnits();
    fetchConversions();
  }, [fetchUnits, fetchConversions]);

  const activeUnits = units.filter((u) => u.is_active);

  const createUnit = async (record: Omit<UnitOfMeasure, "id" | "created_at">) => {
    const { data, error } = await (supabase as any)
      .from("units_of_measure")
      .insert(record)
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Unité créée" });
    await fetchUnits();
    return data;
  };

  const updateUnit = async (id: string, record: Partial<UnitOfMeasure>) => {
    const { error } = await (supabase as any)
      .from("units_of_measure")
      .update(record)
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchUnits();
    return true;
  };

  const deleteUnit = async (id: string) => {
    const { error } = await (supabase as any)
      .from("units_of_measure")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Unité supprimée" });
    await fetchUnits();
    return true;
  };

  const setDefault = async (id: string) => {
    await (supabase as any)
      .from("units_of_measure")
      .update({ is_default: false })
      .eq("is_default", true);
    await updateUnit(id, { is_default: true });
  };

  // Conversion CRUD
  const createConversion = async (record: { from_unit_id: string; to_unit_id: string; factor: number }) => {
    const { data, error } = await (supabase as any)
      .from("uom_conversions")
      .insert(record)
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Conversion créée" });
    await fetchConversions();
    return data;
  };

  const updateConversion = async (id: string, record: Partial<UomConversion>) => {
    const { error } = await (supabase as any)
      .from("uom_conversions")
      .update(record)
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetchConversions();
    return true;
  };

  const deleteConversion = async (id: string) => {
    const { error } = await (supabase as any)
      .from("uom_conversions")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Conversion supprimée" });
    await fetchConversions();
    return true;
  };

  // Enrich conversions with unit data
  const enrichedConversions = conversions.map((c) => ({
    ...c,
    from_unit: units.find((u) => u.id === c.from_unit_id),
    to_unit: units.find((u) => u.id === c.to_unit_id),
  }));

  // Get conversion factor between two unit names
  const getConversionFactor = (fromUnitName: string, toUnitName: string): number | null => {
    const fromUnit = units.find((u) => u.name === fromUnitName);
    const toUnit = units.find((u) => u.name === toUnitName);
    if (!fromUnit || !toUnit) return null;
    const conv = conversions.find(
      (c) => c.is_active && c.from_unit_id === fromUnit.id && c.to_unit_id === toUnit.id
    );
    if (conv) return conv.factor;
    // Check reverse
    const reverseConv = conversions.find(
      (c) => c.is_active && c.from_unit_id === toUnit.id && c.to_unit_id === fromUnit.id
    );
    if (reverseConv && reverseConv.factor !== 0) return 1 / reverseConv.factor;
    return null;
  };

  const unitsByCategory = activeUnits.reduce((acc, u) => {
    if (!acc[u.category]) acc[u.category] = [];
    acc[u.category].push(u);
    return acc;
  }, {} as Record<string, UnitOfMeasure[]>);

  return {
    units,
    activeUnits,
    unitsByCategory,
    loading,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    setDefault,
    // Conversions
    conversions: enrichedConversions,
    createConversion,
    updateConversion,
    deleteConversion,
    getConversionFactor,
  };
}
