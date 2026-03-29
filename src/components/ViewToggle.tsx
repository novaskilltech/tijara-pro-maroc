import { LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewToggleProps {
  view: "list" | "kanban";
  onChange: (view: "list" | "kanban") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-md transition-all duration-200 ${
                view === "list"
                  ? "bg-[hsl(195,78%,53%)]/15 text-[hsl(195,78%,53%)] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onChange("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Vue liste</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-md transition-all duration-200 ${
                view === "kanban"
                  ? "bg-[hsl(195,78%,53%)]/15 text-[hsl(195,78%,53%)] shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => onChange("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Vue cartes</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
