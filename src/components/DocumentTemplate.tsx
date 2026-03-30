import { ReactNode } from "react";
import defaultLogo from "@/assets/logo-tijarapro.jpg";

export type DocumentType = "devis" | "bon-commande" | "bon-livraison" | "facture" | "avoir";

export interface CompanyInfo {
  raison_sociale: string;
  forme_juridique?: string;
  ice?: string;
  if_number?: string;
  rc?: string;
  patente?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  logo_url?: string | null;
  capital?: number;
  bankName?: string;
  bankRib?: string;
}

interface DocumentLine {
  ref: string;
  description: string;
  qty: number;
  unitPrice: number;
  tva: number;
  discount?: number;
}

interface DocumentTemplateProps {
  type: DocumentType;
  docNumber: string;
  date: string;
  dueDate?: string;
  client: {
    name: string;
    address?: string;
    ice?: string;
  };
  lines: DocumentLine[];
  notes?: string;
  paymentTerms?: string;
  company?: CompanyInfo | null;
  children?: ReactNode;
}

const typeLabels: Record<DocumentType, string> = {
  devis: "DEVIS",
  "bon-commande": "BON DE COMMANDE",
  "bon-livraison": "BON DE LIVRAISON",
  facture: "FACTURE",
  avoir: "AVOIR",
};

