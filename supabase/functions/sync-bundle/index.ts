import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { bundle_id } = body;

    // 1. Fetch Wallets inside Bundle
    const { data: wallets } = await supabaseClient
      .from("wallets")
      .select("id, address, chain_type")
      .eq("bundle_id", bundle_id);

    if (!wallets || wallets.length === 0) {
      return new Response(JSON.stringify({ error: "No wallets found" }), { status: 400 });
    }

    // 2. Perform Backend Batch Sync
    for (const wallet of wallets) {
      // NOTE: In production, this hits our data-provider layer
      // PRIVACY FIREWALL ENFORCEMENT: We extract totals only. 
      // Arrays of NFTs, Tokens, and TXs are discarded and NEVER sent to the UPSERT.
      const aggregatedNetWorth = Math.random() * 50000;
      
      await supabaseClient.from("wallet_cache").upsert({
        wallet_id: wallet.id,
        net_worth_usd: aggregatedNetWorth,
        net_worth_usd_24h_ago: aggregatedNetWorth * 0.95,
        token_count: Math.floor(Math.random() * 20),
        nft_count: Math.floor(Math.random() * 5),
        defi_positions_count: Math.floor(Math.random() * 3),
        fetch_status: "success",
        last_fetched_at: new Date().toISOString()
      }, { onConflict: "wallet_id" });
    }

    // 3. Close the Sync Job state
    await supabaseClient.from("sync_jobs")
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq("bundle_id", bundle_id)
      .eq("status", "pending"); 

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
