import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, Download, ChevronDown, Loader2 } from "lucide-react";

interface PrintButtonProps {
  onPrint: () => Promise<void>;
  onDownload?: () => Promise<void>;
  size?: "sm" | "default";
  iconOnly?: boolean;
  disabled?: boolean;
}

export function PrintButton({ onPrint, onDownload, size = "sm", iconOnly = false, disabled }: PrintButtonProps) {
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPrinting(true);
    try { await onPrint(); } finally { setPrinting(false); }
  };

  const handleDownload = async () => {
    if (!onDownload) return;
    setDownloading(true);
    try { await onDownload(); } finally { setDownloading(false); }
  };

  const busy = printing || downloading;

  if (iconOnly && !onDownload) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Imprimer / PDF"
        disabled={disabled || busy}
        onClick={handlePrint}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
      </Button>
    );
  }

  if (iconOnly && onDownload) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled || busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[170px]">
          <DropdownMenuItem onClick={handlePrint} disabled={printing}>
            <Printer className="h-4 w-4 mr-2" />
            {printing ? "Génération..." : "Ouvrir / Imprimer"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4 mr-2" />
            {downloading ? "Téléchargement..." : "Télécharger PDF"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-0">
      <Button
        variant="outline"
        size={size}
        className="rounded-r-none gap-1.5 border-r-0"
        disabled={disabled || busy}
        onClick={handlePrint}
      >
        {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        Imprimer
      </Button>
      {onDownload && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={size} className="rounded-l-none px-2" disabled={disabled || busy}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[170px]">
            <DropdownMenuItem onClick={handlePrint} disabled={printing}>
              <Printer className="h-4 w-4 mr-2" />
              {printing ? "Génération..." : "Ouvrir / Imprimer"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "Téléchargement..." : "Télécharger PDF"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
