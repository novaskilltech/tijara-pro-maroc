import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipientEmail, documentNumber, documentType, pdfContent, fileName, companyName } = await req.json();

    if (!recipientEmail || !pdfContent) {
      throw new Error("Missing required fields");
    }

    const { data, error } = await resend.emails.send({
      from: `${companyName} <noreply@tijara-pro.ma>`, // Use a verified domain or generic
      to: [recipientEmail],
      subject: `Votre ${documentType} - ${documentNumber}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Bonjour,</h2>
          <p>
            Veuillez trouver ci-joint votre <strong>${documentType}</strong> n° <strong>${documentNumber}</strong> 
            établi par l'entreprise <strong>${companyName}</strong>.
          </p>
          <p>Cordialement,<br />L'équipe ${companyName}</p>
          <hr />
          <p style="font-size: 10px; color: #888;">Envoyé via Tijara Pro Maroc</p>
        </div>
      `,
      attachments: [
        {
          filename: fileName || `${documentType}-${documentNumber}.pdf`,
          content: pdfContent,
        },
      ],
    });

    if (error) {
      console.error("Resend Error:", error);
      throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
