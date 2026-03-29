import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo-tijarapro.jpg";
import { Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-card border border-border p-8">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="TijaraPro" className="h-12 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground text-center mb-1">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>

          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-foreground">
                Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">Vérifiez votre boîte de réception et vos spams.</p>
              <Link to="/auth/login">
                <Button variant="outline" className="w-full mt-2">Retour à la connexion</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@entreprise.ma"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Envoyer le lien
              </Button>
              <Link to="/auth/login" className="text-sm text-primary hover:underline block text-center">
                Retour à la connexion
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
