import React, { useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const NftMedia = ({ nft }: { nft: any }) => {
  const [loadTime, setLoadTime] = useState(Date.now());

  useEffect(() => {
    setLoadTime(Date.now());
  }, [nft]);

  const handleLoad = () => {
    const timeTaken = Date.now() - loadTime;
    if (timeTaken > 3000) {
      console.log(`[Heavy NFT] Loaded in ${timeTaken}ms: ${nft.name} (${nft.contractAddress})`);
    }
  };

  const src = nft.thumbnail || nft.small || nft.image;
  if (!src) {
    return <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700 font-mono text-xl uppercase">?</div>;
  }

  const isVideoOrHeavy = src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.gif') || src.endsWith('.svg');

  if (isVideoOrHeavy) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 font-mono text-[10px] uppercase group-hover:scale-105 transition-transform duration-300 relative z-10 border border-zinc-800">
        [HEAVY_MEDIA_BLOCKED]
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={nft.name}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 relative z-10"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        onLoad={handleLoad}
      />
      <div className="absolute inset-0 z-0 bg-zinc-900 flex items-center justify-center text-zinc-700 font-mono text-xl">?</div>
    </>
  );
};

const NftCard = React.memo(({ nft, uniqueId, showHiddenMode, onHide, onUnhide }: any) => {
  const osChain = nft.chain ? (nft.chain.toLowerCase() === "polygon" ? "matic" : nft.chain.toLowerCase()) : "ethereum";
  const osUrl = `https://opensea.io/assets/${osChain}/${nft.contractAddress}/${nft.tokenId}`;
  const blurUrl = `https://blur.io/asset/${nft.contractAddress}/${nft.tokenId}`;

  let priceVal = nft.floorPrice || nft.raw?.contract?.openSeaMetadata?.floorPrice || nft.raw?.contract?.openSea?.floorPrice || nft.raw?.contractMetadata?.openSea?.floorPrice || nft.raw?.floorPrice || nft.raw?.price || null;
  let displayPrice = "-";
  if (priceVal && priceVal > 0) {
    displayPrice = `${priceVal.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${nft.chain?.toLowerCase() === 'polygon' ? 'MATIC' : 'ETH'}`;
  }

  return (
    <div 
      className="flex flex-col border border-zinc-800/50 rounded-lg overflow-hidden bg-zinc-900/20 hover:bg-zinc-800/40 transition-colors group transform-gpu"
      style={{ willChange: "transform", transform: "translateZ(0)", contentVisibility: "auto" }}
    >
      <div className={`aspect-square bg-zinc-900 relative overflow-hidden ${showHiddenMode ? 'opacity-50 grayscale' : ''}`}>
        <NftMedia nft={nft} />
        <div className="absolute top-1 right-1 z-20">
          <span className="bg-black/70 text-zinc-400 font-mono text-[7px] px-1 py-0.5 rounded-sm uppercase">{nft.chain || "EVM"}</span>
        </div>
      </div>
      <div className="p-1.5 flex flex-col gap-0.5">
        <div className="text-zinc-300 font-mono text-[9px] truncate">{nft.name}</div>
        <div className="text-zinc-600 font-mono text-[8px] truncate">{nft.collection}</div>
        
        <div className="flex gap-1 text-[10px] text-cyan-400 font-mono uppercase truncate mt-0.5 items-center min-h-[14px]">
          {displayPrice !== "-" ? (
            <span>{displayPrice}</span>
          ) : (
            <span className="text-zinc-600">-</span>
          )}
        </div>

        <div className="flex gap-1.5 mt-1.5">
          <a
            href={osUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[8px] text-zinc-500 hover:text-cyan-400 font-mono border border-zinc-800 px-1 py-0.5 hover:bg-zinc-900 transition-colors rounded-sm flex-1 text-center uppercase"
          >
            OpenSea
          </a>
          {nft.chain?.toLowerCase() !== "polygon" && (
            <a
              href={blurUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[8px] text-zinc-500 hover:text-blue-400 font-mono border border-zinc-800 px-1 py-0.5 hover:bg-zinc-900 transition-colors rounded-sm flex-1 text-center uppercase"
            >
              Blur
            </a>
          )}
        </div>
        
        {showHiddenMode ? (
          <button
            onClick={(e) => { e.stopPropagation(); onUnhide(uniqueId); }}
            className="mt-1 w-full text-[8px] text-cyan-500 hover:text-cyan-400 border border-cyan-900/50 hover:border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-900/40 transition-all uppercase font-mono py-0.5 rounded-sm flex items-center justify-center gap-1"
          >
            [ UNHIDE ]
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onHide(uniqueId); }}
            className="mt-1 w-full text-[8px] text-zinc-600 hover:text-white border border-transparent hover:border-rose-500 bg-transparent hover:bg-rose-500 transition-colors uppercase font-mono py-0.5 rounded-sm"
          >
            [ HIDE ]
          </button>
        )}
      </div>
    </div>
  );
});

