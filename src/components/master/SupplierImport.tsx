import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, AlertCircle, CheckCircle2, Download } from "lucid-react";
import * as XLSX from 'xlsx';

interface SupplierImportProps {
  onImportDone: () => void;
  companyId: string | null;
}

interface ImportError {
  row: number;
  message: string;
}

export function SupplierImport({ onImportDone, companyId }: SupplierImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        code: "FRN-001",
        name: "Fournisseur Exemple",
        entity_type: "morale",
        ice: "123456789012345",
        rc: "12345",
        if_number: "67890",
        email: "contact@exemple.ma",
        phone: "0522000000",
        city: "Casablanca",
        address: "Rue 1, Casablanca",
        payment_terms: "30j"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modèle");
    XLSX.writeFile(wb, "Modele_Import_Fournisseurs.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setErrors([]);
    setImported(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        if (data.length === 0) {
          setErrors([{ row: 0, message: "Le fichier est vide." }]);
          setImporting(false);
          return;
        }

        const importErrors: ImportError[] = [];
        let count = 0;

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2; // +1 for index, +1 for header

          if (!row.code || !row.name) {
            importErrors.push({ row: rowNum, message: "Le code et la raison sociale sont obligatoires." });
            continue;
          }

          // Validation pour personne morale
          if (row.entity_type === "morale" && (!row.ice || !row.rc || !row.if_number)) {
            importErrors.push({ row: rowNum, message: "ICE, RC et IF sont obligatoires pour une personne morale." });
            continue;
          }

          const record = {
            company_id: companyId,
            code: String(row.code),
            name: String(row.name),
            entity_type: row.entity_type === "physique" ? "physique" : "morale",
            ice: row.ice ? String(row.ice) : null,
            rc: row.rc ? String(row.rc) : null,
            if_number: row.if_number ? String(row.if_number) : null,
            patente: row.patente ? String(row.patente) : null,
            email: row.email ? String(row.email) : null,
            phone: row.phone ? String(row.phone) : null,
            city: row.city ? String(row.city) : null,
            address: row.address ? String(row.address) : null,
            payment_terms: row.payment_terms || "30j",
            is_active: true
          };

          const { error } = await supabase.from("suppliers").insert(record);
          if (error) {
            importErrors.push({ row: rowNum, message: error.message });
          } else {
            count++;
          }
        }

        setErrors(importErrors);
        setImported(count);
        if (count > 0) {
          onImportDone();
          toast.success(`${count} fournisseurs importés avec succès.`);
        }
      } catch (err: any) {
        setErrors([{ row: 0, message: `Erreur lors de la lecture du fichier : ${err.message}` }]);
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4" /> Importer
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer des fournisseurs</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Utilisez un fichier Excel (.xlsx) ou CSV.
              </p>
              <Button variant="link" size="sm" onClick={downloadTemplate} className="h-auto p-0 gap-1 text-xs">
                <Download className="h-3 w-3" /> Télécharger le modèle
              </Button>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/30">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
                id="supplier-import-input"
              />
              <label 
                htmlFor="supplier-import-input"
                className={`flex flex-col items-center cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="bg-primary/10 p-3 rounded-full mb-2">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">Cliquez pour sélectionner un fichier</span>
                <span className="text-xs text-muted-foreground mt-1">Excel ou CSV uniquement</span>
              </label>
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Importation en cours...
              </div>
            )}

            {imported > 0 && (
              <div className="bg-success/10 border border-success/20 rounded-md p-3 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div className="text-sm text-success font-medium">
                  {imported} fournisseur(s) importé(s) avec succès.
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertCircle className="h-4 w-4" /> Erreurs détectées ({errors.length})
                </div>
                <div className="max-h-40 overflow-y-auto border border-destructive/20 rounded bg-destructive/5 p-2 text-xs space-y-1.5 tabular-nums">
                  {errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-destructive">
                      <span className="font-bold shrink-0">Ligne {err.row}:</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
