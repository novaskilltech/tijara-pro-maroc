import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, FolderOpen, Folder } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CategoryTreeNode } from "@/hooks/useProductCategories";

interface CategoryPickerProps {
  value: string | null; // selected category_id
  onChange: (id: string | null) => void;
  flatList: CategoryTreeNode[];
  tree: CategoryTreeNode[];
  placeholder?: string;
  disabled?: boolean;
}

function TreeNode({
  node,
  onSelect,
  selectedId,
  depth,
}: {
  node: CategoryTreeNode;
  onSelect: (node: CategoryTreeNode) => void;
  selectedId: string | null;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent transition-colors",
          selectedId === node.id && "bg-primary/10 text-primary font-medium"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {hasChildren ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryPicker({
  value,
  onChange,
  flatList,
  tree,
  placeholder = "Sélectionner une catégorie",
  disabled = false,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = flatList.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal text-left",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selected ? selected.fullPath : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1 max-h-72 overflow-y-auto" align="start">
        {/* Clear option */}
        <div
          className="px-2 py-1.5 text-sm text-muted-foreground cursor-pointer rounded-sm hover:bg-accent italic"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
        >
          — Aucune catégorie —
        </div>
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            selectedId={value}
            depth={0}
            onSelect={(n) => {
              onChange(n.id);
              setOpen(false);
            }}
          />
        ))}
        {tree.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune catégorie configurée
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
