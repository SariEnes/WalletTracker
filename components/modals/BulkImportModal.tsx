"use client";
import React, { useState } from "react";

type ModalStep = "INPUT" | "PREVIEW";

export function BulkImportModal({ 
  onClose, 
  onImport,
  bundleName
}: { 
  onClose: () => void, 
  onImport: (wallets: { address: string, label: string }[]) => Promise<void>,
  bundleName?: string
}) {
  const [step, setStep] = useState<ModalStep>("INPUT");
  const [input, setInput] = useState("");
  const [detectedAddresses, setDetectedAddresses] = useState<{ address: string, label: string }[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const parseAddresses = (text: string) => {
    // 1. EVM: 0x followed by 40 hex characters (case-insensitive)
    const evmMatches = text.match(/0x[a-fA-F0-9]{40}/gi) || [];
    
    // 2. Stellar: G followed by 55 base32 characters (case-insensitive)
    const stellarMatches = text.match(/G[a-zA-Z2-7]{55}/gi) || [];
    
    // 3. Solana: 32-44 base58 characters (case-sensitive)
    // We try to match Solana addresses that aren't already captured as EVM/Stellar
    const solanaMatches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];

    // Combine all matches
    let allMatches = [...evmMatches, ...stellarMatches, ...solanaMatches];

    // Filter out Solana matches that are just substrings of EVM/Stellar matches
    allMatches = allMatches.filter(addr => {
      // If it's explicitly an EVM or Stellar match, keep it
      if (addr.startsWith("0x") || addr.startsWith("0X")) return true;
      if (addr.length === 56 && addr.toUpperCase().startsWith("G")) return true;
      
      // If it's a Solana match, ensure it's not a substring of a found EVM/Stellar address
      const isSubstring = [...evmMatches, ...stellarMatches].some(
        other => other !== addr && other.includes(addr)
      );
      return !isSubstring;
    });

    // Remove duplicates (case-insensitive comparison for deduplication, keeping first seen casing)
    const uniqueMap = new Map<string, string>();
    allMatches.forEach(addr => {
      const key = addr.toLowerCase();
      if (!uniqueMap.has(key)) {
        // For Stellar, typically uppercase
        if (addr.length === 56 && addr.toUpperCase().startsWith("G")) {
          uniqueMap.set(key, addr.toUpperCase());
        } else {
          uniqueMap.set(key, addr);
        }
      }
    });

    return Array.from(uniqueMap.values()).map((address, index) => ({
      address,
      label: `New Wallet ${index + 1}`
    }));
  };

  const handleAnalyze = () => {
    const addresses = parseAddresses(input);
    setDetectedAddresses(addresses);
    setStep("PREVIEW");
  };

  const handleLabelChange = (index: number, newLabel: string) => {
    setDetectedAddresses(prev => {
      const updated = [...prev];
      updated[index].label = newLabel;
      return updated;
    });
  };

  const handleConfirmImport = async () => {
    if (detectedAddresses.length === 0) return;

    setIsImporting(true);
    setLogs(["> INITIALIZING_BULK_IMPORT...", `> IMPORTING ${detectedAddresses.length} WALLETS`]);
    
    try {
      await onImport(detectedAddresses);
      setLogs(prev => [...prev, `> SUCCESSFULLY_IMPORTED ${detectedAddresses.length} WALLETS`, "> CLOSING_MODAL..."]);
      setTimeout(onClose, 1000);
    } catch (err) {
      setLogs(prev => [...prev, "> ERROR: IMPORT_FAILED", (err as Error).message]);
      setIsImporting(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 p-8 shadow-[0_0_50px_rgba(34,211,238,0.1)] relative overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-400/20 translate-x-8 -translate-y-8 rotate-45" />
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-cyan-400 text-xl tracking-[0.2em] font-bold uppercase">
              {step === "INPUT" ? "BULK_IMPORT_WALLETS" : "PREVIEW_DETECTION"}
            </h2>
            <p className="text-zinc-500 text-[10px] mt-1 tracking-widest uppercase">TARGET_BUNDLE: {bundleName || "GLOBAL"}</p>
          </div>
          <button onClick={onClose} disabled={isImporting} className="text-zinc-600 hover:text-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">[ESC]</button>
        </div>

        {step === "INPUT" && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute -top-2 left-4 px-2 bg-zinc-950 text-[10px] text-zinc-600 uppercase tracking-widest">Input_Stream</div>
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste addresses here (concatenated, one per line, or comma-separated)..."
                className="w-full h-48 bg-zinc-900/50 border border-zinc-800 p-4 text-cyan-400 font-mono text-xs focus:outline-none focus:border-cyan-400/50 transition-colors resize-none scrollbar-thin scrollbar-thumb-zinc-800 leading-relaxed"
              />
            </div>

            <p className="text-[10px] text-zinc-500 leading-relaxed">
              <span className="text-cyan-400/70">SYSTEM NOTE:</span> Auto-detection works best for EVM (0x) and Stellar (G) addresses. For Solana or other formats, please use spaces or commas for 100% accuracy.
            </p>

            <div className="flex justify-end gap-4 pt-4 border-t border-zinc-900">
              <button 
                onClick={onClose} 
                className="px-6 py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs tracking-widest uppercase"
              >
                CANCEL
              </button>
              <button 
                onClick={handleAnalyze}
                disabled={!input.trim()}
                className="px-8 py-2 font-bold text-xs tracking-widest uppercase transition-all bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none disabled:cursor-not-allowed"
              >
                ANALYZE
              </button>
            </div>
          </div>
        )}

        {step === "PREVIEW" && (
          <div className="space-y-6">
            <div className="bg-zinc-900/30 border border-zinc-800 p-4">
              <p className="text-cyan-400 text-xs tracking-widest uppercase mb-3">
                &gt; DETECTED: {detectedAddresses.length} WALLETS
              </p>
              
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-2">
                {detectedAddresses.length > 0 ? (
                  detectedAddresses.map((wallet, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-black/50 border border-zinc-800/50 px-3 py-2">
                      <div className="text-[11px] text-zinc-300 tracking-wider font-mono shrink-0 w-24">
                        {truncateAddress(wallet.address)}
                      </div>
                      <input
                        type="text"
                        value={wallet.label}
                        onChange={(e) => handleLabelChange(idx, e.target.value)}
                        placeholder="Wallet Label"
                        className="flex-1 bg-transparent border-b border-zinc-800 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-400 transition-colors py-1 placeholder:text-zinc-700"
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-rose-500 text-[11px]">NO VALID ADDRESSES FOUND IN STREAM.</div>
                )}
              </div>
            </div>

            {logs.length > 0 && (
              <div className="bg-black/40 border border-zinc-800/50 p-4 font-mono text-[10px] space-y-1 max-h-32 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes("ERROR") ? "text-rose-500" : "text-cyan-400/60"}>
                    {log}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-zinc-900">
              <button 
                onClick={() => {
                  setStep("INPUT");
                  setLogs([]);
                }} 
                disabled={isImporting}
                className="px-6 py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? "CANCEL" : "BACK"}
              </button>
              
              {detectedAddresses.length > 0 && (
                <button 
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className={`px-8 py-2 font-bold text-xs tracking-widest uppercase transition-all ${
                    isImporting 
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                      : "bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                  }`}
                >
                  {isImporting ? "IMPORTING..." : "CONFIRM & IMPORT"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
