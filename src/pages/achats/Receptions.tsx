import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useReceptions } from "@/hooks/usePurchases";
import { useStockEngine } from "@/hooks/useStockEngine";
import { ReceptionListPage } from "@/components/purchases/ReceptionListPage";
import { ReceptionFormPage } from "@/components/purchases/ReceptionFormPage";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { RECEPTION_KANBAN_COLUMNS, mapReceptionCard } from "@/lib/kanban-config";
import { useAuth } from "@/hooks/useAuth";
import type { KanbanTransition } from "@/components/KanbanBoard";

const Receptions = () => {
  const hook = useReceptions();
  const stock = useStockEngine();
  const { isAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");

  if (selectedId) {
    const item = hook.items.find((r: any) => r.id === selectedId);
    if (item) {
      return (
        <ReceptionFormPage
          reception={item}
          stockEngine={stock}
          onBack={() => { setSelectedId(null); hook.fetch(); }}
          onSaved={() => hook.fetch()}
        />
      );
    }
  }

  if (creating) {
    return (
      <ReceptionFormPage
        stockEngine={stock}
        onBack={() => { setCreating(false); hook.fetch(); }}
        onSaved={(id) => { setCreating(false); setSelectedId(id); hook.fetch(); }}
      />
    );
  }

  const transitions: KanbanTransition[] = [
    { from: "draft", to: "cancelled", requiresAdmin: true, requiresReason: true, action: async (id, r) => { await hook.cancel(id, r); } },
  ];

  const cards = hook.items.map(mapReceptionCard);

  return (
    <AppLayout title="Réceptions" subtitle="Suivi des réceptions fournisseurs">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <ReceptionListPage
          hook={hook}
          onNew={() => setCreating(true)}
          onView={(id: string) => setSelectedId(id)}
        />
      ) : (
        <KanbanBoard
          columns={RECEPTION_KANBAN_COLUMNS}
          cards={cards}
          transitions={transitions}
          isAdmin={isAdmin()}
          onCardClick={(id) => setSelectedId(id)}
        />
      )}
    </AppLayout>
  );
};

export default Receptions;
