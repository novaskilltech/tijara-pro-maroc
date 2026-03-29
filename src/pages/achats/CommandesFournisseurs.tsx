import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { usePurchaseOrders } from "@/hooks/usePurchases";
import { PurchaseOrderList } from "@/components/purchases/PurchaseOrderList";
import { PurchaseOrderForm } from "@/components/purchases/PurchaseOrderForm";

const CommandesFournisseurs = () => {
  const hook = usePurchaseOrders();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  return (
    <AppLayout title="Bons de commande fournisseurs" subtitle="Gestion des commandes fournisseurs">
      <PurchaseOrderList
        items={hook.items}
        loading={hook.loading}
        onNew={() => { setEditItem(null); setShowForm(true); }}
        onEdit={(item) => { setEditItem(item); setShowForm(true); }}
        onConfirm={hook.confirm}
        onCancel={hook.cancel}
        onCreateReception={() => {}} // handled inline in list
        hook={hook}
      />
      {showForm && (
        <PurchaseOrderForm
          editItem={editItem}
          hook={hook}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppLayout>
  );
};

export default CommandesFournisseurs;
