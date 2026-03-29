import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { InvoiceList } from "@/components/invoice/InvoiceList";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { INVOICE_KANBAN_COLUMNS, getInvoiceTransitions, mapInvoiceCard } from "@/lib/kanban-config";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import type { Invoice } from "@/types/invoice";
import { useNavigate } from "react-router-dom";

const FacturesClients = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { invoices, loading, validateInvoice, cancelInvoice, markPaid } = useInvoices("client");
  const [view, setView] = useState<"list" | "kanban">("list");

  const handleCreateCreditNote = (invoice: Invoice) => {
    navigate("/facturation/avoirs", { state: { linkedInvoice: invoice } });
  };

  const transitions = getInvoiceTransitions(validateInvoice, cancelInvoice, markPaid);
  const cards = invoices.map((inv) => mapInvoiceCard(inv, "client"));

  return (
    <AppLayout title="Factures Clients" subtitle="Gestion des factures clients">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <InvoiceList invoiceType="client" onCreateCreditNote={handleCreateCreditNote} />
      ) : (
        <KanbanBoard
          columns={INVOICE_KANBAN_COLUMNS}
          cards={cards}
          transitions={transitions}
          isAdmin={isAdmin()}
        />
      )}
    </AppLayout>
  );
};

export default FacturesClients;
