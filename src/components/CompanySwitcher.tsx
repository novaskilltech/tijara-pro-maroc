import { useState, useRef, useEffect } from "react";
import { useCompany } from "@/hooks/useCompany";
import { Building2, ChevronDown, Check, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function CompanySwitcher() {
  const { activeCompany, companies, switchCompany } = useCompany();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!activeCompany) return null;

  // Don't show switcher if only one company and not admin
  if (companies.length <= 1 && !isAdmin()) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border">
      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
        {activeCompany.raison_sociale}
      </span>
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border hover:bg-muted transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
          {activeCompany.raison_sociale || "Société"}
        </span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-card border border-border rounded-xl shadow-lg py-1.5 z-50 animate-fade-in">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Mes sociétés
          </p>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => { switchCompany(company); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{company.raison_sociale}</p>
                {company.city && (
                  <p className="text-[11px] text-muted-foreground truncate">{company.city}</p>
                )}
              </div>
              {activeCompany.id === company.id && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}

          {isAdmin() && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { setOpen(false); navigate("/systeme/societes"); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Gérer les sociétés</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
