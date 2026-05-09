import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, signature } = body;

    if (!address || !signature) {
      return NextResponse.json({ error: "Address and signature are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch nonce from DB
    const { data: nonceData, error: nonceError } = await supabase
      .from("wallet_auth_nonces")
      .select("nonce, expires_at")
      .eq("address", address.toLowerCase())
      .single();

    if (nonceError || !nonceData) {
      return NextResponse.json({ error: "Nonce not found or expired" }, { status: 400 });
    }

    if (new Date(nonceData.expires_at) < new Date()) {
      return NextResponse.json({ error: "Nonce expired" }, { status: 400 });
    }

    // 2. Verify signature using Viem
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: nonceData.nonce,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Delete the used nonce (Security Guardrail: one-time verification)
    await supabase.from("wallet_auth_nonces").delete().eq("address", address.toLowerCase());

    // 4. Supabase User Management bypassing RLS
    const email = `${address.toLowerCase()}@vibe.local`;

    // Attempt to create the user if they don't exist
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { address: address.toLowerCase() }
    }); // We ignore errors here in case the user already exists

    // 5. Generate magic link to obtain session tokens safely
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error("Link Error:", linkError);
      return NextResponse.json({ error: "Failed to generate auth session" }, { status: 500 });
    }

    // Parse the token from the action_link to verify and fetch tokens
    const actionLink = new URL(linkData.properties.action_link);
    const token = actionLink.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Failed to parse session token" }, { status: 500 });
    }

    const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink'
    });

    if (verifyError || !sessionData.session) {
      console.error("Verify Error:", verifyError);
      return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
    }

    // Return the tokens
    return NextResponse.json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token
    });

  } catch (error) {
    console.error("Verify route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
