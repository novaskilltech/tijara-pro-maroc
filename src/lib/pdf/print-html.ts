import type { PdfDocumentData } from "./types";
import { DOC_TITLES, DOC_PARTY_LABEL, BRAND } from "./types";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Opens a new browser tab with an HTML rendition of the document
 * and automatically triggers the native print dialog (Ctrl+P).
 */
export function openPrintHtml(data: PdfDocumentData) {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    alert("Le navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.");
    return;
  }

  const c = data.company;
  const party = data.party;
  const partyLabel = DOC_PARTY_LABEL[data.type];

  const logoHtml = c.logo_url
    ? `<img src="${c.logo_url}" class="logo" />`
    : "";

  const regRows = [
    c.ice ? `<tr><td class="reg-l">ICE</td><td class="reg-v">${c.ice}</td></tr>` : "",
    c.if_number ? `<tr><td class="reg-l">IF</td><td class="reg-v">${c.if_number}</td></tr>` : "",
    c.rc ? `<tr><td class="reg-l">RC</td><td class="reg-v">${c.rc}</td></tr>` : "",
    c.patente ? `<tr><td class="reg-l">Patente</td><td class="reg-v">${c.patente}</td></tr>` : "",
    c.cnss ? `<tr><td class="reg-l">CNSS</td><td class="reg-v">${c.cnss}</td></tr>` : "",
    c.capital ? `<tr><td class="reg-l">Capital</td><td class="reg-v">${Number(c.capital).toLocaleString("fr-FR")} MAD</td></tr>` : "",
  ].filter(Boolean).join("");

  const infoBoxes: string[] = [];
  infoBoxes.push(`<div class="info-box"><div class="info-l">Date du document</div><div class="info-v">${data.date}</div></div>`);
  if (data.dueDate) infoBoxes.push(`<div class="info-box"><div class="info-l">Échéance</div><div class="info-v">${data.dueDate}</div></div>`);
  if (data.paymentTerms) infoBoxes.push(`<div class="info-box"><div class="info-l">Conditions</div><div class="info-v">${data.paymentTerms}</div></div>`);
  if (data.originRef) infoBoxes.push(`<div class="info-box"><div class="info-l">Réf. origine</div><div class="info-v">${data.originRef}</div></div>`);

  const linesHtml = data.lines.map((l, i) => {
    const zebra = i % 2 === 1 ? ` class="zebra"` : "";
    return `<tr${zebra}>
      <td class="c">${l.ref || (i + 1)}</td>
      <td>${l.description}</td>
      <td class="c">${l.quantity}</td>
      <td class="c">${l.unit || "Unité"}</td>
      <td class="r">${fmt(l.unit_price)}</td>
      <td class="c">${l.discount_percent || 0}%</td>
      <td class="c">${l.tva_rate}%</td>
      <td class="r b">${fmt(l.total_ht)}</td>
      <td class="r b">${fmt(l.total_ttc)}</td>
    </tr>`;
  }).join("");

  const bankHtml = data.bankAccount
    ? `<div class="bank-box">
        <div class="bank-title">Coordonnées bancaires</div>
        ${data.bankAccount.bank_name ? `<div class="bank-row"><span class="bank-l">Banque</span><span>${data.bankAccount.bank_name}</span></div>` : ""}
        ${data.bankAccount.account_name ? `<div class="bank-row"><span class="bank-l">Titulaire</span><span>${data.bankAccount.account_name}</span></div>` : ""}
        ${data.bankAccount.rib ? `<div class="bank-row"><span class="bank-l">RIB</span><span>${data.bankAccount.rib}</span></div>` : ""}
        ${data.bankAccount.swift ? `<div class="bank-row"><span class="bank-l">SWIFT</span><span>${data.bankAccount.swift}</span></div>` : ""}
       </div>`
    : "";

  const balanceRows = [
    data.amountPaid != null && data.amountPaid > 0
      ? `<tr><td class="tot-l">Montant payé</td><td class="tot-v">${fmt(data.amountPaid)} MAD</td></tr>`
      : "",
    data.remainingBalance != null
      ? `<tr class="balance"><td class="tot-l">Solde restant</td><td class="tot-v">${fmt(data.remainingBalance)} MAD</td></tr>`
      : "",
  ].filter(Boolean).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${DOC_TITLES[data.type]} ${data.number}</title>
