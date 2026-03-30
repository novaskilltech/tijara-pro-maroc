import { Button } from "@/components/ui/button";
import { useTextSize } from "@/contexts/TextSizeContext";
import { Type } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TextSizeToggle() {
  const { textSize, cycleTextSize } = useTextSize();

  const labels = {
    normal: "Taille normale",
    large: "Taille grande",
    xlarge: "Taille très grande",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTextSize}
            className="relative"
            aria-label="Changer la taille du texte"
          >
            <Type className="h-[1.2rem] w-[1.2rem] transition-all" />
            <span className="sr-only">Changer la taille du texte</span>
            {textSize !== "normal" && (
              <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{labels[textSize]} (Cliquez pour agrandir)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
