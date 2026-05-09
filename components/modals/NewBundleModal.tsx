"use client";

import { useState, useEffect } from "react";
import { parseWalletAddresses, ParsedAddress } from "@/lib/utils/address";
import { X, Check } from "lucide-react";

export function NewBundleModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("anon");
  const [rawInput, setRawInput] = useState("");
  const [parsed, setParsed] = useState<ParsedAddress[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Live Regex Parsing
    const timer = setTimeout(() => {
      const results = parseWalletAddresses(rawInput);
      setParsed(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawInput]);

  const evmCount = parsed.filter(p => p.chain_type === "evm").length;
  const btcCount = parsed.filter(p => p.chain_type === "bitcoin").length;
  const solCount = parsed.filter(p => p.chain_type === "solana").length;

  // Enforcing the 75 limit on UX side
  const validCount = Math.min(parsed.length, 75);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          icon,
          addresses: parsed.slice(0, 75).map(p => p.address)
        })
      });
      if (!response.ok) throw new Error("Failed to create bundle");
      onClose();
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-mono">
      <div className="bg-[#121212] border border-[#1F1F1F] w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-accent-green font-bold">
            {step === 1 ? "NEW_BUNDLE" : "MASS_IMPORT"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">BUNDLE_NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full bg-[#0A0A0A] border border-[#1F1F1F] p-3 text-gray-200 focus:border-accent-blue outline-none transition-colors"
                placeholder="e.g. Airdrop Farming"
              />
            </div>
            
            <button
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              className="w-full bg-accent-blue text-[#0A0A0A] font-bold py-3 disabled:opacity-30 disabled:bg-gray-600 transition-colors uppercase tracking-wider"
            >
              NEXT &gt;
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">PASTE_ADDRESSES (EVM, BTC, SOL)</label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full h-40 bg-[#0A0A0A] border border-[#1F1F1F] p-3 text-xs text-gray-300 outline-none resize-none focus:border-accent-green transition-colors"
                placeholder="0x...&#10;bc1...&#10;HN7..."
              />
            </div>

            <div className="flex gap-4 text-xs">
              <span className="text-gray-500">DETECTED:</span>
              {evmCount > 0 && <span className="text-accent-blue font-bold">{evmCount} EVM</span>}
              {btcCount > 0 && <span className="text-orange-400 font-bold">{btcCount} BTC</span>}
              {solCount > 0 && <span className="text-purple-400 font-bold">{solCount} SOL</span>}
              {parsed.length === 0 && <span className="text-gray-600">0 WALLETS</span>}
            </div>

            {parsed.length > 75 && (
              <div className="text-xs text-red-500 mt-1 bg-red-950/30 p-2 border border-red-900/50">
                WARNING: Import capped at 75 wallets to prevent sync timeouts.
              </div>
            )}

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-[#1F1F1F] text-gray-400 py-3 hover:bg-[#1F1F1F] transition-colors tracking-widest"
              >
                &lt; BACK
              </button>
              <button
                onClick={handleSubmit}
                disabled={parsed.length === 0 || isSubmitting}
                className="flex-[2] bg-accent-green text-[#0A0A0A] font-bold py-3 disabled:opacity-30 flex items-center justify-center gap-2 tracking-widest transition-colors"
              >
                {isSubmitting ? "IMPORTING..." : <><Check size={18} strokeWidth={3} /> IMPORT {validCount}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
