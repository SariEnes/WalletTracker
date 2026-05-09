import React, { useState } from "react";
import { formatAmount } from "../../lib/utils/format";

export function PortfolioComp({ 
  holdingsLoading, 
  topHoldings 
}: { 
  holdingsLoading: boolean, 
  topHoldings: { symbol: string; amount: number; valueUsd: number; priceUsd?: number }[] 
}) {
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  return (
    <div className="flex flex-col gap-3 text-right">
      <span className="text-zinc-500 font-sans text-[10px] uppercase tracking-[0.2em] font-medium">PORTFOLIO COMPOSITION</span>
      {holdingsLoading ? (
        <div className="flex flex-col gap-2 animate-pulse items-end">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-3 w-48 bg-zinc-800/50 rounded" />
          ))}
        </div>
      ) : topHoldings.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {/* Column Headers */}
          <div className="grid grid-cols-[40px_60px_80px_80px] gap-4 font-mono text-[9px] uppercase tracking-tighter text-zinc-600 mb-1 border-b border-zinc-900/50 pb-1">
            <span className="text-left">ASSET</span>
            <span className="text-right">PRICE</span>
            <span className="text-right">AMOUNT</span>
            <span className="text-right">TOTAL</span>
          </div>

          {topHoldings.slice(0, showAllHoldings ? topHoldings.length : 3).map((h) => {
            const unitPrice = h.priceUsd && h.priceUsd > 0 ? h.priceUsd : (h.amount > 0 ? h.valueUsd / h.amount : 0);
            return (
              <div key={h.symbol} className="grid grid-cols-[40px_60px_80px_80px] gap-4 font-mono text-[11px] items-center">
                <span className="text-cyan-400 font-bold text-left">{h.symbol}</span>
                <span className="text-zinc-600 text-[10px] text-right">
                  ${unitPrice < 1 ? unitPrice.toFixed(3) : unitPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
                <span className="text-zinc-500 text-right">
                  {formatAmount(h.amount ?? 0)}
                </span>
                <span className="text-zinc-300 font-medium text-right">
                  {h.valueUsd > 0 && h.valueUsd < 0.001 ? "<$0.001" : `$${h.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
            );
          })}
          {topHoldings.length > 3 && (
            <div className="flex justify-end mt-1">
              <button 
                onClick={() => setShowAllHoldings(!showAllHoldings)}
                className="text-zinc-500 hover:text-cyan-400 transition-colors font-mono text-xs uppercase tracking-widest"
              >
                {showAllHoldings ? "-LESS" : "+MORE"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <span className="text-zinc-600 font-mono text-[10px]">NO_DATA_DETECTED</span>
      )}
    </div>
  );
}
