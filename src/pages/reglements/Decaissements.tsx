import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PaymentList } from "@/components/payments/PaymentList";
import { ViewToggle } from "@/components/ViewToggle";
import { KanbanBoard } from "@/components/KanbanBoard";
import { PAYMENT_KANBAN_COLUMNS, mapPaymentCard } from "@/lib/kanban-config";
import { usePayments } from "@/hooks/usePayments";
import { useAuth } from "@/hooks/useAuth";
import type { KanbanTransition } from "@/components/KanbanBoard";

const Decaissements = () => {
  const { isAdmin } = useAuth();
  const { payments } = usePayments("supplier");
  const [view, setView] = useState<"list" | "kanban">("list");

  const chequePayments = payments.filter(p => p.payment_method === "cheque");
  const cards = chequePayments.map(p => mapPaymentCard(p, "supplier"));
  const transitions: KanbanTransition[] = [];

  return (
    <AppLayout title="Décaissements" subtitle="Paiements fournisseurs émis">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <PaymentList paymentType="supplier" />
      ) : (
        <KanbanBoard
          columns={PAYMENT_KANBAN_COLUMNS}
          cards={cards}
          transitions={transitions}
          isAdmin={isAdmin()}
        />
      )}
    </AppLayout>
  );
};

export default Decaissements;
