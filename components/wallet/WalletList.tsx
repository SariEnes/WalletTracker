"use client";

import { BulkImportModal } from "../modals/BulkImportModal";
import React, { useRef, useState, useEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { WalletDetail } from "./WalletDetail";
import { useDebouncedUpdate, supabase } from "../../lib/hooks";
import { EditableName } from "../shared/EditableName";
import { motion, AnimatePresence } from "framer-motion";


import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown } from 'lucide-react';

export interface WalletType {
  id: string;
  address: string;
  label: string;
  bundle_id?: string;
  wallet_cache: {
    net_worth_usd: number;
    net_worth_usd_24h_ago: number;
    chains_active: string[];
    fetch_status: string;
  };
}

function SortableRow({ wallet, virtualRow, isExpanded, measureElement, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: wallet.address });

  const virtualizerStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    transform: `translateY(${virtualRow.start}px)`,
    zIndex: isDragging ? 50 : 0,
  };

  const sortableStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={measureElement} data-index={virtualRow.index} style={virtualizerStyle}>
      <div
        ref={setNodeRef}
        style={sortableStyle}
        className={`flex flex-col border-b border-zinc-800 transition-colors select-none group/row ${isDragging ? "bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.5)] z-50 relative" : isExpanded ? 'bg-zinc-900/40' : 'bg-transparent hover:bg-zinc-900/20'}`}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-0 h-[56px] w-6 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-cyan-400 opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <GripVertical size={14} />
        </div>
        {children}
      </div>
    </div>
  );
}