export function DocumentTemplate({ type, docNumber, date, dueDate, client, lines, notes, paymentTerms, company }: DocumentTemplateProps) {
  const totalHT = lines.reduce((sum, l) => sum + (l.qty * l.unitPrice * (1 - (l.discount || 0) / 100)), 0);
  const totalTVA = lines.reduce((sum, l) => {
    const lineHT = l.qty * l.unitPrice * (1 - (l.discount || 0) / 100);
    return sum + lineHT * (l.tva / 100);
  }, 0);
  const totalTTC = totalHT + totalTVA;

  const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const c = company;
  const logoSrc = c?.logo_url || defaultLogo;
  const companyName = c?.raison_sociale || "Société Exemple";
  
  // Colors aligned with BRAND in PDF
  const colors = {
    primary: "#2b6cb0",
    navy: "#1a365d",
    textDark: "#1a202c",
    textMid: "#4a5568",
    cyan10: "#ebf8ff",
    border: "#e2e8f0",
    zebra: "#f7fafc"
  };

  return (
    <div className="bg-white max-w-[210mm] mx-auto p-12 shadow-lg border border-gray-200 print:shadow-none print:border-none text-[#1a202c]" style={{ fontFamily: "'Inter', 'Helvetica', sans-serif", fontSize: "11px" }}>
      {/* ─── Header ─── */}
      <div className="flex justify-between items-start mb-6 pb-6 border-b-2" style={{ borderBottomColor: colors.primary }}>
        <div className="w-1/2">
          {c?.logo_url ? (
            <img src={logoSrc} alt="Logo" className="max-h-20 mb-4 object-contain" />
          ) : (
            <div className="text-3xl font-extrabold mb-2" style={{ color: colors.navy }}>{companyName}</div>
          )}
          <div className="text-[10px] space-y-1" style={{ color: colors.textMid }}>
            <p className="font-bold text-gray-800 text-sm">{companyName}</p>
            {c?.address && <p>{c.address}</p>}
            <p>{c?.city || ""} {c?.postal_code || ""} Maroc</p>
            {c?.phone && <p>Tél : {c.phone}</p>}
          </div>
        </div>
        
        <div className="w-[180px]">
          <div className="rounded-lg p-3 space-y-1.5" style={{ backgroundColor: colors.cyan10 }}>
            {c?.ice && (
              <div className="flex justify-between text-[9px]">
                <span className="font-bold uppercase opacity-60">ICE</span>
                <span>{c.ice}</span>
              </div>
            )}
            {c?.if_number && (
              <div className="flex justify-between text-[9px]">
                <span className="font-bold uppercase opacity-60">IF</span>
                <span>{c.if_number}</span>
              </div>
            )}
            {c?.rc && (
              <div className="flex justify-between text-[9px]">
                <span className="font-bold uppercase opacity-60">RC</span>
                <span>{c.rc}</span>
              </div>
            )}
            {c?.patente && (
              <div className="flex justify-between text-[9px]">
                <span className="font-bold uppercase opacity-60">Patente</span>
                <span>{c.patente}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Title Block ─── */}
      <div className="flex justify-between items-center rounded-lg px-6 py-4 mb-6" style={{ backgroundColor: colors.navy }}>
        <h1 className="text-xl font-bold text-white uppercase tracking-wider m-0">{typeLabels[type]}</h1>
        <div className="text-right">
          <p className="text-sm font-bold m-0" style={{ color: colors.primary }}>N° {docNumber}</p>
          <p className="text-[10px] text-blue-200 mt-1 opacity-80">Date : {date}</p>
        </div>
      </div>

      {/* ─── Info Row (Secondary) ─── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded border-l-4 p-3 space-y-1" style={{ backgroundColor: colors.cyan10, borderLeftColor: colors.primary }}>
          <p className="text-[9px] font-bold uppercase opacity-60 m-0">Date du document</p>
          <p className="text-sm font-bold m-0">{date}</p>
        </div>
        {dueDate && (
          <div className="rounded border-l-4 p-3 space-y-1" style={{ backgroundColor: colors.cyan10, borderLeftColor: colors.primary }}>
            <p className="text-[9px] font-bold uppercase opacity-60 m-0">Date d'échéance</p>
            <p className="text-sm font-bold m-0">{dueDate}</p>
          </div>
        )}
        <div className="rounded border-l-4 p-3 space-y-1" style={{ backgroundColor: colors.cyan10, borderLeftColor: colors.primary }}>
          <p className="text-[9px] font-bold uppercase opacity-60 m-0">Conditions</p>
          <p className="text-sm font-bold m-0">{paymentTerms || "Sur facture"}</p>
        </div>
      </div>

      {/* ─── Parties ─── */}
      <div className="flex justify-between gap-6 mb-8">
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
          <div className="px-4 py-2 text-white font-bold text-[10px] uppercase tracking-wider" style={{ backgroundColor: colors.navy }}>
            Destinataire
          </div>
          <div className="p-4 bg-white min-h-[80px] space-y-1">
            <p className="font-bold text-sm mb-2" style={{ color: colors.navy }}>{client.name}</p>
            {client.address && <p className="text-gray-600 leading-snug whitespace-pre-wrap">{client.address}</p>}
            {client.ice && <p className="mt-2 font-bold" style={{ color: colors.primary }}>ICE : {client.ice}</p>}
          </div>
        </div>
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: colors.border }}>
          <div className="px-4 py-2 text-white font-bold text-[10px] uppercase tracking-wider" style={{ backgroundColor: colors.navy }}>
            {["bon-livraison", "facture"].includes(type) ? "ADRESSE DE LIVRAISON" : "INFORMATIONS"}
          </div>
          <div className="p-4 bg-white min-h-[80px]">
            <p className="text-gray-600 text-sm">Référence : {docNumber}</p>
            <p className="text-gray-600 text-sm mt-2">Date : {date}</p>
          </div>
        </div>
      </div>

      {/* ─── Lines Table ─── */}
      <div className="rounded-lg border overflow-hidden mb-8" style={{ borderColor: colors.border }}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-white text-[10px] h-10 px-4" style={{ backgroundColor: colors.navy }}>
              <th className="pl-4 pr-2 font-bold uppercase w-10">#</th>
              <th className="px-2 font-bold uppercase">Désignation</th>
              <th className="px-2 font-bold uppercase text-center w-16">Qté</th>
              <th className="px-2 font-bold uppercase text-right w-24">P.U. HT</th>
              <th className="px-2 font-bold uppercase text-center w-14">Rem.</th>
              <th className="px-2 font-bold uppercase text-center w-14">TVA</th>
              <th className="pl-2 pr-4 font-bold uppercase text-right w-28">Total HT</th>
            </tr>
          </thead>
          <tbody className="text-[10.5px]">
            {lines.map((line, i) => (
              <tr key={i} className="border-b" style={{ borderColor: colors.border, backgroundColor: i % 2 === 1 ? colors.zebra : "transparent" }}>
                <td className="pl-4 pr-2 py-2.5 text-gray-500">{i + 1}</td>
                <td className="px-2 py-2.5 font-medium leading-tight">
                  {line.ref && <span className="text-gray-400 font-mono text-[9px] mr-1">[{line.ref}]</span>}
                  {line.description}
                </td>
                <td className="px-2 py-2.5 text-center">{line.qty}</td>
                <td className="px-2 py-2.5 text-right">{fmt(line.unitPrice)}</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{line.discount || 0}%</td>
                <td className="px-2 py-2.5 text-center text-gray-500">{line.tva}%</td>
                <td className="pl-2 pr-4 py-2.5 text-right font-bold text-gray-800">{fmt(line.qty * line.unitPrice * (1 - (line.discount || 0) / 100))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Totals ─── */}
      <div className="flex justify-end mb-10">
        <div className="w-72 rounded-lg border overflow-hidden shadow-sm" style={{ borderColor: colors.border }}>
          <div className="flex justify-between px-4 py-2 border-b" style={{ borderColor: colors.border }}>
            <span className="text-gray-500">Total Hors Taxe</span>
            <span className="font-bold">{fmt(totalHT)} MAD</span>
          </div>
          <div className="flex justify-between px-4 py-2 border-b" style={{ borderColor: colors.border }}>
            <span className="text-gray-500">Total TVA</span>
            <span className="font-bold">{fmt(totalTVA)} MAD</span>
          </div>
          <div className="flex justify-between px-4 py-3 text-white" style={{ backgroundColor: colors.navy }}>
            <span className="text-base font-extrabold uppercase">TOTAL TTC</span>
            <span className="text-base font-extrabold" style={{ color: colors.primary }}>{fmt(totalTTC)} MAD</span>
          </div>
        </div>
      </div>

      {/* ─── Notes ─── */}
      {notes && (
        <div className="mb-12 rounded-lg border-l-4 p-4" style={{ backgroundColor: colors.cyan10, borderLeftColor: colors.primary }}>
          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2 tracking-widest">Notes & Observations</span>
          <p className="text-gray-700 italic text-[11px] leading-relaxed whitespace-pre-wrap m-0">{notes}</p>
        </div>
      )}

      {/* ─── Footer ─── */}
      <div className="mt-auto pt-6 border-t-2" style={{ borderTopColor: colors.primary }}>
        <div className="grid grid-cols-2 gap-8 mb-4">
          {c?.bankName && (
            <div className="rounded p-4 space-y-2" style={{ backgroundColor: colors.cyan10 }}>
              <p className="text-[9px] font-bold uppercase opacity-60 mb-1" style={{ color: colors.navy }}>Coordonnées Bancaires</p>
              <div className="flex space-x-2 text-[10px]">
                <span className="text-gray-500 w-12">Banque:</span>
                <span className="font-bold">{c.bankName}</span>
              </div>
              <div className="flex space-x-2 text-[10px]">
                <span className="text-gray-500 w-12">RIB:</span>
                <span className="font-mono text-[9px]">{c.bankRib}</span>
              </div>
            </div>
          )}
          <div className="text-right flex flex-col justify-end">
            <p className="text-[9px] text-gray-400">Généré par TijaraPro ERP le {new Date().toLocaleDateString("fr-MA")}</p>
          </div>
        </div>
        
        <div className="text-center space-y-1">
          <p className="font-bold text-[10px] text-gray-600">
            {c?.raison_sociale} {c?.forme_juridique ? `— ${c.forme_juridique}` : ""} 
            {c?.capital ? ` au capital de ${fmt(c.capital)} MAD` : ""}
          </p>
          <div className="text-[9px] text-gray-400 flex justify-center divide-x divide-gray-200">
            <span className="px-2">ICE: {c?.ice || "—"}</span>
            <span className="px-2">IF: {c?.if_number || "—"}</span>
            <span className="px-2">RC: {c?.rc || "—"}</span>
            <span className="px-2">Patente: {c?.patente || "—"}</span>
          </div>
          <p className="text-[9px] text-gray-400">{c?.address ? `${c.address}, ` : ""}{c?.city || ""} — Maroc</p>
        </div>
      </div>
    </div>
  );
}
