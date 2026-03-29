import { ReactNode } from "react";
import defaultLogo from "@/assets/logo-tijarapro.jpg";

export type DocumentType = "devis" | "bon-commande" | "bon-livraison" | "facture" | "avoir";

export interface CompanyInfo {
  raison_sociale: string;
  forme_juridique?: string;
  ice?: string;
  if_number?: string;
  rc?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  logo_url?: string | null;
  capital?: number;
  // Bank info comes from a separate bank_accounts record — not company
  bankName?: string;
  bankRib?: string;
}

interface DocumentLine {
  ref: string;
  description: string;
  qty: number;
  unitPrice: number;
  tva: number;
}

interface DocumentTemplateProps {
  type: DocumentType;
  docNumber: string;
  date: string;
  client: {
    name: string;
    address: string;
    ice: string;
  };
  lines: DocumentLine[];
  notes?: string;
  company?: CompanyInfo | null;
  children?: ReactNode;
}

const typeLabels: Record<DocumentType, string> = {
  devis: "Devis",
  "bon-commande": "Bon de Commande",
  "bon-livraison": "Bon de Livraison",
  facture: "Facture",
  avoir: "Avoir",
};

export function DocumentTemplate({ type, docNumber, date, client, lines, notes, company }: DocumentTemplateProps) {
  const totalHT = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const totalTVA = lines.reduce((sum, l) => sum + l.qty * l.unitPrice * (l.tva / 100), 0);
  const totalTTC = totalHT + totalTVA;

  const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const c = company;
  const logoSrc = c?.logo_url || defaultLogo;
  const companyName = c?.raison_sociale || "Société Exemple SARL";
  const companyAddress = c ? `${c.address}${c.postal_code ? ` ${c.postal_code}` : ""} ${c.city}, Maroc` : "123 Boulevard Mohammed V\n20000 Casablanca, Maroc";
  const companyIce = c?.ice || "001234567000089";
  const companyIf = c?.if_number || "12345678";
  const companyRc = c?.rc || "123456";
  const companyPhone = c?.phone || "+212 5 22 00 00 00";
  const companyEmail = c?.email || "contact@exemple.ma";
  const companyWebsite = c?.website || "www.exemple.ma";
  const companyBankName = c?.bankName || "Banque Exemple";
  const companyBankRib = c?.bankRib || "000 000 0000000000000000 00";
  const companyCapital = c?.capital || 100000;
  const companyForme = c?.forme_juridique || "SARL";

  return (
    <div className="bg-card max-w-[210mm] mx-auto p-8 shadow-card border border-border print:shadow-none print:border-none" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <img src={logoSrc} alt="Logo" className="h-12 mb-3" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {companyName} {companyForme}<br />
            {companyAddress}<br />
            ICE : {companyIce}<br />
            IF : {companyIf}<br />
            RC : {companyRc}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tél : {companyPhone}<br />
            Email : {companyEmail}<br />
            {companyWebsite}
          </p>
        </div>
      </div>

      {/* Document title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary">{typeLabels[type]}</h2>
        <div className="h-1 w-24 gradient-primary rounded mt-2" />
        <div className="flex gap-8 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">N° : </span>
            <span className="font-semibold text-foreground">{docNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Date : </span>
            <span className="font-semibold text-foreground">{date}</span>
          </div>
        </div>
      </div>

      {/* Client info */}
      <div className="mb-8 p-4 rounded-lg bg-muted/30 border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Client</p>
        <p className="font-semibold text-foreground">{client.name}</p>
        <p className="text-sm text-muted-foreground">{client.address}</p>
        <p className="text-sm text-muted-foreground">ICE : {client.ice}</p>
      </div>

      {/* Lines table */}
      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="bg-secondary text-secondary-foreground">
            <th className="px-3 py-2 text-left font-semibold rounded-tl-md">Réf</th>
            <th className="px-3 py-2 text-left font-semibold">Désignation</th>
            <th className="px-3 py-2 text-right font-semibold">Qté</th>
            <th className="px-3 py-2 text-right font-semibold">P.U. HT</th>
            <th className="px-3 py-2 text-right font-semibold">TVA</th>
            <th className="px-3 py-2 text-right font-semibold rounded-tr-md">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className={`border-b border-border ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
              <td className="px-3 py-2 text-foreground">{line.ref}</td>
              <td className="px-3 py-2 text-foreground">{line.description}</td>
              <td className="px-3 py-2 text-right text-foreground">{line.qty}</td>
              <td className="px-3 py-2 text-right text-foreground">{fmt(line.unitPrice)} MAD</td>
              <td className="px-3 py-2 text-right text-foreground">{line.tva}%</td>
              <td className="px-3 py-2 text-right font-medium text-foreground">{fmt(line.qty * line.unitPrice)} MAD</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-2 text-sm border-b border-border">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium text-foreground">{fmt(totalHT)} MAD</span>
          </div>
          <div className="flex justify-between py-2 text-sm border-b border-border">
            <span className="text-muted-foreground">TVA</span>
            <span className="font-medium text-foreground">{fmt(totalTVA)} MAD</span>
          </div>
          <div className="flex justify-between py-2 text-sm font-bold">
            <span className="text-foreground">Total TTC</span>
            <span className="text-primary">{fmt(totalTTC)} MAD</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-8 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Notes :</p>
          <p>{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border pt-4 text-xs text-muted-foreground text-center leading-relaxed">
        <p className="font-medium">Informations bancaires : {companyBankName} — RIB : {companyBankRib}</p>
        <p className="mt-1">{companyName} {companyForme} au capital de {fmt(companyCapital)} MAD — RC {c?.city || "Casablanca"} N° {companyRc} — IF {companyIf} — ICE {companyIce}</p>
      </div>
    </div>
  );
}