export function WalletList({
  wallets,
  currentBundleId,
  bundles,
  onWalletsChange,
  onRefresh
}: {
  wallets: WalletType[],
  currentBundleId?: string | null,
  bundles?: { id: string, name: string }[],
  onWalletsChange?: (wallets: WalletType[]) => void,
  onRefresh?: () => void
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<"netWorthUsd" | "date" | "manual">("netWorthUsd");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const [manualOrder, setManualOrder] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && currentBundleId) {
      const saved = localStorage.getItem(`wallet_order_${currentBundleId}`);
      if (saved) {
        try {
          setManualOrder(JSON.parse(saved));
        } catch (e) { }
      }
    }
  }, [currentBundleId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    if (isSortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSortMenuOpen]);

  const saveManualOrder = (order: string[]) => {
    setManualOrder(order);
    if (currentBundleId) {
      localStorage.setItem(`wallet_order_${currentBundleId}`, JSON.stringify(order));
    }
  };

  const [localWallets, setLocalWalletsInternal] = useState<WalletType[]>(wallets || []);

  const sortedWallets = useMemo(() => {
    return [...localWallets].sort((a, b) => {
      if (sortKey === "manual") {
        const indexA = manualOrder.indexOf(a.address);
        const indexB = manualOrder.indexOf(b.address);
        const valA = indexA === -1 ? Infinity : indexA;
        const valB = indexB === -1 ? Infinity : indexB;
        return valA - valB;
      } else if (sortKey === "netWorthUsd") {
        const aWorth = a.wallet_cache?.net_worth_usd || 0;
        const bWorth = b.wallet_cache?.net_worth_usd || 0;
        return sortOrder === "desc" ? bWorth - aWorth : aWorth - bWorth;
      } else {
        const indexA = localWallets.indexOf(a);
        const indexB = localWallets.indexOf(b);
        return sortOrder === "desc" ? indexA - indexB : indexB - indexA;
      }
    });
  }, [localWallets, sortKey, sortOrder, manualOrder]);

  useEffect(() => {
    setLocalWalletsInternal(wallets || []);
  }, [wallets]);

  const setLocalWallets = (newWallets: WalletType[] | ((prev: WalletType[]) => WalletType[])) => {
    if (typeof newWallets === 'function') {
      setLocalWalletsInternal(prev => {
        const updated = newWallets(prev);
        onWalletsChange?.(updated);
        return updated;
      });
    } else {
      setLocalWalletsInternal(newWallets);
      onWalletsChange?.(newWallets);
    }
  };

  const handleCopy = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  const handleBulkImport = async (importedWallets: { address: string, label: string }[]) => {
    const targetBundleId = currentBundleId || null;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("UNAUTHORIZED_ACCESS");

    // Filter out addresses already in the bundle
    const existingAddresses = new Set(localWallets.map(w => w.address.toLowerCase()));
    const newWallets = importedWallets.filter(w => !existingAddresses.has(w.address.toLowerCase()));

    if (newWallets.length === 0) return;

    const insertData = newWallets.map(w => ({
      address: w.address,
      label: w.label || "Unnamed_Wallet",
      bundle_id: targetBundleId,
      user_id: userData.user!.id
    }));

    const { data, error } = await supabase.from('wallets').insert(insertData).select('*, wallet_cache(*)');

    if (error) {
      console.error("Error bulk inserting wallets:", error);
      throw error;
    }

    if (data) {
      const insertedWallets = (data as any[]).map(w => ({
        ...w,
        wallet_cache: {
          ...(w.wallet_cache || {}),
          fetch_status: "pending",
          net_worth_usd: 0,
          net_worth_usd_24h_ago: 0,
          chains_active: ['EVM']
        }
      })) as WalletType[];

      setLocalWallets(prev => [...insertedWallets, ...prev]);

      if (onRefresh) {
        onRefresh();
      }

      // Trigger background sync for each new wallet
      newWallets.forEach(w => {
        fetch(`/api/wallets/${w.address}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const result = await res.json();
            setLocalWallets(prev =>
              prev.map(wallet =>
                wallet.address.toLowerCase() === w.address.toLowerCase()
                  ? {
                    ...wallet,
                    wallet_cache: {
                      ...wallet.wallet_cache,
                      fetch_status: 'synced',
                      net_worth_usd: result.data?.netWorthUsd || 0,
                      chains_active: result.data?.activeChains || ['EVM']
                    }
                  }
                  : wallet
              )
            );
          })
          .catch(err => {
            console.error(`Error syncing wallet ${w.address}:`, err);
            setLocalWallets(prev =>
              prev.map(wallet =>
                wallet.address.toLowerCase() === w.address.toLowerCase()
                  ? { ...wallet, wallet_cache: { ...wallet.wallet_cache, fetch_status: 'error' } }
                  : wallet
              )
            );
          });
      });
    }
  };

  const handleAddWallet = async (address: string, label: string, bundleId?: string) => {
    // Keep this for future single-add functionality if needed, 
    // but the [+] button now triggers bulk import.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedWallets.findIndex(w => w.address === active.id);
      const newIndex = sortedWallets.findIndex(w => w.address === over.id);

      const newOrderWallets = arrayMove(sortedWallets, oldIndex, newIndex);
      setSortKey("manual");
      saveManualOrder(newOrderWallets.map(w => w.address));
    }
  };

  const rowVirtualizer = useVirtualizer({
    count: sortedWallets?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
    getItemKey: (index) => sortedWallets[index]?.address || index,
  });

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-zinc-950 font-sans">
      <div
        ref={parentRef}
        className="flex-1 h-full overflow-auto text-zinc-100 relative z-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#27272a #09090b" }}
      >
        <div className="flex text-[10px] text-zinc-500 uppercase font-sans tracking-[0.2em] px-6 py-3 border-b border-zinc-800/50 bg-zinc-950/80 sticky top-0 z-10 items-center select-none">
          <div className="w-8">STS</div>
          <div className="w-40">ADDRESS</div>
          <div className="flex-1 pl-9">LABEL</div>

          <div className="flex items-center justify-end">
            <div className="relative inline-block mr-4" ref={sortMenuRef}>
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="flex items-center gap-2 px-2 py-1 border border-zinc-800 rounded-sm hover:bg-zinc-900 transition-all"
              >
                <span className="text-zinc-500 text-[10px] font-mono uppercase tracking-wider">
                  SORT
                </span>
                <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSortMenuOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-max min-w-[180px] bg-black border border-zinc-800 p-1 shadow-2xl">
                  <div className="flex flex-col">
                    {[
                      { label: 'MOST VALUE TO LEAST', key: 'netWorthUsd', order: 'desc' },
                      { label: 'LEAST TO MOST', key: 'netWorthUsd', order: 'asc' },
                      { label: 'NEWEST TO OLDEST', key: 'date', order: 'desc' },
                      { label: 'OLDEST TO NEWEST', key: 'date', order: 'asc' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => {
                          setSortKey(option.key as any);
                          setSortOrder(option.order as any);
                          setIsSortMenuOpen(false);
                        }}
                        className="w-full text-center px-4 py-2 text-zinc-500 text-[10px] font-mono uppercase hover:text-cyan-400 hover:bg-zinc-900/50 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-36 text-center pr-0 font-mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
              NET WORTH
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="px-3 py-1 text-cyan-400 font-mono font-bold border border-cyan-400/30 hover:bg-cyan-400/10 rounded-sm transition-colors text-[10px] tracking-widest whitespace-nowrap"
              >
                + ADD WALLET
              </button>
            </div>
          </div>
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedWallets.map(w => w.address)} strategy={verticalListSortingStrategy}>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const wallet = sortedWallets[virtualRow.index];
                const cache = wallet.wallet_cache || {};
                const netWorth = cache.net_worth_usd || 0;
                const isPending = cache.fetch_status === 'pending';
                const isError = cache.fetch_status === 'error';
                const isExpanded = selectedWallet === wallet.address;

                return (
                  <SortableRow
                    key={virtualRow.key}
                    wallet={wallet}
                    virtualRow={virtualRow}
                    isExpanded={isExpanded}
                    measureElement={rowVirtualizer.measureElement}
                  >
                    <div
                      className={`flex items-center pl-8 pr-6 h-[56px] cursor-pointer transition-all duration-300 ${isExpanded ? 'border-l-2 border-l-cyan-400 bg-zinc-900/20' : 'border-l-2 border-l-transparent'}`}
                      onClick={() => setSelectedWallet(isExpanded ? null : wallet.address)}
                    >
                      <div className="w-8">
                        {isPending ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Syncing..." />
                        ) : isError ? (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" title="Error" />
                        ) : (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" title="Synced" />
                        )}
                      </div>
                      <div className="w-40 flex items-center gap-2 group/addr">
                        <span className="truncate text-cyan-400 font-mono text-[11px] tracking-wider font-medium">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                        <button
                          onClick={(e) => handleCopy(e, wallet.address)}
                          className="opacity-0 group-hover/addr:opacity-100 transition-opacity text-zinc-600 hover:text-cyan-400 shrink-0"
                          title="Copy address"
                        >
                          {copiedAddress === wallet.address ? (
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                          )}
                        </button>
                      </div>
                      <div className="flex-1 pl-6 pr-4">
                        <EditableName
                          initialName={wallet.label || "Unnamed_Wallet"}
                          onSave={async (newName) => {
                            const { error } = await supabase.from('wallets').update({ label: newName }).eq('id', wallet.id);
                            if (error) console.error(`Failed to save label for wallet ${wallet.id}:`, error);
                          }}
                          className="font-sans text-zinc-400 hover:text-zinc-300 pointer-events-auto"
                        />
                      </div>
                      <div className="w-36 text-left font-mono text-zinc-300 text-[12px] mr-[10px] tabular-nums font-medium">${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="w-12 flex justify-end items-center">
                        <span className={`font-mono text-xs transition-all duration-300 ${isExpanded ? 'text-cyan-400 rotate-90' : 'text-zinc-600'}`}>
                          →
                        </span>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden bg-zinc-950"
                        >
                          <WalletDetail address={wallet.address} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {isBulkImportOpen && (
        <BulkImportModal
          onClose={() => setIsBulkImportOpen(false)}
          onImport={handleBulkImport}
          bundleName={bundles?.find(b => b.id === currentBundleId)?.name}
        />
      )}
    </div>
  );
}