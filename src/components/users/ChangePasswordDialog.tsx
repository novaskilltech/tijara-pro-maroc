import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from "lucide-react";
import type { ManagedUser } from "@/hooks/useUserManagement";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  user: ManagedUser | null;
}

const PASSWORD_RULES = [
  { label: "Au moins 8 caractères", test: (p: string) => p.length >= 8 },
  { label: "Une majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Une minuscule", test: (p: string) => /[a-z]/.test(p) },
  { label: "Un chiffre", test: (p: string) => /[0-9]/.test(p) },
];

export function ChangePasswordDialog({ open, onClose, user }: ChangePasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setPassword("");
    setConfirm("");
    setShowPassword(false);
    setShowConfirm(false);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = "Le mot de passe est obligatoire";
    else if (password.length < 8) errs.password = "Le mot de passe doit contenir au moins 8 caractères";
    if (!confirm) errs.confirm = "La confirmation du mot de passe est obligatoire";
    else if (password !== confirm) errs.confirm = "Les mots de passe ne correspondent pas";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "change_password",
          target_user_id: user.user_id,
          new_password: password,
        },
      });

      if (error || data?.error) {
        toast({
          title: "Erreur",
          description: data?.error || "Une erreur est survenue lors de la modification du mot de passe",
          variant: "destructive",
        });
      } else {
        toast({ title: "Mot de passe modifié avec succès" });
        handleClose();
      }
    } catch (err) {
      console.error("Change password error:", err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la modification du mot de passe",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const allRulesPassed = PASSWORD_RULES.every((r) => r.test(password));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Modifier le mot de passe
          </DialogTitle>
          <DialogDescription>
            {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: "" })); }}
                placeholder="••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrors((p) => ({ ...p, confirm: "" })); }}
                placeholder="••••••••"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>

          {/* Strength indicator */}
          {password.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Critères du mot de passe</p>
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(password);
                return (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <span className={passed ? "text-foreground" : "text-muted-foreground"}>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !allRulesPassed || !confirm}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
