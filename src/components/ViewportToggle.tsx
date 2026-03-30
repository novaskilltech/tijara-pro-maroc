import { Button } from "@/components/ui/button";
import { useViewport } from "@/contexts/ViewportContext";
import { Monitor, Smartphone } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

export function ViewportToggle() {
  const { mode, toggleMode } = useViewport();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // We only really need this toggle shown if the user is physically on a small screen
  // If they are actually on a big PC screen, forcing desktop mode makes no sense
  useEffect(() => {
    const checkIsMobile = () => {
      // Basic check if the device screen is smaller than standard desktop or if it has touch
      const isMobile = window.innerWidth <= 1024 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      setIsMobileDevice(isMobile);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (!isMobileDevice) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            className="relative"
            aria-label="Basculer PC/Mobile"
          >
            {mode === 'mobile' ? (
              <Monitor className="h-[1.2rem] w-[1.2rem] transition-all" />
            ) : (
              <Smartphone className="h-[1.2rem] w-[1.2rem] transition-all" />
            )}
            <span className="sr-only">Mode de Vue</span>
            {mode === 'desktop' && (
              <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Passer en mode {mode === 'mobile' ? 'PC (Vue large)' : 'Mobile (Adapté)'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
