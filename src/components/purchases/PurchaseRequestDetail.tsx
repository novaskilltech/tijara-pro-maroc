import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Mail, FileText, Edit, Paperclip, ClipboardEdit } from "lucide-react";
import { PURCHASE_REQUEST_STATUS, getStatus } from "@/lib/status-config";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { openPrintHtml } from "@/lib/pdf/print-html";
import type { PdfDocumentData } from "@/lib/pdf/types";
import { toast } from "@/hooks/use-toast";
import { DocumentAttachmentsPanel } from "@/components/DocumentAttachmentsPanel";
import { SupplierResponseDialog } from "@/components/purchases/SupplierResponseDialog";

interface Props {
  item: any;
  onClose: () => void;
  onCreatePO?: (id: string) => Promise<any>;
  onEdit?: (item: any) => void;
  onSubmit?: (id: string) => void;
  onApprove?: (id: string) => void;
  onRefuse?: (id: string, reason?: string) => void;
  onRefresh?: () => void;
}

export function PurchaseRequestDetail({ item, onClose, onCreatePO, onEdit, onSubmit, onApprove, onRefuse, onRefresh }: Props) {
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingPO, setCreatingPO] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSupplierResponse, setShowSupplierResponse] = useState(false);
  const [currentItem, setCurrentItem] = useState(item);
  const { roles } = useAuth();
  const isAdmin = roles.some(r => ["super_admin", "admin"].includes(r));
  const { settings: companySettings } = useCompanySettings();
  const { activeCompany } = useCompany();

  const loadLines = () => {
    setLoading(true);
    (supabase as any).from("purchase_request_lines")
      .select("*, product:products(name, code)")
      .eq("request_id", currentItem.id).order("sort_order")
      .then(({ data }: any) => { setLines(data || []); setLoading(false); });
  };

  useEffect(() => { loadLines(); }, [currentItem.id]);

  const reloadItem = async () => {
    const { data } = await (supabase as any).from("purchase_requests")
      .select("*, supplier:suppliers(name, code), currency:currencies(code, symbol)")
      .eq("id", currentItem.id).single();
    if (data) setCurrentItem({ ...data, number: data.request_number, date: data.request_date || data.created_at?.split("T")[0] });
    loadLines();
    onRefresh?.();
  };

  const cfg = getStatus(PURCHASE_REQUEST_STATUS, currentItem.status);
  const isDraft = currentItem.status === "draft";
  const isSubmitted = currentItem.status === "submitted";
  const isApprovedOrValidated = ["approved", "validated"].includes(currentItem.status);
  const canEditSupplierResponse = isSubmitted || isApprovedOrValidated;

  // Check if any line has supplier price
  const hasSupplierPrices = lines.some(l => Number(l.supplier_unit_price) > 0);

  const handlePrint = () => {
    if (!companySettings) {
      toast({ title: "Erreur", description: "Paramètres société non chargés", variant: "destructive" });
      return;
    }
    const pdfLines = lines.map((l, i) => ({
      ref: l.product?.code || String(i + 1),
      description: l.description || l.product?.name || "",
      quantity: Number(l.quantity),
      unit: l.unit || "Unité",
      unit_price: 0, discount_percent: 0, tva_rate: 0, total_ht: 0, total_ttc: 0,
    }));
    const pdfData: PdfDocumentData = {
      type: "commande_fournisseur",
      number: currentItem.number,
      date: currentItem.needed_date || currentItem.date || new Date().toISOString().split("T")[0],
      party: {
        name: currentItem.supplier?.name || "—",
        ice: currentItem.supplier?.ice,
        address: currentItem.supplier?.address,
        city: currentItem.supplier?.city,
        phone: currentItem.supplier?.phone,
        email: currentItem.supplier?.email,
      },
      lines: pdfLines, subtotalHt: 0, totalTva: 0, totalTtc: 0,
      notes: currentItem.notes, company: companySettings as any,
    };
    openPrintRFQ(pdfData);
  };

  const handleEmail = () => {
    toast({ title: "Fonctionnalité à venir", description: "L'envoi par email sera disponible prochainement." });
  };

  const handleConfirmOrder = async () => {
    if (!onCreatePO) return;
    setCreatingPO(true);
    try {
      const po = await onCreatePO(currentItem.id);
      if (po) onClose();
    } finally {
      setCreatingPO(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <DialogTitle>{currentItem.number}</DialogTitle>
                <Badge className={`${cfg.className} border-0 text-xs`}>{cfg.label}</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAttach(!showAttach)}>
                  <Paperclip className="h-3.5 w-3.5 mr-1" /> Pièces jointes
                </Button>
                <Button size="sm" variant="outline" onClick={handleEmail}>
                  <Mail className="h-3.5 w-3.5 mr-1" /> Envoyer par email
                </Button>
                {isDraft && onEdit && (
                  <Button size="sm" variant="outline" onClick={() => { onClose(); onEdit(currentItem); }}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                  </Button>
                )}
                {isDraft && onSubmit && (
                  <Button size="sm" variant="default" onClick={() => { onSubmit(currentItem.id); onClose(); }}>
                    Soumettre
                  </Button>
                )}
                {isSubmitted && isAdmin && onApprove && (
                  <Button size="sm" variant="default" onClick={() => { onApprove(currentItem.id); onClose(); }}>
                    Approuver
                  </Button>
                )}
                {isSubmitted && isAdmin && onRefuse && (
                  <Button size="sm" variant="destructive" onClick={() => { onRefuse(currentItem.id); onClose(); }}>
                    Refuser
                  </Button>
                )}
                {canEditSupplierResponse && (
                  <Button size="sm" variant="outline" className="border-primary/50 text-primary" onClick={() => setShowSupplierResponse(true)}>
                    <ClipboardEdit className="h-3.5 w-3.5 mr-1" /> Réponse fournisseur
                  </Button>
                )}
                {isApprovedOrValidated && onCreatePO && (
                  <Button size="sm" variant="default" disabled={creatingPO} onClick={handleConfirmOrder}>
                    {creatingPO ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
                    Créer BC Fournisseur
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Fournisseur :</span> <strong>{currentItem.supplier?.name || "—"}</strong></div>
              <div><span className="text-muted-foreground">Réf. fournisseur :</span> <strong>{currentItem.supplier_reference || "—"}</strong></div>
              <div><span className="text-muted-foreground">Arrivée prévue :</span> <strong>{currentItem.needed_date || "—"}</strong></div>
              <div><span className="text-muted-foreground">Devise :</span> <strong>{currentItem.currency?.code || "MAD"}</strong></div>
            </div>

            {/* Supplier Response Section */}
            {(currentItem.supplier_response_date || currentItem.supplier_notes) && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-semibold text-primary">Réponse Fournisseur</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date réponse :</span> <strong>{currentItem.supplier_response_date || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Réf. fournisseur :</span> <strong>{currentItem.supplier_reference || "—"}</strong></div>
                </div>
                {currentItem.supplier_notes && (
                  <div className="text-sm"><span className="text-muted-foreground">Notes : </span>{currentItem.supplier_notes}</div>
                )}
              </div>
            )}

            {currentItem.notes && (
              <div className="text-sm bg-muted/50 rounded-md p-3">
                <span className="text-muted-foreground">Notes internes : </span>{currentItem.notes}
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2 text-foreground">Lignes de demande</h4>
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Produit / Description</th>
                        <th className="text-left px-3 py-2 font-medium">Réf.</th>
                        <th className="text-right px-3 py-2 font-medium">Qté</th>
                        <th className="text-right px-3 py-2 font-medium">Unité</th>
                        <th className="text-right px-3 py-2 font-medium">Prix estimé</th>
                        {hasSupplierPrices && <th className="text-right px-3 py-2 font-medium text-primary">Prix fourn.</th>}
                        {hasSupplierPrices && <th className="text-right px-3 py-2 font-medium text-primary">Remise %</th>}
                        <th className="text-right px-3 py-2 font-medium">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => {
                        const hasSupPrice = Number(l.supplier_unit_price) > 0;
                        const price = hasSupPrice ? Number(l.supplier_unit_price) : (Number(l.estimated_cost) || 0);
                        const disc = hasSupPrice ? (Number(l.supplier_discount_percent) || 0) : 0;
                        const ht = (Number(l.quantity) || 0) * price * (1 - disc / 100);
                        return (
                          <tr key={l.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                            <td className="px-3 py-2">{l.description || l.product?.name || "—"}</td>
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{l.product?.code || "—"}</td>
                            <td className="px-3 py-2 text-right">{l.quantity}</td>
                            <td className="px-3 py-2 text-right">{l.unit || "Unité"}</td>
                            <td className="px-3 py-2 text-right">{l.estimated_cost ? `${Number(l.estimated_cost).toLocaleString("fr-MA")}` : "—"}</td>
                            {hasSupplierPrices && (
                              <td className="px-3 py-2 text-right text-primary font-medium">
                                {hasSupPrice ? `${Number(l.supplier_unit_price).toLocaleString("fr-MA")}` : "—"}
                              </td>
                            )}
                            {hasSupplierPrices && (
                              <td className="px-3 py-2 text-right text-primary">
                                {hasSupPrice && disc > 0 ? `${disc}%` : "—"}
                              </td>
                            )}
                            <td className="px-3 py-2 text-right font-medium">{ht > 0 ? `${ht.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals */}
            {lines.length > 0 && (() => {
              const totalHT = lines.reduce((s, l) => {
                const hasSupPrice = Number(l.supplier_unit_price) > 0;
                const price = hasSupPrice ? Number(l.supplier_unit_price) : (Number(l.estimated_cost) || 0);
                const disc = hasSupPrice ? (Number(l.supplier_discount_percent) || 0) : 0;
                return s + (Number(l.quantity) || 0) * price * (1 - disc / 100);
              }, 0);
              const totalTVA = lines.reduce((s, l) => {
                const hasSupPrice = Number(l.supplier_unit_price) > 0;
                const price = hasSupPrice ? Number(l.supplier_unit_price) : (Number(l.estimated_cost) || 0);
                const disc = hasSupPrice ? (Number(l.supplier_discount_percent) || 0) : 0;
                const tva = hasSupPrice && l.supplier_tva_rate != null ? Number(l.supplier_tva_rate) : (Number(l.tva_rate) || 0);
                const ht = (Number(l.quantity) || 0) * price * (1 - disc / 100);
                return s + ht * tva / 100;
              }, 0);
              const totalTTC = totalHT + totalTVA;
              if (totalHT === 0) return null;
              return (
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-1 max-w-xs ml-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total HT</span>
                    <span className="font-medium">{totalHT.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total TVA</span>
                    <span className="font-medium">{totalTVA.toFixed(2)} MAD</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold border-t border-border pt-1">
                    <span>Total TTC</span>
                    <span>{totalTTC.toFixed(2)} MAD</span>
                  </div>
                </div>
              );
            })()}

            {showAttach && (
              <DocumentAttachmentsPanel
                docType="purchase_request"
                docId={currentItem.id}
                companyId={activeCompany?.id}
                readOnly={!isDraft && !isAdmin}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showSupplierResponse && (
        <SupplierResponseDialog
          item={currentItem}
          onClose={() => setShowSupplierResponse(false)}
          onSaved={reloadItem}
        />
      )}
    </>
  );
}

/**
 * Special print function for RFQ: shows product lines WITHOUT prices.
 */
function openPrintRFQ(data: PdfDocumentData) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Le navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.");
    return;
  }

  const c = data.company;
  const party = data.party;
  const BRAND = { primary: "#26B6E7", navy: "#002B49", cyan10: "#EBF8FD", textDark: "#1A2B3C", textMid: "#4A6070", textLight: "#7A919E", border: "#D4E2E9", zebra: "#F4FAFD" };

  const logoHtml = c.logo_url ? `<img src="${c.logo_url}" style="max-height:55px;max-width:160px;object-fit:contain;margin-bottom:4px" />` : "";

  const regRows = [
    c.ice ? `<tr><td style="font-size:7px;font-weight:700;color:${BRAND.textMid};padding:1.5px 4px 1.5px 0">ICE</td><td style="font-size:7px;text-align:right;padding:1.5px 0">${c.ice}</td></tr>` : "",
    c.if_number ? `<tr><td style="font-size:7px;font-weight:700;color:${BRAND.textMid};padding:1.5px 4px 1.5px 0">IF</td><td style="font-size:7px;text-align:right;padding:1.5px 0">${c.if_number}</td></tr>` : "",
    c.rc ? `<tr><td style="font-size:7px;font-weight:700;color:${BRAND.textMid};padding:1.5px 4px 1.5px 0">RC</td><td style="font-size:7px;text-align:right;padding:1.5px 0">${c.rc}</td></tr>` : "",
    c.patente ? `<tr><td style="font-size:7px;font-weight:700;color:${BRAND.textMid};padding:1.5px 4px 1.5px 0">Patente</td><td style="font-size:7px;text-align:right;padding:1.5px 0">${c.patente}</td></tr>` : "",
  ].filter(Boolean).join("");

  const linesHtml = data.lines.map((l, i) => {
    const zebra = i % 2 === 1 ? `background:${BRAND.zebra};` : "";
    return `<tr style="${zebra}border-bottom:1px solid ${BRAND.border}">
      <td style="padding:5px;text-align:center;font-size:8px">${l.ref || (i + 1)}</td>
      <td style="padding:5px;font-size:8px">${l.description}</td>
      <td style="padding:5px;text-align:center;font-size:8px">${l.quantity}</td>
      <td style="padding:5px;text-align:center;font-size:8px">${l.unit || "Unité"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>DEMANDE DE PRIX ${data.number}</title>
<style>
@page { size: A4; margin: 12mm 15mm; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;color:${BRAND.textDark};line-height:1.45;background:#fff}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;padding-bottom:12px;margin-bottom:14px;border-bottom:2.5px solid ${BRAND.primary}">
  <div>
    ${logoHtml}
    <div style="font-size:13px;font-weight:700;color:${BRAND.navy}">${c.raison_sociale}</div>
    ${c.forme_juridique ? `<div style="font-size:8px;color:${BRAND.textMid}">${c.forme_juridique}</div>` : ""}
    <div style="font-size:7.5px;color:${BRAND.textMid}">${[c.address, c.city, c.postal_code].filter(Boolean).join(", ")}</div>
    ${c.phone ? `<div style="font-size:7.5px;color:${BRAND.textMid}">Tél: ${c.phone}</div>` : ""}
    ${c.email ? `<div style="font-size:7.5px;color:${BRAND.textMid}">${c.email}</div>` : ""}
  </div>
  <div style="background:${BRAND.cyan10};border-radius:4px;padding:7px 9px">
    <table style="border-collapse:collapse">${regRows}</table>
  </div>
</div>

<div style="background:${BRAND.navy};border-radius:4px;padding:9px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
  <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:1.5px">DEMANDE DE PRIX</span>
  <div style="text-align:right">
    <div style="font-size:9px;color:${BRAND.primary};font-weight:700">N° ${data.number}</div>
    <div style="font-size:8px;color:#B0C8D8">Date: ${data.date}</div>
  </div>
</div>

<div style="display:flex;gap:10px;margin-bottom:14px">
  <div style="flex:1;border:1px solid ${BRAND.border};border-radius:5px;overflow:hidden">
    <div style="background:${BRAND.navy};padding:5px 10px"><span style="font-size:7.5px;color:#fff;font-weight:700;letter-spacing:.8px">FOURNISSEUR</span></div>
    <div style="padding:9px 10px;min-height:65px">
      <div style="font-size:9.5px;font-weight:700;color:${BRAND.navy}">${party.name}</div>
      ${party.address ? `<div style="font-size:7.5px;color:${BRAND.textMid}">${party.address}${party.city ? `, ${party.city}` : ""}</div>` : ""}
      ${party.phone ? `<div style="font-size:7.5px;color:${BRAND.textMid}">Tél: ${party.phone}</div>` : ""}
      ${party.email ? `<div style="font-size:7.5px;color:${BRAND.textMid}">${party.email}</div>` : ""}
      ${party.ice ? `<div style="font-size:7.5px;color:${BRAND.primary};font-weight:700">ICE: ${party.ice}</div>` : ""}
    </div>
  </div>
  <div style="flex:1;border:1px solid ${BRAND.border};border-radius:5px;overflow:hidden">
    <div style="background:${BRAND.navy};padding:5px 10px"><span style="font-size:7.5px;color:#fff;font-weight:700;letter-spacing:.8px">ÉMETTEUR</span></div>
    <div style="padding:9px 10px;min-height:65px">
      <div style="font-size:9.5px;font-weight:700;color:${BRAND.navy}">${c.raison_sociale}</div>
      <div style="font-size:7.5px;color:${BRAND.textMid}">${[c.address, c.city].filter(Boolean).join(", ")}</div>
      ${c.ice ? `<div style="font-size:7.5px;color:${BRAND.primary};font-weight:700">ICE: ${c.ice}</div>` : ""}
    </div>
  </div>
</div>

<table style="width:100%;border-collapse:collapse;margin-bottom:10px">
  <thead><tr style="background:${BRAND.navy}">
    <th style="color:#fff;font-size:7.5px;font-weight:700;padding:6px 5px;text-align:center;width:10%">Réf.</th>
    <th style="color:#fff;font-size:7.5px;font-weight:700;padding:6px 5px;text-align:left">Désignation</th>
    <th style="color:#fff;font-size:7.5px;font-weight:700;padding:6px 5px;text-align:center;width:10%">Qté</th>
    <th style="color:#fff;font-size:7.5px;font-weight:700;padding:6px 5px;text-align:center;width:10%">Unité</th>
  </tr></thead>
  <tbody>${linesHtml}</tbody>
</table>

${data.notes ? `<div style="border-left:3px solid ${BRAND.primary};background:${BRAND.cyan10};padding:7px 9px;border-radius:3px;margin-bottom:10px"><div style="font-size:7.5px;font-weight:700;color:${BRAND.textMid};text-transform:uppercase;margin-bottom:2px">Notes</div><div style="font-size:8px;line-height:1.4">${data.notes}</div></div>` : ""}

<div style="border-top:1.5px solid ${BRAND.primary};padding-top:6px;margin-top:20px;text-align:center;font-size:6.5px;color:${BRAND.textLight};line-height:1.7">
  ${c.raison_sociale} — ${c.forme_juridique || ""} au capital de ${c.capital ? Number(c.capital).toLocaleString("fr-FR") : "—"} MAD<br/>
  ICE: ${c.ice || "—"} | IF: ${c.if_number || "—"} | RC: ${c.rc || "—"} | Patente: ${c.patente || "—"}
</div>

<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
