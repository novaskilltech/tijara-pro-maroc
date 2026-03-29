import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentList } from "@/components/payments/PaymentList";
import { BankReconciliation } from "@/components/payments/BankReconciliation";
import { UnpaidDashboard } from "@/components/payments/UnpaidDashboard";
import { ArrowDownCircle, ArrowUpCircle, Landmark, AlertTriangle } from "lucide-react";

const Reglements = () => {
  const [activeTab, setActiveTab] = useState("encaissements");

  return (
    <AppLayout title="Règlements & Trésorerie" subtitle="Suivi des paiements et flux de trésorerie">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="encaissements" className="gap-1.5"><ArrowDownCircle className="h-4 w-4" /> Encaissements</TabsTrigger>
          <TabsTrigger value="decaissements" className="gap-1.5"><ArrowUpCircle className="h-4 w-4" /> Décaissements</TabsTrigger>
          <TabsTrigger value="rapprochement" className="gap-1.5"><Landmark className="h-4 w-4" /> Rapprochement</TabsTrigger>
          <TabsTrigger value="impayes" className="gap-1.5"><AlertTriangle className="h-4 w-4" /> Impayés</TabsTrigger>
        </TabsList>

        <TabsContent value="encaissements"><PaymentList paymentType="client" /></TabsContent>
        <TabsContent value="decaissements"><PaymentList paymentType="supplier" /></TabsContent>
        <TabsContent value="rapprochement"><BankReconciliation /></TabsContent>
        <TabsContent value="impayes"><UnpaidDashboard /></TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Reglements;
