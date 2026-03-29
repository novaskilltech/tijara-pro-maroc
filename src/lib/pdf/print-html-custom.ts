import type { PdfDocumentData } from "./types";
import { DOC_TITLES, DOC_PARTY_LABEL } from "./types";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateConfig } from "@/hooks/useDocumentTemplates";

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Map PdfDocumentType to template document_type key.
 */
const PDF_TO_TEMPLATE_TYPE: Record<string, string> = {
  devis: "devis_client",
  commande_client: "bc_client",
  facture_client: "facture_client",
  avoir_client: "avoir_client",
  commande_fournisseur: "bc_fournisseur",
  facture_fournisseur: "facture_fournisseur",
  avoir_fournisseur: "avoir_fournisseur",
  reception: "reception",
  bon_livraison: "bon_livraison",
};

/**
 * Fetch PUBLISHED template for a company/type combo. Returns null if none.
 */
async function fetchPublishedTemplate(
  companyId: string | undefined | null,
  pdfType: string
): Promise<TemplateConfig | null> {
  if (!companyId) return null;
  const templateType = PDF_TO_TEMPLATE_TYPE[pdfType];
  if (!templateType) return null;

  const { data } = await (supabase as any)
    .from("document_templates")
    .select("template_json")
    .eq("company_id", companyId)
    .eq("document_type", templateType)
    .eq("is_active", true)
    .eq("status", "published")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.template_json as TemplateConfig | null;
}

/**
 * Build HTML using published template config. Falls back to default if no published template.
 */
export async function openPrintHtmlWithTemplate(data: PdfDocumentData) {
  const companyId = (data.company as any)?.id || null;
  const tpl = await fetchPublishedTemplate(companyId, data.type);

  if (!tpl) {
    const { openPrintHtml } = await import("./print-html");
    openPrintHtml(data);
    return;
  }

  // If template uses custom HTML/CSS code, use that directly
  if (tpl.isCustomCode && tpl.customHtml) {
    openCustomCodePrintHtml(data, tpl);
    return;
  }

  openCustomPrintHtml(data, tpl);
}

/**
 * Render using raw custom HTML/CSS code from the source code editor.
 * Replaces placeholders with actual data.
 */
