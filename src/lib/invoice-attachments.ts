import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { InvoiceAttachment } from "@/types/invoice";

export async function fetchAttachments(invoiceId?: string, creditNoteId?: string): Promise<InvoiceAttachment[]> {
  let query = (supabase as any).from("invoice_attachments").select("*").order("created_at", { ascending: false });
  if (invoiceId) query = query.eq("invoice_id", invoiceId);
  if (creditNoteId) query = query.eq("credit_note_id", creditNoteId);
  const { data, error } = await query;
  if (error) return [];

  // Generate signed URLs for each attachment
  const attachments = (data || []) as InvoiceAttachment[];
  for (const att of attachments) {
    if (att.file_url && !att.file_url.startsWith("http")) {
      // file_url stores a path - generate signed URL
      const { data: signed } = await supabase.storage
        .from("invoice-attachments")
        .createSignedUrl(att.file_url, 60 * 60); // 1 hour
      if (signed?.signedUrl) {
        att.file_url = signed.signedUrl;
      }
    }
  }

  return attachments;
}

export async function uploadAttachment(
  file: File,
  invoiceId?: string,
  creditNoteId?: string,
  companyId?: string | null
): Promise<InvoiceAttachment | null> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  // Scope storage path by company for isolation
  const prefix = companyId ? `${companyId}/` : "";
  const path = `${prefix}${invoiceId || creditNoteId}/${Date.now()}_${file.name}`;

  const { error: uploadErr } = await supabase.storage
    .from("invoice-attachments")
    .upload(path, file);

  if (uploadErr) {
    toast({ title: "Erreur upload", description: uploadErr.message, variant: "destructive" });
    return null;
  }

  // Store path (not public URL) - generate signed URLs on read
  const { data, error } = await (supabase as any)
    .from("invoice_attachments")
    .insert({
      invoice_id: invoiceId || null,
      credit_note_id: creditNoteId || null,
      file_name: file.name,
      file_url: path, // store path, generate signed URL on read
      file_size: file.size,
      file_type: file.type,
      uploaded_by: userId,
      company_id: companyId || null,
    })
    .select()
    .single();

  if (error) {
    toast({ title: "Erreur", description: error.message, variant: "destructive" });
    return null;
  }

  // Generate signed URL for immediate use
  const { data: signed } = await supabase.storage
    .from("invoice-attachments")
    .createSignedUrl(path, 60 * 60);

  toast({ title: "Fichier ajouté" });
  return { ...data, file_url: signed?.signedUrl || path } as InvoiceAttachment;
}

export async function deleteAttachment(id: string) {
  // Get file path before deleting record
  const { data: att } = await (supabase as any)
    .from("invoice_attachments")
    .select("file_url")
    .eq("id", id)
    .single();

  if (att?.file_url && !att.file_url.startsWith("http")) {
    await supabase.storage.from("invoice-attachments").remove([att.file_url]);
  }

  const { error } = await (supabase as any).from("invoice_attachments").delete().eq("id", id);
  if (error) {
    toast({ title: "Erreur", description: error.message, variant: "destructive" });
    return false;
  }
  toast({ title: "Fichier supprimé" });
  return true;
}
