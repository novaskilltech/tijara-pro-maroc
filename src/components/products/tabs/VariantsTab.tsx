import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProductVariants } from "@/hooks/useProducts";
import { Plus, Trash2, Wand2, X, Loader2, AlertTriangle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

interface VariantsTabProps {
  productId: string | null;
  productName?: string;
  productUnit?: string;
}

interface LocalAttribute {
  id?: string;
  name: string;
  values: { id?: string; label: string }[];
}

export function VariantsTab({ productId, productName, productUnit }: VariantsTabProps) {
  const { variants, loading: variantsLoading, generateVariants, updateVariant, deleteVariant } = useProductVariants(productId);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const [localAttrs, setLocalAttrs] = useState<LocalAttribute[]>([]);
  const [newAttrName, setNewAttrName] = useState("");
  const [newValueMap, setNewValueMap] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Inline cell edit
  const [editCell, setEditCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Variant edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [variantForm, setVariantForm] = useState<Record<string, any>>({});
  const [savingVariant, setSavingVariant] = useState(false);

  const loadExisting = useCallback(async () => {
    if (!productId) return;
    const { data: lines } = await (supabase as any)
      .from("product_attribute_lines")
      .select("id, attribute_id, product_attributes(id, name)")
      .eq("product_id", productId);
    if (!lines || lines.length === 0) { setLoaded(true); return; }

    const lineIds = lines.map((l: any) => l.id);
    const { data: lineValues } = await (supabase as any)
      .from("product_attribute_line_values")
      .select("line_id, value_id, product_attribute_values(id, value)")
      .in("line_id", lineIds);

    const attrs: LocalAttribute[] = lines.map((line: any) => ({
      id: line.product_attributes?.id,
      name: line.product_attributes?.name || "",
      values: (lineValues || [])
        .filter((lv: any) => lv.line_id === line.id)
        .map((lv: any) => ({ id: lv.product_attribute_values?.id, label: lv.product_attribute_values?.value || "" })),
    }));
    setLocalAttrs(attrs);
    setLoaded(true);
  }, [productId]);

  useEffect(() => { loadExisting(); }, [loadExisting]);

  if (!productId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-lg font-medium">Enregistrez d'abord le produit</p>
        <p className="text-sm mt-1">Les variantes seront disponibles après la création du produit.</p>
      </div>
    );
  }

  // ── Attribute handlers ──
  const handleAddAttribute = () => {
    const name = newAttrName.trim();
    if (!name) return;
    if (localAttrs.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Attribut déjà ajouté", variant: "destructive" });
      return;
    }
    setLocalAttrs((prev) => [...prev, { name, values: [] }]);
    setNewAttrName("");
  };

  const handleRemoveAttribute = (idx: number) => {
    setLocalAttrs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddValue = (idx: number) => {
    const val = newValueMap[idx]?.trim();
    if (!val) return;
    setLocalAttrs((prev) => {
      const copy = [...prev];
      if (copy[idx].values.some((v) => v.label.toLowerCase() === val.toLowerCase())) {
        toast({ title: "Valeur déjà existante", variant: "destructive" });
        return prev;
      }
      copy[idx] = { ...copy[idx], values: [...copy[idx].values, { label: val }] };
      return copy;
    });
    setNewValueMap((prev) => ({ ...prev, [idx]: "" }));
  };

  const handleRemoveValue = (attrIdx: number, valIdx: number) => {
    setLocalAttrs((prev) => {
      const copy = [...prev];
      copy[attrIdx] = { ...copy[attrIdx], values: copy[attrIdx].values.filter((_, i) => i !== valIdx) };
      return copy;
    });
  };

  const handleGenerate = async () => {
    const validAttrs = localAttrs.filter((a) => a.values.length > 0);
    if (validAttrs.length === 0) {
      toast({ title: "Ajoutez des valeurs", description: "Chaque attribut doit avoir au moins une valeur.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const lines: { attribute_id: string; value_ids: string[] }[] = [];
      for (const attr of validAttrs) {
        let attrId = attr.id;
        if (!attrId) {
          const { data: existing } = await (supabase as any).from("product_attributes").select("id").ilike("name", attr.name).maybeSingle();
          if (existing) { attrId = existing.id; }
          else {
            const { data: created } = await (supabase as any).from("product_attributes").insert({ name: attr.name, display_type: "dropdown" }).select("id").single();
            if (!created) continue;
            attrId = created.id;
          }
        }
        const valueIds: string[] = [];
        for (const val of attr.values) {
          let valId = val.id;
          if (!valId) {
            const { data: existingVal } = await (supabase as any).from("product_attribute_values").select("id").eq("attribute_id", attrId).ilike("value", val.label).maybeSingle();
            if (existingVal) { valId = existingVal.id; }
            else {
              const { data: createdVal } = await (supabase as any).from("product_attribute_values").insert({ attribute_id: attrId, value: val.label }).select("id").single();
              if (!createdVal) continue;
              valId = createdVal.id;
            }
          }
          valueIds.push(valId!);
        }
        const { data: lineData } = await (supabase as any)
          .from("product_attribute_lines")
          .upsert({ product_id: productId, attribute_id: attrId, company_id: companyId }, { onConflict: "product_id,attribute_id" })
          .select().single();
        if (lineData) {
          for (const vid of valueIds) {
            await (supabase as any).from("product_attribute_line_values").upsert({ line_id: lineData.id, value_id: vid, company_id: companyId }, { onConflict: "line_id,value_id" });
          }
        }
        lines.push({ attribute_id: attrId!, value_ids: valueIds });
      }
      await generateVariants(productId, lines);
      await loadExisting();
    } finally {
      setGenerating(false);
    }
  };

  // ── Inline cell edit ──
  const startEdit = (id: string, field: string, currentValue: any) => {
    setEditCell({ id, field });
    setEditValue(currentValue?.toString() ?? "");
  };

  const commitEdit = async () => {
    if (!editCell) return;
    const { id, field } = editCell;
    const numFields = ["sale_price", "purchase_price"];
    const value = numFields.includes(field) ? (editValue ? Number(editValue) : null) : editValue;
    await updateVariant(id, { [field]: value } as any);
    setEditCell(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditCell(null);
    setEditValue("");
  };

  // ── Variant edit dialog ──
  const openVariantEdit = (v: any) => {
    setEditingVariant(v);
    setVariantForm({
      sku: v.sku || "",
      barcode: v.barcode || "",
      sale_price: v.sale_price ?? "",
      purchase_price: v.purchase_price ?? "",
      weight: v.weight ?? 0,
      is_active: v.is_active !== false,
    });
    setEditDialogOpen(true);
  };

  const handleVariantFormSave = async () => {
    if (!editingVariant) return;
    setSavingVariant(true);
    const payload: Record<string, any> = {
      sku: variantForm.sku || null,
      barcode: variantForm.barcode || null,
      sale_price: variantForm.sale_price !== "" ? Number(variantForm.sale_price) : null,
      purchase_price: variantForm.purchase_price !== "" ? Number(variantForm.purchase_price) : null,
      weight: Number(variantForm.weight) || 0,
      is_active: variantForm.is_active,
    };
    await updateVariant(editingVariant.id, payload as any);
    setSavingVariant(false);
    setEditDialogOpen(false);
    toast({ title: "Variante mise à jour" });
  };

  const combinationCount = localAttrs.filter((a) => a.values.length > 0).reduce((acc, a) => acc * a.values.length, 1);
  const hasValues = localAttrs.some((a) => a.values.length > 0);

  const fmt = (n: number | null | undefined) => {
    if (n == null) return "0,00";
    return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* ── Attributes Builder ── */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Attributs du produit</Label>
        <div className="flex items-center gap-3 mb-4">
          <Input
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            placeholder="Nom de l'attribut (ex: Poids, Couleur, Taille...)"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAddAttribute()}
          />
          <Button onClick={handleAddAttribute} size="sm" className="gap-1 shrink-0" disabled={!newAttrName.trim()}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>

        <div className="space-y-3">
          {localAttrs.map((attr, attrIdx) => (
            <div key={attrIdx} className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm uppercase tracking-wide">{attr.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveAttribute(attrIdx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {attr.values.map((v, vIdx) => (
                  <span key={vIdx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background border border-border">
                    {v.label}
                    <button onClick={() => handleRemoveValue(attrIdx, vIdx)} className="opacity-50 hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {attr.values.length === 0 && <span className="text-xs text-muted-foreground italic">Aucune valeur définie</span>}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newValueMap[attrIdx] || ""}
                  onChange={(e) => setNewValueMap((prev) => ({ ...prev, [attrIdx]: e.target.value }))}
                  placeholder="Ajouter une valeur..."
                  className="h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleAddValue(attrIdx)}
                />
                <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => handleAddValue(attrIdx)} disabled={!newValueMap[attrIdx]?.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Generate Button ── */}
      {localAttrs.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border border-border">
          <Button onClick={handleGenerate} disabled={generating || !hasValues} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Générer les variantes
          </Button>
          <span className="text-sm text-muted-foreground">
            {hasValues ? `${combinationCount} combinaison(s) à générer` : "Ajoutez des valeurs aux attributs"}
          </span>
        </div>
      )}

      {/* ── Odoo-style Variants Table ── */}
      {variants.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3">Variantes ({variants.length})</h3>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="min-w-[140px]">Référence interne</TableHead>
                  <TableHead className="min-w-[120px]">Nom</TableHead>
                  <TableHead className="min-w-[200px]">Valeurs de la variante</TableHead>
                  <TableHead className="text-right min-w-[110px]">Prix de vente</TableHead>
                  <TableHead className="text-right min-w-[90px]">Coût</TableHead>
                  <TableHead className="text-right min-w-[90px] text-primary">En stock</TableHead>
                  <TableHead className="text-right min-w-[70px] text-primary">Prévu</TableHead>
                  <TableHead className="min-w-[70px]">Unité</TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : variants.map((v) => {
                  const isEditingSku = editCell?.id === v.id && editCell?.field === "sku";
                  const isEditingPrice = editCell?.id === v.id && editCell?.field === "sale_price";
                  const isEditingCost = editCell?.id === v.id && editCell?.field === "purchase_price";

                  return (
                    <TableRow key={v.id} className={!v.is_active ? "opacity-50" : ""}>
                      {/* Référence interne */}
                      <TableCell className="py-2.5">
                        {isEditingSku ? (
                          <Input autoFocus className="h-8 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }} />
                        ) : (
                          <span className="text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => startEdit(v.id, "sku", v.sku)}>{v.sku || "—"}</span>
                        )}
                      </TableCell>

                      {/* Nom */}
                      <TableCell className="py-2.5">
                        <span className="text-sm">{productName || "—"}</span>
                      </TableCell>

                      {/* Valeurs de la variante */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {v.attribute_values.map((av, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal px-2.5 py-1 rounded bg-muted text-muted-foreground border-0">
                              {av.attribute_name}: {av.value}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      {/* Prix de vente */}
                      <TableCell className="text-right py-2.5">
                        {isEditingPrice ? (
                          <Input autoFocus type="number" step="0.01" className="h-8 text-sm text-right w-24 ml-auto" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }} />
                        ) : (
                          <span className="text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => startEdit(v.id, "sale_price", v.sale_price)}>{fmt(v.sale_price)}</span>
                        )}
                      </TableCell>

                      {/* Coût */}
                      <TableCell className="text-right py-2.5">
                        {isEditingCost ? (
                          <Input autoFocus type="number" step="0.01" className="h-8 text-sm text-right w-24 ml-auto" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }} />
                        ) : (
                          <span className="text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => startEdit(v.id, "purchase_price", v.purchase_price)}>{fmt(v.purchase_price)}</span>
                        )}
                      </TableCell>

                      {/* En stock */}
                      <TableCell className="text-right py-2.5">
                        <span className="text-sm text-primary font-medium">0,00</span>
                      </TableCell>

                      {/* Prévu */}
                      <TableCell className="text-right py-2.5">
                        <span className="text-sm text-primary font-medium">0,00</span>
                      </TableCell>

                      {/* Unité */}
                      <TableCell className="py-2.5">
                        <span className="text-sm text-muted-foreground">{productUnit || "Unité(s)"}</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openVariantEdit(v)} title="Modifier la variante">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteVariant(v.id)} title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Variant Edit Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Modifier la variante
              {editingVariant?.attribute_values?.length > 0 && (
                <span className="text-muted-foreground font-normal ml-2">
                  — {editingVariant.attribute_values.map((av: any) => av.value).join(" / ")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Attribute badges (read-only) */}
            {editingVariant?.attribute_values?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {editingVariant.attribute_values.map((av: any, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs px-2.5 py-1">
                    {av.attribute_name}: {av.value}
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Référence interne</Label>
                <Input value={variantForm.sku || ""} onChange={(e) => setVariantForm((p) => ({ ...p, sku: e.target.value }))} placeholder="REF-001" />
              </div>
              <div className="space-y-2">
                <Label>Code-barres</Label>
                <Input value={variantForm.barcode || ""} onChange={(e) => setVariantForm((p) => ({ ...p, barcode: e.target.value }))} placeholder="123456789" />
              </div>
              <div className="space-y-2">
                <Label>Prix de vente</Label>
                <Input type="number" step="0.01" value={variantForm.sale_price} onChange={(e) => setVariantForm((p) => ({ ...p, sale_price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Coût d'achat</Label>
                <Input type="number" step="0.01" value={variantForm.purchase_price} onChange={(e) => setVariantForm((p) => ({ ...p, purchase_price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Poids</Label>
                <Input type="number" step="0.01" value={variantForm.weight} onChange={(e) => setVariantForm((p) => ({ ...p, weight: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={variantForm.is_active} onCheckedChange={(val) => setVariantForm((p) => ({ ...p, is_active: val }))} />
                  <span className="text-sm">{variantForm.is_active ? "Actif" : "Inactif"}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleVariantFormSave} disabled={savingVariant}>
                {savingVariant && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
