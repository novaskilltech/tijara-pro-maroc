import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DocAttachment {
  id: string;
  doc_type: string;
  doc_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  is_audio: boolean;
  uploaded_by: string | null;
  company_id: string | null;
  created_at: string;
}

export async function fetchDocAttachments(docType: string, docId: string): Promise<DocAttachment[]> {
  const { data, error } = await (supabase as any)
    .from("document_attachments")
    .select("*")
    .eq("doc_type", docType)
    .eq("doc_id", docId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []) as DocAttachment[];
}

export async function uploadDocAttachment(
  file: File,
  docType: string,
  docId: string,
  companyId?: string | null,
  isAudio = false
): Promise<DocAttachment | null> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const path = `${docType}/${docId}/${Date.now()}_${file.name}`;

  const { error: uploadErr } = await supabase.storage
    .from("document-attachments")
    .upload(path, file);

  if (uploadErr) {
    toast({ title: "Erreur upload", description: uploadErr.message, variant: "destructive" });
    return null;
  }

  const { data: urlData } = supabase.storage.from("document-attachments").getPublicUrl(path);
  // Use signed URL since bucket is private
  const { data: signedData } = await supabase.storage
    .from("document-attachments")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

  const fileUrl = signedData?.signedUrl || urlData.publicUrl;

  const { data, error } = await (supabase as any)
    .from("document_attachments")
    .insert({
      doc_type: docType,
      doc_id: docId,
      file_name: file.name,
      file_url: path, // store path, generate signed URL on read
      file_size: file.size,
      file_type: file.type,
      is_audio: isAudio,
      uploaded_by: userId,
      company_id: companyId || null,
    })
    .select()
    .single();

  if (error) {
    toast({ title: "Erreur", description: error.message, variant: "destructive" });
    return null;
  }

  // Return with signed URL
  toast({ title: isAudio ? "Note audio ajoutée" : "Fichier ajouté" });
  return { ...data, file_url: fileUrl } as DocAttachment;
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from("document-attachments")
    .createSignedUrl(path, 60 * 60); // 1 hour
  return data?.signedUrl || "";
}

export async function deleteDocAttachment(id: string, filePath: string): Promise<boolean> {
  // Delete from storage
  await supabase.storage.from("document-attachments").remove([filePath]);
  // Delete record
  const { error } = await (supabase as any).from("document_attachments").delete().eq("id", id);
  if (error) {
    toast({ title: "Erreur", description: error.message, variant: "destructive" });
    return false;
  }
  toast({ title: "Supprimé" });
  return true;
}
