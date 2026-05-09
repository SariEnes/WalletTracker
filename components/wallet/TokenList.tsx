import React, { useState } from "react";
import { formatAmount } from "../../lib/utils/format";

export function TokenList({ tokens }: { tokens: any[] }) {
  const [showSpam, setShowSpam] = useState(false);
  const legitTokens = tokens?.filter((t: any) => !t.isSpam) || [];
  const spamTokens = tokens?.filter((t: any) => t.isSpam) || [];

  return (
    <div className="space-y-3">
      <div className="flex text-zinc-500 font-sans uppercase text-[10px] tracking-wide pb-2 px-3">
        <div className="w-28">SYMBOL</div>
        <div className="flex-1 pl-6">AMOUNT</div>
        <div className="w-24 text-right">VALUE</div>
        <div className="w-20 text-right">CHAIN</div>
      </div>
      
      {legitTokens.length === 0 && spamTokens.length === 0 ? (
        <div className="text-rose-500/80 border border-rose-900/30 bg-rose-950/20 rounded-lg p-3 font-mono tracking-widest text-[10px] mt-4">
          NO_TOKENS_FOUND
        </div>
      ) : (
        legitTokens.map((t: any, i: number) => (
          <div key={`legit-${i}`} className="flex items-center border border-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800/40 transition-colors group cursor-default bg-zinc-900/20">
            <div className="w-28 pr-2">
              <div className="font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors truncate font-mono text-[11px]">
                {t.symbol || "UNKNOWN"}
              </div>
              <div className="text-zinc-500 font-mono text-[9px] mt-0.5">
                {t.priceUsd > 0 
                  ? `$${t.priceUsd < 0.01
                      ? t.priceUsd.toFixed(6)
                      : t.priceUsd < 1
                        ? t.priceUsd.toFixed(4)
                        : t.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "-"}
              </div>
            </div>
            <div className="flex-1 text-zinc-400 truncate pl-6 pr-2 font-mono text-[11px]">
              {formatAmount(t.amount ?? 0)}
            </div>
            <div className="w-24 text-right text-cyan-400 font-mono text-[11px]">
              {t.valueUsd > 0 && t.valueUsd < 0.001 ? "<$0.001" : `$${t.valueUsd > 0 ? t.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`}
            </div>
            <div className="w-20 text-right text-zinc-600 uppercase text-[9px] font-mono tracking-wider truncate pl-2">
              {t.chain || "EVM"}
            </div>
          </div>
        ))
      )}
      
      {spamTokens.length > 0 && (
        <div className="pt-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowSpam(!showSpam); }}
            className="w-full text-center text-[10px] text-zinc-500 font-sans tracking-wide border border-zinc-800/50 rounded p-2 hover:bg-zinc-800/30 transition-colors uppercase"
          >
            {showSpam ? "HIDE" : "SHOW"} {spamTokens.length} HIDDEN / SPAM
          </button>
          
          {showSpam && (
            <div className="mt-3 space-y-2 opacity-50">
              {spamTokens.map((t: any, i: number) => (
                <div key={`spam-${i}`} className="flex items-center border border-zinc-800/50 rounded-lg p-3 bg-zinc-900/10 cursor-default">
                  <div className="w-28 text-zinc-500 truncate pr-2 line-through font-mono text-[10px]">
                    {t.symbol || "UNKNOWN"}
                  </div>
                  <div className="flex-1 text-zinc-600 truncate pl-6 pr-2 font-mono text-[10px]">
                    {formatAmount(t.amount ?? 0)}
                  </div>
                  <div className="w-24 text-right text-zinc-500 font-mono text-[10px]">
                    ${t.valueUsd > 0 ? t.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                  </div>
                  <div className="w-20 text-right text-zinc-700 uppercase font-mono text-[9px] truncate pl-2">
                    {t.chain || "EVM"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
