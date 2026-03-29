import { useState, useMemo, ReactNode } from "react";
import { Search, Filter, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";

export interface ERPColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface ERPTableProps<T> {
  columns: ERPColumn<T>[];
  data: T[];
  keyField: string;
  searchPlaceholder?: string;
  pageSize?: number;
  bulkActions?: { label: string; onClick: (selected: string[]) => void }[];
  filterPanel?: ReactNode;
}

export function ERPTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  searchPlaceholder = "Rechercher...",
  pageSize = 10,
  bulkActions,
  filterPanel,
}: ERPTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        columns.some((col) => String(item[col.key] ?? "").toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey] ?? "";
        const bVal = b[sortKey] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal), "fr", { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, sortKey, sortDir, columns]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const allSelected = paged.length > 0 && paged.every((r) => selected.includes(String(r[keyField])));

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleAll = () => {
    if (allSelected) setSelected(selected.filter((s) => !paged.some((r) => String(r[keyField]) === s)));
    else setSelected([...new Set([...selected, ...paged.map((r) => String(r[keyField]))])]);
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  return (
    <div className="bg-card rounded-lg shadow-card border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {filterPanel && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-input text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filtres
          </button>
        )}
        {selected.length > 0 && bulkActions && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selected.length} sélectionné(s)</span>
            {bulkActions.map((action) => (
              <button
                key={action.label}
                onClick={() => action.onClick(selected)}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && filterPanel && (
        <div className="p-4 border-b border-border bg-muted/30">{filterPanel}</div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {bulkActions && (
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSelected ? "bg-primary border-primary" : "border-input"}`}>
                    {allSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:bg-muted/70" : ""}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="text-center py-12 text-muted-foreground">
                  Aucun résultat trouvé
                </td>
              </tr>
            ) : (
              paged.map((item, idx) => {
                const id = String(item[keyField]);
                const isSelected = selected.includes(id);
                return (
                  <tr
                    key={id}
                    className={`border-t border-border transition-colors hover:bg-accent/30 ${idx % 2 === 1 ? "bg-muted/20" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                  >
                    {bulkActions && (
                      <td className="px-4 py-3">
                        <button onClick={() => toggleOne(id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-foreground">
                        {col.render ? col.render(item) : String(item[col.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} sur {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page < 3 ? i : page + i - 2;
              if (p >= totalPages || p < 0) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-sm font-medium transition-colors ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
