import { Redis } from '@upstash/redis';
import { formatUnits } from 'viem';

const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

export interface WalletData {
  address: string;
  netWorthUsd: number;
  tokens: any[];
  tokenCount: number;
  activeChains: string[];
  history: any[];
  nfts: any[];
}

export async function fetchWalletData(address: string, force: boolean = false): Promise<{ data: WalletData, cached: boolean }> {
  const cacheKey = `wallet:multichain:${address.toLowerCase()}`;
  
  if (redis && !force) {
    const cachedData = await redis.get<WalletData>(cacheKey);
    if (cachedData) return { data: cachedData, cached: true };
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY;
  if (!alchemyKey) throw new Error("Missing ALCHEMY_API_KEY");

  const chains = [
    { name: "Ethereum", url: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`, nativeSymbol: "ethereum" },
    { name: "Polygon", url: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`, nativeSymbol: "matic-network" },
    { name: "Arbitrum", url: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`, nativeSymbol: "ethereum" }, 
    { name: "Base", url: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`, nativeSymbol: "ethereum" }, 
  ];

  let prices: Record<string, number> = { ethereum: 0, "matic-network": 0, "usd-coin": 1, tether: 1, "wrapped-bitcoin": 0 };
  let pricesFetched = true;
  try {
    const priceRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network,polygon-ecosystem-token,usd-coin,tether,wrapped-bitcoin&vs_currencies=usd",
      { cache: "no-store" }
    );
    if (!priceRes.ok) throw new Error("CoinGecko API Error");
    const priceData = await priceRes.json();
    prices.ethereum = priceData?.ethereum?.usd || 0;
    // CoinGecko transitioned MATIC to polygon-ecosystem-token
    prices["matic-network"] = priceData?.["polygon-ecosystem-token"]?.usd || priceData?.["matic-network"]?.usd || 0;
    prices["usd-coin"] = priceData?.["usd-coin"]?.usd || 1;
    prices.tether = priceData?.tether?.usd || 1;
    prices["wrapped-bitcoin"] = priceData?.["wrapped-bitcoin"]?.usd || 0;
  } catch (error) {
    console.error("Error fetching prices:", error);
    pricesFetched = false;
  }

  let totalNetWorthUsd = 0;
  let allTokens: any[] = [];
  let allHistory: any[] = [];
  let allNfts: any[] = [];
  let activeChains = new Set<string>();

  const chainPromises = chains.map(async ({ name, url, nativeSymbol }) => {
    let chainNetWorth = 0;
    let chainTokens: any[] = [];
    let chainHistory: any[] = [];
    let chainNfts: any[] = [];
    let hasBalance = false;

    const rpcCall = async (method: string, params: any[]) => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
      });
      if (!res.ok) {
         throw new Error(`HTTP Error ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
         throw new Error(`RPC Error: ${data.error.message}`);
      }
      return data.result;
    };

    // A. Fetch native balance safely
    try {
      const rawBalance = await rpcCall("eth_getBalance", [address, "latest"]);
      const balanceWei = BigInt(rawBalance);
      const nativeBalance = Number(balanceWei) / 1e18;
      
      if (nativeBalance > 0) {
        const valueUsd = nativeBalance * (prices[nativeSymbol] || 0);
        chainNetWorth += valueUsd;
        hasBalance = true;

        let displaySymbol = "ETH";
        if (name === "Polygon") displaySymbol = "MATIC";

        if (displaySymbol === "MATIC") {
          console.log("[DEBUG] MATIC Balance:", nativeBalance, "Price:", prices[nativeSymbol] || 0);
        }

        chainTokens.push({
          chain: name,
          contractAddress: "0x0000000000000000000000000000000000000000",
          symbol: displaySymbol,
          name: name + " Native",
          amount: nativeBalance,
          valueUsd,
          priceUsd: prices[nativeSymbol] || 0,
          isSpam: false
        });
      }
    } catch (err: any) {
      console.error(`Alchemy getBalance error on ${name}:`, err);
      if (err.message?.includes("401") || err.message?.includes("429")) throw err;
    }

    // B. Fetch ERC-20 Tokens safely
    try {
      const tokenBalancesObj = await rpcCall("alchemy_getTokenBalances", [address]);
      const nonZeroTokens = tokenBalancesObj?.tokenBalances?.filter(
        (token: any) => token.tokenBalance !== "0" && token.tokenBalance !== "0x0"
      ) || [];

      const topTokens = nonZeroTokens.slice(0, 50);

      const resolvedTokens: any[] = [];
      const CHUNK_SIZE = 10;
      
      for (let i = 0; i < topTokens.length; i += CHUNK_SIZE) {
        const chunk = topTokens.slice(i, i + CHUNK_SIZE);
        
        const tokenPromises = chunk.map(async (token: any) => {
          const rawBalanceHex = token.tokenBalance || "0x0";
          const rawBalanceBigInt = BigInt(rawBalanceHex === "0x" ? "0x0" : rawBalanceHex);
          if (rawBalanceBigInt <= 0n) return null;

          const metadata = await rpcCall("alchemy_getTokenMetadata", [token.contractAddress]);
          
          const decimals = metadata?.decimals ?? 18;
          const tokenAmount = Number(formatUnits(rawBalanceBigInt, decimals));

          if (tokenAmount <= 0 || isNaN(tokenAmount) || !isFinite(tokenAmount)) return null;
          
          const symbol = metadata?.symbol?.toUpperCase() || "UNKNOWN";
          const tokenName = metadata?.name || "Unknown Token";
          
          const spamRegex = /(http|\.com|visit|claim|\.org)/i;
          let isSpam = spamRegex.test(symbol) || spamRegex.test(tokenName);

          let tokenPrice = 0;
          
          if (token.contractAddress === "0x0000000000000000000000000000000000000000" || symbol === "MATIC" || symbol === "WMATIC") {
            tokenPrice = prices["matic-network"] || 0;
          } else if (symbol === "USDC") tokenPrice = prices["usd-coin"] || 0;
          else if (symbol === "USDT") tokenPrice = prices.tether || 0;
          else if (symbol === "WBTC") tokenPrice = prices["wrapped-bitcoin"] || 0;
          else if (symbol === "WETH" || symbol === "ETH") tokenPrice = prices.ethereum || 0;
          
          if (tokenPrice === 0) {
            tokenPrice = prices[symbol.toLowerCase()] || 0;
          }

          const valueUsd = tokenAmount * tokenPrice;
          
          if (symbol === "MATIC" || symbol === "WMATIC" || token.contractAddress === "0x0000000000000000000000000000000000000000") {
             console.log("[DEBUG] ERC20 MATIC/WMATIC Amount:", tokenAmount, "Price:", tokenPrice);
          }
          
          // Aggressively flag any non-native token worth less than $0.01 as spam
          if (pricesFetched && valueUsd < 0.01) {
            isSpam = true;
          }

          return {
            chain: name,
            contractAddress: token.contractAddress,
            symbol: metadata?.symbol || "UNKNOWN",
            name: tokenName,
            amount: tokenAmount,
            valueUsd,
            priceUsd: tokenPrice,
            isSpam
          };
        });

        const chunkResults = await Promise.allSettled(tokenPromises);
        
        for (const res of chunkResults) {
          if (res.status === 'fulfilled' && res.value) {
            resolvedTokens.push(res.value);
          } else if (res.status === 'rejected') {
            console.error(`Error in metadata chunk fetch on ${name}:`, res.reason);
          }
        }
      }
      
      for (const t of resolvedTokens) {
        if (t.amount > 0) hasBalance = true;
        chainNetWorth += t.valueUsd;
        chainTokens.push(t);
      }
      console.log(`[${name}] Tokens found:`, chainTokens.length);
    } catch (err: any) {
      console.error(`Alchemy getTokenBalances error on ${name}:`, err);
      if (err.message?.includes("401") || err.message?.includes("429")) throw err;
    }

    // C. Fetch Asset Transfers (History) safely
    try {
      const fetchTransfers = async (isOut: boolean) => {
        const payload: any = {
          fromBlock: "0x0",
          toBlock: "latest",
          excludeZeroValue: true,
          category: ["external", "erc20", "erc721", "erc1155", "specialnft"],
          maxCount: "0x32", // 50 per direction
          withMetadata: true,
          order: "desc",
        };
        if (isOut) {
          payload.fromAddress = address;
        } else {
          payload.toAddress = address;
        }
        const result = await rpcCall("alchemy_getAssetTransfers", [payload]);
        console.log(`[${name}] Raw API Response (${isOut ? "OUT" : "IN"}):`, JSON.stringify(result).slice(0, 500));
        return result;
      };

      const [inbound, outbound] = await Promise.all([
        fetchTransfers(false),
        fetchTransfers(true)
      ]);

      const formatTransfer = (tx: any, type: "IN" | "OUT") => ({
        chain: name,
        type,
        asset: tx.asset || "UNKNOWN",
        amount: tx.value || 0,
        from: tx.from,
        to: tx.to,
        hash: tx.hash,
        timestamp: tx.metadata?.blockTimestamp || new Date().toISOString(),
      });

      if (inbound?.transfers) {
        chainHistory.push(...inbound.transfers.map((tx: any) => formatTransfer(tx, "IN")));
      }
      if (outbound?.transfers) {
        chainHistory.push(...outbound.transfers.map((tx: any) => formatTransfer(tx, "OUT")));
      }
      
      console.log(`[${name}] History found (IN):`, inbound?.transfers?.length || 0);
      console.log(`[${name}] History found (OUT):`, outbound?.transfers?.length || 0);
    } catch (err: any) {
      console.error(`Alchemy getAssetTransfers error on ${name}:`, err);
      if (err.message?.includes("401") || err.message?.includes("429")) throw err;
    }

    // D. Fetch NFTs via Alchemy NFT REST API (v3)
    try {
      // Build the correct Alchemy NFT API base URL from the chain name, not URL transform
      const nftBaseUrls: Record<string, string> = {
        "Ethereum": `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyKey}`,
        "Polygon":  `https://polygon-mainnet.g.alchemy.com/nft/v3/${alchemyKey}`,
        "Arbitrum": `https://arb-mainnet.g.alchemy.com/nft/v3/${alchemyKey}`,
        "Base":     `https://base-mainnet.g.alchemy.com/nft/v3/${alchemyKey}`,
      };
      const nftBase = nftBaseUrls[name];

      if (!nftBase) {
        console.warn(`[NFT][${name}] No NFT base URL defined for this chain, skipping.`);
      } else {
        // Filters DISABLED intentionally for debug — re-enable after verifying data flows through
        const nftEndpoint = `${nftBase}/getNFTsForOwner?owner=${encodeURIComponent(address)}&pageSize=50&withMetadata=true&orderBy=transferTime`;
        console.log(`[NFT][${name}] Fetching: ${nftEndpoint}`);

        const nftRes = await fetch(nftEndpoint, {
          headers: { accept: "application/json" },
          cache: "no-store",
        });

        console.log(`[NFT][${name}] HTTP status:`, nftRes.status, nftRes.statusText);

        if (!nftRes.ok) {
          const errText = await nftRes.text();
          console.error(`[NFT][${name}] Non-OK response body:`, errText.slice(0, 300));
        } else {
          const nftData = await nftRes.json();
          console.log(`[NFT][${name}] RAW DATA — totalCount: ${nftData?.totalCount}, ownedNfts length: ${nftData?.ownedNfts?.length}`);
          console.log(`[NFT][${name}] RAW DATA (first item sample):`, JSON.stringify(nftData?.ownedNfts?.[0]).slice(0, 400));

          const owned = nftData?.ownedNfts || [];

          if (owned.length === 0) {
            console.warn(`[NFT][${name}] API returned 0 NFTs (totalCount=${nftData?.totalCount}). Wallet may genuinely hold no NFTs on this chain.`);
          }

          // ── NUCLEAR SPAM FILTER ──────────────────────────────────────────────
          const SPAM_KEYWORDS = [
            "claim", "voucher", "winner", "reward", "airdrop",
            "$", "free", "gift", "visit", "link", "http", "www",
            ".com", ".io", ".xyz", "coupon", "promo", "bonus",
          ];
          const SCAM_IMAGE_PATTERNS = [
            "ipfs://bafybeig",  // common scam placeholder
            "data:image/svg",   // inline SVG spam
          ];
          const SAFE_STATUSES = ["verified", "approved"];

          const hiddenNames: string[] = [];

          const isNftSpam = (nft: any): boolean => {
            // Layer 1: Alchemy's own spam flag
            if (nft.spamInfo?.isSpam === true) return true;

            // Layer 2: Exclusion-based safelist status (hide explicitly disabled/spam)
            const safelistStatus = nft.contract?.openSeaMetadata?.safelistStatus?.toLowerCase() || "";
            if (["disabled", "not_requested", "requested"].includes(safelistStatus)) {
              return true;
            }

            // Layer 3: Keyword scan on name + description + collection
            const haystack = [
              nft.name || "",
              nft.description || "",
              nft.contract?.name || "",
              nft.contract?.openSeaMetadata?.collectionName || "",
            ].join(" ").toLowerCase();

            for (const kw of SPAM_KEYWORDS) {
              if (haystack.includes(kw.toLowerCase())) return true;
            }

            // Layer 4: Scam image pattern check
            let img = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || nft.rawMetadata?.image || "";
            if (typeof img !== "string") img = "";
            for (const pat of SCAM_IMAGE_PATTERNS) {
              if (img.includes(pat)) return true;
            }

            return false;
          };

          const spamCount = owned.filter(isNftSpam).length;
          console.log(`[NFT][${name}] Mapped ${owned.length} NFT(s) total (${spamCount} flagged as spam).`);

          chainNfts.push(...owned.map((nft: any) => ({
            chain: name,
            contractAddress: nft.contract?.address || "",
            tokenId: nft.tokenId || nft.id?.tokenId || "",
            name: nft.name || nft.contract?.name || "Unknown NFT",
            collection: nft.contract?.name || nft.contract?.openSeaMetadata?.collectionName || "Unknown Collection",
            image: (() => {
              let rawUrl = nft.image?.cachedUrl || nft.image?.thumbnailUrl || nft.image?.originalUrl || nft.rawMetadata?.image || nft.media?.[0]?.gateway || null;
              if (typeof rawUrl !== "string") return null;
              if (rawUrl.startsWith("ipfs://")) {
                return rawUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
              }
              return rawUrl;
            })(),
            tokenType: nft.contract?.tokenType || "ERC721",
            isSpam: isNftSpam(nft),
            safelistStatus: nft.contract?.openSeaMetadata?.safelistStatus || "",
            spamClassifications: nft.contract?.spamClassifications || [],
            floorPrice: nft.contract?.openSeaMetadata?.floorPrice || nft.contract?.openSea?.floorPrice || nft.contractMetadata?.openSea?.floorPrice || 0,
            raw: nft
          })));
          // ─────────────────────────────────────────────────────────────────────

          console.log(`[NFT][${name}] Mapped ${chainNfts.length} NFT(s) total (including spam, filters OFF).`);
        }
      }
    } catch (err: any) {
      console.error(`[NFT][${name}] Exception during fetch:`, err?.message || err);
    }

    return { name, hasBalance, netWorth: chainNetWorth, tokens: chainTokens, history: chainHistory, nfts: chainNfts };
  });

  const results = await Promise.allSettled(chainPromises);

  for (const result of results) {
    if (result.status === "rejected") {
      const err = result.reason;
      if (err.message?.includes("401") || err.message?.includes("429")) {
        throw new Error("Alchemy API Authentication/Rate Limit Error");
      }
    } else if (result.status === "fulfilled") {
      const { name, hasBalance, netWorth, tokens, history, nfts } = result.value;
      if (hasBalance) {
        activeChains.add(name);
      }
      totalNetWorthUsd += netWorth;
      allTokens.push(...tokens);
      allHistory.push(...history);
      allNfts.push(...nfts);
    }
  }

  allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  // Keep up to 100 most recent transactions across all chains
  allHistory = allHistory.slice(0, 100);
  console.log("[data-provider] Total history entries after merge:", allHistory.length);

  allTokens.sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

  const walletData: WalletData = {
    address,
    netWorthUsd: totalNetWorthUsd,
    tokens: allTokens,
    tokenCount: allTokens.length,
    activeChains: Array.from(activeChains),
    history: allHistory,
    nfts: allNfts,
  };

  let safeWalletData = walletData;
  try {
    // Strip any lingering BigInts before caching or client serialization
    safeWalletData = JSON.parse(JSON.stringify(walletData, (_, v) => typeof v === 'bigint' ? v.toString() : v));
  } catch (err) {
    console.error("Error serializing wallet data:", err);
  }

  if (redis) {
    try {
      await redis.set(cacheKey, safeWalletData, { ex: 900 });
    } catch (redisErr) {
      console.error("Error writing to Redis cache:", redisErr);
      // Proceed without caching if Redis fails
    }
  }

  return { data: safeWalletData, cached: false };
}
