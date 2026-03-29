import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceList } from "@/components/invoice/InvoiceList";
import { CreditNoteList } from "@/components/invoice/CreditNoteList";
import { InvoiceExports } from "@/components/invoice/InvoiceExports";
import type { Invoice } from "@/types/invoice";
import { FileText, Users, Truck, ReceiptText, BarChart3 } from "lucide-react";

const Facturation = () => {
  const [activeTab, setActiveTab] = useState("client");
  const [linkedInvoice, setLinkedInvoice] = useState<Invoice | null>(null);

  const handleCreateCreditNote = (invoice: Invoice) => {
    setLinkedInvoice(invoice);
    setActiveTab("avoirs");
  };

  return (
    <AppLayout title="Facturation" subtitle="Gestion des factures clients, fournisseurs et avoirs">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="client" className="gap-1.5"><Users className="h-4 w-4" /> Factures Clients</TabsTrigger>
          <TabsTrigger value="supplier" className="gap-1.5"><Truck className="h-4 w-4" /> Factures Fournisseurs</TabsTrigger>
          <TabsTrigger value="avoirs" className="gap-1.5"><ReceiptText className="h-4 w-4" /> Avoirs</TabsTrigger>
          <TabsTrigger value="exports" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="client">
          <InvoiceList invoiceType="client" onCreateCreditNote={handleCreateCreditNote} />
        </TabsContent>

        <TabsContent value="supplier">
          <InvoiceList invoiceType="supplier" onCreateCreditNote={handleCreateCreditNote} />
        </TabsContent>

        <TabsContent value="avoirs">
          <CreditNoteList linkedInvoice={linkedInvoice} onClearLinked={() => setLinkedInvoice(null)} />
        </TabsContent>

        <TabsContent value="exports">
          <InvoiceExports />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Facturation;
