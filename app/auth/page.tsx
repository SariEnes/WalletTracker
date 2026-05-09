"use client";

import { useState } from "react";
import { useConnect, useSignMessage, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/hooks";

export default function AuthPage() {
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  // removed handleEmailSubmit

  const handleConnect = async () => {
    try {
      setStatusText("> INITIATING_CONNECTION...");

      // Ensure clean connection state
      try { await disconnectAsync(); } catch (e) { /* ignore */ }

      const { accounts } = await connectAsync({ connector: connectors[0] });
      const walletAddress = accounts[0];

      setStatusText("> FETCHING_SECURE_NONCE...");

      const nonceRes = await fetch("/api/auth/wallet-nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
      });

      if (!nonceRes.ok) throw new Error("Nonce fetch failed");
      const { nonce } = await nonceRes.json();

      setStatusText("> AWAITING_SIGNATURE... [Loading]");

      const signature = await signMessageAsync({ message: nonce });

      setStatusText("> VERIFYING_SIGNATURE...");

      const verifyRes = await fetch("/api/auth/wallet-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, signature }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed");

      // Tokens successfully retrieved.
      const { access_token, refresh_token } = await verifyRes.json();
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) throw sessionError;

      // Typewriter effect for success
      const successMsg = "> AUTH_SUCCESS: REDIRECTING...";
      setStatusText("");
      for (let i = 0; i <= successMsg.length; i++) {
        setTimeout(() => setStatusText(successMsg.slice(0, i)), i * 50);
      }

      setTimeout(() => {
        router.push("/dashboard");
      }, successMsg.length * 50 + 500);

    } catch (error) {
      console.error(error);
      setStatusText("> ERROR: AUTH_FAILED");
    }
  };

  return (
    <div className="min-h-screen bg-terminal-base flex flex-col items-center justify-center font-mono text-gray-300 p-4">
      <div className="border border-[#1F1F1F] p-8 max-w-md w-full bg-[#121212] shadow-2xl h-auto">
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] uppercase">
            ERROR: {error}
          </div>
        )}

        {/* Top: Google Auth */}
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-6 bg-white text-black font-bold py-3 hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          CONTINUE WITH GOOGLE
        </button>

        <div className="my-6 flex items-center gap-4 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
          <div className="flex-1 h-px bg-[#1F1F1F]"></div>
          <span>OR</span>
          <div className="flex-1 h-px bg-[#1F1F1F]"></div>
        </div>

        {/* Bottom: Wallet Connection */}
        <h1 className="text-accent-green text-xl mb-4 font-bold flex items-center tracking-tighter uppercase">
          VIBE_TERMINAL
        </h1>

        <div className="mb-8 min-h-[4rem] text-sm text-accent-blue bg-black/50 p-4 border-l-2 border-accent-blue">
          {statusText ? (
            <span className={statusText.includes("AWAITING_SIGNATURE") ? "animate-pulse" : ""}>
              {statusText}
            </span>
          ) : (
            <span className="opacity-70">&gt; SYSTEM_READY... AWAITING_INPUT</span>
          )}
        </div>

        <button
          onClick={handleConnect}
          className="w-full bg-accent-green text-[#0A0A0A] font-bold py-3 px-4 hover:bg-opacity-80 transition-all uppercase tracking-widest"
        >
          CONNECT_WALLET
        </button>
      </div>
    </div>
  );
}