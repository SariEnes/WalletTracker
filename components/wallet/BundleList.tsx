"use client";

import React, { useState } from "react";
import { WalletList, WalletType } from "./WalletList";
import { formatAmount } from "../../lib/utils/format";
import { PortfolioComp } from "./PortfolioComp";
import { supabase } from "../../lib/hooks";
import { EditableName } from "../shared/EditableName";

export interface BundleType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export function BundleList({ bundles, wallets, onCreateBundle, onSignOut, onRefresh }: { bundles: BundleType[], wallets: WalletType[], onCreateBundle?: (name: string) => void, onSignOut?: () => void, onRefresh?: () => void }) {
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBundleName, setNewBundleName] = useState("");
  const [localFilteredWallets, setLocalFilteredWallets] = useState<WalletType[]>([]);
  const [topHoldings, setTopHoldings] = useState<{ symbol: string; amount: number; valueUsd: number; priceUsd?: number }[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  // Sync localFilteredWallets with wallets prop when bundle changes
  React.useEffect(() => {
    if (selectedBundleId) {
      setLocalFilteredWallets(wallets.filter(w => w.bundle_id === selectedBundleId));
    } else {
      setLocalFilteredWallets([]);
    }
  }, [selectedBundleId, wallets]);

  // Fetch and aggregate tokens across all localFilteredWallets
  React.useEffect(() => {
    if (!selectedBundleId || localFilteredWallets.length === 0) {
      setTopHoldings([]);
      return;
    }

    setHoldingsLoading(true);
    const fetchAll = async () => {
      const symbolMap: Record<string, { amount: number; valueUsd: number; priceUsd?: number }> = {};

      console.log("[BundleList] Fetching live data for wallets:", localFilteredWallets.map(w => w.address));

      await Promise.allSettled(
        localFilteredWallets.map(async (w) => {
          try {
            // cache: no-store forces a fresh response, bypassing browser HTTP cache
            const res = await fetch(`/api/wallets/${w.address}`, { cache: "no-store" });
            if (!res.ok) return;
            const json = await res.json();
            const tokens = json?.data?.tokens || [];

            console.log(`[BundleList] ${w.address} → netWorthUsd: $${json?.data?.netWorthUsd?.toFixed(2)}, tokens: ${tokens.length}`);

            for (const t of tokens) {
              if (t.isSpam) continue;
              const sym = (t.symbol || "UNKNOWN").toUpperCase();
              const tokenAmount = t.amount !== undefined ? t.amount : (t.balance || 0);
              console.log(`  [price] ${sym}: amount=${tokenAmount?.toFixed(6)}, valueUsd=$${t.valueUsd?.toFixed(4)}, priceUsd=$${t.priceUsd?.toFixed(6)}`);
              if (!symbolMap[sym]) symbolMap[sym] = { amount: 0, valueUsd: 0, priceUsd: 0 };
              symbolMap[sym].amount += tokenAmount;
              symbolMap[sym].valueUsd += t.valueUsd || 0;
              if (t.priceUsd > 0) symbolMap[sym].priceUsd = t.priceUsd;
            }
          } catch (err) {
            console.error(`[BundleList] Failed to fetch wallet ${w.address}:`, err);
          }
        })
      );

      const sorted = Object.entries(symbolMap)
        .map(([symbol, data]) => ({ symbol, ...data }))
        .sort((a, b) => b.valueUsd - a.valueUsd);

      console.log("[BundleList] Portfolio composition summary:", sorted);
      setTopHoldings(sorted);
      setHoldingsLoading(false);
    };
    fetchAll();
  }, [selectedBundleId, localFilteredWallets]);

  if (selectedBundleId) {
    const selectedBundle = bundles.find(b => b.id === selectedBundleId);
    const totalBundleValue = localFilteredWallets.reduce((acc, w) => {
      const netWorth = w.wallet_cache?.net_worth_usd || 0;
      console.log(`[BundleList] Wallet ${w.address} cached net_worth_usd: $${netWorth.toFixed(2)}`);
      return acc + netWorth;
    }, 0);
    console.log("[BundleList] Total bundle value (from DB cache):", `$${totalBundleValue.toFixed(2)}`, "— hit [FORCE_SYNC] per wallet to refresh");
    
    return (
      <div className="flex flex-col w-full h-full bg-zinc-950 select-none">
        {/* Global System Bar */}
        <nav className="flex justify-between items-center w-full px-8 py-3 border-b border-zinc-900/50 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-20 leading-none">
          <button 
            onClick={() => setSelectedBundleId(null)}
            className="text-zinc-500 hover:text-cyan-400 transition-all duration-300 font-mono text-[11px] font-medium tracking-[0.2em] uppercase"
          >
            &lt; BACK_TO_BUNDLES
          </button>
          {onSignOut && (
            <button 
              onClick={onSignOut} 
              className="text-zinc-500 hover:text-rose-500 transition-all duration-300 font-mono text-[11px] font-medium uppercase tracking-[0.2em]"
            >
              [SIGN_OUT]
            </button>
          )}
        </nav>

        {/* Hero Section */}
        <div className="relative px-8 pt-8 pb-12 bg-zinc-950 border-b border-zinc-800/50">
          <div className="flex justify-between items-start w-full">
            {/* Top-Left: Identity Info */}
            <div className="flex flex-col gap-1">
              <EditableName 
                initialName={selectedBundle?.name || "Bundle"}
                onSave={async (newName) => {
                  if (selectedBundle) {
                    const { error } = await supabase.from('bundles').update({ name: newName }).eq('id', selectedBundle.id);
                    if (!error && onRefresh) onRefresh();
                  }
                }}
                className="text-cyan-400 font-mono text-4xl tracking-tighter uppercase font-bold leading-none"
              />
              <span className="text-zinc-500 font-mono text-xs tracking-wide">
                {localFilteredWallets.length} WALLETS TRACKED
              </span>
            </div>

            {/* Top-Right Metrics: Composition & Total Value */}
            <div className="flex items-start gap-20">
              {/* Center: Portfolio Composition */}
            <PortfolioComp holdingsLoading={holdingsLoading} topHoldings={topHoldings} />

            {/* Aggregate Value */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-zinc-500 font-sans text-[10px] uppercase tracking-[0.2em] font-medium">TOTAL VALUE</span>
              <h1 className="text-6xl font-mono text-zinc-100 tracking-tighter font-bold leading-none">
                ${totalBundleValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
            </div>
            </div>
          </div>
        </div>

        {/* Wallet List */}
        <div className="flex-1 overflow-hidden relative">
          <WalletList 
            wallets={localFilteredWallets} 
            currentBundleId={selectedBundleId} 
            bundles={bundles} 
            onWalletsChange={setLocalFilteredWallets}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 font-mono w-full h-full overflow-auto bg-zinc-950 select-none">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-4">
        <h2 className="text-cyan-400 text-xl tracking-[0.2em] uppercase">ACTIVE_BUNDLES</h2>
        {onSignOut && (
          <button onClick={onSignOut} className="text-zinc-600 hover:text-rose-500 transition-colors font-mono text-[10px] uppercase tracking-widest border border-zinc-800 px-2 py-1 bg-black/20">
            [SIGN_OUT]
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map((bundle) => {
          const bundleWallets = wallets.filter(w => w.bundle_id === bundle.id);
          const totalValue = bundleWallets.reduce((acc, w) => acc + (w.wallet_cache?.net_worth_usd || 0), 0);
          
          return (
            <div 
              key={bundle.id}
              onClick={() => setSelectedBundleId(bundle.id)}
              className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 cursor-pointer hover:border-cyan-400/40 hover:bg-zinc-800/20 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400/0 group-hover:bg-cyan-400 transition-all" />
              <div className="flex justify-between items-start mb-4">
                <EditableName 
                  initialName={bundle.name} 
                  onSave={async (newName) => {
                    const { error } = await supabase.from('bundles').update({ name: newName }).eq('id', bundle.id);
                    if (!error && onRefresh) onRefresh();
                  }}
                  className="text-zinc-200 text-lg group-hover:text-cyan-400 font-mono tracking-tight"
                />
                <span className="text-[10px] text-zinc-500 font-mono bg-black/40 px-2 py-1 rounded border border-zinc-800">
                  {bundleWallets.length} UNITS
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mb-6 font-sans tracking-wide leading-relaxed">{bundle.description || "NO_DESCRIPTION_AVAILABLE"}</p>
              <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">EST_VALUE</span>
                <span className="text-cyan-400 font-mono font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          );
        })}
        
        <div 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-zinc-900/10 border border-dashed border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400/30 hover:bg-zinc-900/20 transition-all opacity-60 hover:opacity-100 group"
        >
          <span className="text-cyan-400/40 group-hover:text-cyan-400 text-3xl mb-2 transition-colors">+</span>
          <span className="text-zinc-600 group-hover:text-zinc-400 text-[10px] font-mono tracking-widest uppercase transition-colors">INITIALIZE_NEW_BUNDLE</span>
        </div>
      </div>

      {/* Create Bundle Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 p-8 shadow-2xl">
            <h3 className="text-cyan-400 font-mono text-sm tracking-[0.2em] mb-6 uppercase">NEW_BUNDLE_INITIALIZATION</h3>
            
            <input 
              autoFocus
              type="text"
              maxLength={25}
              value={newBundleName}
              onChange={(e) => setNewBundleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newBundleName.trim() && onCreateBundle) {
                    onCreateBundle(newBundleName.trim());
                    setNewBundleName("");
                    setIsCreateModalOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setIsCreateModalOpen(false);
                  setNewBundleName("");
                }
              }}
              placeholder="BUNDLE_NAME"
              className="w-full bg-zinc-900 border border-zinc-800 p-4 text-cyan-400 font-mono text-sm focus:outline-none focus:border-cyan-400/50 mb-8 transition-all placeholder:text-zinc-700"
            />

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if (newBundleName.trim() && onCreateBundle) {
                    onCreateBundle(newBundleName.trim());
                    setNewBundleName("");
                    setIsCreateModalOpen(false);
                  }
                }}
                disabled={!newBundleName.trim()}
                className="flex-1 bg-cyan-400 text-black font-mono font-bold py-2 text-[10px] tracking-widest uppercase hover:bg-cyan-300 transition-all disabled:opacity-50"
              >
                [CONFIRM]
              </button>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewBundleName("");
                }}
                className="flex-1 bg-transparent border border-zinc-800 text-zinc-500 font-mono font-bold py-2 text-[10px] tracking-widest uppercase hover:bg-zinc-900 transition-all"
              >
                [CANCEL]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
