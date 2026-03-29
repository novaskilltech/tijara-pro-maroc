import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useQuotations, useSalesOrders, useDeliveries } from "@/hooks/useSales";
import { useStockEngine } from "@/hooks/useStockEngine";
import { SalesDocList } from "@/components/sales/SalesDocList";
import { SalesFormDialog } from "@/components/sales/SalesFormDialog";
import { QuotationDetailPage } from "@/components/sales/QuotationDetailPage";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { QUOTATION_KANBAN_COLUMNS, getQuotationTransitions, mapQuotationCard } from "@/lib/kanban-config";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Devis = () => {
  const quotations = useQuotations();
  const salesOrders = useSalesOrders();
  const deliveries = useDeliveries();
  const stockEngine = useStockEngine();
  const { isAdmin } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const navigate = useNavigate();

  if (selectedId) {
    const item = quotations.items.find(q => q.id === selectedId);
    if (item) {
      return (
        <QuotationDetailPage
          quotation={item}
          hook={quotations}
          onBack={() => setSelectedId(null)}
          onConvertedToOrder={() => {
            setSelectedId(null);
            navigate("/ventes/commandes");
          }}
        />
      );
    }
  }

  const transitions = getQuotationTransitions(quotations.markSent, quotations.confirm, quotations.cancel);
  const cards = quotations.items.map(mapQuotationCard);

  return (
    <AppLayout title="Devis" subtitle="Gestion des devis clients">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <SalesDocList
          title="Devis"
          items={quotations.items}
          loading={quotations.loading}
          onCreate={() => setShowForm(true)}
          onView={(id) => setSelectedId(id)}
          onValidate={(id) => quotations.confirm(id)}
          onCancel={(id) => quotations.cancel(id)}
          onConvert={async (id, whId) => {
            await quotations.convertToOrder(id, whId);
            navigate("/ventes/commandes");
          }}
          onConvertToDelivery={async (id, whId) => {
            await quotations.convertQuotationToDelivery(id, whId);
            navigate("/ventes/livraisons");
          }}
          onConvertToInvoice={async (id, whId) => {
            await quotations.convertQuotationToInvoice(id, whId);
            navigate("/facturation/clients");
          }}
          onConvertFull={async (id, whId) => {
            await quotations.convertFullCycle(
              id, 
              whId, 
              stockEngine.reserveStock, 
              stockEngine.deductStock, 
              stockEngine.releaseReservation,
              salesOrders.createDelivery,
              salesOrders.createInvoiceFromOrder
            );
            navigate("/facturation/clients");
          }}
          docType="quotation"
        />
      ) : (
        <KanbanBoard
          columns={QUOTATION_KANBAN_COLUMNS}
          cards={cards}
          transitions={transitions}
          isAdmin={isAdmin()}
          onCardClick={(id) => setSelectedId(id)}
        />
      )}

      {showForm && (
        <SalesFormDialog
          type="quotation"
          onClose={() => setShowForm(false)}
          onSubmit={async (customerId, lines, notes, terms, globalDiscount) => {
            await quotations.create({ customerId, lines, notes, paymentTerms: terms, globalDiscount });
            setShowForm(false);
          }}
        />
      )}
    </AppLayout>
  );
};

export default Devis;
