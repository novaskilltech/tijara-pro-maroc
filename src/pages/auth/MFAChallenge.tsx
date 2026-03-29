import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

export default function MFAChallenge() {
  const { mfaFactors, verifyMFA, signOut, loading: authLoading, aal } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/";

  // Redirect if already verified or no factors
  useEffect(() => {
    if (aal === "aal2") {
      navigate(from, { replace: true });
    }
  }, [aal, navigate, from]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    
    setVerifying(true);
    try {
      // Find the first active TOTP factor
      const factor = mfaFactors.find(f => f.factor_type === 'totp' && f.status === 'verified');
      if (!factor) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Aucun facteur d'authentification actif trouvé."
        });
        return;
      }

      const { success, error } = await verifyMFA(factor.id, code);
      if (success) {
        toast({
          title: "Authentification réussie",
          description: "Bienvenue sur Tijara Pro."
        });
        navigate(from, { replace: true });
      } else {
        throw error;
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: error.message || "Le code saisi est incorrect ou a expiré."
      });
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    navigate("/auth/login");
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Vérification de sécurité</CardTitle>
          <CardDescription>
            Entrez le code de vérification généré par votre application d'authentification.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pt-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={handleVerify}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          <Button 
            className="w-full" 
            onClick={handleVerify} 
            disabled={code.length !== 6 || verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              "Vérifier le code"
            )}
          </Button>
        </CardContent>
        <CardFooter>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground" 
            onClick={handleCancel}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la connexion
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
