import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Check, ChevronsUpDown, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface Option {
  value: string;
  label: string;
  sub?: string; // optional subtitle/code
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Show a "Créer: <query>" option when no match found */
  allowCreate?: boolean;
  onCreateNew?: (query: string) => void;
}

/** Highlight matched substring in text */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-[2px] px-0">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  disabled = false,
  className,
  allowCreate = false,
  onCreateNew,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = options.find((o) => o.value === value);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 120);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) || (o.sub && o.sub.toLowerCase().includes(q))
    );
  }, [options, debouncedSearch]);

  // Show create option
  const showCreate = allowCreate && debouncedSearch.trim().length > 0 && filtered.length === 0;

  const totalItems = filtered.length + (showCreate ? 1 : 0);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setDebouncedSearch("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    if (!open) setActiveIndex(-1);
  }, [open]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLElement>("[data-option]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const selectOption = useCallback((opt: Option) => {
    onValueChange(opt.value);
    setOpen(false);
    setSearch("");
    setDebouncedSearch("");
    setActiveIndex(-1);
  }, [onValueChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") { setOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          selectOption(filtered[activeIndex]);
        } else if (showCreate && activeIndex === filtered.length) {
          onCreateNew?.(debouncedSearch.trim());
          setOpen(false); setSearch(""); setDebouncedSearch("");
        }
        break;
      case "Escape":
        setOpen(false);
        setSearch(""); setDebouncedSearch("");
        break;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setSearch(""); setDebouncedSearch(""); }}
        onKeyDown={handleKeyDown}
        className="w-full justify-between font-normal h-9 px-3 text-sm bg-background"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute z-[9999] mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-lg"
          style={{ maxHeight: "260px", display: "flex", flexDirection: "column" }}
        >
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          {/* Options */}
          <div ref={listRef} className="overflow-y-auto py-1" style={{ flex: 1 }}>
            {filtered.length === 0 && !showCreate && (
              <p className="py-3 text-center text-sm text-muted-foreground">Aucun résultat</p>
            )}

            {filtered.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                data-option
                role="option"
                aria-selected={value === opt.value}
                onClick={() => selectOption(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                  idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  value === opt.value && "text-primary font-medium"
                )}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", value === opt.value ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate">
                    <HighlightMatch text={opt.label} query={debouncedSearch} />
                  </span>
                  {opt.sub && (
                    <span className="block text-[11px] text-muted-foreground truncate">
                      <HighlightMatch text={opt.sub} query={debouncedSearch} />
                    </span>
                  )}
                </span>
              </button>
            ))}

            {/* Create new shortcut */}
            {showCreate && (
              <button
                type="button"
                data-option
                role="option"
                onClick={() => { onCreateNew?.(debouncedSearch.trim()); setOpen(false); setSearch(""); setDebouncedSearch(""); }}
                onMouseEnter={() => setActiveIndex(filtered.length)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors text-left border-t border-border mt-1 pt-2",
                  activeIndex === filtered.length ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                )}
              >
                <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-primary font-medium">Créer « {debouncedSearch.trim()} »</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
