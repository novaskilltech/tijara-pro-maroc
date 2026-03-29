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
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a202c; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #2b6cb0; }
    .company-info { font-size: 10px; color: #4a5568; line-height: 1.6; }
    .doc-title { text-align: center; margin: 20px 0; }
    .doc-title h1 { font-size: 22px; color: #2b6cb0; letter-spacing: 2px; }
    .doc-title .doc-number { font-size: 14px; color: #4a5568; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; margin: 20px 0 30px; }
    .party-box { width: 48%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 4px; }
    .party-box h3 { font-size: 10px; text-transform: uppercase; color: #718096; margin-bottom: 6px; letter-spacing: 1px; }
    .party-box p { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #2b6cb0; color: white; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .totals { margin-left: auto; width: 280px; }
    .totals tr td { padding: 6px 12px; font-size: 12px; }
    .totals .total-row { background: #2b6cb0; color: white; font-size: 14px; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #718096; text-align: center; line-height: 1.8; }
    .notes { margin-top: 20px; padding: 10px; background: #f7fafc; border-left: 3px solid #2b6cb0; font-size: 10px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>${logoHtml}
      <div class="company-info" style="margin-top:8px;">
        <strong>${company.raison_sociale}</strong> ${company.forme_juridique ? `— ${company.forme_juridique}` : ""}<br/>
        ${company.address ? `${company.address}, ` : ""}${company.city || ""} ${company.postal_code || ""}<br/>
        ${company.phone ? `Tél: ${company.phone}` : ""}${company.fax ? ` | Fax: ${company.fax}` : ""}<br/>
        ${company.email ? `Email: ${company.email}` : ""}${company.website ? ` | ${company.website}` : ""}
      </div>
    </div>
    <div class="company-info" style="text-align:right;">
      ${company.ice ? `ICE: ${company.ice}<br/>` : ""}
      ${company.if_number ? `IF: ${company.if_number}<br/>` : ""}
      ${company.rc ? `RC: ${company.rc}<br/>` : ""}
      ${company.patente ? `Patente: ${company.patente}<br/>` : ""}
      ${company.cnss ? `CNSS: ${company.cnss}<br/>` : ""}
      ${company.capital ? `Capital: ${Number(company.capital).toLocaleString("fr-MA")} MAD` : ""}
    </div>
  </div>

  <div class="doc-title">
    <h1>${DOC_TITLES[data.type]}</h1>
    <div class="doc-number">${data.number} — ${data.date}</div>
  </div>

  <div class="parties">
    <div class="party-box">
      <h3>Client / Tiers</h3>
      <p><strong>${data.clientName}</strong></p>
      ${data.clientAddress ? `<p>${data.clientAddress}</p>` : ""}
      ${data.clientIce ? `<p>ICE: ${data.clientIce}</p>` : ""}
    </div>
    <div class="party-box">
      <h3>Informations</h3>
      <p>Date: <strong>${data.date}</strong></p>
      ${data.dueDate ? `<p>Échéance: <strong>${data.dueDate}</strong></p>` : ""}
      ${data.paymentTerms ? `<p>Conditions: ${data.paymentTerms}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;text-align:center;">#</th>
        <th>Désignation</th>
        <th style="width:60px;text-align:center;">Qté</th>
        <th style="width:90px;text-align:right;">P.U. (MAD)</th>
        <th style="width:60px;text-align:center;">Rem.</th>
        <th style="width:60px;text-align:center;">TVA</th>
        <th style="width:100px;text-align:right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Total HT</td><td style="text-align:right;">${data.subtotalHt.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD</td></tr>
    <tr><td>Total TVA</td><td style="text-align:right;">${data.totalTva.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD</td></tr>
    <tr class="total-row"><td style="padding:10px 12px;">Total TTC</td><td style="text-align:right;padding:10px 12px;">${data.totalTtc.toLocaleString("fr-MA", { minimumFractionDigits: 2 })} MAD</td></tr>
  </table>

  ${data.notes ? `<div class="notes"><strong>Notes:</strong> ${data.notes}</div>` : ""}

  <div class="footer">
    ${company.raison_sociale} — ${company.forme_juridique || ""} au capital de ${company.capital ? Number(company.capital).toLocaleString("fr-MA") : "—"} MAD<br/>
    ${bankFooter ? `${bankFooter}<br/>` : ""}
    ICE: ${company.ice || "—"} | IF: ${company.if_number || "—"} | RC: ${company.rc || "—"} | Patente: ${company.patente || "—"}
  </div>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
