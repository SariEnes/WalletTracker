import { NextRequest, NextResponse } from "next/server";
import { fetchWalletData } from "../../../../lib/api/data-provider";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    // Call data-provider which dynamically scans Ethereum, Polygon, Arbitrum, Base
    // It enforces the 15-Minute Upstash TTL Rule for raw arrays.
    const { data, cached } = await fetchWalletData(address, force);

    const supabase = createAdminClient();

    // 1. Fetch wallet_id corresponding to this address
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('id')
      .ilike('address', address)
      .limit(1)
      .single();

    if (!walletError && walletData) {
      // 2. PRIVACY FIREWALL ENFORCEMENT
      // We explicitly refuse to store `tokens` or `history` arrays in PostgreSQL.
      // We ONLY upsert the aggregate totals into the correct `wallet_cache` table.
      const newCache = {
        wallet_id: walletData.id,
        net_worth_usd: data.netWorthUsd,
        token_count: data.tokenCount,
        chains_active: data.activeChains,
        fetch_status: 'success',
        last_fetched_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('wallet_cache')
        .upsert(newCache, { onConflict: 'wallet_id' });

      if (updateError) {
        console.error("Failed to update wallet cache in DB:", updateError);
      }
    }

    // We return the full payload (including arrays) back to the client.
    return NextResponse.json({ data, cached });
  } catch (error: any) {
    console.error("Wallet Fetch Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  // Alias POST to GET for forced cache-busting syncs
  return GET(request, { params });
}
