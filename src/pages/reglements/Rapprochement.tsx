import { AppLayout } from "@/components/AppLayout";
import { BankReconciliation } from "@/components/payments/BankReconciliation";

const Rapprochement = () => {
  return (
    <AppLayout title="Rapprochement bancaire" subtitle="Lettrage et rapprochement des transactions">
      <BankReconciliation />
    </AppLayout>
  );
};

export default Rapprochement;
