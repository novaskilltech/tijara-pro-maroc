import { AppLayout } from "@/components/AppLayout";
import { useStockEngine } from "@/hooks/useStockEngine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Mouvements = () => {
  const { movements } = useStockEngine();

  return (
    <AppLayout title="Mouvements de stock" subtitle="Journal des entrées et sorties de stock">
      <div className="space-y-4">
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun mouvement</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Coût unitaire</TableHead>
                  <TableHead>Référence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString("fr-MA")}</TableCell>
                    <TableCell>{m.product?.code} — {m.product?.name}</TableCell>
                    <TableCell>{m.warehouse?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={m.movement_type === "in" ? "text-green-600" : m.movement_type === "out" ? "text-destructive" : ""}>
                        {m.movement_type === "in" ? "Entrée" : m.movement_type === "out" ? "Sortie" : m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{m.quantity}</TableCell>
                    <TableCell className="text-right">{Number(m.unit_cost).toLocaleString("fr-MA")}</TableCell>
                    <TableCell className="text-xs">{m.reference_type || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Mouvements;
