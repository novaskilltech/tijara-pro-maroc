import { ReactNode, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Bell, User, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { ThemeToggle } from "./ThemeToggle";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { profile, roles, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 bg-card shadow-topbar border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <div className="pl-12 lg:pl-0 space-y-1">
            <Breadcrumbs />
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <CompanySwitcher />
            <button className="p-2 rounded-md hover:bg-muted transition-colors relative text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>

            {/* Profile dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors max-w-[180px] sm:max-w-xs"
                title={profile?.full_name || profile?.email || "Profil"}
              >
                {/* Avatar circle */}
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </span>
                {/* Name + role — hidden on very small screens */}
                <span className="hidden sm:flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium text-foreground leading-tight truncate max-w-[120px]">
                    {profile?.full_name || profile?.email || "Utilisateur"}
                  </span>
                  {roles.length > 0 && (
                    <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[120px]">
                      {ROLE_LABELS[roles[0]]}
                    </span>
                  )}
                </span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profile?.full_name || profile?.email || "Utilisateur"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {roles.map((r) => (
                        <Badge key={r} variant="secondary" className="text-[10px]">
                          {ROLE_LABELS[r]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); navigate("/profil"); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <UserCircle className="h-4 w-4" />
                    Mon profil
                  </button>
                </div>
              )}
            </div>

            {/* Logout button — directly in header next to profile */}
            <button
              onClick={signOut}
              title="Déconnexion"
              className="w-8 h-8 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
