import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import { TijaraProPDF } from "@/lib/pdf/TijaraProPDF";
import type { PdfDocumentData } from "@/lib/pdf/types";
import { toast } from "@/hooks/use-toast";

/**
 * Service pour l'envoi de documents par email via Supabase Edge Functions & Resend
 */
export const emailService = {
  /**
   * Envoie un document (Devis, BL, Facture) par email
   */
  async sendDocument(data: PdfDocumentData, recipientEmail: string) {
    try {
      // 1. Générer le PDF en tant que Blob
      const blob = await pdf(<TijaraProPDF data={data} />).toBlob();
      
      // 2. Convertir le Blob en Base64 pour l'envoi
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Retirer le préfixe "data:application/pdf;base64,"
          resolve(base64String.split(',')[1]);
        };
      });
      reader.readAsDataURL(blob);
      const base64Content = await base64Promise;

      // 3. Appeler la fonction Edge Supabase
      const { data: response, error } = await supabase.functions.invoke("send-sales-document", {
        body: {
          recipientEmail,
          documentNumber: data.number,
          documentType: data.type,
          pdfContent: base64Content,
          fileName: `${data.type}-${data.number}.pdf`,
          companyName: data.company.name,
        },
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: `Le document ${data.number} a été envoyé à ${recipientEmail}.`,
      });

      return true;
    } catch (error: any) {
      console.error("Erreur d'envoi d'email:", error);
      toast({
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer l'email. Vérifiez la configuration.",
        variant: "destructive",
      });
      return false;
    }
  },
};
