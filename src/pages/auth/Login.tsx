import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo-tijarapro.jpg";
import { Loader2 } from "lucide-react";
import { getFirstAccessibleRoute, type AppRole } from "@/types/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      toast({ title: "Erreur de connexion", description: error.message, variant: "destructive" });
      return;
    }

    // Fetch user roles to determine redirect
    const userId = data.user?.id;
    if (userId) {
      const { data: rolesData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId);
      const roles: AppRole[] = (rolesData as any[] || []).map((r: any) => r.role as AppRole).filter(Boolean);
      setLoading(false);
      navigate(getFirstAccessibleRoute(roles));
    } else {
      setLoading(false);
      navigate("/tableaux-de-bord");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl shadow-card border border-border p-8">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="TijaraPro" className="h-12 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground text-center mb-1">Connexion</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Accédez à votre espace ERP</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.ma"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link to="/auth/forgot-password" className="text-sm text-primary hover:underline block">
              Mot de passe oublié ?
            </Link>
            <p className="text-sm text-muted-foreground">
              Pas de compte ?{" "}
              <Link to="/auth/register" className="text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
