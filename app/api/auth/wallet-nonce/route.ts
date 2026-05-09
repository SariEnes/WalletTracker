import { NextRequest, NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Generate a secure alphanumeric nonce as required by EIP-4361 (SIWE)
    const nonce = generateNonce();

    const supabase = createAdminClient();

    // Store the nonce in the database, overwriting any previous nonce for this address
    const { error } = await supabase
      .from("wallet_auth_nonces")
      .upsert(
        {
          address: address.toLowerCase(),
          nonce: nonce,
          created_at: new Date().toISOString(),
          // Nonce expires in 10 minutes
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        },
        { onConflict: "address" }
      );

    if (error) {
      console.error("Nonce DB insertion error:", error);
      return NextResponse.json({ error: "Failed to store nonce" }, { status: 500 });
    }

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
