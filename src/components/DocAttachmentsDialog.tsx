import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentAttachmentsPanel } from "@/components/DocumentAttachmentsPanel";
import { Badge } from "@/components/ui/badge";
import { Paperclip } from "lucide-react";

interface DocAttachmentsDialogProps {
  open: boolean;
  onClose: () => void;
  docType: string;
  docId: string;
  docNumber: string;
  companyId?: string | null;
  readOnly?: boolean;
}

export function DocAttachmentsDialog({
  open, onClose, docType, docId, docNumber, companyId, readOnly,
}: DocAttachmentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            Pièces jointes & Notes vocales
            <Badge variant="outline" className="font-mono text-xs">{docNumber}</Badge>
          </DialogTitle>
        </DialogHeader>
        <DocumentAttachmentsPanel
          docType={docType}
          docId={docId}
          companyId={companyId}
          readOnly={readOnly}
        />
      </DialogContent>
    </Dialog>
  );
}
