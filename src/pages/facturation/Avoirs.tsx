import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { CreditNoteList } from "@/components/invoice/CreditNoteList";
import { useLocation } from "react-router-dom";
import type { Invoice } from "@/types/invoice";

const Avoirs = () => {
  const location = useLocation();
  const [linkedInvoice, setLinkedInvoice] = useState<Invoice | null>(
    (location.state as any)?.linkedInvoice || null
  );

  return (
    <AppLayout title="Avoirs" subtitle="Gestion des avoirs clients et fournisseurs">
      <CreditNoteList linkedInvoice={linkedInvoice} onClearLinked={() => setLinkedInvoice(null)} />
    </AppLayout>
  );
};

export default Avoirs;
