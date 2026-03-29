import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldCheck, FileText, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfUse() {
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
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Gavel className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Conditions Générales d'Utilisation</h1>
                <p className="text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">1. Mentions Légales</h2>
                <p>
                  Le service <strong>Tijara Pro</strong> est une solution logicielle en mode SaaS (Software as a Service) 
                  éditée et propulsée par <strong>High Performance Systems (HPS)</strong>, dont le siège social est situé à Casablanca, Maroc.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">2. Objet du Service</h2>
                <p>
                  Tijara Pro met à disposition des entreprises et commerçants une plateforme de gestion intégrée (ERP) incluant 
                  la gestion des stocks, la facturation, le suivi client et l'analyse de rentabilité. 
                  L'accès au service est subordonné à l'acceptation pleine et entière des présentes conditions.
                </p>
              </section>

              <section className="p-6 bg-muted/50 rounded-2xl border border-border/50">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  3. Responsabilité du Client (Commerçant)
                </h2>
                <p className="mb-4">
                  En tant qu'utilisateur de Tijara Pro, vous êtes seul responsable de :
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>L'exactitude des données saisies (Identifiant Commun des Entreprises - **ICE**, Identifiant Fiscal, etc.).</li>
                  <li>La validité des taux de TVA appliqués selon la législation marocaine en vigueur.</li>
                  <li>La sécurité de vos identifiants d'accès et de l'activation du MFA (Multi-Factor Authentication).</li>
                  <li>L'utilisation du service en conformité avec les lois commerciales du Royaume du Maroc.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">4. Disponibilité et SLA</h2>
                <p>
                  HPS s'engage à assurer une disponibilité du service de <strong>99,9%</strong> sur une base annuelle, 
                  hors périodes de maintenance programmées. En cas d'incident technique majeur, HPS mettra tout en œuvre 
                  pour rétablir le service dans les plus brefs délais via ses équipes de support localisées au Maroc.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">5. Propriété Intellectuelle</h2>
                <p>
                  Tous les droits de propriété intellectuelle relatifs à la plateforme Tijara Pro (code source, interfaces, 
                  algorithmes, logos) restent la propriété exclusive de HPS. Le client bénéficie d'une licence d'utilisation personnelle, 
                  temporaire et non cessible durant la durée de son abonnement.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-foreground mb-4">6. Droit Applicable et Juridiction</h2>
                <p>
                  Les présentes conditions sont soumises au droit marocain. En cas de litige non résolu à l'amiable, 
                  le <strong>Tribunal de Commerce de Casablanca</strong> sera seul compétent.
                </p>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Version Certifiée HPS</span>
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
