import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Trash2, Download, Loader2 } from "lucide-react";
import { fetchAttachments, uploadAttachment, deleteAttachment } from "@/lib/invoice-attachments";
import type { InvoiceAttachment } from "@/types/invoice";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

interface InvoiceAttachmentsPanelProps {
  invoiceId?: string;
  creditNoteId?: string;
}

export function InvoiceAttachmentsPanel({ invoiceId, creditNoteId }: InvoiceAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useAuth();
  const { activeCompany } = useCompany();

  const load = async () => {
    const data = await fetchAttachments(invoiceId, creditNoteId);
    setAttachments(data);
  };

  useEffect(() => { load(); }, [invoiceId, creditNoteId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadAttachment(file, invoiceId, creditNoteId, activeCompany?.id);
    await load();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    await deleteAttachment(id);
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-primary" /> Pièces jointes ({attachments.length})
        </h4>
        <div>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Paperclip className="h-4 w-4 mr-1" />}
            Ajouter
          </Button>
        </div>
      </div>
      {attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune pièce jointe</p>
      ) : (
        <div className="space-y-1">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm">
              <span className="truncate flex-1">{att.file_name}</span>
              <div className="flex items-center gap-1 ml-2">
                <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                </a>
                {isAdmin() && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(att.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
