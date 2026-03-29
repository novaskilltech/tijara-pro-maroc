import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCustomerBlocked } from "@/lib/blocked-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Save, CheckCircle2, X, Truck, Plus, Trash2,
  Loader2, FileText, Link2, ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { DELIVERY_STATUS, getStatus } from "@/lib/status-config";

// ─── Status badge ─────────────────────────────────────────────────────────────
function DeliveryStatusBadge({ status }: { status: string }) {
  const cfg = getStatus(DELIVERY_STATUS, status);
  return <Badge className={`${cfg.className} border px-3 py-1 text-sm font-medium`}>{cfg.label}</Badge>;
}

// ─── Workflow status bar ──────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  { key: "draft",     label: "Brouillon" },
  { key: "confirmed", label: "À faire" },
  { key: "validated", label: "Validée" },
];

function WorkflowBar({ status }: { status: string }) {
  const activeIdx = status === "cancelled"
    ? -1
    : WORKFLOW_STEPS.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-0">
      {WORKFLOW_STEPS.map((step, idx) => {
        const done = idx < activeIdx;
        const current = idx === activeIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className={`
              flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full transition-all
              ${current ? "bg-primary text-primary-foreground shadow" : ""}
              ${done ? "bg-success/20 text-success" : ""}
              ${!current && !done ? "text-muted-foreground" : ""}
            `}>
              {done && <CheckCircle2 className="h-3 w-3" />}
              {step.label}
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-1" />
            )}
          </div>
        );
      })}
      {status === "cancelled" && (
        <Badge className="ml-2 bg-destructive/10 text-destructive border-destructive/20">Annulée</Badge>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface DeliveryFormPageProps {
  delivery?: any;
  salesOrderId?: string;
  onBack: () => void;
  onSaved?: (id: string) => void;
  stockEngine: any;
}

interface DeliveryLine {
  id?: string;
  product_id: string | null;
  description: string;
  quantity_ordered: number;   // Qté demandée
  quantity_delivered: number; // Qté livrée
  unit: string;
  unit_price: number;
  discount_percent: number;
  tva_rate: number;
  sales_order_line_id?: string | null;
}

export function DeliveryFormPage({ delivery, salesOrderId, onBack, onSaved, stockEngine }: DeliveryFormPageProps) {
  const { activeCompany } = useCompany();
  const { roles } = useAuth();
  const companyId = activeCompany?.id ?? null;
  const isAdmin = roles.some(r => ["super_admin", "admin"].includes(r));

  // ── Form state ────────────────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string>(delivery?.customer_id || "");
  const [warehouseId, setWarehouseId] = useState<string>(delivery?.warehouse_id || "");
  const [deliveryAddress, setDeliveryAddress] = useState<string>(delivery?.delivery_address || "");
  const [scheduledDate, setScheduledDate] = useState<string>(
    delivery?.delivery_date || new Date().toISOString().split("T")[0]
  );
  const [originDoc, setOriginDoc] = useState<string>(delivery?.origin_doc || "");
  const [notes, setNotes] = useState<string>(delivery?.notes || "");
  const [additionalInfo, setAdditionalInfo] = useState<string>(delivery?.additional_info || "");
  const [lines, setLines] = useState<DeliveryLine[]>([]);
  const [status, setStatus] = useState<string>(delivery?.status || "draft");

  // ── Ref data ─────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [linkedSO, setLinkedSO] = useState<any>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [overrideDialog, setOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // ── Load ref data ────────────────────────────────────────────────────────
  const loadRefs = useCallback(async () => {
    if (!companyId) return;
    const [{ data: custs }, { data: whs }, { data: prods }] = await Promise.all([
      (supabase as any).from("customers").select("id, name, code, address, city").eq("company_id", companyId).order("name"),
      (supabase as any).from("warehouses").select("id, name, code").eq("company_id", companyId).order("name"),
      (supabase as any).from("products").select("id, name, code, sale_price, unit, tva_rate").eq("can_be_sold", true).eq("company_id", companyId).order("name"),
    ]);
    setCustomers(custs || []);
    setWarehouses(whs || []);
    setProducts(prods || []);
  }, [companyId]);

  // ── Load lines for existing delivery ─────────────────────────────────────
  const loadLines = useCallback(async () => {
    if (!delivery?.id) return;
    const { data } = await (supabase as any)
      .from("delivery_lines")
      .select("*, product:products(name, code)")
      .eq("delivery_id", delivery.id)
      .order("sort_order");
    if (data) {
      setLines(data.map((l: any) => ({
        id: l.id,
        product_id: l.product_id,
        description: l.description,
        quantity_ordered: Number(l.quantity),
        quantity_delivered: Number(l.quantity),
        unit: l.unit || "Unité",
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
        tva_rate: Number(l.tva_rate),
        sales_order_line_id: l.sales_order_line_id || null,
      })));
    }
  }, [delivery?.id]);

  // ── Load from SO ──────────────────────────────────────────────────────────
  const loadFromSO = useCallback(async (soId: string) => {
    const { data: so } = await (supabase as any)
      .from("sales_orders")
      .select("*, customer:customers(name, code, address, city), warehouse:warehouses(name)")
      .eq("id", soId).single();
    if (!so) return;
    setLinkedSO(so);
    setCustomerId(so.customer_id || "");
    setWarehouseId(so.warehouse_id || "");
    setOriginDoc(so.order_number || "");
    const addr = [so.customer?.address, so.customer?.city].filter(Boolean).join(", ");
    setDeliveryAddress(addr);

    const { data: soLines } = await (supabase as any)
      .from("sales_order_lines")
      .select("*, product:products(name, code, unit, tva_rate)")
      .eq("sales_order_id", soId)
      .order("sort_order");

    if (soLines) {
      setLines(soLines
        .filter((l: any) => {
          const remaining = Number(l.quantity) - Number(l.delivered_qty || 0);
          return remaining > 0;
        })
        .map((l: any) => ({
          product_id: l.product_id,
          description: l.description || l.product?.name || "",
          quantity_ordered: Number(l.quantity) - Number(l.delivered_qty || 0),
          quantity_delivered: Number(l.quantity) - Number(l.delivered_qty || 0),
          unit: l.product?.unit || "Unité",
          unit_price: Number(l.unit_price),
          discount_percent: Number(l.discount_percent),
          tva_rate: Number(l.tva_rate || l.product?.tva_rate || 20),
          sales_order_line_id: l.id,
        }))
      );
    }
  }, []);

  useEffect(() => { loadRefs(); }, [loadRefs]);

  useEffect(() => {
    if (delivery?.id) {
      loadLines();
      if (delivery.sales_order_id) {
        (supabase as any).from("sales_orders").select("*, customer:customers(name,code), warehouse:warehouses(name)").eq("id", delivery.sales_order_id).single().then(({ data }: any) => {
          if (data) setLinkedSO(data);
        });
      }
    } else if (salesOrderId) {
      loadFromSO(salesOrderId);
    } else {
      setLines([{ product_id: null, description: "", quantity_ordered: 1, quantity_delivered: 1, unit: "Unité", unit_price: 0, discount_percent: 0, tva_rate: 20 }]);
    }
  }, [delivery?.id, salesOrderId, loadLines, loadFromSO]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const addLine = () => {
    setLines(prev => [...prev, { product_id: null, description: "", quantity_ordered: 1, quantity_delivered: 1, unit: "Unité", unit_price: 0, discount_percent: 0, tva_rate: 20 }]);
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof DeliveryLine, value: any) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "product_id" && value) {
        const p = products.find(p => p.id === value);
        if (p) {
          next[idx].description = p.name;
          next[idx].unit = p.unit || "Unité";
          next[idx].unit_price = p.sale_price || 0;
          next[idx].tva_rate = p.tva_rate || 20;
        }
      }
      return next;
    });
  };

  const canEdit = status === "draft" || status === "confirmed";

  // ── Save draft ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!customerId || !warehouseId) {
      toast({ title: "Champs requis", description: "Client et dépôt sont obligatoires.", variant: "destructive" });
      return;
    }
    if (await isCustomerBlocked(customerId)) return;
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (delivery?.id) {
        await (supabase as any).from("deliveries").update({
          customer_id: customerId,
          warehouse_id: warehouseId,
          delivery_date: scheduledDate || null,
          notes: notes || null,
        }).eq("id", delivery.id);

        await (supabase as any).from("delivery_lines").delete().eq("delivery_id", delivery.id);
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          const ht = l.quantity_delivered * l.unit_price * (1 - l.discount_percent / 100);
          const tvaAmt = ht * l.tva_rate / 100;
          await (supabase as any).from("delivery_lines").insert({
            delivery_id: delivery.id,
            product_id: l.product_id || null,
            description: l.description,
            quantity: l.quantity_delivered,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
            tva_rate: l.tva_rate,
            total_ht: Math.round(ht * 100) / 100,
            total_tva: Math.round(tvaAmt * 100) / 100,
            total_ttc: Math.round((ht + tvaAmt) * 100) / 100,
            sales_order_line_id: l.sales_order_line_id || null,
            sort_order: i,
            company_id: companyId,
          });
        }
        toast({ title: "Bon de livraison sauvegardé" });
        onSaved?.(delivery.id);
      } else {
        const { data: num } = await supabase.rpc("next_document_number", { p_type: "BL", p_company_id: companyId } as any);
        const { data: del, error } = await (supabase as any).from("deliveries").insert({
          delivery_number: num,
          customer_id: customerId,
          warehouse_id: warehouseId,
          sales_order_id: salesOrderId || linkedSO?.id || null,
          status: "draft",
          delivery_date: scheduledDate || null,
          notes: notes || null,
          created_by: userId,
          company_id: companyId,
        }).select().single();
        if (error) throw error;

        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          const ht = l.quantity_delivered * l.unit_price * (1 - l.discount_percent / 100);
          const tvaAmt = ht * l.tva_rate / 100;
          await (supabase as any).from("delivery_lines").insert({
            delivery_id: del.id,
            product_id: l.product_id || null,
            description: l.description,
            quantity: l.quantity_delivered,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
            tva_rate: l.tva_rate,
            total_ht: Math.round(ht * 100) / 100,
            total_tva: Math.round(tvaAmt * 100) / 100,
            total_ttc: Math.round((ht + tvaAmt) * 100) / 100,
            sales_order_line_id: l.sales_order_line_id || null,
            sort_order: i,
            company_id: companyId,
          });
        }
        toast({ title: "Bon de livraison créé", description: num as string });
        onSaved?.(del.id);
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // ── Mark as "À faire" ─────────────────────────────────────────────────────
  const handleMarkToDo = async () => {
    if (!delivery?.id) { await handleSave(); return; }
    await (supabase as any).from("deliveries").update({ status: "confirmed" }).eq("id", delivery.id);
    setStatus("confirmed");
    toast({ title: "Marqué comme À faire" });
  };

  // ── Validate (with stock impact) ──────────────────────────────────────────
  const doValidate = async (withOverride = false) => {
    if (!delivery?.id) {
      toast({ title: "Sauvegardez d'abord le bon de livraison.", variant: "destructive" });
      return;
    }
    setValidating(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Check over-delivering
      if (!withOverride && linkedSO) {
        for (const l of lines) {
          if (!l.sales_order_line_id) continue;
          const { data: sol } = await (supabase as any)
            .from("sales_order_lines")
            .select("quantity, delivered_qty")
            .eq("id", l.sales_order_line_id).single();
          if (sol) {
            const remaining = Number(sol.quantity) - Number(sol.delivered_qty || 0);
            if (l.quantity_delivered > remaining + 0.001) {
              if (!isAdmin) {
                toast({ title: "Quantité dépassée", description: `La quantité livrée dépasse la commande pour "${l.description}".`, variant: "destructive" });
                setValidating(false);
                return;
              }
              setOverrideDialog(true);
              setValidating(false);
              return;
            }
          }
        }
      }

      // Check stock availability
      for (const l of lines) {
        if (!l.product_id || l.quantity_delivered <= 0) continue;
        const { data: sl } = await (supabase as any)
          .from("stock_levels")
          .select("stock_on_hand, stock_reserved")
          .eq("product_id", l.product_id)
          .eq("warehouse_id", warehouseId).maybeSingle();
        const available = sl ? Number(sl.stock_on_hand) - Number(sl.stock_reserved) : 0;
        if (l.quantity_delivered > available && !withOverride) {
          if (!isAdmin) {
            toast({ title: "Stock insuffisant", description: `Stock disponible insuffisant pour "${l.description}" (dispo: ${available}).`, variant: "destructive" });
            setValidating(false);
            return;
          }
          setOverrideDialog(true);
          setValidating(false);
          return;
        }
      }

      // Process lines: deduct stock, release reservation, update SO delivered_qty
      for (const l of lines) {
        if (!l.product_id || l.quantity_delivered <= 0) continue;

        await stockEngine.deductStock(l.product_id, warehouseId, l.quantity_delivered, "delivery", delivery.id);
        await stockEngine.releaseReservation(l.product_id, warehouseId, l.quantity_delivered);

        if (l.sales_order_line_id) {
          const { data: sol } = await (supabase as any)
            .from("sales_order_lines").select("delivered_qty").eq("id", l.sales_order_line_id).single();
          if (sol) {
            await (supabase as any).from("sales_order_lines").update({
              delivered_qty: Number(sol.delivered_qty || 0) + l.quantity_delivered,
            }).eq("id", l.sales_order_line_id);
          }
        }
      }

      // Mark delivery validated
      await (supabase as any).from("deliveries").update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: userId,
      }).eq("id", delivery.id);
      setStatus("validated");

      // Update SO status
      const soId = delivery?.sales_order_id;
      if (soId) {
        const { data: allLines } = await (supabase as any)
          .from("sales_order_lines").select("quantity, delivered_qty").eq("sales_order_id", soId);
        const fully = (allLines || []).every((l: any) => Number(l.delivered_qty) >= Number(l.quantity));
        const partial = (allLines || []).some((l: any) => Number(l.delivered_qty) > 0);
        const newStatus = fully ? "delivered" : partial ? "partially_delivered" : "confirmed";
        await (supabase as any).from("sales_orders").update({ status: newStatus }).eq("id", soId);
      }

      // Audit log
      await (supabase as any).from("audit_logs").insert({
        action: "validate_delivery",
        table_name: "deliveries",
        record_id: delivery.id,
        details: withOverride ? `Dérogation: ${overrideReason}` : "Validé normalement",
        user_id: userId,
      });

      toast({ title: "✅ Bon de livraison validé — stock mis à jour" });
      await stockEngine.fetchAll();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
    setValidating(false);
  };

  const handleValidate = () => doValidate(false);

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await (supabase as any).from("deliveries").update({
      status: "cancelled",
      cancel_reason: cancelReason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
    }).eq("id", delivery.id);
    await (supabase as any).from("audit_logs").insert({
      action: "cancel_delivery", table_name: "deliveries",
      record_id: delivery.id, details: `Motif: ${cancelReason}`, user_id: userId,
    });
    setStatus("cancelled");
    setCancelDialog(false);
    toast({ title: "Bon de livraison annulé" });
  };

  const customerOptions = customers.map(c => ({ value: c.id, label: c.name, sub: c.code }));
  const warehouseOptions = warehouses.map(w => ({ value: w.id, label: w.name, sub: w.code }));
  const productOptions = products.map(p => ({ value: p.id, label: p.name, sub: p.code }));

  const totalHT = lines.reduce((s, l) => {
    const ht = l.quantity_delivered * l.unit_price * (1 - l.discount_percent / 100);
    return s + ht;
  }, 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ── Top action bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Livraisons
          </Button>
          <Separator orientation="vertical" className="h-5" />

          {canEdit && (
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer
            </Button>
          )}
          {status === "draft" && (
            <Button size="sm" variant="outline" onClick={handleMarkToDo} disabled={saving}>
              <Truck className="h-4 w-4 mr-1" /> Marquer comme à faire
            </Button>
          )}
          {(status === "draft" || status === "confirmed") && (
            <Button size="sm" className="bg-success hover:bg-success/90 text-white" onClick={handleValidate} disabled={validating}>
              {validating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Valider
            </Button>
          )}
          {status !== "cancelled" && status !== "validated" && isAdmin && (
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setCancelDialog(true)}>
              <X className="h-4 w-4 mr-1" /> Annuler
            </Button>
          )}

          <div className="ml-auto">
            <WorkflowBar status={status} />
          </div>
        </div>
      </div>

      {/* ── Document header ─────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {delivery?.delivery_number ? (
                <span className="font-mono">{delivery.delivery_number}</span>
              ) : (
                "Nouveau bon de livraison"
              )}
            </h1>
            {linkedSO && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                <span>BC : <span className="font-mono font-medium text-primary">{linkedSO.order_number}</span></span>
              </div>
            )}
          </div>
          <DeliveryStatusBadge status={status} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Adresse de livraison (Client) *</Label>
            {canEdit ? (
              <SearchableSelect
                options={customerOptions}
                value={customerId}
                onValueChange={v => {
                  setCustomerId(v);
                  const c = customers.find(c => c.id === v);
                  if (c) setDeliveryAddress([c.address, c.city].filter(Boolean).join(", "));
                }}
                placeholder="Sélectionner client"
              />
            ) : (
              <div className="text-sm font-medium">{customers.find(c => c.id === customerId)?.name || "—"}</div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dépôt expéditeur *</Label>
            {canEdit ? (
              <SearchableSelect
                options={warehouseOptions}
                value={warehouseId}
                onValueChange={setWarehouseId}
                placeholder="Sélectionner dépôt"
              />
            ) : (
              <div className="text-sm font-medium">{warehouses.find(w => w.id === warehouseId)?.name || "—"}</div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Date planifiée</Label>
            {canEdit ? (
              <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="h-9" />
            ) : (
              <div className="text-sm font-medium">{scheduledDate || "—"}</div>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Document d'origine</Label>
            {canEdit ? (
              <Input value={originDoc} onChange={e => setOriginDoc(e.target.value)} placeholder="Ex: BC/2025/00001" className="h-9" />
            ) : (
              <div className="text-sm font-mono text-primary">{originDoc || "—"}</div>
            )}
          </div>
        </div>

        {deliveryAddress && (
          <div className="mt-2 text-sm text-muted-foreground">
            📍 <span className="italic">{deliveryAddress}</span>
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-4">
        <Tabs defaultValue="operations">
          <TabsList className="mb-4">
            <TabsTrigger value="operations" className="gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Opérations
            </TabsTrigger>
            <TabsTrigger value="info">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Info complémentaire
            </TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* ── Opérations tab ────────────────────────────────────────── */}
          <TabsContent value="operations">
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[30%]">Produit</TableHead>
                    <TableHead className="w-[20%]">Description</TableHead>
                    <TableHead className="w-[10%] text-right">Qté demandée</TableHead>
                    <TableHead className="w-[10%] text-right">Qté livrée</TableHead>
                    <TableHead className="w-[8%]">Unité</TableHead>
                    <TableHead className="w-[10%] text-right">P.U.</TableHead>
                    <TableHead className="w-[8%] text-right">Total HT</TableHead>
                    {canEdit && <TableHead className="w-[4%]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        Aucun produit. Cliquez sur "Ajouter une ligne".
                      </TableCell>
                    </TableRow>
                  )}
                  {lines.map((line, idx) => {
                    const ht = line.quantity_delivered * line.unit_price * (1 - line.discount_percent / 100);
                    return (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="py-2">
                          {canEdit ? (
                          <SearchableSelect
                            options={productOptions}
                            value={line.product_id || ""}
                            onValueChange={v => updateLine(idx, "product_id", v)}
                            placeholder="Produit…"
                          />
                          ) : (
                            <span className="text-sm">{products.find(p => p.id === line.product_id)?.name || line.description}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          {canEdit ? (
                            <Input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)}
                              className="h-8 text-sm" placeholder="Description…" />
                          ) : (
                            <span className="text-sm text-muted-foreground">{line.description}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {canEdit ? (
                            <Input type="number" min={0}
                              value={line.quantity_ordered}
                              onChange={e => updateLine(idx, "quantity_ordered", Number(e.target.value))}
                              className="h-8 text-sm text-right w-20 ml-auto" />
                          ) : (
                            <span className="text-sm">{line.quantity_ordered}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {canEdit ? (
                            <Input type="number" min={0} max={line.quantity_ordered}
                              value={line.quantity_delivered}
                              onChange={e => updateLine(idx, "quantity_delivered", Math.min(Number(e.target.value), line.quantity_ordered))}
                              className={`h-8 text-sm text-right w-20 ml-auto ${line.quantity_delivered > line.quantity_ordered ? "border-destructive" : ""}`} />
                          ) : (
                            <span className={`text-sm font-medium ${line.quantity_delivered < line.quantity_ordered ? "text-warning-foreground" : "text-success"}`}>
                              {line.quantity_delivered}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm text-muted-foreground">{line.unit}</span>
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm">
                          {canEdit ? (
                            <Input type="number" min={0}
                              value={line.unit_price}
                              onChange={e => updateLine(idx, "unit_price", Number(e.target.value))}
                              className="h-8 text-sm text-right w-24 ml-auto" />
                          ) : (
                            <span>{line.unit_price.toFixed(2)}</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 text-right text-sm font-medium">
                          {ht.toFixed(2)}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="py-2 text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLine(idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {canEdit && (
              <Button variant="ghost" size="sm" className="mt-2 text-primary gap-1.5" onClick={addLine}>
                <Plus className="h-4 w-4" /> Ajouter une ligne
              </Button>
            )}

            {/* Summary */}
            <div className="mt-4 flex items-center gap-4 justify-between text-sm bg-muted/30 rounded-lg px-4 py-2">
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{lines.length} ligne(s)</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Qté livrée : <strong>{lines.reduce((s, l) => s + l.quantity_delivered, 0)}</strong></span>
              </div>
              <div className="font-semibold text-foreground">
                Total HT : {totalHT.toFixed(2)} MAD
              </div>
            </div>
          </TabsContent>

          {/* ── Info complémentaire ───────────────────────────────────── */}
          <TabsContent value="info">
            <div className="max-w-2xl space-y-4 bg-card border rounded-lg p-4">
              <div className="space-y-1">
                <Label className="text-sm">Adresse de livraison</Label>
                <Textarea value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Adresse complète de livraison…" rows={3} disabled={!canEdit} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Informations complémentaires</Label>
                <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)}
                  placeholder="Transporteur, numéro de suivi, contact destinataire…" rows={3} disabled={!canEdit} />
              </div>
              {linkedSO && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-muted-foreground">Bon de commande lié</Label>
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded px-3 py-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="font-mono text-sm text-primary">{linkedSO.order_number}</span>
                    <span className="text-muted-foreground text-xs ml-1">— {linkedSO.customer?.name}</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Notes ─────────────────────────────────────────────────── */}
          <TabsContent value="notes">
            <div className="max-w-2xl bg-card border rounded-lg p-4">
              <Label className="text-sm mb-2 block">Notes internes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notes internes, instructions de livraison…" rows={6} disabled={!canEdit} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Cancel dialog ───────────────────────────────────────────────── */}
      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le bon de livraison</AlertDialogTitle>
            <AlertDialogDescription>Un motif d'annulation est obligatoire.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Motif d'annulation…" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={!cancelReason.trim()}
              className="bg-destructive hover:bg-destructive/90">
              Annuler le BL
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Admin override dialog ──────────────────────────────────────── */}
      <AlertDialog open={overrideDialog} onOpenChange={setOverrideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dérogation — Livraison dépassée ou stock insuffisant</AlertDialogTitle>
            <AlertDialogDescription>
              La quantité livrée dépasse la commande ou le stock disponible est insuffisant.
              En tant qu'administrateur, vous pouvez forcer cette livraison. Un motif est obligatoire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Motif de dérogation…" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setOverrideDialog(false); doValidate(true); }} disabled={!overrideReason.trim()}>
              Valider avec dérogation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
