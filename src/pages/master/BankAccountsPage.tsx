import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCrud } from "@/hooks/useCrud";
import { supabase } from "@/integrations/supabase/client";
import { Landmark, Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Link } from "react-router-dom";

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  rib: string;
  swift: string;
  currency: string;
  is_default: boolean;
  is_active: boolean;
}

interface Bank {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}

export default function BankAccountsPage() {
  const { data, loading, create, update, remove } = useCrud<BankAccount>({ table: "bank_accounts", companyScoped: true });
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [rib, setRib] = useState("");
  const [swift, setSwift] = useState("");
  const [currency, setCurrency] = useState("MAD");

  useEffect(() => {
    (supabase as any).from("banks").select("id, name, code, is_active").eq("is_active", true).order("sort_order").then(({ data: d }: any) => {
      setBanks(d || []);
      setBanksLoading(false);
    });
  }, []);

  const filtered = data.filter((row: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [row.bank_name, row.account_name, row.account_number, row.rib].some(v => v && String(v).toLowerCase().includes(s));
  });

  const resetForm = () => {
    setBankName(""); setAccountName(""); setAccountNumber(""); setRib(""); setSwift(""); setCurrency("MAD");
  };

  const openCreate = () => {
    resetForm();
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (row: any) => {
    setBankName(row.bank_name || "");
    setAccountName(row.account_name || "");
    setAccountNumber(row.account_number || "");
    setRib(row.rib || "");
    setSwift(row.swift || "");
    setCurrency(row.currency || "MAD");
    setEditingId(row.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: any = { bank_name: bankName, account_name: accountName, account_number: accountNumber, rib, swift, currency };
    const ok = editingId
      ? await update(editingId, payload)
      : await create(payload);
    setSaving(false);
    if (ok) setDialogOpen(false);
  };

  if (loading || banksLoading) {
    return (
      <AppLayout title="Comptes Bancaires" subtitle="Gestion des comptes bancaires de l'entreprise">
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Comptes Bancaires" subtitle="Gestion des comptes bancaires de l'entreprise">
      {banks.length === 0 ? (
        <EmptyState
          icon={<Landmark className="h-8 w-8" />}
          title="Aucune banque configurée"
          description="Vous devez d'abord configurer les banques avant d'ajouter un compte bancaire."
          actionLabel="Configurer les banques"
          onAction={() => window.location.href = "/config/banques"}
        />
      ) : data.length === 0 && !search ? (
        <>
          <EmptyState
            icon={<Landmark className="h-8 w-8" />}
            title="Aucun compte bancaire"
            description="Ajoutez votre premier compte bancaire pour commencer."
            actionLabel="Ajouter"
            onAction={openCreate}
          />
          {renderDialog()}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
            </div>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Banque</TableHead>
                  <TableHead>Intitulé du compte</TableHead>
                  <TableHead>N° de compte</TableHead>
                  <TableHead>RIB</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row: any, i) => (
                  <TableRow key={row.id} className={`cursor-pointer hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`} onClick={() => openEdit(row)}>
                    <TableCell>{row.bank_name || "—"}</TableCell>
                    <TableCell>{row.account_name || "—"}</TableCell>
                    <TableCell>{row.account_number || "—"}</TableCell>
                    <TableCell>{row.rib || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(row); }}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); remove(row.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun résultat.</p>}
          </div>

          {renderDialog()}
        </div>
      )}
    </AppLayout>
  );

  function renderDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier" : "Nouveau"} Compte Bancaire</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Banque *</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une banque" /></SelectTrigger>
                <SelectContent>
                  {banks.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Intitulé du compte *</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Compte courant principal" />
            </div>
            <div>
              <Label>N° de compte</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="00000000" />
            </div>
            <div>
              <Label>RIB</Label>
              <Input value={rib} onChange={(e) => setRib(e.target.value)} placeholder="RIB complet" />
            </div>
            <div>
              <Label>SWIFT</Label>
              <Input value={swift} onChange={(e) => setSwift(e.target.value)} placeholder="BCMAMAMC" />
            </div>
            <div>
              <Label>Devise</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MAD" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !bankName || !accountName}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
