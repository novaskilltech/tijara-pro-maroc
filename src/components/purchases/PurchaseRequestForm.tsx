import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Plus, Trash2, Loader2, Building2, User2, Calendar, Hash, Globe, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { PurchaseLine } from "@/hooks/usePurchases";
import { Separator } from "@/components/ui/separator";

interface Props {
  editItem: any | null;
  hook: any;
  onClose: () => void;
}

const emptyLine = (): Partial<PurchaseLine> => ({
  product_id: null, description: "", quantity: 1, unit: "Unité", estimated_cost: 0, tva_rate: 0,
});

export function PurchaseRequestForm({ editItem, hook, onClose }: Props) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState(editItem?.supplier_id || "");
  const [neededDate, setNeededDate] = useState(editItem?.needed_date || "");
  const [supplierReference, setSupplierReference] = useState(editItem?.supplier_reference || "");
  const [currencyId, setCurrencyId] = useState(editItem?.currency_id || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [lines, setLines] = useState<Partial<PurchaseLine>[]>(editItem ? [] : [emptyLine()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierError, setSupplierError] = useState(false);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const selectedCurrency = currencies.find(c => c.id === currencyId);

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("suppliers").select("*").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setSuppliers(data || []));
    (supabase as any).from("currencies").select("id, code, symbol, name").eq("is_active", true).order("sort_order").then(({ data }: any) => {
      setCurrencies(data || []);
      if (!editItem && data?.length) {
        const mad = data.find((c: any) => c.code === "MAD");
        if (mad) setCurrencyId(mad.id);
        else setCurrencyId(data[0].id);
      }
    });
    (supabase as any).from("products").select("id, name, code, tva_rate").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setProducts(data || []));

    if (editItem) {
      setLoading(true);
      hook.getLines(editItem.id).then((l: any[]) => {
        setLines(l.map(r => ({ product_id: r.product_id, description: r.description, quantity: r.quantity, unit: r.unit || "Unité", estimated_cost: r.estimated_cost || 0, tva_rate: r.tva_rate })));
        setLoading(false);
      });
    }
  }, [companyId]);

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === "product_id") {
      const p = products.find((pr: any) => pr.id === value);
      if (p) {
        updated[idx].description = p.name;
        updated[idx].tva_rate = p.tva_rate || 20;
      }
    }
    setLines(updated);
  };

  const handleSave = async () => {
    if (!supplierId) {
      setSupplierError(true);
      toast({ title: "Champ obligatoire", description: "Fournisseur obligatoire", variant: "destructive" });
      return;
    }
    setSupplierError(false);

    // Validation: at least one product
    if (lines.length === 0 || lines.every(l => !l.product_id)) {
      toast({ title: "Erreur", description: "Veuillez ajouter au moins un produit", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editItem) {
        const result = await hook.update(editItem.id, {
          supplier_id: supplierId,
          needed_date: neededDate || null,
          supplier_reference: supplierReference || null,
          currency_id: currencyId || null,
          notes,
        }, lines.filter(l => l.product_id));
        if (result === false) {
          setSaving(false);
          return;
        }
        toast({ title: "Demande d'achat mise à jour" });
      } else {
        const result = await hook.create({
          supplierId,
          neededDate: neededDate || undefined,
          supplierReference: supplierReference || undefined,
          currencyId: currencyId || undefined,
          notes,
          lines: lines.filter(l => l.product_id),
        });
        if (!result) {
          setSaving(false);
          return;
        }
      }
      onClose();
    } catch (err: any) {
      console.error("Erreur sauvegarde demande d'achat:", err);
      toast({ title: "Erreur", description: err?.message || "Erreur inattendue lors de la sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  
  // Anti-duplicate filter for products
  const selectedProductIds = lines.map(l => l.product_id).filter(Boolean);
  const getProductOptions = (currentProductId: string | null | undefined) => {
    return products
      .filter(p => !selectedProductIds.includes(p.id) || p.id === currentProductId)
      .map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }));
  };

  const totalHT = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.estimated_cost) || 0), 0);
  const totalTVA = lines.reduce((sum, l) => {
    const ht = (Number(l.quantity) || 0) * (Number(l.estimated_cost) || 0);
    return sum + ht * (Number(l.tva_rate) || 0) / 100;
  }, 0);
  const totalTTC = totalHT + totalTVA;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8 bg-white p-10 rounded-xl shadow-sm border border-slate-200">
            {/* Header: Issuer vs Supplier */}
            <div className="grid grid-cols-2 gap-12">
              {/* Left Column: Issuer (Company) */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  {activeCompany?.logo_url ? (
                    <img src={activeCompany.logo_url} alt="Logo" className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">{activeCompany?.name || "Ma Société"}</h2>
                    <p className="text-sm font-medium text-primary uppercase tracking-wider">{activeCompany?.sector || "Secteur d'activité"}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <span>{activeCompany?.address || "Adresse de la société"}, {activeCompany?.city || "Ville"}, {activeCompany?.country || "Maroc"}</span>
                  </div>
                  {activeCompany?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeCompany.phone}</span>
                    </div>
                  )}
                  {activeCompany?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeCompany.email}</span>
                    </div>
                  )}
                  {activeCompany?.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeCompany.website}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Supplier Selection */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex-1">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <User2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Fournisseur / Destinataire</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <SearchableSelect
                        options={supplierOptions}
                        value={supplierId}
                        onValueChange={(v) => { setSupplierId(v); setSupplierError(false); }}
                        placeholder="Sélectionner un fournisseur..."
                      />
                      {supplierError && (
                        <p className="text-xs text-destructive mt-1 font-medium">Veuillez sélectionner un fournisseur</p>
                      )}
                    </div>
                    
                    {selectedSupplier && (
                      <div className="space-y-2 text-sm pt-2">
                        <p className="font-bold text-slate-900">{selectedSupplier.name}</p>
                        <p className="text-slate-600 line-clamp-2">{selectedSupplier.address}</p>
                        <p className="text-slate-600 font-medium">{selectedSupplier.email}</p>
                        <p className="text-slate-600">{selectedSupplier.phone}</p>
                        <div className="pt-2 flex gap-2">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500">ICE: {selectedSupplier.ice || "-"}</span>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500">IF: {selectedSupplier.if_number || "-"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title and Meta */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 border-t border-slate-100">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">DEMANDE D'ACHAT</h1>
                <p className="text-slate-400 font-medium">Soumise pour approbation au fournisseur sélectionné</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto min-w-[340px]">
                <div className="space-y-1.5 flex-1 shadow-sm px-4 py-3 bg-primary/5 rounded-xl border border-primary/10">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70 flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Numéro de document
                  </Label>
                  <p className="text-lg font-black text-primary">{editItem?.number || "Brouillon — AUTO"}</p>
                </div>
                <div className="space-y-1.5 flex-1 shadow-sm px-4 py-3 bg-white rounded-xl border border-slate-200">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Date d'émission
                  </Label>
                  <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Référence Externe (Devis)</Label>
                <Input placeholder="Ex: DV-2024-001" value={supplierReference} onChange={e => setSupplierReference(e.target.value)} className="bg-white border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Arrivée prévue (Souhaitée)</Label>
                <Input type="date" value={neededDate} onChange={e => setNeededDate(e.target.value)} className="bg-white border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Devise</Label>
                <Select value={currencyId} onValueChange={setCurrencyId}>
                  <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Table */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Détails des articles</h3>
                <Button size="sm" variant="outline" className="h-8 text-xs font-bold bg-white hover:bg-slate-50 border-slate-200 shadow-sm" onClick={() => setLines([...lines, emptyLine()])}>
                  <Plus className="h-3.5 w-3.5 mr-1.5 text-primary" /> Ajouter un produit
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                    <p className="text-sm font-medium text-slate-400">Chargement des données...</p>
                  </div>
                </div>
              ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Produit</th>
                        <th className="text-center px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider w-[120px]">Quantité</th>
                        <th className="text-center px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider w-[100px]">UdM</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider w-[140px]">Prix Unit. {selectedCurrency?.symbol}</th>
                        <th className="text-center px-4 py-3 font-bold text-slate-500 uppercase text-[10px] tracking-wider w-[80px]">TVA %</th>
                        <th className="text-right px-4 py-3 font-bold text-slate-900 uppercase text-[10px] tracking-wider w-[140px] bg-slate-100/50">Total HT</th>
                        <th className="w-[50px] bg-slate-50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => {
                        const lineHT = (Number(line.quantity) || 0) * (Number(line.estimated_cost) || 0);
                        return (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <SearchableSelect 
                                options={getProductOptions(line.product_id)} 
                                value={line.product_id || ""} 
                                onValueChange={v => updateLine(idx, "product_id", v)} 
                                placeholder="Sélectionner un produit..." 
                                className="min-w-[200px] border-transparent hover:border-slate-200 focus:border-primary transition-all" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input className="h-9 text-center font-medium border-slate-200 group-hover:border-slate-300" type="number" min={0} value={line.quantity || ""} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} />
                            </td>
                            <td className="px-4 py-3">
                              <Select value={line.unit || "Unité"} onValueChange={v => updateLine(idx, "unit", v)}>
                                <SelectTrigger className="h-9 border-slate-200 group-hover:border-slate-300 bg-white"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["Unité", "Kg", "L", "m", "m²", "Boîte", "Carton", "Pièce", "Sac"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <Input className="h-9 text-right pr-7 font-bold text-slate-900 border-slate-200 group-hover:border-slate-300" type="number" min={0} placeholder="0,00" value={line.estimated_cost || ""} onChange={e => updateLine(idx, "estimated_cost", Number(e.target.value))} />
                                <span className="absolute right-2 top-2.5 text-[10px] font-bold text-slate-400">{selectedCurrency?.symbol}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Input className="h-9 text-center border-slate-200 group-hover:border-slate-300" type="number" min={0} value={line.tva_rate || ""} onChange={e => updateLine(idx, "tva_rate", Number(e.target.value))} />
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-900 bg-slate-50/30">
                              {lineHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-300 hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-medium italic">Aucun produit ajouté</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Section: Notes and Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Label className="text-xs font-bold uppercase tracking-widest">Notes & Instructions spécialisées</Label>
                </div>
                <Textarea 
                  placeholder="Conditions de livraison, délais particuliers, etc..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={4} 
                  className="bg-white border-slate-200 focus:ring-primary/20 rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end">
                <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-8 shadow-xl shadow-slate-200 space-y-4 border border-slate-800">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Total HT</span>
                    <span className="text-lg font-bold">{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {selectedCurrency?.symbol}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">Total TVA</span>
                    <span className="text-lg font-bold">{totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {selectedCurrency?.symbol}</span>
                  </div>
                  <Separator className="bg-slate-800" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-widest text-primary">Total TTC</span>
                    <div className="text-right">
                      <span className="block text-3xl font-black text-white leading-none">
                        {totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} 
                      </span>
                      <span className="text-xs font-bold text-primary tracking-widest">{selectedCurrency?.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-between items-center shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <div className="h-2 w-2 rounded-full bg-orange-400"></div>
            Statut actuel : Brouillon (Non enregistré)
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 hover:bg-slate-100">
              Annuler les modifications
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0">
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              {editItem ? "Confirmer les modifications" : "Générer la demande d'achat"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