export function NftGrid({ nfts, parentRef }: { nfts: any[], parentRef: React.RefObject<HTMLDivElement> }) {
  const [hiddenNfts, setHiddenNfts] = useState<string[]>([]);
  const [showHiddenMode, setShowHiddenMode] = useState(false);
  const [columns, setColumns] = useState(6);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 640) setColumns(2);
      else if (window.innerWidth < 768) setColumns(4);
      else if (window.innerWidth < 1024) setColumns(5);
      else setColumns(6);
    };
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hidden_nfts");
      if (stored) setHiddenNfts(JSON.parse(stored));
    } catch {}
  }, []);

  const hideNft = (id: string) => {
    const updated = [...hiddenNfts, id];
    setHiddenNfts(updated);
    localStorage.setItem("hidden_nfts", JSON.stringify(updated));
  };

  const unhideNft = (id: string) => {
    const updated = hiddenNfts.filter(hiddenId => hiddenId !== id);
    setHiddenNfts(updated);
    localStorage.setItem("hidden_nfts", JSON.stringify(updated));
  };

  const filteredNfts = React.useMemo(() => {
    const rawNfts = nfts || [];
    return rawNfts.filter((nft: any) => {
      const uniqueId = `${nft.chain}-${nft.contractAddress}-${nft.tokenId}`;
      const isHidden = hiddenNfts.includes(uniqueId);
      return showHiddenMode ? isHidden : !isHidden;
    });
  }, [nfts, hiddenNfts, showHiddenMode]);

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredNfts.length / columns),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 2,
  });

  useEffect(() => {
    if (nfts && nfts.length > 0) {
      console.log("NFT Data Sample:", nfts[0]);
    }
  }, [nfts]);

  return (
    <div className="mt-2">
      <div className="flex justify-between items-end mb-4 border-b border-zinc-800/50 pb-2">
        <h4 className="text-zinc-500 font-sans uppercase tracking-wide text-[10px]">
          NFT COLLECTION {showHiddenMode ? "(HIDDEN)" : "(ALL)"}
        </h4>
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowHiddenMode(!showHiddenMode); }}
            className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border transition-colors ${showHiddenMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300'}`}
          >
            {showHiddenMode ? "[ SHOW GALLERY ]" : "[ SHOW HIDDEN ]"}
          </button>
          <span className="text-zinc-600 font-mono text-[10px]">{filteredNfts.length} ASSET{filteredNfts.length !== 1 ? "S" : ""}</span>
        </div>
      </div>

      {filteredNfts.length === 0 ? (
        <div className="text-zinc-600 border border-zinc-800/50 bg-zinc-900/20 rounded-lg p-3 font-mono tracking-widest text-[10px] text-center py-8">
          {showHiddenMode ? "NO_HIDDEN_ASSETS_FOUND" : "NO_NFTS_FOUND"}
        </div>
      ) : (
        <div 
          style={{ 
            height: `${rowVirtualizer.getTotalSize()}px`, 
            width: "100%", 
            position: "relative" 
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const startIndex = virtualRow.index * columns;
            const rowNfts = filteredNfts.slice(startIndex, startIndex + columns);
            
            return (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className="absolute top-0 left-0 w-full grid gap-2"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {rowNfts.map((nft: any) => {
                  const uniqueId = `${nft.chain}-${nft.contractAddress}-${nft.tokenId}`;
                  return (
                    <NftCard
                      key={uniqueId}
                      nft={nft}
                      uniqueId={uniqueId}
                      showHiddenMode={showHiddenMode}
                      onHide={hideNft}
                      onUnhide={unhideNft}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
