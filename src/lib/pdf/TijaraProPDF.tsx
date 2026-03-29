import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import type {
  PdfDocumentData, PdfLine,
} from "./types";
import { DOC_TITLES, DOC_PARTY_LABEL, BRAND } from "./types";

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BRAND.textDark,
    backgroundColor: BRAND.white,
    paddingTop: 28,
    paddingBottom: 52,
    paddingHorizontal: 30,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.primary,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    maxWidth: 160,
    maxHeight: 55,
    objectFit: "contain",
    marginBottom: 6,
  },
  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: BRAND.navy,
    marginBottom: 2,
  },
  companyTagline: {
    fontSize: 8,
    color: BRAND.textMid,
    marginBottom: 4,
  },
  companyInfoLine: {
    fontSize: 7.5,
    color: BRAND.textMid,
    marginBottom: 1.5,
  },
  headerRight: {
    width: 160,
    alignItems: "flex-end",
  },
  registrationBox: {
    backgroundColor: BRAND.cyan10,
    borderRadius: 4,
    padding: 8,
    width: "100%",
  },
  registrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  registrationLabel: {
    fontSize: 7,
    color: BRAND.textMid,
    fontFamily: "Helvetica-Bold",
  },
  registrationValue: {
    fontSize: 7,
    color: BRAND.textDark,
  },

  // ── Document title block ──────────────────────────────────────────────────
  titleBlock: {
    backgroundColor: BRAND.navy,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: BRAND.white,
    letterSpacing: 1.5,
  },
  titleMeta: {
    alignItems: "flex-end",
  },
  titleNumber: {
    fontSize: 9,
    color: BRAND.primary,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  titleDate: {
    fontSize: 8,
    color: "#B0C8D8",
  },

  // ── Info row (date, ref, terms) ───────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  infoBox: {
    flex: 1,
    backgroundColor: BRAND.cyan10,
    borderRadius: 4,
    padding: 7,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
  },
  infoLabel: {
    fontSize: 7,
    color: BRAND.textMid,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 8.5,
    color: BRAND.textDark,
    fontFamily: "Helvetica-Bold",
  },
  infoValueSub: {
    fontSize: 7.5,
    color: BRAND.textMid,
  },

  // ── Parties ───────────────────────────────────────────────────────────────
  partiesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  partyHeader: {
    backgroundColor: BRAND.navy,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  partyHeaderText: {
    fontSize: 7.5,
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  partyBody: {
    padding: 10,
    minHeight: 70,
  },
  partyName: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND.navy,
    marginBottom: 4,
  },
  partyLine: {
    fontSize: 7.5,
    color: BRAND.textMid,
    marginBottom: 2,
  },
  partyLineHighlight: {
    fontSize: 7.5,
    color: BRAND.primary,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },

  // ── Lines table ───────────────────────────────────────────────────────────
  tableSection: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND.navy,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    fontSize: 7.5,
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    minHeight: 22,
    alignItems: "center",
  },
  tableRowZebra: {
    backgroundColor: BRAND.zebra,
  },
  tableCell: {
    fontSize: 8,
    color: BRAND.textDark,
  },
  tableCellMuted: {
    fontSize: 7.5,
    color: BRAND.textMid,
  },
  tableCellBold: {
    fontSize: 8,
    color: BRAND.textDark,
    fontFamily: "Helvetica-Bold",
  },

  // Column widths
  colRef: { width: "9%", paddingHorizontal: 2 },
  colDesc: { flex: 1, paddingHorizontal: 4 },
  colQty: { width: "8%", paddingHorizontal: 2, textAlign: "right" },
  colUnit: { width: "7%", paddingHorizontal: 2, textAlign: "center" },
  colPU: { width: "10%", paddingHorizontal: 2, textAlign: "right" },
  colRem: { width: "7%", paddingHorizontal: 2, textAlign: "center" },
  colTva: { width: "7%", paddingHorizontal: 2, textAlign: "center" },
  colHT: { width: "11%", paddingHorizontal: 2, textAlign: "right" },
  colTTC: { width: "11%", paddingHorizontal: 2, textAlign: "right" },

  // ── Totals ────────────────────────────────────────────────────────────────
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  totalsBox: {
    width: 210,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 5,
    overflow: "hidden",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  totalsLabel: {
    fontSize: 8,
    color: BRAND.textMid,
  },
  totalsValue: {
    fontSize: 8,
    color: BRAND.textDark,
    fontFamily: "Helvetica-Bold",
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: BRAND.navy,
  },
  totalsFinalLabel: {
    fontSize: 10,
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
  },
  totalsFinalValue: {
    fontSize: 10,
    color: BRAND.primary,
    fontFamily: "Helvetica-Bold",
  },
  totalsBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: BRAND.cyan10,
  },
  totalsBalanceLabel: {
    fontSize: 8,
    color: BRAND.primary,
    fontFamily: "Helvetica-Bold",
  },
  totalsBalanceValue: {
    fontSize: 8,
    color: BRAND.primary,
    fontFamily: "Helvetica-Bold",
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  notesBox: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
    backgroundColor: BRAND.cyan10,
    padding: 8,
    borderRadius: 3,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: BRAND.textMid,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  notesText: {
    fontSize: 8,
    color: BRAND.textDark,
    lineHeight: 1.4,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    borderTopWidth: 1.5,
    borderTopColor: BRAND.primary,
    paddingTop: 7,
  },
  footerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  footerBankBox: {
    backgroundColor: BRAND.cyan10,
    borderRadius: 3,
    padding: 6,
    flex: 1,
    marginRight: 10,
  },
  footerBankTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: BRAND.navy,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  footerBankRow: {
    flexDirection: "row",
    marginBottom: 1.5,
  },
  footerBankLabel: {
    fontSize: 7,
    color: BRAND.textMid,
    width: 60,
  },
  footerBankValue: {
    fontSize: 7,
    color: BRAND.textDark,
  },
  footerLegal: {
    fontSize: 6.5,
    color: BRAND.textLight,
    textAlign: "center",
    marginTop: 4,
  },
  footerPage: {
    fontSize: 6.5,
    color: BRAND.textLight,
    textAlign: "right",
    marginTop: 4,
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Sub-components ────────────────────────────────────────────────────────────

function CompanyHeader({ company }: { company: PdfDocumentData["company"] }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {company.logo_url ? (
          <Image src={company.logo_url} style={styles.logo} />
        ) : (
          <Text style={styles.companyName}>{company.raison_sociale}</Text>
        )}
        {company.logo_url && (
          <Text style={[styles.companyName, { marginTop: 4 }]}>{company.raison_sociale}</Text>
        )}
        {company.forme_juridique && (
          <Text style={styles.companyTagline}>{company.forme_juridique}</Text>
        )}
        <Text style={styles.companyInfoLine}>
          {[company.address, company.city, company.postal_code].filter(Boolean).join(", ")}
        </Text>
        {(company.phone || company.fax) && (
          <Text style={styles.companyInfoLine}>
            {company.phone ? `Tél: ${company.phone}` : ""}
            {company.phone && company.fax ? "  |  " : ""}
            {company.fax ? `Fax: ${company.fax}` : ""}
          </Text>
        )}
        {company.email && (
          <Text style={styles.companyInfoLine}>{company.email}</Text>
        )}
      </View>
      <View style={styles.headerRight}>
        <View style={styles.registrationBox}>
          {company.ice && (
            <View style={styles.registrationRow}>
              <Text style={styles.registrationLabel}>ICE</Text>
              <Text style={styles.registrationValue}>{company.ice}</Text>
            </View>
          )}
          {company.if_number && (
            <View style={styles.registrationRow}>
              <Text style={styles.registrationLabel}>IF</Text>
              <Text style={styles.registrationValue}>{company.if_number}</Text>
            </View>
          )}
          {company.rc && (
            <View style={styles.registrationRow}>
              <Text style={styles.registrationLabel}>RC</Text>
              <Text style={styles.registrationValue}>{company.rc}</Text>
            </View>
          )}
          {company.patente && (
            <View style={styles.registrationRow}>
              <Text style={styles.registrationLabel}>Patente</Text>
              <Text style={styles.registrationValue}>{company.patente}</Text>
            </View>
          )}
          {company.cnss && (
            <View style={styles.registrationRow}>
              <Text style={styles.registrationLabel}>CNSS</Text>
              <Text style={styles.registrationValue}>{company.cnss}</Text>
            </View>
          )}
          {company.capital != null && company.capital > 0 && (
            <View style={styles.registrationRow}>
              <Text style={styles.registrationLabel}>Capital</Text>
              <Text style={styles.registrationValue}>{Number(company.capital).toLocaleString("fr-FR")} MAD</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function TitleBlock({ data }: { data: PdfDocumentData }) {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.titleText}>{DOC_TITLES[data.type]}</Text>
      <View style={styles.titleMeta}>
        <Text style={styles.titleNumber}>N° {data.number}</Text>
        <Text style={styles.titleDate}>Date: {data.date}</Text>
      </View>
    </View>
  );
}

function InfoRow({ data }: { data: PdfDocumentData }) {
  const boxes: { label: string; value: string; sub?: string }[] = [];
  boxes.push({ label: "Date du document", value: data.date });
  if (data.dueDate) boxes.push({ label: "Date d'échéance", value: data.dueDate });
  if (data.paymentTerms) boxes.push({ label: "Conditions de paiement", value: data.paymentTerms });
  if (data.originRef) boxes.push({ label: "Document d'origine", value: data.originRef });

  if (boxes.length === 0) return null;
  return (
    <View style={styles.infoRow}>
      {boxes.map((b, i) => (
        <View key={i} style={styles.infoBox}>
          <Text style={styles.infoLabel}>{b.label}</Text>
          <Text style={styles.infoValue}>{b.value}</Text>
          {b.sub && <Text style={styles.infoValueSub}>{b.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

function PartiesBlock({ data }: { data: PdfDocumentData }) {
  const partyLabel = DOC_PARTY_LABEL[data.type];
  return (
    <View style={styles.partiesRow}>
      {/* Party */}
      <View style={styles.partyBox}>
        <View style={styles.partyHeader}>
          <Text style={styles.partyHeaderText}>{partyLabel}</Text>
        </View>
        <View style={styles.partyBody}>
          <Text style={styles.partyName}>{data.party.name}</Text>
          {data.party.ice && <Text style={styles.partyLineHighlight}>ICE: {data.party.ice}</Text>}
          {data.party.rc && <Text style={styles.partyLine}>RC: {data.party.rc}</Text>}
          {data.party.address && <Text style={styles.partyLine}>{data.party.address}</Text>}
          {data.party.city && <Text style={styles.partyLine}>{data.party.city}</Text>}
          {data.party.phone && <Text style={styles.partyLine}>Tél: {data.party.phone}</Text>}
          {data.party.email && <Text style={styles.partyLine}>{data.party.email}</Text>}
        </View>
      </View>
      {/* Delivery / billing address */}
      <View style={styles.partyBox}>
        <View style={styles.partyHeader}>
          <Text style={styles.partyHeaderText}>
            {["bon_livraison", "commande_client", "facture_client"].includes(data.type)
              ? "ADRESSE DE LIVRAISON"
              : "INFORMATIONS"}
          </Text>
        </View>
        <View style={styles.partyBody}>
          {data.deliveryAddress ? (
            <Text style={styles.partyLine}>{data.deliveryAddress}</Text>
          ) : (
            <>
              <Text style={styles.partyLine}>Document N°: {data.number}</Text>
              <Text style={styles.partyLine}>Date: {data.date}</Text>
              {data.dueDate && <Text style={styles.partyLine}>Échéance: {data.dueDate}</Text>}
              {data.paymentTerms && <Text style={styles.partyLine}>Conditions: {data.paymentTerms}</Text>}
              {data.originRef && <Text style={styles.partyLine}>Réf. origine: {data.originRef}</Text>}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function LineItemsTable({ lines }: { lines: PdfLine[] }) {
  return (
    <View style={styles.tableSection}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.colRef]}>Réf.</Text>
        <Text style={[styles.tableHeaderCell, styles.colDesc]}>Désignation</Text>
        <Text style={[styles.tableHeaderCell, styles.colQty]}>Qté</Text>
        <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unité</Text>
        <Text style={[styles.tableHeaderCell, styles.colPU]}>PU HT</Text>
        <Text style={[styles.tableHeaderCell, styles.colRem]}>Rem%</Text>
        <Text style={[styles.tableHeaderCell, styles.colTva]}>TVA%</Text>
        <Text style={[styles.tableHeaderCell, styles.colHT]}>Total HT</Text>
        <Text style={[styles.tableHeaderCell, styles.colTTC]}>Total TTC</Text>
      </View>
      {/* Rows */}
      {lines.map((line, idx) => (
        <View
          key={idx}
          style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowZebra : {}]}
          wrap={false}
        >
          <Text style={[styles.tableCellMuted, styles.colRef]}>{line.ref || "—"}</Text>
          <Text style={[styles.tableCell, styles.colDesc]}>{line.description}</Text>
          <Text style={[styles.tableCell, styles.colQty]}>{line.quantity}</Text>
          <Text style={[styles.tableCellMuted, styles.colUnit]}>{line.unit || "—"}</Text>
          <Text style={[styles.tableCell, styles.colPU]}>{fmt(line.unit_price)}</Text>
          <Text style={[styles.tableCellMuted, styles.colRem]}>{line.discount_percent ? `${line.discount_percent}%` : "—"}</Text>
          <Text style={[styles.tableCellMuted, styles.colTva]}>{line.tva_rate}%</Text>
          <Text style={[styles.tableCellBold, styles.colHT]}>{fmt(line.total_ht)}</Text>
          <Text style={[styles.tableCellBold, styles.colTTC]}>{fmt(line.total_ttc)}</Text>
        </View>
      ))}
    </View>
  );
}

function TotalsSection({ data }: { data: PdfDocumentData }) {
  const hasBalance = data.remainingBalance != null && data.amountPaid != null;
  const hasGlobalDiscount = (data.globalDiscountAmount || 0) > 0;
  const subtotalHtBrut = hasGlobalDiscount ? data.subtotalHt + data.globalDiscountAmount! : data.subtotalHt;
  return (
    <View style={styles.totalsSection}>
      <View style={styles.totalsBox}>
        {hasGlobalDiscount && (
          <>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total HT brut</Text>
              <Text style={styles.totalsValue}>{fmt(subtotalHtBrut)} MAD</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsLabel, { color: "#DC2626" }]}>{data.globalDiscountLabel || "Remise globale"}</Text>
              <Text style={[styles.totalsValue, { color: "#DC2626" }]}>-{fmt(data.globalDiscountAmount!)} MAD</Text>
            </View>
          </>
        )}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>{hasGlobalDiscount ? "Total HT net" : "Total HT"}</Text>
          <Text style={styles.totalsValue}>{fmt(data.subtotalHt)} MAD</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Total TVA</Text>
          <Text style={styles.totalsValue}>{fmt(data.totalTva)} MAD</Text>
        </View>
        <View style={styles.totalsFinalRow}>
          <Text style={styles.totalsFinalLabel}>Total TTC</Text>
          <Text style={styles.totalsFinalValue}>{fmt(data.totalTtc)} MAD</Text>
        </View>
        {hasBalance && (
          <>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Montant payé</Text>
              <Text style={styles.totalsValue}>{fmt(data.amountPaid!)} MAD</Text>
            </View>
            <View style={styles.totalsBalanceRow}>
              <Text style={styles.totalsBalanceLabel}>Solde restant</Text>
              <Text style={styles.totalsBalanceValue}>{fmt(data.remainingBalance!)} MAD</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function NotesSection({ notes }: { notes: string }) {
  if (!notes) return null;
  return (
    <View style={styles.notesBox}>
      <Text style={styles.notesLabel}>Notes & Observations</Text>
      <Text style={styles.notesText}>{notes}</Text>
    </View>
  );
}

function FooterSection({ data }: { data: PdfDocumentData }) {
  const bank = data.bankAccount;
  const c = data.company;
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerTop}>
        {bank && (bank.bank_name || bank.rib) ? (
          <View style={styles.footerBankBox}>
            <Text style={styles.footerBankTitle}>Coordonnées bancaires</Text>
            {bank.bank_name && (
              <View style={styles.footerBankRow}>
                <Text style={styles.footerBankLabel}>Banque:</Text>
                <Text style={styles.footerBankValue}>{bank.bank_name}</Text>
              </View>
            )}
            {bank.account_name && (
              <View style={styles.footerBankRow}>
                <Text style={styles.footerBankLabel}>Compte:</Text>
                <Text style={styles.footerBankValue}>{bank.account_name}</Text>
              </View>
            )}
            {bank.account_number && (
              <View style={styles.footerBankRow}>
                <Text style={styles.footerBankLabel}>N° compte:</Text>
                <Text style={styles.footerBankValue}>{bank.account_number}</Text>
              </View>
            )}
            {bank.rib && (
              <View style={styles.footerBankRow}>
                <Text style={styles.footerBankLabel}>RIB:</Text>
                <Text style={styles.footerBankValue}>{bank.rib}</Text>
              </View>
            )}
            {bank.swift && (
              <View style={styles.footerBankRow}>
                <Text style={styles.footerBankLabel}>SWIFT/BIC:</Text>
                <Text style={styles.footerBankValue}>{bank.swift}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={{ alignItems: "flex-end", justifyContent: "flex-end" }}>
          <Text
            style={styles.footerPage}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
            fixed
          />
        </View>
      </View>
      {c.legal_mentions && (
        <Text style={[styles.footerLegal, { fontSize: 7, marginTop: 2, color: BRAND.navy }]}>
          {c.legal_mentions}
        </Text>
      )}
      <Text style={styles.footerLegal}>
        {c.raison_sociale}
        {c.forme_juridique ? ` — ${c.forme_juridique}` : ""}
        {c.capital ? ` — Capital: ${Number(c.capital).toLocaleString("fr-FR")} MAD` : ""}
        {c.ice ? ` — ICE: ${c.ice}` : ""}
        {c.if_number ? ` — IF: ${c.if_number}` : ""}
        {c.rc ? ` — RC: ${c.rc}` : ""}
        {c.patente ? ` — Patente: ${c.patente}` : ""}
      </Text>
    </View>
  );
}

// ─── Main PDF Document Component ──────────────────────────────────────────────
export function TijaraProPDF({ data }: { data: PdfDocumentData }) {
  return (
    <Document
      title={`${DOC_TITLES[data.type]} ${data.number}`}
      author={data.company.raison_sociale}
      creator="TijaraPro ERP"
      producer="TijaraPro ERP"
    >
      <Page size="A4" style={styles.page}>
        <CompanyHeader company={data.company} />
        <TitleBlock data={data} />
        <InfoRow data={data} />
        <PartiesBlock data={data} />
        <LineItemsTable lines={data.lines} />
        <TotalsSection data={data} />
        {data.notes && <NotesSection notes={data.notes} />}
        <FooterSection data={data} />
      </Page>
    </Document>
  );
}
