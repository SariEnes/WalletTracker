import { Redis } from '@upstash/redis';

// Utilize Upstash Redis globally if configured; fallback to memory for local testing
const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
}) : null;

const memCache = new Map<string, { price: number, expiresAt: number }>();

export async function getNativePrice(symbol: string): Promise<number> {
  const normalizedSymbol = symbol.toLowerCase();
  const cacheKey = `price:${normalizedSymbol}`;
  
  if (redis) {
    const cachedPrice = await redis.get<number>(cacheKey);
    if (cachedPrice) return cachedPrice;
  } else {
    if (memCache.has(normalizedSymbol)) {
      const cached = memCache.get(normalizedSymbol)!;
      if (Date.now() < cached.expiresAt) return cached.price;
    }
  }

  try {
    // Primary Source: CoinGecko Free Tier
    const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${normalizedSymbol}&vs_currencies=usd`);
    if (cgRes.ok) {
      const data = await cgRes.json();
      if (data[normalizedSymbol]?.usd) {
        const price = data[normalizedSymbol].usd;
        if (redis) await redis.set(cacheKey, price, { ex: 300 }); // 5 minute TTL
        else memCache.set(normalizedSymbol, { price, expiresAt: Date.now() + 300 * 1000 });
        return price;
      }
    }
    
    // Fallback Source: CoinMarketCap
    if (process.env.COINMARKETCAP_API_KEY) {
      const cmcRes = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${normalizedSymbol.toUpperCase()}`, {
        headers: { 'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY }
      });
      if (cmcRes.ok) {
        const data = await cmcRes.json();
        const price = data.data[normalizedSymbol.toUpperCase()]?.quote?.USD?.price;
        if (price) {
          if (redis) await redis.set(cacheKey, price, { ex: 300 });
          else memCache.set(normalizedSymbol, { price, expiresAt: Date.now() + 300 * 1000 });
          return price;
        }
      }
    }
  } catch (error) {
    console.error("Price fetch error:", error);
  }

  return 0; // Return 0 as fallback to prevent UI crash
}
