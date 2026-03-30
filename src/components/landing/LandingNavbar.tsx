import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-tijarapro.jpg";
import { LogIn, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TextSizeToggle } from "@/components/TextSizeToggle";
import { ViewportToggle } from "@/components/ViewportToggle";

export function LandingNavbar() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-lg border-b border-border/40 transition-all duration-300">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" onClick={scrollToTop} className="flex items-center gap-2 group">
          <img 
            src={logo} 
            alt="TijaraPro" 
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105 duration-300 shadow-sm rounded-lg py-1 px-2 bg-white" 
          />
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            TijaraPro
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 ml-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Fonctionnalités</a>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">À propos</a>
        </div>

        <div className="flex items-center gap-3">
          <ViewportToggle />
          <TextSizeToggle />
          <ThemeToggle />
          <Link to="/auth/login">
            <Button variant="ghost" className="hidden sm:flex gap-2 text-foreground">
              <LogIn className="h-4 w-4" />
              Connexion
            </Button>
          </Link>
          <Link to="/auth/register">
            <Button className="gradient-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
              C'est parti
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
