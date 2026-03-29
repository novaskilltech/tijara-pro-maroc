import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, CheckCircle2, ShoppingCart, Package, 
  TrendingUp, FileText, Wallet, BarChart3, MessageCircle 
} from "lucide-react";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-tijara.png";
import logo from "@/assets/logo-tijarapro.jpg";
import hpsLogo from "@/assets/hps-logo.jpg";
import stockPreview from "@/assets/stock-preview.png";
import invoicePreview from "@/assets/invoice-preview.png";

const modules = [
  { label: "Ventes & Devis", icon: TrendingUp, desc: "Convertissez vos opportunités en réalité. Devis, bons de commande et factures générés instantanément pour une réactivité commerciale sans faille.", color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Gestion de Stock", icon: Package, desc: "Maîtrisez vos inventaires. Suivi critique des stocks et alertes intelligentes pour éliminer les ruptures et optimiser votre trésorerie.", color: "text-green-500", bg: "bg-green-500/10" },
  { label: "Achats & Dépenses", icon: ShoppingCart, desc: "Contrôlez vos flux sortants. Centralisez vos engagements fournisseurs et analysez vos coûts pour protéger vos marges.", color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "Facturation & TVA", icon: FileText, desc: "Conformité sans compromis. Génération de documents standards (ICE, TVA) pour une gestion comptable saine et sécurisée.", color: "text-slate-700", bg: "bg-slate-700/10" },
  { label: "Trésorerie", icon: Wallet, desc: "Dominez votre flux de cash. Visualisez vos encaissements et vos règlements en un clin d'œil pour une agilité financière totale.", color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Tableaux de Bord", icon: BarChart3, desc: "Décidez avec précision. Transformez vos données brutes en indicateurs stratégiques pour piloter votre business vers le succès.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
];

export default function LandingPage() {
  const whatsappUrl = "https://wa.me/212664367707?text=Bonjour, je souhaite un devis pour Tijara Pro.";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
            <div className="w-full lg:w-1/2 text-center lg:text-left animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 animate-pulse">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold tracking-wider uppercase">Solution cloud n°1 au Maroc</span>
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Gérez votre business <br/>
                <span className="gradient-primary-text">en toute simplicité.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Tijara Pro est l'ERP cloud tout-en-un conçu pour les commerçants et PME marocaines. 
                Ventes, Stocks, Achats et Comptabilité centralisés en un seul endroit sécurisé.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button size="lg" className="h-14 px-8 text-lg font-bold gap-3 gradient-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 w-full">
                    Demander un devis
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </a>
                <Link to="/auth/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-semibold gap-2 w-full border-border hover:bg-muted/50 transition-colors">
                    Essai gratuit
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 relative animate-fade-in">
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-blue-500/30 rounded-full blur-[100px] pointer-events-none animate-pulse" />
              <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative rounded-2xl border border-white/10 shadow-2xl overflow-hidden glassmorphism transform lg:rotate-2 hover:rotate-0 transition-transform duration-500">
                <img 
                  src={heroImg} 
                  alt="Tijara Pro Dashboard" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="features" className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight text-foreground">Le centre de pilotage de <span className="text-primary italic">votre ambition.</span></h2>
            <p className="text-lg text-muted-foreground">Un écosystème ERP unifié pour orchestrer votre croissance, de la gestion du catalogue jusqu'au suivi précis de vos marges nettes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((mod, i) => (
              <div 
                key={mod.label} 
                className="group p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-elevated transition-all duration-300 hover:-translate-y-2 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
              >
                <div className={`w-14 h-14 rounded-2xl ${mod.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <mod.icon className={`h-7 w-7 ${mod.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{mod.label}</h3>
                <p className="text-muted-foreground leading-relaxed">{mod.desc}</p>
              </div>
            ))}
          </div>

          {/* Key Stats */}
          <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 border-y border-border/50 py-12 animate-fade-in">
            {[
              { val: "2,500+", lab: "Entreprises au Maroc" },
              { val: "100%", lab: "Conformité TVA/ICE" },
              { val: "24/7", lab: "Support de Proximité" },
              { val: "99.9%", lab: "Disponibilité Cloud" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-5xl font-black text-primary mb-2">{stat.val}</div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.lab}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Features Zoom - Stock */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2 order-2 lg:order-1 animate-fade-in">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 group">
                <img src={stockPreview} alt="Gestion de Stock" className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
            </div>
            <div className="w-full lg:w-1/2 order-1 lg:order-2 animate-fade-in-up">
              <span className="text-primary font-bold tracking-widest text-sm uppercase mb-4 block">Maîtrise Totale</span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">
                Une gestion de <span className="text-primary">stock</span> sans angle mort.
              </h2>
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                  <h4 className="text-xl font-bold mb-2">Alertes Intelligentes</h4>
                  <p className="text-muted-foreground">Soyez notifié dès qu'un produit atteint son seuil critique. Ne ratez plus jamais une vente à cause d'une rupture.</p>
                </div>
                <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                  <h4 className="text-xl font-bold mb-2">Multi-Entrepôts</h4>
                  <p className="text-muted-foreground">Transférez vos marchandises entre vos dépôts et suivez la valorisation de votre stock en temps réel.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Features Zoom - Invoicing */}
      <section className="py-12 md:py-16 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2 animate-fade-in-up">
              <span className="text-secondary font-bold tracking-widest text-sm uppercase mb-4 block">100% Marocain</span>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight leading-tight">
                Facturation & <span className="text-secondary">Conformité</span> sans effort.
              </h2>
              <ul className="space-y-4 mb-8">
                {[
                  "Génération automatique d'ICE et identifiant fiscal.",
                  "Gestion native de la TVA à 20%, 14%, 10% et 7%.",
                  "Modèles de factures et devis professionnels en MAD.",
                  "Export comptable simplifié vers vos outils habituels.",
                ].map((item, id) => (
                  <li key={id} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-secondary shrink-0" />
                    <span className="text-lg text-muted-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary font-bold">
                <FileText className="h-5 w-5" />
                Conformité DGI Garantie
              </div>
            </div>
            <div className="w-full lg:w-1/2 animate-fade-in">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 group">
                <img src={invoicePreview} alt="Facturation Conforme" className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-12 md:py-16 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">Pourquoi choisir <br/><span className="gradient-primary-text italic">Tijara Pro ?</span></h2>
              <div className="space-y-6">
                {[
                  { t: "Localisé pour le Maroc", d: "TVA 20%, Devises en MAD, modèles de documents marocains conformes." },
                  { t: "Cloud & Mobilité", d: "Accédez à vos données partout, que vous soyez au bureau ou en déplacement professionnel." },
                  { t: "Sécurité Maximale", d: "Chiffrement des données et authentification forte (MFA) pour protéger votre business." },
                  { t: "Support Dédié", d: "Une équipe locale pour vous accompagner dans votre transformation digitale." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{item.t}</h4>
                      <p className="text-muted-foreground">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 p-8 bg-secondary rounded-3xl text-white relative shadow-2xl">
              <div className="p-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm">
                <blockquote className="text-2xl font-medium italic mb-6 leading-relaxed">
                  "Depuis que nous utilisons Tijara Pro, nos délais de facturation ont été divisés par deux et nous avons une vision claire de nos stocks en temps réel."
                </blockquote>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/30" />
                  <div>
                    <p className="font-bold">Ahmed B.</p>
                    <p className="text-white/60 text-sm">Gérant, Distribution Casablanca</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 md:py-16 bg-background relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10 animate-fade-in-up">
              <h2 className="text-3xl md:text-6xl font-black mb-6 tracking-tight italic">
                La technologie au service <br/>
                <span className="gradient-primary-text">du commerce marocain.</span>
              </h2>
              <div className="w-24 h-1 bg-primary mx-auto rounded-full mb-8" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg leading-relaxed">
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <p className="mb-4 font-medium text-foreground">
                  Tijara Pro est né de la volonté de moderniser la gestion des PME au Maroc. Trop souvent confrontées à des outils complexes ou inadaptés, nous avons créé une plateforme qui combine puissance et simplicité.
                </p>
                <p className="text-muted-foreground">
                  Notre mission est claire : digitaliser chaque commerce marocain pour lui permettre de se concentrer sur l'essentiel — sa croissance.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-muted/30 border border-border/40 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <div className="w-2 h-8 bg-secondary rounded-full" />
                  L'expertise HPS
                </h4>
                <p className="text-muted-foreground mb-6">
                  Tijara Pro est une solution propulsée par <strong>High Performance Systems (HPS)</strong>. Notre équipe d'architectes et d'ingénieurs travaille au quotidien pour garantir une plateforme robuste, sécurisée et évolutive.
                </p>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                  <div>
                    <span className="block text-xs uppercase font-bold text-muted-foreground mb-1">Architecte Solution</span>
                    <span className="font-bold text-foreground">HPS - Maroc</span>
                  </div>
                  <img src={hpsLogo} alt="HPS Logo" className="h-10 opacity-70" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Prêt à moderniser votre gestion ?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">Rejoignez les entreprises marocaines qui font confiance à Tijara Pro pour leur croissance.</p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="h-16 px-12 text-xl font-bold gap-3 gradient-primary shadow-2xl shadow-primary/30 hover:scale-105 transition-all">
              Obtenir mon devis gratuit
              <MessageCircle className="h-6 w-6" />
            </Button>
          </a>
          <p className="mt-6 text-sm text-muted-foreground">Appelez-nous au : <strong>+212 6 64 36 77 07</strong></p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
               <img src={logo} alt="TijaraPro" className="h-8 py-1 px-2 bg-white rounded-lg" />
               <span className="font-bold text-lg">TijaraPro</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-primary transition-colors">Conditions d'utilisation</Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">Confidentialité</Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Contact</a>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 text-sm text-muted-foreground">
              <span className="text-xs uppercase tracking-widest font-semibold opacity-60">Développé par</span>
              <img src={hpsLogo} alt="HPS - High Performance Systems" className="h-10 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100" />
            </div>
            <p className="text-sm text-muted-foreground text-center md:text-right">© {new Date().getFullYear()} Tijara Pro Maroc. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
