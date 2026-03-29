import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:gap-3 transition-all mb-8 font-medium">
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>

          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-sm animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Politique de Confidentialité</h1>
                <p className="text-muted-foreground underline underline-offset-4 decoration-secondary/30">
                  Conformité Loi 09-08 (Maroc / CNDP)
                </p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">1. Responsable du Traitement</h2>
                <p>
                  Les données à caractère personnel collectées via <strong>Tijara Pro</strong> sont traitées par 
                  <strong> High Performance Systems (HPS)</strong>, Casablanca, Maroc. Nous accordons une importance capitale 
                  à la protection de votre vie privée et de vos données commerciales.
                </p>
              </section>

              <section className="p-6 bg-muted/50 rounded-2xl border border-border/50">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-secondary" />
                  2. Données Collectées
                </h2>
                <p className="mb-4">
                  Dans le cadre du service ERP, HPS collecte les données suivantes :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Informations de Profil</strong> : Nom, prénom, email, téléphone, fonction.</li>
                  <li><strong>Informations Entreprise</strong> : Dénomination, ICE, Identifiant Fiscal, adresse du siège social.</li>
                  <li><strong>Données de Transaction</strong> : Détails des factures, règlements, catalogue produits et niveaux de stock.</li>
                  <li><strong>Données Techniques</strong> : Adresses IP, logs de connexion et cookies de session.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">3. Finalités du Traitement</h2>
                <p>
                  Le traitement de vos données a pour finalités exclusives :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>La fourniture et la maintenance des services ERP de Tijara Pro.</li>
                  <li>La gestion de la facturation et du support technique.</li>
                  <li>L'amélioration continue de l'expérience utilisateur et des fonctionnalités.</li>
                  <li>La conformité aux obligations légales et réglementaires marocaines (conservation comptable).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">4. Durée de Conservation</h2>
                <p>
                  Vos données sont conservées pendant toute la durée de votre abonnement. Après résiliation, 
                  les données comptables et fiscales sont archivées pendant une durée de <strong>10 ans</strong>, 
                  conformément aux dispositions du Code de Commerce marocain.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">5. Vos Droits (Loi 09-08)</h2>
                <p className="mb-4">
                  Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition 
                  au traitement de vos données. Pour exercer vos droits, vous pouvez nous contacter :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Par email : <strong>privacy@tijarapro.ma</strong></li>
                  <li>Par courrier : <strong>HPS Maroc, Casablanca</strong></li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">6. Sécurité des Données</h2>
                <p>
                  Nous utilisons des protocoles de chiffrement standards (TLS/SSL) pour tous les flux de données. 
                  Nos serveurs sont protégés par des systèmes de détection d'intrusion et font l'objet de sauvegardes quotidiennes redondantes.
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-secondary" />
                <span className="text-sm font-semibold">Données Sécurisées au Maroc</span>
              </div>
              <Button onClick={() => window.print()} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Télécharger en PDF
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-border bg-muted/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Tijara Pro Maroc - High Performance Systems. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
