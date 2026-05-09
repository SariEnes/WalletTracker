"use client";

import React, { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { formatAmount } from "../../lib/utils/format";
import { TokenList } from "./TokenList";
import { NftGrid } from "./NftGrid";
import { HistoryList } from "./HistoryList";

type TabType = "TOKENS" | "HISTORY" | "NFTS";
const TABS: TabType[] = ["TOKENS", "HISTORY", "NFTS"];





export function WalletDetail({ address }: { address: string }) {
  const [activeTab, setActiveTab] = useState<TabType>("TOKENS");
  const [loading, setLoading] = useState(true);
  const [typewriter, setTypewriter] = useState("");
  const [data, setData] = useState<any>(null);
  const [forceTrigger, setForceTrigger] = useState(0);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setTypewriter("");
    setData(null);

    const msg = `> SECURE CONNECTION ESTABLISHED...\n> ADDRESS: ${address}\n> FETCHING ON-CHAIN DATA...`;
    let i = 0;
    const interval = setInterval(() => {
      if (!isMounted) return;
      setTypewriter(msg.slice(0, i));
      i++;
      if (i > msg.length) clearInterval(interval);
    }, 15);

    const fetchData = async (forceSync = forceTrigger > 0) => {
      try {
        const url = forceSync ? `/api/wallets/${address}?force=true` : `/api/wallets/${address}`;
        const res = await fetch(url, { method: forceSync ? "POST" : "GET" });
        if (!res.ok && !forceSync) {
            return fetchData(true);
        } else if (!res.ok) {
            throw new Error("Fetch failed");
        }
        const json = await res.json();
        
        if (!forceSync && (!json?.data?.tokens || !json?.data?.history)) {
           if (isMounted) setTypewriter("> CACHE_MISS_DETECTED: FORCING_DEEP_SYNC...\n> RE-QUERYING_NODES...");
           return fetchData(true);
        }

        if (isMounted) {
          setData(json);
          setLoading(false);
          clearInterval(interval);
        }
      } catch (err) {
        if (isMounted) {
          setTypewriter("> ERROR: FAILED TO FETCH ON-CHAIN DATA");
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [address, forceTrigger]);



  return (
    <div 
      ref={parentRef}
      className="flex flex-col w-full bg-zinc-950/80 border-t border-zinc-800/50 font-sans text-zinc-100 max-h-[400px] overflow-y-auto"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a transparent" }}
    >
      <div 
        className="sticky top-0 z-40 bg-black/95 backdrop-blur-md flex justify-between items-end px-4 pt-3 pb-0 border-b border-zinc-800 shadow-md pointer-events-none"
        style={{ transform: "translateZ(0)" }}
      >
        <div className="flex text-[10px] tracking-wide font-sans space-x-6 pointer-events-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
              className={`pb-2 transition-colors uppercase ${
                activeTab === tab 
                  ? 'border-b-2 border-cyan-400 text-cyan-400 font-bold' 
                  : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="pb-1.5 pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); setForceTrigger(prev => prev + 1); }}
            disabled={loading}
            className="text-[9px] text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded hover:bg-cyan-400/10 transition-colors disabled:opacity-50 tracking-widest uppercase font-mono bg-black/50"
          >
            [ REFRESH ]
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col">
            <div className="whitespace-pre-line text-xs font-mono text-cyan-400 mb-6 leading-relaxed">
              {typewriter}
              <span className="animate-pulse">_</span>
            </div>
            
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 items-center border border-zinc-800/50 rounded-lg p-3 bg-zinc-900/20">
                  <div className="w-8 h-8 bg-zinc-800/50 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-zinc-800/50 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs">
            {activeTab === "TOKENS" && (
              <TokenList tokens={data?.data?.tokens} />
            )}
            
            {activeTab === "NFTS" && (
              <NftGrid nfts={data?.data?.nfts} parentRef={parentRef} />
            )}
            
            {activeTab === "HISTORY" && (
              <HistoryList history={data?.data?.history} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
