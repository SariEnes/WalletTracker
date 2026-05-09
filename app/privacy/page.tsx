export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] font-mono text-gray-300 p-8 flex flex-col items-center justify-center relative">
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-5" />

      <div className="max-w-2xl border border-[#1F1F1F] bg-[#121212] p-8 shadow-2xl z-10 relative">
        <h1 className="text-2xl text-accent-green mb-6 font-bold uppercase tracking-widest">&gt; PRIVACY_PROTOCOL</h1>
        
        <div className="space-y-4 leading-relaxed">
          <p className="text-accent-blue bg-[#0A0A0A] border border-[#1F1F1F] p-4 text-lg border-l-4 border-l-accent-blue">
            "We store your address book; we never touch your private keys or store your balance history."
          </p>
          
          <ul className="list-disc pl-5 space-y-3 text-sm text-gray-400 mt-6 tracking-wide">
            <li>
              <span className="text-accent-green font-bold">1. Zero-Leak Promise:</span> Raw blockchain data (NFT arrays, token transactions) is cached ephemerally in Redis (15-min TTL).
            </li>
            <li>
              <span className="text-accent-green font-bold">2. No Persistent Tracking:</span> No raw arrays ever persist inside our PostgreSQL clusters.
            </li>
            <li>
              <span className="text-accent-green font-bold">3. EIP-191 Auth:</span> Your signatures are cryptographically validated exactly once and instantly destroyed.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
