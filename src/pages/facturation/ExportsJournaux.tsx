import { AppLayout } from "@/components/AppLayout";
import { InvoiceExports } from "@/components/invoice/InvoiceExports";

const ExportsJournaux = () => {
  return (
    <AppLayout title="Exports & Journaux" subtitle="Rapports et exports de facturation">
      <InvoiceExports />
    </AppLayout>
  );
};

export default ExportsJournaux;
