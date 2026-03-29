import { Moon, Sun, Waves } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border/50 hover:bg-muted transition-all duration-300">
          {theme === "abyss" ? (
            <Waves className="h-[1.2rem] w-[1.2rem] text-primary animate-pulse" />
          ) : theme === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem]" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem]" />
          )}
          <span className="sr-only">Changer de thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl glassmorphism border-white/10">
        <DropdownMenuItem 
          onClick={() => setTheme("light")} 
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        >
          <Sun className="h-4 w-4" />
          <span>Clair</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")} 
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        >
          <Moon className="h-4 w-4" />
          <span>Sombre</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("abyss")} 
          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-primary/10 text-primary font-semibold transition-colors"
        >
          <Waves className="h-4 w-4" />
          <span>Bleu Abyss PRO</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