<style>
@page { size: A4; margin: 12mm 15mm; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;color:${BRAND.textDark};line-height:1.45;background:#fff}

/* ── Header ── */
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;margin-bottom:14px;border-bottom:2.5px solid ${BRAND.primary}}
.logo{max-height:55px;max-width:160px;object-fit:contain;margin-bottom:4px}
.company-name{font-size:13px;font-weight:700;color:${BRAND.navy};margin-bottom:1px}
.company-sub{font-size:8px;color:${BRAND.textMid};margin-bottom:3px}
.company-line{font-size:7.5px;color:${BRAND.textMid};line-height:1.5}
.reg-box{background:${BRAND.cyan10};border-radius:4px;padding:7px 9px}
.reg-box table{width:100%;border-collapse:collapse}
.reg-l{font-size:7px;font-weight:700;color:${BRAND.textMid};padding:1.5px 4px 1.5px 0}
.reg-v{font-size:7px;color:${BRAND.textDark};text-align:right;padding:1.5px 0}

/* ── Title band ── */
.title-band{background:${BRAND.navy};border-radius:4px;padding:9px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.title-band h1{font-size:16px;color:#fff;letter-spacing:1.5px;margin:0;font-weight:700}
.title-meta{text-align:right}
.title-num{font-size:9px;color:${BRAND.primary};font-weight:700}
.title-date{font-size:8px;color:#B0C8D8}

/* ── Info row ── */
.info-row{display:flex;gap:8px;margin-bottom:12px}
.info-box{flex:1;background:${BRAND.cyan10};border-radius:4px;padding:6px 8px;border-left:3px solid ${BRAND.primary}}
.info-l{font-size:7px;font-weight:700;color:${BRAND.textMid};text-transform:uppercase;margin-bottom:2px}
.info-v{font-size:8.5px;font-weight:700;color:${BRAND.textDark}}

/* ── Parties ── */
.parties{display:flex;gap:10px;margin-bottom:14px}
.party-box{flex:1;border:1px solid ${BRAND.border};border-radius:5px;overflow:hidden}
.party-head{background:${BRAND.navy};padding:5px 10px}
.party-head span{font-size:7.5px;color:#fff;font-weight:700;letter-spacing:.8px}
.party-body{padding:9px 10px;min-height:65px}
.party-name{font-size:9.5px;font-weight:700;color:${BRAND.navy};margin-bottom:3px}
.party-line{font-size:7.5px;color:${BRAND.textMid};margin-bottom:1.5px}
.party-hl{font-size:7.5px;color:${BRAND.primary};font-weight:700;margin-bottom:1.5px}

/* ── Table ── */
table.lines{width:100%;border-collapse:collapse;margin-bottom:10px}
table.lines th{background:${BRAND.navy};color:#fff;font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:6px 5px}
table.lines td{padding:5px;border-bottom:1px solid ${BRAND.border};font-size:8px}
table.lines tr.zebra{background:${BRAND.zebra}}
.c{text-align:center}.r{text-align:right}.b{font-weight:600}

/* ── Totals ── */
table.totals{width:210px;margin-left:auto;border:1px solid ${BRAND.border};border-radius:5px;overflow:hidden;border-collapse:collapse;margin-bottom:14px}
.tot-l{font-size:8px;color:${BRAND.textMid};padding:5px 10px}
.tot-v{font-size:8px;font-weight:700;color:${BRAND.textDark};text-align:right;padding:5px 10px}
table.totals tr{border-bottom:1px solid ${BRAND.border}}
table.totals tr.final{background:${BRAND.navy}}
table.totals tr.final td{color:#fff;font-size:10px;font-weight:700;padding:8px 10px}
table.totals tr.final td:last-child{color:${BRAND.primary}}
table.totals tr.balance{background:${BRAND.cyan10}}
table.totals tr.balance td{color:${BRAND.primary};font-weight:700}

/* ── Notes ── */
.notes-box{border-left:3px solid ${BRAND.primary};background:${BRAND.cyan10};padding:7px 9px;border-radius:3px;margin-bottom:10px}
.notes-label{font-size:7.5px;font-weight:700;color:${BRAND.textMid};text-transform:uppercase;margin-bottom:2px}
.notes-text{font-size:8px;color:${BRAND.textDark};line-height:1.4}

/* ── Bank ── */
.bank-box{background:${BRAND.cyan10};border-radius:3px;padding:6px 8px;margin-bottom:8px}
.bank-title{font-size:7px;font-weight:700;color:${BRAND.navy};text-transform:uppercase;margin-bottom:3px}
.bank-row{font-size:7px;color:${BRAND.textDark};margin-bottom:1px}
.bank-l{color:${BRAND.textMid};display:inline-block;width:55px}

/* ── Footer ── */
#page-footer{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  padding:0 15mm 0 15mm;
  background:#fff;
}
#page-content{
  padding-bottom:55px;
}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .no-print{display:none!important}
  #page-footer{position:fixed;bottom:0}
  @page{margin-bottom:20mm}
}
</style>
</head>
<body>

<div id="page-content">
<div class="header">
  <div>
    ${logoHtml}
    <div class="company-name">${c.raison_sociale}</div>
    ${c.forme_juridique ? `<div class="company-sub">${c.forme_juridique}</div>` : ""}
    <div class="company-line">${[c.address, c.city, c.postal_code].filter(Boolean).join(", ")}</div>
    ${c.phone || c.fax ? `<div class="company-line">${c.phone ? `Tél: ${c.phone}` : ""}${c.phone && c.fax ? " | " : ""}${c.fax ? `Fax: ${c.fax}` : ""}</div>` : ""}
    ${c.email ? `<div class="company-line">${c.email}${c.website ? ` | ${c.website}` : ""}</div>` : ""}
  </div>
  <div class="party-box" style="min-width:200px">
    <div class="party-head"><span>${partyLabel}</span></div>
    <div class="party-body">
      <div class="party-name">${party.name}</div>
      ${party.address ? `<div class="party-line">${party.address}${party.city ? `, ${party.city}` : ""}</div>` : ""}
      ${party.phone ? `<div class="party-line">Tél: ${party.phone}</div>` : ""}
      ${party.email ? `<div class="party-line">${party.email}</div>` : ""}
      ${party.ice ? `<div class="party-hl">ICE: ${party.ice}</div>` : ""}
      ${party.rc ? `<div class="party-line">RC: ${party.rc}</div>` : ""}
    </div>
  </div>
</div>

<div class="title-band">
  <h1>${DOC_TITLES[data.type]} — N° ${data.number}</h1>
  <div class="title-meta">
    <div class="title-date">Date: ${data.date}</div>
  </div>
</div>

<table class="lines">
  <thead><tr>
    <th class="c" style="width:8%">Réf.</th>
    <th>Désignation</th>
    <th class="c" style="width:7%">Qté</th>
    <th class="c" style="width:7%">Unité</th>
    <th class="r" style="width:10%">P.U.</th>
    <th class="c" style="width:6%">Rem.</th>
    <th class="c" style="width:6%">TVA</th>
    <th class="r" style="width:10%">Total HT</th>
    <th class="r" style="width:10%">Total TTC</th>
  </tr></thead>
  <tbody>${linesHtml}</tbody>
</table>

<table class="totals">
  <tr><td class="tot-l">Total HT</td><td class="tot-v">${fmt(data.subtotalHt)} MAD</td></tr>
  <tr><td class="tot-l">Total TVA</td><td class="tot-v">${fmt(data.totalTva)} MAD</td></tr>
  <tr class="final"><td>Total TTC</td><td style="text-align:right">${fmt(data.totalTtc)} MAD</td></tr>
  ${balanceRows}
</table>

${data.notes ? `<div class="notes-box"><div class="notes-label">Notes</div><div class="notes-text">${data.notes}</div></div>` : ""}

${bankHtml}
</div>

<div id="page-footer">
  <div style="border-top:1.5px solid ${BRAND.primary};padding-top:6px;font-size:6.5px;color:${BRAND.textLight};line-height:1.7;display:flex;justify-content:space-between;align-items:flex-start">
    <div style="flex:1;text-align:left">
      <div style="font-weight:700;color:${BRAND.navy};font-size:7px">${c.raison_sociale}${c.forme_juridique ? ` — ${c.forme_juridique}` : ""}</div>
      ${c.phone ? `<div>Tél: ${c.phone}</div>` : ""}
      ${c.email ? `<div>${c.email}</div>` : ""}
    </div>
    <div style="flex:1;text-align:center">
      ${c.ice ? `<div>ICE: ${c.ice}</div>` : ""}
      ${c.if_number ? `<div>IF: ${c.if_number}</div>` : ""}
      ${c.rc ? `<div>RC: ${c.rc}</div>` : ""}
      ${c.patente ? `<div>Patente: ${c.patente}</div>` : ""}
      ${c.capital ? `<div>Capital: ${Number(c.capital).toLocaleString("fr-FR")} MAD</div>` : ""}
    </div>
    <div style="flex:1;text-align:right">
      ${data.bankAccount ? `
        ${data.bankAccount.bank_name ? `<div style="font-weight:600">${data.bankAccount.bank_name}</div>` : ""}
        ${data.bankAccount.rib ? `<div>RIB: ${data.bankAccount.rib}</div>` : ""}
      ` : ""}
    </div>
  </div>
</div>

<script>
window.onload = function() {
  document.title = "${DOC_TITLES[data.type]} ${data.number}";
  try { history.replaceState(null, "", "${DOC_TITLES[data.type]} ${data.number}"); } catch(e) {}
  setTimeout(function() { window.print(); }, 400);
};
</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
