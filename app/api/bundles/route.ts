import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWalletAddresses } from "@/lib/utils/address";
import { sanitizeField } from "@/lib/utils/sanitize";

const BundleSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.enum(['whale', 'defi', 'nft', 'team', 'dao', 'anon', 'shark', 'diamond', 'fire', 'lock']).default('anon'),
  addresses: z.array(z.string())
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = BundleSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload", details: result.error.format() }, { status: 400 });
    }

    const { name, icon, addresses } = result.data;
    const sanitizedName = sanitizeField(name, 60);

    const supabase = createAdminClient();

    // Mocking auth extraction for demonstration: normally use supabase.auth.getUser() via cookies
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users.users || users.users.length === 0) {
      return NextResponse.json({ error: "No authenticated user found" }, { status: 401 });
    }
    const userId = users.users[0].id; 

    // Bundle limit enforcement
    const { count: bundleCount, error: countError } = await supabase
      .from('bundles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) throw countError;
    if (bundleCount && bundleCount >= 20) {
      return NextResponse.json({ error: "Limit reached (20 bundles max)" }, { status: 403 });
    }

    // Re-validation server-side using prioritized regex
    const rawText = addresses.join(" ");
    const parsedAddresses = parseWalletAddresses(rawText);

    // Hardcap at 75 wallets per bundle to prevent timeout loops
    const validAddresses = parsedAddresses.slice(0, 75);

    if (validAddresses.length === 0) {
      return NextResponse.json({ error: "No valid addresses provided" }, { status: 400 });
    }

    // Insert Bundle
    const { data: bundleData, error: bundleError } = await supabase
      .from('bundles')
      .insert({
        user_id: userId,
        name: sanitizedName,
        icon: icon
      })
      .select('id')
      .single();

    if (bundleError || !bundleData) throw bundleError;

    // Insert Wallets
    const walletsToInsert = validAddresses.map(addr => ({
      bundle_id: bundleData.id,
      address: addr.address,
      chain_type: addr.chain_type,
      source: 'import'
    }));

    const { error: walletsError } = await supabase
      .from('wallets')
      .insert(walletsToInsert);

    if (walletsError) throw walletsError;

    // Enqueue Sync Job
    await supabase.from('sync_jobs').insert({
      bundle_id: bundleData.id,
      status: 'pending'
    });

    return NextResponse.json({ 
      bundle_id: bundleData.id, 
      wallets_imported: validAddresses.length 
    });

  } catch (error: any) {
    console.error("Bundle Creation Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
