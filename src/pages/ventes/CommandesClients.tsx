import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useSalesOrders } from "@/hooks/useSales";
import { useStockEngine } from "@/hooks/useStockEngine";
import { SalesDocList } from "@/components/sales/SalesDocList";
import { SalesOrderDetailPage } from "@/components/sales/SalesOrderDetailPage";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ORDER_KANBAN_COLUMNS, getOrderTransitions, mapOrderCard } from "@/lib/kanban-config";
import { useAuth } from "@/hooks/useAuth";

const CommandesClients = () => {
  const salesOrders = useSalesOrders();
  const stock = useStockEngine();
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");

  if (selectedId) {
    const item = salesOrders.items.find(o => o.id === selectedId);
    if (item) {
      return (
        <SalesOrderDetailPage
          order={item}
          hook={salesOrders}
          stock={stock}
          onBack={() => setSelectedId(null)}
        />
      );
    }
  }

  const transitions = getOrderTransitions(salesOrders.confirm, salesOrders.cancel, stock.reserveStock, stock.releaseReservation);
  const cards = salesOrders.items.map(mapOrderCard);

  return (
    <AppLayout title="Bons de commande clients" subtitle="Gestion des commandes clients">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <SalesDocList
          title="Bons de commande"
          items={salesOrders.items}
          loading={salesOrders.loading}
          onView={(id) => setSelectedId(id)}
          onValidate={(id) => salesOrders.confirm(id, stock.reserveStock)}
          onCancel={(id) => salesOrders.cancel(id, stock.releaseReservation)}
          docType="order"
        />
      ) : (
        <KanbanBoard
          columns={ORDER_KANBAN_COLUMNS}
          cards={cards}
          transitions={transitions}
          isAdmin={isAdmin()}
          onCardClick={(id) => setSelectedId(id)}
        />
      )}
    </AppLayout>
  );
};

export default CommandesClients;