function openCustomCodePrintHtml(data: PdfDocumentData, tpl: TemplateConfig) {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    alert("Le navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.");
    return;
  }

  const c = data.company;
  const party = data.party;
  const ba = data.bankAccount;

  let htmlBody = tpl.customHtml || "";
  const css = tpl.customCss || "";

  // Replace company placeholders
  htmlBody = htmlBody.replace(/\{\{company\.name\}\}/g, c.raison_sociale || "");
  htmlBody = htmlBody.replace(/\{\{company\.ice\}\}/g, c.ice || "");
  htmlBody = htmlBody.replace(/\{\{company\.rc\}\}/g, c.rc || "");
  htmlBody = htmlBody.replace(/\{\{company\.if\}\}/g, c.if_number || "");
  htmlBody = htmlBody.replace(/\{\{company\.address\}\}/g, [c.address, c.city, c.postal_code].filter(Boolean).join(", "));
  htmlBody = htmlBody.replace(/\{\{company\.phone\}\}/g, c.phone || "");
  htmlBody = htmlBody.replace(/\{\{company\.email\}\}/g, c.email || "");
  htmlBody = htmlBody.replace(/\{\{company\.logo_url\}\}/g, c.logo_url || "");
  htmlBody = htmlBody.replace(/\{\{forme_juridique\}\}/g, c.forme_juridique || "");
  htmlBody = htmlBody.replace(/\{\{patente\}\}/g, c.patente || "");
  htmlBody = htmlBody.replace(/\{\{capital\}\}/g, c.capital ? Number(c.capital).toLocaleString("fr-FR") : "");
  htmlBody = htmlBody.replace(/\{\{cnss\}\}/g, (c as any).cnss || "");

  // Replace partner placeholders
  htmlBody = htmlBody.replace(/\{\{partner\.name\}\}/g, party.name || "");
  htmlBody = htmlBody.replace(/\{\{partner\.address\}\}/g, (party.address || "") + (party.city ? `, ${party.city}` : ""));
  htmlBody = htmlBody.replace(/\{\{partner\.ice\}\}/g, party.ice || "");

  // Replace doc placeholders
  htmlBody = htmlBody.replace(/\{\{doc\.number\}\}/g, data.number || "");
  htmlBody = htmlBody.replace(/\{\{doc\.date\}\}/g, data.date || "");
  htmlBody = htmlBody.replace(/\{\{doc\.due_date\}\}/g, data.dueDate || "");
  htmlBody = htmlBody.replace(/\{\{doc\.payment_terms\}\}/g, data.paymentTerms || "");

  // Replace totals
  htmlBody = htmlBody.replace(/\{\{totals\.ht\}\}/g, fmt(data.subtotalHt));
  htmlBody = htmlBody.replace(/\{\{totals\.tva\}\}/g, fmt(data.totalTva));
  htmlBody = htmlBody.replace(/\{\{totals\.ttc\}\}/g, fmt(data.totalTtc));

  // Replace bank
  htmlBody = htmlBody.replace(/\{\{bank\.name\}\}/g, ba?.bank_name || "");
  htmlBody = htmlBody.replace(/\{\{bank\.rib\}\}/g, ba?.rib || "");
  htmlBody = htmlBody.replace(/\{\{bank\.swift\}\}/g, ba?.swift || "");

  // Replace notes
  htmlBody = htmlBody.replace(/\{\{notes\}\}/g, data.notes || "");

  // Handle lines loop
  const linesLoopRegex = /<!--\s*\{\{#each lines\}\}\s*-->([\s\S]*?)<!--\s*\{\{\/each\}\}\s*-->/g;
  htmlBody = htmlBody.replace(linesLoopRegex, (_match, lineTemplate: string) => {
    return data.lines.map((l, i) => {
      let row = lineTemplate;
      row = row.replace(/\{\{line\.ref\}\}/g, l.ref || String(i + 1));
      row = row.replace(/\{\{line\.description\}\}/g, l.description || "");
      row = row.replace(/\{\{line\.quantity\}\}/g, String(l.quantity));
      row = row.replace(/\{\{line\.unit\}\}/g, l.unit || "Unité");
      row = row.replace(/\{\{line\.unit_price\}\}/g, fmt(l.unit_price));
      row = row.replace(/\{\{line\.discount_percent\}\}/g, String(l.discount_percent || 0));
      row = row.replace(/\{\{line\.tva_rate\}\}/g, String(l.tva_rate));
      row = row.replace(/\{\{line\.total_ht\}\}/g, fmt(l.total_ht));
      row = row.replace(/\{\{line\.total_ttc\}\}/g, fmt(l.total_ttc));
      return row;
    }).join("");
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${DOC_TITLES[data.type]} ${data.number}</title>
<style>${css}</style>
</head>
<body>
${htmlBody}
<script>window.onload=function(){document.title="${DOC_TITLES[data.type]} ${data.number}";setTimeout(function(){window.print()},400)}</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

function openCustomPrintHtml(data: PdfDocumentData, tpl: TemplateConfig) {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    alert("Le navigateur a bloqué l'ouverture de la fenêtre. Veuillez autoriser les pop-ups.");
    return;
  }

  const c = data.company;
  const party = data.party;
  const partyLabel = DOC_PARTY_LABEL[data.type];
  const g = tpl.globalStyles;
  const sorted = [...tpl.blocks].sort((a, b) => a.order - b.order).filter((b) => b.visible);

  const footerBlock = sorted.find(b => b.type === "footer");
  const contentBlocks = sorted.filter(b => b.type !== "footer");

  let bodyHtml = "";

  for (const block of contentBlocks) {
    const mb = block.styles.spacing || 10;

    if (block.type === "logo") {
      const logoHtml = c.logo_url ? `<img src="${c.logo_url}" class="logo" />` : "";
      bodyHtml += `<div style="margin-bottom:${mb}px;display:flex;justify-content:space-between;border-bottom:2.5px solid ${g.primaryColor};padding-bottom:12px">
        <div>
          ${logoHtml}
          <div style="font-size:${block.styles.fontSize || 13}px;font-weight:700;color:${g.secondaryColor}">${c.raison_sociale}</div>
          ${block.fields?.forme_juridique !== false && c.forme_juridique ? `<div style="font-size:8px;color:#4A6070">${c.forme_juridique}</div>` : ""}
          ${block.fields?.address !== false ? `<div style="font-size:7.5px;color:#4A6070">${[c.address, c.city, c.postal_code].filter(Boolean).join(", ")}</div>` : ""}
          ${block.fields?.phone !== false && c.phone ? `<div style="font-size:7.5px;color:#4A6070">Tél: ${c.phone}${c.fax ? ` | Fax: ${c.fax}` : ""}</div>` : ""}
          ${block.fields?.email !== false && c.email ? `<div style="font-size:7.5px;color:#4A6070">${c.email}</div>` : ""}
        </div>
        <div style="border:1px solid #D4E2E9;border-radius:5px;overflow:hidden;min-width:200px">
          <div style="background:${g.secondaryColor};padding:5px 10px"><span style="font-size:7.5px;color:#fff;font-weight:700;letter-spacing:.8px">${partyLabel}</span></div>
          <div style="padding:9px 10px;min-height:55px">
            ${block.fields?.client_name !== false ? `<div style="font-size:9.5px;font-weight:700;color:${g.secondaryColor}">${party.name}</div>` : ""}
            ${block.fields?.client_address !== false && party.address ? `<div style="font-size:7.5px;color:#4A6070">${party.address}${party.city ? `, ${party.city}` : ""}</div>` : ""}
            ${block.fields?.client_phone !== false && party.phone ? `<div style="font-size:7.5px;color:#4A6070">Tél: ${party.phone}</div>` : ""}
            ${block.fields?.client_email !== false && party.email ? `<div style="font-size:7.5px;color:#4A6070">${party.email}</div>` : ""}
            ${block.fields?.client_ice !== false && party.ice ? `<div style="font-size:7.5px;color:${g.primaryColor};font-weight:700">ICE: ${party.ice}</div>` : ""}
            ${block.fields?.client_rc !== false && party.rc ? `<div style="font-size:7.5px;color:#4A6070">RC: ${party.rc}</div>` : ""}
          </div>
        </div>
      </div>`;
    }

    if (block.type === "title") {
      bodyHtml += `<div style="margin-bottom:${mb}px;background:${block.styles.backgroundColor || g.secondaryColor};border-radius:4px;padding:9px 16px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:${block.styles.fontSize || 16}px;font-weight:700;color:${block.styles.color || "#fff"};letter-spacing:1.5px">${DOC_TITLES[data.type]} — N° ${data.number}</span>
        <div style="text-align:right">
          <div style="font-size:8px;color:#B0C8D8">Date: ${data.date}</div>
        </div>
      </div>`;
    }

    if (block.type === "doc_info") {
      const items: string[] = [];
      if (block.fields?.date !== false) items.push(`<div class="info-box"><div class="info-l">Date</div><div class="info-v">${data.date}</div></div>`);
      if (block.fields?.due_date !== false && data.dueDate) items.push(`<div class="info-box"><div class="info-l">Échéance</div><div class="info-v">${data.dueDate}</div></div>`);
      if (block.fields?.payment_terms !== false && data.paymentTerms) items.push(`<div class="info-box"><div class="info-l">Conditions</div><div class="info-v">${data.paymentTerms}</div></div>`);
      if (block.fields?.origin_ref !== false && data.originRef) items.push(`<div class="info-box"><div class="info-l">Réf. origine</div><div class="info-v">${data.originRef}</div></div>`);
      if (items.length) bodyHtml += `<div style="margin-bottom:${mb}px;display:flex;gap:8px">${items.join("")}</div>`;
    }

    // party block type removed — client info is now rendered inside the logo block

    if (block.type === "lines_table") {
      const f = block.fields || {};
      const cols = [
        { key: "ref", label: "Réf.", align: "center", w: "8%", render: (l: any, i: number) => l.ref || (i + 1) },
        { key: "description", label: "Désignation", align: "left", w: "", render: (l: any) => l.description },
        { key: "qty", label: "Qté", align: "center", w: "7%", render: (l: any) => l.quantity },
        { key: "unit", label: "Unité", align: "center", w: "7%", render: (l: any) => l.unit || "Unité" },
        { key: "unit_price", label: "P.U.", align: "right", w: "10%", render: (l: any) => fmt(l.unit_price) },
        { key: "discount", label: "Rem.", align: "center", w: "6%", render: (l: any) => `${l.discount_percent || 0}%` },
        { key: "tva", label: "TVA", align: "center", w: "6%", render: (l: any) => `${l.tva_rate}%` },
        { key: "total_ht", label: "Total HT", align: "right", w: "10%", render: (l: any) => fmt(l.total_ht) },
        { key: "total_ttc", label: "Total TTC", align: "right", w: "10%", render: (l: any) => fmt(l.total_ttc) },
      ];

      const activeCols = cols.filter(col => f[col.key] !== false);
      const ths = activeCols.map(col => `<th style="color:#fff;font-size:7.5px;font-weight:700;padding:6px 5px;text-align:${col.align};${col.w ? `width:${col.w}` : ""}">${col.label}</th>`).join("");

      const rows = data.lines.map((l, i) => {
        const cells = activeCols.map(col => `<td style="padding:5px;font-size:${block.styles.fontSize || 8}px;text-align:${col.align};${col.key === "total_ht" || col.key === "total_ttc" ? "font-weight:600" : ""}">${col.render(l, i)}</td>`).join("");
        return `<tr style="border-bottom:1px solid #D4E2E9;${i % 2 === 1 ? `background:#F4FAFD` : ""}">${cells}</tr>`;
      }).join("");

      bodyHtml += `<div style="margin-bottom:${mb}px"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:${g.secondaryColor}">${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    if (block.type === "totals") {
      const f = block.fields || {};
      let rows = "";
      if (f.total_ht !== false) rows += `<tr style="border-bottom:1px solid #D4E2E9"><td style="font-size:8px;color:#4A6070;padding:5px 10px">Total HT</td><td style="font-size:8px;font-weight:700;text-align:right;padding:5px 10px">${fmt(data.subtotalHt)} MAD</td></tr>`;
      rows += `<tr style="border-bottom:1px solid #D4E2E9"><td style="font-size:8px;color:#4A6070;padding:5px 10px">Total TVA</td><td style="font-size:8px;font-weight:700;text-align:right;padding:5px 10px">${fmt(data.totalTva)} MAD</td></tr>`;
      if (f.total_ttc !== false) rows += `<tr style="background:${g.secondaryColor}"><td style="font-size:10px;font-weight:700;color:#fff;padding:8px 10px">Total TTC</td><td style="font-size:10px;font-weight:700;color:${g.primaryColor};text-align:right;padding:8px 10px">${fmt(data.totalTtc)} MAD</td></tr>`;
      if (f.amount_paid !== false && data.amountPaid && data.amountPaid > 0) rows += `<tr><td style="font-size:8px;color:#4A6070;padding:5px 10px">Montant payé</td><td style="font-size:8px;font-weight:700;text-align:right;padding:5px 10px">${fmt(data.amountPaid)} MAD</td></tr>`;
      if (f.remaining !== false && data.remainingBalance != null) rows += `<tr style="background:#EBF8FD"><td style="font-size:8px;color:${g.primaryColor};font-weight:700;padding:5px 10px">Solde restant</td><td style="font-size:8px;color:${g.primaryColor};font-weight:700;text-align:right;padding:5px 10px">${fmt(data.remainingBalance)} MAD</td></tr>`;

      bodyHtml += `<div style="margin-bottom:${mb}px;display:flex;justify-content:flex-end"><table style="width:210px;border:1px solid #D4E2E9;border-radius:5px;overflow:hidden;border-collapse:collapse">${rows}</table></div>`;
    }

    if (block.type === "notes" && data.notes) {
      bodyHtml += `<div style="margin-bottom:${mb}px;border-left:3px solid ${g.primaryColor};background:${g.primaryColor}10;padding:7px 9px;border-radius:3px">
        <div style="font-size:7.5px;font-weight:700;color:#4A6070;text-transform:uppercase;margin-bottom:2px">Notes</div>
        <div style="font-size:${block.styles.fontSize || 8}px;line-height:1.4">${data.notes}</div>
      </div>`;
    }

    if (block.type === "bank" && data.bankAccount) {
      const ba = data.bankAccount;
      bodyHtml += `<div style="margin-bottom:${mb}px;background:#EBF8FD;border-radius:3px;padding:6px 8px">
        <div style="font-size:7px;font-weight:700;color:${g.secondaryColor};text-transform:uppercase;margin-bottom:3px">Coordonnées bancaires</div>
        ${block.fields?.bank_name !== false && ba.bank_name ? `<div style="font-size:7px"><span style="color:#4A6070;display:inline-block;width:55px">Banque</span>${ba.bank_name}</div>` : ""}
        ${block.fields?.account_name !== false && ba.account_name ? `<div style="font-size:7px"><span style="color:#4A6070;display:inline-block;width:55px">Titulaire</span>${ba.account_name}</div>` : ""}
        ${block.fields?.rib !== false && ba.rib ? `<div style="font-size:7px"><span style="color:#4A6070;display:inline-block;width:55px">RIB</span>${ba.rib}</div>` : ""}
        ${block.fields?.swift !== false && ba.swift ? `<div style="font-size:7px"><span style="color:#4A6070;display:inline-block;width:55px">SWIFT</span>${ba.swift}</div>` : ""}
      </div>`;
    }

    if (block.type === "custom_text" && (block as any).customContent) {
      bodyHtml += `<div style="margin-bottom:${mb}px;font-size:${block.styles.fontSize || 8}px;text-align:${block.styles.alignment || "left"};color:${block.styles.color || "#1A2B3C"}">${(block as any).customContent}</div>`;
    }

    // empty blocks just add spacing
    if (block.type === "empty") {
      bodyHtml += `<div style="margin-bottom:${mb}px;min-height:${block.styles.spacing || 40}px"></div>`;
    }
  }

  // Build footer HTML separately for fixed positioning
  let footerHtml = "";
  if (footerBlock) {
    const ff = footerBlock.fields || {};
    const ba = data.bankAccount;
    footerHtml = `<div id="page-footer">
      <div style="border-top:1.5px solid ${g.primaryColor};padding-top:6px;font-size:${footerBlock.styles.fontSize || 6.5}px;color:#7A919E;line-height:1.7;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1;text-align:left">
          <div style="font-weight:700;color:${g.secondaryColor};font-size:${(footerBlock.styles.fontSize || 6.5) + 0.5}px">${c.raison_sociale}${c.forme_juridique ? ` — ${c.forme_juridique}` : ""}</div>
          ${ff.phone !== false && c.phone ? `<div>Tél: ${c.phone}</div>` : ""}
          ${ff.email !== false && c.email ? `<div>${c.email}</div>` : ""}
        </div>
        <div style="flex:1;text-align:center">
          ${ff.ice !== false && c.ice ? `<div>ICE: ${c.ice}</div>` : ""}
          ${ff.if_number !== false && c.if_number ? `<div>IF: ${c.if_number}</div>` : ""}
          ${ff.rc !== false && c.rc ? `<div>RC: ${c.rc}</div>` : ""}
          ${ff.patente !== false && c.patente ? `<div>Patente: ${c.patente}</div>` : ""}
          ${ff.capital !== false && c.capital ? `<div>Capital: ${Number(c.capital).toLocaleString("fr-FR")} MAD</div>` : ""}
        </div>
        <div style="flex:1;text-align:right">
          ${ff.bank !== false && ba ? `
            ${ba.bank_name ? `<div style="font-weight:600">${ba.bank_name}</div>` : ""}
            ${ba.rib ? `<div>RIB: ${ba.rib}</div>` : ""}
          ` : ""}
        </div>
      </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>${DOC_TITLES[data.type]} ${data.number}</title>
<style>
@page { size: A4; margin: 12mm 15mm 24mm 15mm; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:${g.fontFamily};font-size:${g.bodyFontSize}px;color:#1A2B3C;line-height:1.45;background:#fff}
.logo{max-height:55px;max-width:160px;object-fit:contain;margin-bottom:4px}
.info-box{flex:1;background:#EBF8FD;border-radius:4px;padding:6px 8px;border-left:3px solid ${g.primaryColor}}
.info-l{font-size:7px;font-weight:700;color:#4A6070;text-transform:uppercase;margin-bottom:2px}
.info-v{font-size:8.5px;font-weight:700;color:#1A2B3C}
#page-footer{
  position:fixed;
  bottom:0;
  left:0;
  right:0;
  padding:0 15mm 0 15mm;
  background:#fff;
}
#page-content{
  padding-bottom:${footerBlock ? "55" : "0"}px;
}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #page-footer{position:fixed;bottom:0}
  @page{margin-bottom:${footerBlock ? "20mm" : "12mm"}}
}
</style>
</head>
<body>
<div id="page-content">${bodyHtml}</div>
${footerHtml}
<script>window.onload=function(){document.title="${DOC_TITLES[data.type]} ${data.number}";try{history.replaceState(null,"","${DOC_TITLES[data.type]} ${data.number}")}catch(e){}setTimeout(function(){window.print()},400)}</script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
