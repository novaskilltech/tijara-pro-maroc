import { AppLayout } from "@/components/AppLayout";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { TrendingDown } from "lucide-react";

const Depenses = () => {
  return (
    <AppLayout
      title="Dépenses"
      subtitle="Gestion des charges et dépenses d'exploitation"
    >
      <ExpenseList />
    </AppLayout>
  );
};

export default Depenses;
