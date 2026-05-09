import React from "react";
import { ExternalLink } from "lucide-react";
import { formatAmount } from "../../lib/utils/format";

function getRelativeTime(timestamp: string) {
  if (!timestamp) return "UNKNOWN";
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getScanLink(hash: string, chain: string): string | null {
  if (!hash) return null;
  const c = chain?.toLowerCase();
  if (c === "solana" || c === "sol") return `https://solscan.io/tx/${hash}`;
  if (c === "stellar" || c === "xlm") return `https://stellar.expert/explorer/public/tx/${hash}`;
  // Default: Ethereum / EVM
  return `https://etherscan.io/tx/${hash}`;
}

export function HistoryList({ history }: { history: any[] }) {
  return (
    <div className="space-y-3">
      <div className="flex text-zinc-500 font-sans tracking-wide uppercase text-[10px] pb-2 px-3 border-b border-zinc-800/50 mb-4">
        <div className="w-16">TYPE</div>
        <div className="flex-1">ASSET & AMOUNT</div>
        <div className="w-24 text-right">TIME</div>
        <div className="w-20 text-right">CHAIN</div>
        <div className="w-8 text-right">SCAN</div>
      </div>
      
      {!history || history.length === 0 ? (
        <div className="text-rose-500/80 border border-rose-900/30 bg-rose-950/20 rounded-lg p-3 font-mono tracking-widest text-[10px] mt-4">
          NO_HISTORY_DETECTED
        </div>
      ) : (
        history.map((tx: any, i: number) => {
          const isOut = tx.type === "OUT";
          return (
            <div key={i} className="flex items-center border border-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800/40 transition-colors group cursor-default bg-zinc-900/20">
              <div className={`w-16 font-mono font-bold text-[10px] ${isOut ? 'text-zinc-500' : 'text-emerald-400/80'}`}>
                {tx.type}
              </div>
              <div className={`flex-1 truncate pr-2 font-mono text-[11px] ${isOut ? 'text-zinc-400' : 'text-zinc-200'}`}>
                {formatAmount(tx.amount ?? 0)} {tx.asset}
              </div>
              <div className="w-24 text-right text-zinc-500 font-mono text-[10px]">
                {getRelativeTime(tx.timestamp)}
              </div>
              <div className="w-20 text-right text-zinc-600 uppercase font-mono tracking-wider text-[9px] truncate pl-2">
                {tx.chain || "EVM"}
              </div>
              <div className="w-8 flex justify-end">
                {getScanLink(tx.hash, tx.chain) && (
                  <a
                    href={getScanLink(tx.hash, tx.chain)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-zinc-500 hover:text-cyan-400 transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
