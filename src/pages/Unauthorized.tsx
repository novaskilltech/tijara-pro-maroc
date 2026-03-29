import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="bg-card rounded-xl shadow-card border border-border p-8 max-w-md w-full text-center">
        <ShieldX className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Accès refusé</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          Contactez votre administrateur pour obtenir les droits requis.
        </p>
        <Link to="/">
          <Button>Retour à l'accueil</Button>
        </Link>
      </div>
    </div>
  );
}
