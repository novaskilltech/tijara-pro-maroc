// import * as XLSX from 'xlsx';

/**
 * Utilitaires pour l'export Excel dans TIJARAPRO
 */
export const excelExport = {
  /**
   * Génère et télécharge un fichier Excel à partir d'un tableau d'objets
   */
  exportToExcel: async (data: any[], filename: string, sheetName: string = "Données") => {
    // Import dynamique pour alléger le build et éviter les crashs Rollup
    const XLSX = await import('xlsx');
    
    // Créer un classeur
    const wb = XLSX.utils.book_new();
    
    // Créer une feuille à partir des données
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajuster la largeur des colonnes
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key] || "").length)) + 2
    }));
    ws['!cols'] = colWidths as any;
    
    // Ajouter la feuille au classeur
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Télécharger le fichier
    XLSX.writeFile(wb, `${filename}.xlsx`);
  },

  /**
   * Formate les données produits pour l'export (Toutes les colonnes)
   */
  formatProductsForExport: (products: any[]) => {
    return products.map(p => ({
      "Référence": p.code,
      "Désignation": p.name,
      "Catégorie": p.category || "—",
      "Type": p.product_type === "service" ? "Service" : p.product_type === "consumable" ? "Consommable" : "Stockable",
      "Code-barres": p.barcode || "—",
      "Unité de vente": p.unit || "Unité",
      "Unité d'achat": p.purchase_unit || "Unité",
      "Prix de vente HT": p.sale_price,
      "Coût d'achat HT": p.purchase_price,
      "Taux TVA (%)": p.tva_rate || 20,
      "Stock minimum": p.min_stock || 0,
      "Poids (kg)": p.weight || 0,
      "Peut être vendu": p.can_be_sold !== false ? "Oui" : "Non",
      "Peut être acheté": p.can_be_purchased !== false ? "Oui" : "Non",
      "Description": p.description || "—",
      "Actif": p.is_active !== false ? "Oui" : "Non",
      "URL Image": p.image_url || "—"
    }));
  },

  /**
   * Formate les données factures pour l'export
   */
  formatInvoicesForExport: (invoices: any[]) => {
    return invoices.map(inv => ({
      "Numéro": inv.invoice_number,
      "Date": inv.invoice_date,
      "Tiers": inv.customer?.name || inv.supplier?.name || "—",
      "Total HT": inv.subtotal_ht,
      "Total TVA": inv.total_tva,
      "Total TTC": inv.total_ttc,
      "Reste à payer": inv.remaining_balance,
      "Statut": inv.status
    }));
  },

  /**
   * Formate les données fournisseurs pour l'export
   */
  formatSuppliersForExport: (suppliers: any[]) => {
    return suppliers.map(s => ({
      "Code": s.code,
      "Raison sociale": s.name,
      "Type": s.entity_type === "morale" ? "Personne Morale" : "Personne Physique",
      "ICE": s.ice || "—",
      "RC": s.rc || "—",
      "IF": s.if_number || "—",
      "Patente": s.patente || "—",
      "Email": s.email || "—",
      "Téléphone 1": s.phone || "—",
      "Téléphone 2": s.phone2 || "—",
      "Fax": s.fax || "—",
      "Ville": s.city || "—",
      "Adresse": s.address || "—",
      "Plafond crédit": s.credit_limit || 0,
      "Conditions paiement": s.payment_terms || "30j",
      "Banque": s.bank_name || "—",
      "RIB": s.rib || "—",
      "Notes": s.notes || "—",
      "Actif": s.is_active !== false ? "Oui" : "Non"
    }));
  },

  /**
   * Formate les données clients pour l'export
   */
  formatCustomersForExport: (customers: any[]) => {
    return customers.map(c => ({
      "Code": c.code,
      "Raison sociale": c.name,
      "Type": c.entity_type === "morale" ? "Personne Morale" : "Personne Physique",
      "ICE": c.ice || "—",
      "RC": c.rc || "—",
      "IF": c.if_number || "—",
      "Patente": c.patente || "—",
      "Email": c.email || "—",
      "Téléphone 1": c.phone || "—",
      "Téléphone 2": c.phone2 || "—",
      "Fax": c.fax || "—",
      "Ville": c.city || "—",
      "Adresse": c.address || "—",
      "Plafond crédit": c.credit_limit || 0,
      "Conditions paiement": c.payment_terms || "30j",
      "Banque": c.bank_name || "—",
      "RIB": c.rib || "—",
      "Notes": c.notes || "—",
      "Actif": c.is_active !== false ? "Oui" : "Non"
    }));
  }
};
