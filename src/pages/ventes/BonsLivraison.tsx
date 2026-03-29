import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useDeliveries } from "@/hooks/useSales";
import { useStockEngine } from "@/hooks/useStockEngine";
import { DeliveryListPage } from "@/components/sales/DeliveryListPage";
import { DeliveryFormPage } from "@/components/sales/DeliveryFormPage";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { DELIVERY_KANBAN_COLUMNS, getDeliveryTransitions, mapDeliveryCard } from "@/lib/kanban-config";
import { useAuth } from "@/hooks/useAuth";

const BonsLivraison = () => {
  const deliveries = useDeliveries();
  const stock = useStockEngine();
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");

  if (selectedId) {
    const item = deliveries.items.find((d: any) => d.id === selectedId);
    if (item) {
      return (
        <DeliveryFormPage
          delivery={item}
          stockEngine={stock}
          onBack={() => { setSelectedId(null); deliveries.fetch(); }}
          onSaved={() => deliveries.fetch()}
        />
      );
    }
  }

  if (creating) {
    return (
      <DeliveryFormPage
        stockEngine={stock}
        onBack={() => { setCreating(false); deliveries.fetch(); }}
        onSaved={(id) => { setCreating(false); setSelectedId(id); deliveries.fetch(); }}
      />
    );
  }

  const transitions = getDeliveryTransitions(deliveries.validateDelivery, stock.deductStock, stock.releaseReservation);
  const cards = deliveries.items.map(mapDeliveryCard);

  return (
    <AppLayout title="Bons de livraison" subtitle="Suivi des livraisons clients">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <DeliveryListPage
          deliveries={deliveries}
          stock={stock}
          onNew={() => setCreating(true)}
          onView={(id: string) => setSelectedId(id)}
        />
      ) : (
        <KanbanBoard
          columns={DELIVERY_KANBAN_COLUMNS}
          cards={cards}
          transitions={transitions}
          isAdmin={isAdmin()}
          onCardClick={(id) => setSelectedId(id)}
        />
      )}
    </AppLayout>
  );
};

export default BonsLivraison;
