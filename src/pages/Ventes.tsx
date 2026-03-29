import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuotations, useSalesOrders } from "@/hooks/useSales";
import { useStockEngine } from "@/hooks/useStockEngine";
import { SalesDocList } from "@/components/sales/SalesDocList";
import { SalesFormDialog } from "@/components/sales/SalesFormDialog";
import { DeliveryPanel } from "@/components/sales/DeliveryPanel";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";

const Ventes = () => {
  const quotations = useQuotations();
  const salesOrders = useSalesOrders();
  const stock = useStockEngine();
  const [showForm, setShowForm] = useState<"quotation" | null>(null);
  const [tab, setTab] = useState("devis");

  return (
    <AppLayout title="Ventes" subtitle="Gestion commerciale et suivi des ventes">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="commandes">Bons de commande</TabsTrigger>
          <TabsTrigger value="livraisons">Bons de livraison</TabsTrigger>
          <TabsTrigger value="master">Données maîtres</TabsTrigger>
        </TabsList>

        <TabsContent value="devis">
          <SalesDocList
            title="Devis"
            items={quotations.items}
            loading={quotations.loading}
            onCreate={() => setShowForm("quotation")}
            onValidate={(id) => quotations.confirm(id)}
            onCancel={(id) => quotations.cancel(id)}
            onConvert={async (id, whId) => {
              await quotations.convertToOrder(id, whId);
              setTab("commandes");
              salesOrders.fetch();
            }}
            docType="quotation"
          />
        </TabsContent>

        <TabsContent value="commandes">
          <SalesDocList
            title="Bons de commande"
            items={salesOrders.items}
            loading={salesOrders.loading}
            onValidate={(id) => salesOrders.confirm(id, stock.reserveStock)}
            onCancel={(id) => salesOrders.cancel(id, stock.releaseReservation)}
            docType="order"
          />
          <DeliveryPanel salesOrders={salesOrders} stock={stock} />
        </TabsContent>

        <TabsContent value="livraisons">
          <DeliveryPanel salesOrders={salesOrders} stock={stock} showAll />
        </TabsContent>

        <TabsContent value="master">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/ventes/clients" className="bg-card rounded-lg border border-border shadow-card p-6 hover:border-primary/30 hover:bg-accent/30 transition-all group">
              <Users className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground">Clients</h3>
              <p className="text-sm text-muted-foreground mt-1">Gérez votre fichier clients.</p>
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      {showForm && (
        <SalesFormDialog
          type="quotation"
          onClose={() => setShowForm(null)}
          onSubmit={async (customerId, lines, notes, terms) => {
            await quotations.create({ customerId, lines, notes, paymentTerms: terms });
            setShowForm(null);
          }}
        />
      )}
    </AppLayout>
  );
};

export default Ventes;
