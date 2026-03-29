import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X, RotateCcw, ChevronDown } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type SearchOperator = "contains" | "starts_with" | "equals" | "is_empty" | "is_not_empty";

export interface SearchableField {
  key: string;
  label: string;
  /** Which operators are allowed – defaults to ["contains","starts_with","equals"] */
  operators?: SearchOperator[];
}

export interface FilterOption {
  key: string;
  label: string;
  type: "select" | "boolean" | "range";
  options?: { value: string; label: string }[];
  /** For boolean filters */
  trueLabel?: string;
  falseLabel?: string;
}

export interface QuickFilter {
  label: string;
  /** Partial filter map applied when selected */
  filters: Record<string, string>;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue: string;
}

const OPERATOR_LABELS: Record<SearchOperator, string> = {
  contains: "Contient",
  starts_with: "Commence par",
  equals: "Est égal à",
  is_empty: "Est vide",
  is_not_empty: "N'est pas vide",
};

// ─── Component ──────────────────────────────────────────────────────────────────

interface AdvancedSearchProps {
  /** Text search fields (multi-field) */
  searchFields: SearchableField[];
  /** Filter definitions */
  filters?: FilterOption[];
  /** Predefined quick-filter presets */
  quickFilters?: QuickFilter[];
  /** Called with the current search state */
  onSearch: (state: {
    query: string;
    operator: SearchOperator;
    activeFilters: Record<string, string>;
  }) => void;
  /** Debounce interval in ms (default 300) */
  debounce?: number;
  placeholder?: string;
}

export function AdvancedSearch({
  searchFields,
  filters = [],
  quickFilters = [],
  onSearch,
  debounce = 300,
  placeholder = "Rechercher...",
}: AdvancedSearchProps) {
  const [query, setQuery] = useState("");
  const [operator, setOperator] = useState<SearchOperator>("contains");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search callback
  const emitSearch = useCallback(
    (q: string, op: SearchOperator, f: Record<string, string>) => {
      onSearch({ query: q, operator: op, activeFilters: f });
    },
    [onSearch]
  );

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => emitSearch(query, operator, activeFilters), debounce);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, operator, activeFilters, debounce]);

  const setFilter = (key: string, value: string) => {
    setActiveFilters((prev) => {
      if (!value || value === "__all__") {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  };

  const removeFilter = (key: string) => {
    setActiveFilters((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const clearAll = () => {
    setQuery("");
    setOperator("contains");
    setActiveFilters({});
  };

  const applyQuickFilter = (qf: QuickFilter) => {
    setActiveFilters(qf.filters);
  };

  const activeFilterList: ActiveFilter[] = Object.entries(activeFilters).map(([key, value]) => {
    const def = filters.find((f) => f.key === key);
    const displayValue =
      def?.type === "select"
        ? def.options?.find((o) => o.value === value)?.label || value
        : def?.type === "boolean"
        ? value === "true"
          ? def.trueLabel || "Oui"
          : def.falseLabel || "Non"
        : value;
    return { key, label: def?.label || key, value, displayValue };
  });

  const hasActiveState = query.length > 0 || activeFilterList.length > 0;

  return (
    <div className="space-y-2">
      {/* ── Main search row ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 min-w-0 w-full sm:max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Operator selector */}
        <Select value={operator} onValueChange={(v) => setOperator(v as SearchOperator)}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["contains", "starts_with", "equals"] as SearchOperator[]).map((op) => (
              <SelectItem key={op} value={op} className="text-xs">
                {OPERATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filters toggle */}
        {filters.length > 0 && (
          <Button
            variant={filtersOpen ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs h-9"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres
            {activeFilterList.length > 0 && (
              <Badge className="ml-1 h-4 px-1.5 text-[10px] bg-primary-foreground text-primary">
                {activeFilterList.length}
              </Badge>
            )}
          </Button>
        )}

        {/* Quick filters */}
        {quickFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                Filtres rapides
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {quickFilters.map((qf, i) => (
                <DropdownMenuItem key={i} onClick={() => applyQuickFilter(qf)} className="text-xs">
                  {qf.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={clearAll} className="text-xs text-muted-foreground">
                <RotateCcw className="h-3 w-3 mr-1.5" /> Réinitialiser
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Reset */}
        {hasActiveState && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-9 text-muted-foreground" onClick={clearAll}>
            <RotateCcw className="h-3 w-3" /> Réinitialiser
          </Button>
        )}
      </div>

      {/* ── Active filter chips ── */}
      {activeFilterList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilterList.map((af) => (
            <Badge
              key={af.key}
              variant="secondary"
              className="gap-1 text-xs px-2 py-0.5 cursor-pointer hover:bg-destructive/10"
              onClick={() => removeFilter(af.key)}
            >
              {af.label}: {af.displayValue}
              <X className="h-3 w-3 ml-0.5" />
            </Badge>
          ))}
        </div>
      )}

      {/* ── Expandable filter panel ── */}
      {filtersOpen && filters.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filters.map((f) => (
              <div key={f.key}>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{f.label}</label>
                {f.type === "select" && (
                  <Select
                    value={activeFilters[f.key] || "__all__"}
                    onValueChange={(v) => setFilter(f.key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className="text-xs">Tous</SelectItem>
                      {f.options?.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.type === "boolean" && (
                  <Select
                    value={activeFilters[f.key] || "__all__"}
                    onValueChange={(v) => setFilter(f.key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__" className="text-xs">Tous</SelectItem>
                      <SelectItem value="true" className="text-xs">{f.trueLabel || "Oui"}</SelectItem>
                      <SelectItem value="false" className="text-xs">{f.falseLabel || "Non"}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper: apply search + filters to a data array client-side ─────────────

export function applyAdvancedSearch<T extends Record<string, any>>(
  data: T[],
  searchFields: string[],
  query: string,
  operator: SearchOperator,
  activeFilters: Record<string, string>,
  /** Custom filter matchers keyed by filter key */
  filterMatchers?: Record<string, (item: T, value: string) => boolean>
): T[] {
  let result = data;

  // Text search
  if (query) {
    const q = query.toLowerCase().trim();
    result = result.filter((item) =>
      searchFields.some((field) => {
        const val = String(item[field] || "").toLowerCase();
        switch (operator) {
          case "contains":
            return val.includes(q);
          case "starts_with":
            return val.startsWith(q);
          case "equals":
            return val === q;
          case "is_empty":
            return !val || val === "";
          case "is_not_empty":
            return !!val && val !== "";
          default:
            return val.includes(q);
        }
      })
    );
  }

  // Filters
  for (const [filterKey, filterValue] of Object.entries(activeFilters)) {
    if (!filterValue || filterValue === "__all__") continue;
    if (filterMatchers?.[filterKey]) {
      result = result.filter((item) => filterMatchers[filterKey](item, filterValue));
    } else {
      // Default: exact match on item[filterKey]
      result = result.filter((item) => String(item[filterKey]) === filterValue);
    }
  }

  return result;
}
