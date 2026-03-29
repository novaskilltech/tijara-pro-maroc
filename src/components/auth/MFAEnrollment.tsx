import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/components/ui/use-toast";
import { QrCode, ShieldCheck, ShieldAlert, Loader2, Copy, Trash2 } from "lucide-react";

export function MFAEnrollment() {
  const { mfaFactors, enrollMFA, verifyMFA, unenrollMFA, loading: authLoading } = useAuth();
  const [enrollData, setEnrollData] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "enrolling" | "verifying" | "unenrolling">("idle");
  const { toast } = useToast();

  const activeFactor = mfaFactors.find(f => f.status === 'verified');

  const handleStartEnroll = async () => {
    setStatus("enrolling");
    const result = await enrollMFA();
    
    if (result.error) {
      toast({
        variant: "destructive",
        title: "Erreur d'enrôlement",
        description: result.error.message || "Impossible de générer le QR Code."
      });
      setStatus("idle");
    } else {
      setEnrollData({
        id: result.id!,
        qrCode: result.qrCode!,
        secret: result.secret!
      });
      setStatus("verifying");
    }
  };

  const handleVerify = async () => {
    if (!enrollData || code.length !== 6) return;
    
    setStatus("verifying");
    const { success, error } = await verifyMFA(enrollData.id, code);
    
    if (success) {
      toast({
        title: "MFA Activé",
        description: "Votre compte est désormais sécurisé par authentification multi-facteurs."
      });
      setEnrollData(null);
      setCode("");
      setStatus("idle");
    } else {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: error.message || "Le code saisi est incorrect."
      });
      setStatus("verifying");
    }
  };

  const handleUnenroll = async () => {
    if (!activeFactor) return;
    
    if (!confirm("Êtes-vous sûr de vouloir désactiver l'authentification multi-facteurs ? Votre compte sera moins sécurisé.")) {
      return;
    }

    setStatus("unenrolling");
    const { success, error } = await unenrollMFA(activeFactor.id);
    
    if (success) {
      toast({
        title: "MFA Désactivé",
        description: "L'authentification multi-facteurs a été retirée de votre compte."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de désactiver le MFA."
      });
    }
    setStatus("idle");
  };

  const copySecret = () => {
    if (enrollData?.secret) {
      navigator.clipboard.writeText(enrollData.secret);
      toast({ description: "Clé secrète copiée !" });
    }
  };

  if (activeFactor) {
    return (
      <Card border="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle className="text-lg">MFA Activé</CardTitle>
          </div>
          <CardDescription>
            Votre compte est protégé par une application d'authentification ({activeFactor.friendly_name || 'TOTP'}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground bg-background p-3 rounded-md border">
            Status : <span className="text-green-600 font-medium capitalize">{activeFactor.status}</span>
            <br />
            Activé le : {new Date(activeFactor.created_at).toLocaleDateString()}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={handleUnenroll}
            disabled={status === "unenrolling"}
          >
            {status === "unenrolling" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Désactiver le MFA
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (enrollData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurer l'authentification</CardTitle>
          <CardDescription>
            Scannez ce QR Code avec votre application d'authentification (Google Authenticator, Authy, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg border">
            <img src={enrollData.qrCode} alt="QR Code MFA" className="w-48 h-48" />
          </div>
          
          <div className="w-full space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase">Ou saisissez la clé manuellement :</label>
            <div className="flex gap-2">
              <Input value={enrollData.secret} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={copySecret}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 w-full flex flex-col items-center pt-4 border-t">
            <label className="text-sm font-medium">Saisissez le code à 6 chiffres affiché :</label>
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
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
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setEnrollData(null)}>Annuler</Button>
          <Button className="flex-1" onClick={handleVerify} disabled={code.length !== 6 || status === "verifying"}>
            {status === "verifying" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Activer
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-warning">
          <ShieldAlert className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-lg">Sécurisez votre compte</CardTitle>
        </div>
        <CardDescription>
          L'authentification multi-facteurs ajoute une couche de sécurité supplémentaire à votre compte Tijara Pro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Une fois activé, vous devrez saisir un code généré par une application mobile en plus de votre mot de passe pour vous connecter.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleStartEnroll} disabled={status === "enrolling"}>
          {status === "enrolling" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
          Configurer le MFA
        </Button>
      </CardFooter>
    </Card>
  );
}
