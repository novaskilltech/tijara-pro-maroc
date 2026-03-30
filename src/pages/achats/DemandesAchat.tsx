import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { usePurchaseRequests } from "@/hooks/usePurchases";
import { PurchaseRequestList } from "@/components/purchases/PurchaseRequestList";
import { PurchaseRequestForm } from "@/components/purchases/PurchaseRequestForm";

const DemandesAchat = () => {
  const hook = usePurchaseRequests();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  return (
    <AppLayout title="Demandes d'achat" subtitle="Gestion des demandes d'achat">
      <PurchaseRequestList
        items={hook.items}
        loading={hook.loading}
        onNew={() => { setEditItem(null); setShowForm(true); }}
        onEdit={(item) => { setEditItem(item); setShowForm(true); }}
        onDelete={hook.remove}
        onSubmit={hook.submit}
        onApprove={hook.approve}
        onRefuse={hook.refuse}
        onCancel={hook.cancel}
        onCreatePO={hook.createPOFromRequest}
      />
      {showForm && (
        <PurchaseRequestForm
          editItem={editItem}
          hook={hook}
          onClose={() => setShowForm(false)}
        />
      )}
    </AppLayout>
  );
};

export default DemandesAchat;
