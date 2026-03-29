import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { PdfCompany, PdfDocumentType } from "./types";
import { DOC_TITLES, BRAND } from "./types";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: BRAND.textDark,
    backgroundColor: BRAND.white,
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.primary,
  },
  logo: { maxWidth: 120, maxHeight: 45, objectFit: "contain" },
  companyName: { fontFamily: "Helvetica-Bold", fontSize: 12, color: BRAND.navy },
  companyInfo: { fontSize: 7, color: BRAND.textMid, marginTop: 2 },
  
  titleSection: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: BRAND.navy,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  period: {
    fontSize: 10,
    color: BRAND.textMid,
  },

  table: {
    width: "100%",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND.navy,
    padding: 6,
    borderRadius: 2,
  },
  tableHeaderCell: {
    color: BRAND.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    padding: 6,
    alignItems: "center",
  },
  tableCell: { fontSize: 8 },
  
  colDate: { width: "12%" },
  colNo: { width: "15%" },
  colParty: { flex: 1 },
  colIce: { width: "15%" },
  colHT: { width: "12%", textAlign: "right" },
  colTva: { width: "10%", textAlign: "right" },
  colTTC: { width: "12%", textAlign: "right" },

  totalsSection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsBox: {
    width: 200,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 3,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    backgroundColor: BRAND.navy,
  },
  totalLabel: { fontSize: 8, color: BRAND.textMid },
  totalValue: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  totalLabelFinal: { fontSize: 9, color: BRAND.white, fontFamily: "Helvetica-Bold" },
  totalValueFinal: { fontSize: 10, color: BRAND.primary, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: BRAND.textLight,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 5,
  }
});

const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface JournalReportProps {
  type: PdfDocumentType;
  company: PdfCompany;
  period: { from: string; to: string };
  items: any[];
}

export function BillingJournalPDF({ type, company, period, items }: JournalReportProps) {
  const totals = items.reduce((acc, item) => ({
    ht: acc.ht + Number(item.subtotal_ht || 0),
    tva: acc.tva + Number(item.total_tva || 0),
    ttc: acc.ttc + Number(item.total_ttc || 0),
  }), { ht: 0, tva: 0, ttc: 0 });

  return (
    <Document title={DOC_TITLES[type]}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company.logo_url ? (
              <Image src={company.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{company.raison_sociale}</Text>
            )}
            <Text style={styles.companyInfo}>{company.address}, {company.city}</Text>
            <Text style={styles.companyInfo}>ICE: {company.ice || "—"} | IF: {company.if_number || "—"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 7, color: BRAND.textLight }}>Généré le {new Date().toLocaleDateString('fr-FR')}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{DOC_TITLES[type]}</Text>
          <Text style={styles.period}>Période du {period.from} au {period.to}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.colNo]}>N° Facture</Text>
            <Text style={[styles.tableHeaderCell, styles.colParty]}>Tiers</Text>
            <Text style={[styles.tableHeaderCell, styles.colIce]}>ICE</Text>
            <Text style={[styles.tableHeaderCell, styles.colHT]}>Total HT</Text>
            <Text style={[styles.tableHeaderCell, styles.colTva]}>TVA</Text>
            <Text style={[styles.tableHeaderCell, styles.colTTC]}>Total TTC</Text>
          </View>

          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDate]}>{item.invoice_date}</Text>
              <Text style={[styles.tableCell, styles.colNo]}>{item.invoice_number}</Text>
              <Text style={[styles.tableCell, styles.colParty]}>{item.customer?.name || item.supplier?.name || "—"}</Text>
              <Text style={[styles.tableCell, styles.colIce]}>{item.customer?.ice || item.supplier?.ice || "—"}</Text>
              <Text style={[styles.tableCell, styles.colHT]}>{fmt(item.subtotal_ht)}</Text>
              <Text style={[styles.tableCell, styles.colTva]}>{fmt(item.total_tva)}</Text>
              <Text style={[styles.tableCell, styles.colTTC]}>{fmt(item.total_ttc)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT cumulé</Text>
              <Text style={styles.totalValue}>{fmt(totals.ht)} MAD</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total TVA cumulée</Text>
              <Text style={styles.totalValue}>{fmt(totals.tva)} MAD</Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={styles.totalLabelFinal}>Total TTC Général</Text>
              <Text style={styles.totalValueFinal}>{fmt(totals.ttc)} MAD</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Journal de Facturation - ${company.raison_sociale} - Page ${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
