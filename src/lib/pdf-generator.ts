import type { CompanySettings, CompanyBankAccount } from "@/hooks/useCompanySettings";

interface PdfLine {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tva_rate: number;
  total_ht: number;
  total_ttc: number;
}

interface PdfDocData {
  type: "devis" | "bon_commande" | "bon_livraison" | "facture" | "avoir";
  number: string;
  date: string;
  dueDate?: string;
  clientName: string;
  clientAddress?: string;
  clientIce?: string;
  lines: PdfLine[];
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  notes?: string;
  paymentTerms?: string;
}

const DOC_TITLES: Record<string, string> = {
  devis: "DEVIS",
  bon_commande: "BON DE COMMANDE",
  bon_livraison: "BON DE LIVRAISON",
  facture: "FACTURE",
  avoir: "AVOIR",
};

export async function generateDocumentPdf(
  data: PdfDocData,
  company: CompanySettings,
  bankAccount?: CompanyBankAccount | null
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const logoHtml = company.logo_url
    ? `<img src="${company.logo_url}" style="max-height:60px;max-width:200px;object-fit:contain;" />`
    : `<div style="font-size:24px;font-weight:bold;color:#1a365d;">${company.raison_sociale}</div>`;

  const linesHtml = data.lines.map((l, i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${i + 1}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${l.description}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${l.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${Number(l.unit_price).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${l.discount_percent || 0}%</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${l.tva_rate}%</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:500;">${Number(l.total_ht).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join("");

  // Build bank footer from dedicated bank account (not companies table)
  const bankFooter = bankAccount
    ? [
        bankAccount.bank_name ? `Banque: ${bankAccount.bank_name}` : "",
        bankAccount.rib ? `RIB: ${bankAccount.rib}` : "",
        bankAccount.swift ? `SWIFT: ${bankAccount.swift}` : "",
      ].filter(Boolean).join(" | ")
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${DOC_TITLES[data.type]} ${data.number}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #1a202c; line-height: 1.4; padding: 20px; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; }
    .logo-container { width: 50%; }
    .company-details { width: 45%; text-align: right; font-size: 9px; color: #4a5568; }
    
    .doc-info { display: flex; justify-content: space-between; margin-bottom: 25px; }
    .doc-title-box { width: 50%; }
    .doc-title-box h1 { font-size: 18px; color: #2b6cb0; text-transform: uppercase; margin-bottom: 5px; }
    .doc-title-box p { font-size: 12px; font-weight: bold; color: #4a5568; }
    
    .party-info { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
    .party-box { width: 48%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; background: #f8fafc; }
    .party-label { font-size: 8px; text-transform: uppercase; color: #718096; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
    .party-name { font-size: 11px; font-weight: bold; margin: 4px 0; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #2b6cb0; color: white; padding: 8px 5px; text-align: left; font-size: 9px; text-transform: uppercase; }
    td { padding: 7px 5px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    
    .totals-container { display: flex; justify-content: flex-end; }
    .totals-table { width: 250px; }
    .totals-table tr td { padding: 4px 8px; border-bottom: none; }
    .totals-table .total-row { background: #2b6cb0; color: white; font-weight: bold; font-size: 12px; }
    
    .notes-box { margin-top: 20px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 9px; min-height: 60px; }
    .notes-label { font-weight: bold; color: #4a5568; margin-bottom: 4px; display: block; }
    
    .footer { position: fixed; bottom: 10px; left: 0; right: 0; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8px; color: #718096; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      ${logoHtml}
      <div style="margin-top: 10px; font-weight: bold; font-size: 11px;">${company.raison_sociale}</div>
      <div style="font-size: 9px; color: #4a5568;">
        ${company.address ? `${company.address}<br>` : ""}
        ${company.city || ""} ${company.postal_code || ""}
      </div>
    </div>
    <div class="company-details">
      ${company.phone ? `Tél: ${company.phone}<br>` : ""}
      ${company.email ? `Email: ${company.email}<br>` : ""}
      ${company.ice ? `ICE: ${company.ice}<br>` : ""}
      ${company.if_number ? `IF: ${company.if_number}<br>` : ""}
      ${company.rc ? `RC: ${company.rc}<br>` : ""}
    </div>
  </div>

  <div class="doc-info">
    <div class="doc-title-box">
      <h1>${DOC_TITLES[data.type]}</h1>
      <p>N° ${data.number}</p>
    </div>
    <div style="text-align: right;">
      <p>Date: <strong>${data.date}</strong></p>
      ${data.dueDate ? `<p>Échéance: <strong>${data.dueDate}</strong></p>` : ""}
    </div>
  </div>

  <div class="party-info">
    <div class="party-box">
      <div class="party-label">Destinataire</div>
      <div class="party-name">${data.clientName}</div>
      ${data.clientAddress ? `<div>${data.clientAddress}</div>` : ""}
      ${data.clientIce ? `<div style="margin-top: 4px;">ICE: ${data.clientIce}</div>` : ""}
    </div>
    <div class="party-box">
      <div class="party-label">Informations de Paiement</div>
      ${data.paymentTerms ? `<div>Conditions: ${data.paymentTerms}</div>` : "<div>Conditions: Sur facture</div>"}
      ${bankAccount ? `<div style="margin-top: 5px;"><strong>${bankAccount.bank_name}</strong><br>RIB: ${bankAccount.rib}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>Désignation</th>
        <th style="width: 50px; text-align: center;">Qté</th>
        <th style="width: 80px; text-align: right;">P.U. HT</th>
        <th style="width: 40px; text-align: center;">Rem.</th>
        <th style="width: 40px; text-align: center;">TVA</th>
        <th style="width: 90px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <div class="totals-container">
    <table class="totals-table">
      <tr>
        <td>Total Hors Taxe</td>
        <td style="text-align: right; font-weight: bold;">${data.subtotalHt.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD</td>
      </tr>
      <tr>
        <td>Total TVA</td>
        <td style="text-align: right; font-weight: bold;">${data.totalTva.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL TTC</td>
        <td style="text-align: right;">${data.totalTtc.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD</td>
      </tr>
    </table>
  </div>

  ${data.notes ? `
  <div class="notes-box">
    <span class="notes-label">Notes:</span>
    ${data.notes}
  </div>` : ""}

  <div class="footer">
    ${company.raison_sociale} ${company.forme_juridique ? `— ${company.forme_juridique}` : ""} 
    ${company.capital ? `au capital de ${Number(company.capital).toLocaleString("fr-MA")} MAD` : ""}
    <br>
    ICE: ${company.ice || "—"} | IF: ${company.if_number || "—"} | RC: ${company.rc || "—"} | Patente: ${company.patente || "—"}
    <br>
    ${company.address ? `${company.address}, ` : ""}${company.city || ""} — Maroc
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
