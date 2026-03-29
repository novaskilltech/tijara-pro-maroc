import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/types/auth";
import { MFAEnrollment } from "@/components/auth/MFAEnrollment";
import { User, Mail, Shield, UserCheck } from "lucide-react";

export default function Profil() {
  const { profile, roles } = useAuth();

  return (
    <AppLayout title="Mon Profil" subtitle="Gérez vos informations personnelles et votre sécurité">
      <div className="grid gap-6 max-w-4xl mx-auto">
        
        {/* Informations de base */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>{profile?.full_name || "Utilisateur"}</CardTitle>
              <CardDescription className="flex flex-wrap gap-1 justify-center mt-2">
                {roles.map(r => (
                  <Badge key={r} variant="secondary" className="text-[10px]">
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="fullname">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="fullname" value={profile?.full_name || ""} readOnly className="pl-10 bg-muted/50" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="email" value={profile?.email || ""} readOnly className="pl-10 bg-muted/50" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sécurité */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Sécurité du compte
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
             <MFAEnrollment />
             
             <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Mot de passe</CardTitle>
                  <CardDescription>
                    Vous pouvez modifier votre mot de passe depuis l'écran de connexion si vous l'avez oublié.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe régulièrement.
                  </p>
                </CardContent>
             </Card>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
