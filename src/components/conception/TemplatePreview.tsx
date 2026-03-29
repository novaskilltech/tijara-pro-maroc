import { TEMPLATE_DOC_LABELS, type TemplateConfig, type TemplateDocType } from "@/hooks/useDocumentTemplates";

interface TemplatePreviewProps {
  config: TemplateConfig;
  docType: TemplateDocType;
}

const PH = {
  company: "{{company.name}}",
  ice: "{{company.ice}}",
  rc: "{{company.rc}}",
  if_number: "{{company.if}}",
  address: "{{company.address}}",
  phone: "{{company.phone}}",
  email: "{{company.email}}",
  number: "{{doc.number}}",
  date: "{{doc.date}}",
  dueDate: "{{doc.due_date}}",
  paymentTerms: "{{doc.payment_terms}}",
  clientName: "{{partner.name}}",
  clientAddress: "{{partner.address}}",
  clientIce: "{{partner.ice}}",
  totalHt: "{{totals.ht}}",
  totalTva: "{{totals.tva}}",
  totalTtc: "{{totals.ttc}}",
};

export function TemplatePreview({ config, docType }: TemplatePreviewProps) {
  const sorted = [...config.blocks].sort((a, b) => a.order - b.order).filter((b) => b.visible);
  const g = config.globalStyles;

  const footerBlock = sorted.find((b) => b.type === "footer");
  const contentBlocks = sorted.filter((b) => b.type !== "footer");

  const renderBlock = (block: typeof sorted[number]) => {
    const mb = block.styles.spacing || 10;
    const ox = block.styles.offsetX || 0;
    const oy = block.styles.offsetY || 0;
    const positionStyle: React.CSSProperties = {
      marginLeft: ox > 0 ? ox : 0,
      marginRight: ox < 0 ? Math.abs(ox) : 0,
      marginTop: oy,
    };

    if (block.type === "logo") {
      return (
        <div key={block.id} style={{ marginBottom: mb, ...positionStyle, display: "flex", justifyContent: "space-between", borderBottom: `2.5px solid ${g.primaryColor}`, paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: block.styles.fontSize || 13, fontWeight: 700, color: g.secondaryColor }}>{PH.company}</div>
            {block.fields?.forme_juridique && <div style={{ fontSize: 8, color: "#4A6070", fontStyle: "italic" }}>{"{{forme_juridique}}"}</div>}
            {block.fields?.address && <div style={{ fontSize: 7.5, color: "#4A6070" }}>{PH.address}</div>}
            {block.fields?.phone && <div style={{ fontSize: 7.5, color: "#4A6070" }}>Tél: {PH.phone}</div>}
            {block.fields?.email && <div style={{ fontSize: 7.5, color: "#4A6070" }}>{PH.email}</div>}
          </div>
          <div style={{ border: "1px solid #D4E2E9", borderRadius: 5, overflow: "hidden", minWidth: 180 }}>
            <div style={{ background: g.secondaryColor, padding: "5px 10px" }}>
              <span style={{ fontSize: 7.5, color: "#fff", fontWeight: 700, letterSpacing: 0.8 }}>CLIENT / FOURNISSEUR</span>
            </div>
            <div style={{ padding: "9px 10px", minHeight: 55 }}>
              {block.fields?.client_name !== false && <div style={{ fontSize: 9.5, fontWeight: 700, color: g.secondaryColor, fontStyle: "italic" }}>{PH.clientName}</div>}
              {block.fields?.client_address !== false && <div style={{ fontSize: 7.5, color: "#4A6070", fontStyle: "italic" }}>{PH.clientAddress}</div>}
              {block.fields?.client_ice !== false && <div style={{ fontSize: 7.5, color: g.primaryColor, fontWeight: 700, fontStyle: "italic" }}>ICE: {PH.clientIce}</div>}
            </div>
          </div>
        </div>
      );
    }

    if (block.type === "title") {
      return (
        <div key={block.id} style={{
          marginBottom: mb, ...positionStyle, background: block.styles.backgroundColor || g.secondaryColor,
          borderRadius: 4, padding: "9px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: block.styles.fontSize || 16, fontWeight: 700, color: block.styles.color || "#fff", letterSpacing: 1.5 }}>
            {TEMPLATE_DOC_LABELS[docType].toUpperCase()} — N° {PH.number}
          </span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: "#B0C8D8" }}>Date: {PH.date}</div>
          </div>
        </div>
      );
    }

    if (block.type === "doc_info") {
      const items = [
        block.fields?.date !== false && { label: "Date du document", value: PH.date },
        block.fields?.due_date !== false && { label: "Échéance", value: PH.dueDate },
        block.fields?.payment_terms !== false && { label: "Conditions", value: PH.paymentTerms },
      ].filter(Boolean) as { label: string; value: string }[];
      return (
        <div key={block.id} style={{ marginBottom: mb, ...positionStyle, display: "flex", gap: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ flex: 1, background: "#EBF8FD", borderRadius: 4, padding: "6px 8px", borderLeft: `3px solid ${g.primaryColor}` }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: "#4A6070", textTransform: "uppercase", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: 8.5, fontWeight: 700, fontStyle: "italic", color: "#6B8FA0" }}>{item.value}</div>
            </div>
          ))}
        </div>
      );
    }

    // party block type removed — client info is now in logo block

    if (block.type === "lines_table") {
      const f = block.fields || {};
      const placeholderRows = [1, 2, 3];
      return (
        <div key={block.id} style={{ marginBottom: mb, ...positionStyle }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: g.secondaryColor }}>
                {f.ref !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "center" }}>Réf.</th>}
                {f.description !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "left" }}>Désignation</th>}
                {f.qty !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "center" }}>Qté</th>}
                {f.unit !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "center" }}>Unité</th>}
                {f.unit_price !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "right" }}>P.U.</th>}
                {f.discount !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "center" }}>Rem.</th>}
                {f.tva !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "center" }}>TVA</th>}
                {f.total_ht !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "right" }}>Total HT</th>}
                {f.total_ttc !== false && <th style={{ color: "#fff", fontSize: 7.5, fontWeight: 700, padding: "6px 5px", textAlign: "right" }}>Total TTC</th>}
              </tr>
            </thead>
            <tbody>
              {placeholderRows.map((_, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? "#F4FAFD" : "transparent", borderBottom: "1px solid #D4E2E9" }}>
                  {f.ref !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "center", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.description !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.qty !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "center", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.unit !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "center", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.unit_price !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "right", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.discount !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "center", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.tva !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "center", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.total_ht !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "right", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                  {f.total_ttc !== false && <td style={{ fontSize: block.styles.fontSize || 8, padding: "5px", textAlign: "right", color: "#6B8FA0", fontStyle: "italic" }}>---</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (block.type === "totals") {
      return (
        <div key={block.id} style={{ marginBottom: mb, ...positionStyle, display: "flex", justifyContent: "flex-end" }}>
          <table style={{ width: 210, border: "1px solid #D4E2E9", borderRadius: 5, overflow: "hidden", borderCollapse: "collapse" }}>
            <tbody>
              {block.fields?.total_ht !== false && (
                <tr style={{ borderBottom: "1px solid #D4E2E9" }}>
                  <td style={{ fontSize: 8, color: "#4A6070", padding: "5px 10px" }}>Total HT</td>
                  <td style={{ fontSize: 8, fontWeight: 700, textAlign: "right", padding: "5px 10px", fontStyle: "italic", color: "#6B8FA0" }}>{PH.totalHt}</td>
                </tr>
              )}
              {block.fields?.total_tva !== false && (
                <tr style={{ borderBottom: "1px solid #D4E2E9" }}>
                  <td style={{ fontSize: 8, color: "#4A6070", padding: "5px 10px" }}>Total TVA</td>
                  <td style={{ fontSize: 8, fontWeight: 700, textAlign: "right", padding: "5px 10px", fontStyle: "italic", color: "#6B8FA0" }}>{PH.totalTva}</td>
                </tr>
              )}
              {block.fields?.total_ttc !== false && (
                <tr style={{ background: g.secondaryColor }}>
                  <td style={{ fontSize: 10, fontWeight: 700, color: "#fff", padding: "8px 10px" }}>Total TTC</td>
                  <td style={{ fontSize: 10, fontWeight: 700, color: g.primaryColor, textAlign: "right", padding: "8px 10px", fontStyle: "italic" }}>{PH.totalTtc}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    if (block.type === "notes") {
      return (
        <div key={block.id} style={{ marginBottom: mb, ...positionStyle, borderLeft: `3px solid ${g.primaryColor}`, background: `${g.primaryColor}10`, padding: "7px 9px", borderRadius: 3 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: "#4A6070", textTransform: "uppercase", marginBottom: 2 }}>Notes</div>
          <div style={{ fontSize: block.styles.fontSize || 8, fontStyle: "italic", color: "#6B8FA0" }}>{"{{notes}}"}</div>
        </div>
      );
    }

    if (block.type === "bank") {
      return (
        <div key={block.id} style={{ marginBottom: mb, ...positionStyle, background: "#EBF8FD", borderRadius: 3, padding: "6px 8px" }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: g.secondaryColor, textTransform: "uppercase", marginBottom: 3 }}>Coordonnées bancaires</div>
          {block.fields?.bank_name !== false && <div style={{ fontSize: 7 }}><span style={{ color: "#4A6070", width: 55, display: "inline-block" }}>Banque</span> <em style={{ color: "#6B8FA0" }}>{"{{bank.name}}"}</em></div>}
          {block.fields?.rib !== false && <div style={{ fontSize: 7 }}><span style={{ color: "#4A6070", width: 55, display: "inline-block" }}>RIB</span> <em style={{ color: "#6B8FA0" }}>{"{{bank.rib}}"}</em></div>}
          {block.fields?.swift !== false && <div style={{ fontSize: 7 }}><span style={{ color: "#4A6070", width: 55, display: "inline-block" }}>SWIFT</span> <em style={{ color: "#6B8FA0" }}>{"{{bank.swift}}"}</em></div>}
        </div>
      );
    }

    if (block.type === "footer") {
      const f = block.fields || {};
      return (
        <div key={block.id} style={{ borderTop: `1.5px solid ${g.primaryColor}`, paddingTop: 8, fontSize: block.styles.fontSize || 6.5, color: "#7A919E", lineHeight: 1.7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontWeight: 700, color: g.secondaryColor, fontSize: (block.styles.fontSize || 6.5) + 0.5 }}>
                {PH.company} — {"{{forme_juridique}}"}
              </div>
              {f.phone !== false && <div>Tél: {PH.phone}</div>}
              {f.email !== false && <div>{PH.email}</div>}
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              {f.ice !== false && <div>ICE: {PH.ice}</div>}
              {f.if_number !== false && <div>IF: {PH.if_number}</div>}
              {f.rc !== false && <div>RC: {PH.rc}</div>}
              {f.patente !== false && <div>Patente: {"{{patente}}"}</div>}
              {f.capital !== false && <div>Capital: {"{{capital}}"} MAD</div>}
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              {f.bank !== false && (
                <>
                  <div style={{ fontWeight: 600 }}>{"{{bank.name}}"}</div>
                  <div>RIB: {"{{bank.rib}}"}</div>
                </>
              )}
              {f.page_numbers !== false && (
                <div style={{ marginTop: 2, fontStyle: "italic" }}>Page X / Y</div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (block.type === "custom_text") {
      return (
        <div key={block.id} style={{ marginBottom: mb, fontSize: block.styles.fontSize || 8, textAlign: block.styles.alignment || "left", color: block.styles.color || "#1A2B3C" }}>
          {block.customContent || <span style={{ fontStyle: "italic", color: "#6B8FA0" }}>Texte personnalisé...</span>}
        </div>
      );
    }

    if (block.type === "empty") {
      return (
        <div key={block.id} style={{ marginBottom: mb, minHeight: block.styles.spacing || 40 }} />
      );
    }

    return null;
  };

  return (
    <div className="flex justify-center">
      <div
        className="bg-white shadow-xl border rounded"
        style={{
          width: 595,
          minHeight: 842,
          padding: "28px 30px",
          fontFamily: g.fontFamily,
          fontSize: g.bodyFontSize,
          color: "#1A2B3C",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1 }}>
          {contentBlocks.map(renderBlock)}
        </div>
        {footerBlock && renderBlock(footerBlock)}
      </div>
    </div>
  );
}
