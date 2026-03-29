// supabase/functions/cleanup-audit-logs/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-client@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // RGPD: Purge logs older than 12 months (365 days)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const timestamp = twelveMonthsAgo.toISOString()

    console.log(`Cleaning up audit logs older than: ${timestamp}`)

    const { count, error } = await supabaseClient
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', timestamp)

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        message: 'Cleanup successful', 
        deleted_count: count,
        threshold: timestamp 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
