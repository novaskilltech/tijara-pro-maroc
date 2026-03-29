import { AppLayout } from "@/components/AppLayout";
import { UnpaidDashboard } from "@/components/payments/UnpaidDashboard";

const Impayes = () => {
  return (
    <AppLayout title="Impayés & Relances" subtitle="Suivi des impayés et relances clients">
      <UnpaidDashboard />
    </AppLayout>
  );
};

export default Impayes;
