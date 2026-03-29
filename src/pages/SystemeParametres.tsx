import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useAuth } from "@/hooks/useAuth";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useUnitsOfMeasure, UOM_CATEGORIES } from "@/hooks/useUnitsOfMeasure";
import type { ProductCategory } from "@/hooks/useProductCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, Save, Plus, X, Percent, DollarSign, FileText,
  ShieldCheck, Tag, Ruler, ChevronRight, Trash2, Pencil, Check
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Category row ───────────────────────────────────────────
function CategoryRow({
  cat,
  depth,
  parentOptions,
  onUpdate,
  onDelete,
  canEdit,
}: {
  cat: ProductCategory;
  depth: number;
  parentOptions: ProductCategory[];
  onUpdate: (id: string, data: Partial<ProductCategory>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);

  const save = async () => {
    await onUpdate(cat.id, { name });
    setEditing(false);
  };

  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 rounded-sm hover:bg-muted/40 group text-sm"
      style={{ paddingLeft: `${8 + depth * 20}px` }}
    >
      {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      <Badge variant="outline" className="text-xs shrink-0 font-mono">
        N{cat.level}
      </Badge>
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-sm flex-1"
            onKeyDown={(e) => e.key === "Enter" && save()}
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={save}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate">{cat.name}</span>
          {cat.code && <span className="text-xs text-muted-foreground font-mono">{cat.code}</span>}
          {canEdit && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => onDelete(cat.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Flatten with depth ─────────────────────────────────────
function flatWithDepth(
  cats: ProductCategory[],
  parentId: string | null = null,
  depth = 0
): { cat: ProductCategory; depth: number }[] {
  const result: { cat: ProductCategory; depth: number }[] = [];
  const children = cats.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);
  for (const c of children) {
    result.push({ cat: c, depth });
    result.push(...flatWithDepth(cats, c.id, depth + 1));
  }
  return result;
}

// ─── Main page ──────────────────────────────────────────────
const SystemeParametres = () => {
  const { settings, loading, update } = useSystemSettings();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const isAdmin = hasRole("admin") || isSuperAdmin;

  const { categories, createCategory, updateCategory, deleteCategory } = useProductCategories();
  const { units, createUnit, updateUnit, deleteUnit } = useUnitsOfMeasure();

  // ── TVA state
  const [tvaRates, setTvaRates] = useState<number[]>([]);
  const [newTva, setNewTva] = useState("");
  const [defaultTva, setDefaultTva] = useState(20);
  const [defaultCurrency, setDefaultCurrency] = useState("MAD");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("30j");
  const [docFormat, setDocFormat] = useState("TYPE/YEAR/0000X");
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [allowAdminOverrides, setAllowAdminOverrides] = useState(true);
  const [enableAttachments, setEnableAttachments] = useState(true);
  const [requireDoubleValidation, setRequireDoubleValidation] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── New category state
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatParent, setNewCatParent] = useState<string>("none");

  // ── New unit state
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitSymbol, setNewUnitSymbol] = useState("");
  const [newUnitCat, setNewUnitCat] = useState<string>("quantity");

  useEffect(() => {
    if (settings) {
      setTvaRates(settings.tva_rates);
      setDefaultTva(settings.default_tva);
      setDefaultCurrency(settings.default_currency);
      setDefaultPaymentTerms(settings.default_payment_terms);
      setDocFormat(settings.doc_numbering_format);
      setAllowNegativeStock(settings.allow_negative_stock);
      setAllowAdminOverrides(settings.allow_admin_overrides);
      setEnableAttachments(settings.enable_attachments);
      setRequireDoubleValidation(settings.require_double_validation ?? false);
    }
  }, [settings]);

  // ── TVA handlers
  const addTvaRate = () => {
    const val = parseFloat(newTva);
    if (isNaN(val) || val <= 0 || val > 100) { toast({ title: "Taux invalide", variant: "destructive" }); return; }
    if (tvaRates.includes(val)) { toast({ title: "Ce taux existe déjà", variant: "destructive" }); return; }
    setTvaRates([...tvaRates, val].sort((a, b) => a - b));
    setNewTva("");
  };

  const removeTvaRate = (rate: number) => {
    const updated = tvaRates.filter((r) => r !== rate);
    setTvaRates(updated);
    if (defaultTva === rate && updated.length > 0) setDefaultTva(updated[updated.length - 1]);
  };

  const handleSave = async () => {
    setSaving(true);
    await update({
      tva_rates: tvaRates as any,
      default_tva: defaultTva,
      default_currency: defaultCurrency,
      default_payment_terms: defaultPaymentTerms,
      doc_numbering_format: docFormat,
      allow_negative_stock: allowNegativeStock,
      allow_admin_overrides: allowAdminOverrides,
      enable_attachments: enableAttachments,
      require_double_validation: requireDoubleValidation,
    });
    setSaving(false);
  };

  // ── Category handlers
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const parentId = newCatParent === "none" ? null : newCatParent;
    await createCategory({
      name: newCatName.trim(),
      code: newCatCode.trim() || null,
      parent_id: parentId,
      is_active: true,
      sort_order: 0,
    } as any);
    setNewCatName("");
    setNewCatCode("");
    setNewCatParent("none");
  };

  // ── Unit handlers
  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitSymbol.trim()) return;
    await createUnit({
      name: newUnitName.trim(),
      symbol: newUnitSymbol.trim(),
      category: newUnitCat as any,
      is_active: true,
      is_default: false,
      sort_order: units.length,
    });
    setNewUnitName("");
    setNewUnitSymbol("");
  };

  if (loading) {
    return (
      <AppLayout title="Paramètres Système" subtitle="Configuration générale et conformité marocaine">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const flatCats = flatWithDepth(categories);
  // Only allow selecting categories up to level 2 as parents (so child = level 3 max)
  const parentOptions = categories.filter((c) => c.level < 3 && c.is_active);

  const unitsByCategory = units.reduce((acc, u) => {
    if (!acc[u.category]) acc[u.category] = [];
    acc[u.category].push(u);
    return acc;
  }, {} as Record<string, typeof units>);

  return (
    <AppLayout title="Paramètres Système" subtitle="Configuration générale et conformité marocaine">
      <div className="space-y-6 max-w-3xl">

        {/* ── TVA ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4 text-primary" /> Taux de TVA
            </CardTitle>
            <CardDescription>Gérez les taux de TVA applicables aux documents commerciaux</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {tvaRates.map((rate) => (
                <Badge key={rate} variant="secondary" className="text-sm gap-1 pr-1">
                  {rate}%
                  {isSuperAdmin && (
                    <button onClick={() => removeTvaRate(rate)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            {isSuperAdmin && (
              <div className="flex gap-2">
                <Input type="number" placeholder="Nouveau taux (%)" value={newTva}
                  onChange={(e) => setNewTva(e.target.value)} className="w-40"
                  onKeyDown={(e) => e.key === "Enter" && addTvaRate()} />
                <Button variant="outline" size="sm" onClick={addTvaRate}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground">TVA par défaut :</Label>
              <Select value={String(defaultTva)} onValueChange={(v) => setDefaultTva(Number(v))} disabled={!isSuperAdmin}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tvaRates.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Currency & Payment ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4 text-primary" /> Devise & Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Devise par défaut</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency} disabled={!isSuperAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAD">MAD - Dirham Marocain</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="USD">USD - Dollar US</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Conditions de paiement par défaut</Label>
              <Select value={defaultPaymentTerms} onValueChange={setDefaultPaymentTerms} disabled={!isSuperAdmin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comptant">Comptant</SelectItem>
                  <SelectItem value="30j">30 jours</SelectItem>
                  <SelectItem value="60j">60 jours</SelectItem>
                  <SelectItem value="90j">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Document numbering ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Numérotation des documents
            </CardTitle>
            <CardDescription>Format de numérotation automatique pour les documents commerciaux</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm">Format</Label>
              <Input value={docFormat} onChange={(e) => setDocFormat(e.target.value)} disabled={!isSuperAdmin} />
              <p className="text-xs text-muted-foreground">Exemple : FAC/2026/00001, BC/2026/00042</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Product Categories (3 levels) ─────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-primary" /> Catégories de produits
            </CardTitle>
            <CardDescription>Arborescence jusqu'à 3 niveaux (N1 › N2 › N3)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tree display */}
            <div className="border rounded-md divide-y divide-border bg-muted/20 max-h-72 overflow-y-auto">
              {flatCats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Aucune catégorie</p>
              ) : (
                flatCats.map(({ cat, depth }) => (
                  <CategoryRow
                    key={cat.id}
                    cat={cat}
                    depth={depth}
                    parentOptions={parentOptions}
                    onUpdate={updateCategory}
                    onDelete={deleteCategory}
                    canEdit={isAdmin}
                  />
                ))
              )}
            </div>

            {/* Add new category */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1 flex-1 min-w-32">
                  <Label className="text-xs">Nom *</Label>
                  <Input
                    placeholder="Nouvelle catégorie"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 w-24">
                  <Label className="text-xs">Code</Label>
                  <Input
                    placeholder="MAT"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-40">
                  <Label className="text-xs">Sous-catégorie de</Label>
                  <Select value={newCatParent} onValueChange={setNewCatParent}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Niveau 1 (racine) —</SelectItem>
                      {parentOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {"  ".repeat(p.level - 1)}{p.name} (N{p.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddCategory} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Units of Measure ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4 text-primary" /> Unités de mesure
            </CardTitle>
            <CardDescription>Unités disponibles dans les fiches produits (vente &amp; achat)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(UOM_CATEGORIES).map(([catKey, catLabel]) => {
              const catUnits = unitsByCategory[catKey] || [];
              if (catUnits.length === 0 && !isAdmin) return null;
              return (
                <div key={catKey}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    {catLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {catUnits.map((u) => (
                      <Badge
                        key={u.id}
                        variant={u.is_active ? "secondary" : "outline"}
                        className={cn("text-xs gap-1 pr-1", !u.is_active && "opacity-50")}
                      >
                        <span>{u.name}</span>
                        <span className="text-muted-foreground">({u.symbol})</span>
                        {u.is_default && <span className="text-primary text-[10px] ml-0.5">★</span>}
                        {isAdmin && (
                          <button
                            onClick={() => deleteUnit(u.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                    {catUnits.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Aucune unité</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add new unit */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2 items-end pt-2 border-t">
                <div className="space-y-1 flex-1 min-w-32">
                  <Label className="text-xs">Nom *</Label>
                  <Input
                    placeholder="Kilogramme"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 w-24">
                  <Label className="text-xs">Symbole *</Label>
                  <Input
                    placeholder="kg"
                    value={newUnitSymbol}
                    onChange={(e) => setNewUnitSymbol(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 w-36">
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={newUnitCat} onValueChange={setNewUnitCat}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(UOM_CATEGORIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddUnit} className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Advanced toggles ─────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Options avancées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Autoriser le stock négatif</Label>
                <p className="text-xs text-muted-foreground">Permet de valider des bons de sortie même si le stock est insuffisant</p>
              </div>
              <Switch checked={allowNegativeStock} onCheckedChange={setAllowNegativeStock} disabled={!isSuperAdmin} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Autoriser les dérogations admin</Label>
                <p className="text-xs text-muted-foreground">Permet aux admins de contourner certaines restrictions métier</p>
              </div>
              <Switch checked={allowAdminOverrides} onCheckedChange={setAllowAdminOverrides} disabled={!isSuperAdmin} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Pièces jointes</Label>
                <p className="text-xs text-muted-foreground">Activer/désactiver les pièces jointes sur les documents</p>
              </div>
              <Switch checked={enableAttachments} onCheckedChange={setEnableAttachments} disabled={!isSuperAdmin} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Double validation (Admin requise)</Label>
                <p className="text-xs text-muted-foreground">
                  Si activé : l'utilisateur soumet le document, puis un admin doit l'approuver avant validation définitive.
                  S'applique aux Devis, Bons de commande et Factures.
                </p>
              </div>
              <Switch checked={requireDoubleValidation} onCheckedChange={setRequireDoubleValidation} disabled={!isSuperAdmin} />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        {isSuperAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer les paramètres
            </Button>
          </div>
        )}

        {!isSuperAdmin && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Seul le Super Admin peut modifier les paramètres système. Vous êtes en mode lecture seule.
          </p>
        )}
      </div>
    </AppLayout>
  );
};

export default SystemeParametres;
