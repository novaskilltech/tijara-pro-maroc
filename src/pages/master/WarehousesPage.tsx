import { AppLayout } from "@/components/AppLayout";
import { MasterDataPage, FieldConfig } from "@/components/MasterDataPage";
import { useCrud } from "@/hooks/useCrud";
import { Warehouse } from "lucide-react";

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  is_default: boolean;
  is_active: boolean;
}

const fields: FieldConfig[] = [
  { key: "code", label: "Code", required: true, placeholder: "DEP-001" },
  { key: "name", label: "Nom", required: true, placeholder: "Dépôt principal" },
  { key: "address", label: "Adresse", placeholder: "Adresse complète" },
  { key: "city", label: "Ville", placeholder: "Casablanca" },
];

export default function WarehousesPage() {
  const { data, loading, create, update, remove } = useCrud<WarehouseData>({ table: "warehouses", orderBy: "code", ascending: true, companyScoped: true });

  return (
    <AppLayout title="Liste des Dépôts">
      <MasterDataPage
        title="Dépôt"
        icon={<Warehouse className="h-8 w-8" />}
        data={data}
        loading={loading}
        fields={fields}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
      />
    </AppLayout>
  );
}
