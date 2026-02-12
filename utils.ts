import { Token } from './types';

// Real DexScreener API interface for Pair
interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  liquidity?: {
    usd?: number;
  };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { label: string; url: string }[];
    socials?: { type: string; url: string }[];
  };
  priceChange?: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
}

// Interfaces for new endpoints
interface TokenProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
}

interface TokenBoost {
  url: string;
  chainId: string;
  tokenAddress: string;
  amount: number;
  totalAmount: number;
}

export const fetchSolanaPairs = async (): Promise<Token[]> => {
  try {
    const solanaAddresses = new Set<string>();

    // 1. Fetch Latest Token Profiles (Often new listings adding metadata)
    try {
      const profilesRes = await fetch('https://api.dexscreener.com/token-profiles/latest/v1');
      const profilesData = await profilesRes.json();
      if (Array.isArray(profilesData)) {
        profilesData.forEach((p: TokenProfile) => {
          if (p.chainId === 'solana') solanaAddresses.add(p.tokenAddress);
        });
      }
    } catch (e) {
      console.warn("Failed to fetch token profiles", e);
    }

    // 2. Fetch Latest Boosts (Trending/Active new tokens)
    try {
      const boostsRes = await fetch('https://api.dexscreener.com/token-boosts/latest/v1');
      const boostsData = await boostsRes.json();
      if (Array.isArray(boostsData)) {
        boostsData.forEach((b: TokenBoost) => {
          if (b.chainId === 'solana') solanaAddresses.add(b.tokenAddress);
        });
      }
    } catch (e) {
      console.warn("Failed to fetch token boosts", e);
    }

    // 3. Fallback to generic search if sources empty (to ensure app always shows something)
    if (solanaAddresses.size < 5) {
       try {
         const searchRes = await fetch('https://api.dexscreener.com/latest/dex/search?q=solana%20meme');
         const searchData = await searchRes.json();
         if (searchData.pairs) {
           searchData.pairs.slice(0, 10).forEach((p: DexPair) => {
             if (p.chainId === 'solana') solanaAddresses.add(p.baseToken.address);
           });
         }
       } catch (e) {}
    }

    if (solanaAddresses.size === 0) return [];

    // 4. Get Detailed Pair Data for collected addresses
    // API supports up to 30 addresses per call
    const addressesArray = Array.from(solanaAddresses).slice(0, 30).join(',');
    const pairsRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addressesArray}`);
    const pairsData = await pairsRes.json();

    if (!pairsData.pairs || !Array.isArray(pairsData.pairs)) return [];

    const now = Date.now();

    // 5. Map and Filter
    const tokens: Token[] = pairsData.pairs
      .filter((pair: DexPair) => pair.chainId === 'solana')
      .map((pair: DexPair) => {
        // Calculate Age
        const ageMinutes = pair.pairCreatedAt 
          ? Math.floor((now - pair.pairCreatedAt) / 60000)
          : 0; // If unknown, treat as 0 (brand new)

        const hasTwitter = pair.info?.socials?.some(s => s.type === 'twitter') || false;
        const hasTelegram = pair.info?.socials?.some(s => s.type === 'telegram') || false;

        return {
          address: pair.pairAddress,
          tokenAddress: pair.baseToken.address,
          ticker: `$${pair.baseToken.symbol}`,
          name: pair.baseToken.name,
          liquidity: pair.liquidity?.usd || 0,
          mcap: pair.marketCap || pair.fdv || 0,
          age_minutes: ageMinutes,
          has_twitter: hasTwitter,
          has_telegram: hasTelegram,
          image_url: pair.info?.imageUrl || 'https://via.placeholder.com/48?text=?',
          price_change_5m: pair.priceChange?.m5 || 0,
          price_usd: parseFloat(pair.priceUsd) || 0,
          url: pair.url,
          
          // Simulated fields (requires RPC)
          top_holder_pct: Math.floor(Math.random() * 30),
          mint_auth_revoked: true,
          freeze_auth_revoked: true,
        } as Token;
      })
      // Sort by Age (Newest first)
      .sort((a, b) => a.age_minutes - b.age_minutes);
      
    // Deduplicate by token address (keep most liquid pair usually, but simpler to just dedup by ticker/address)
    const uniqueTokens = tokens.filter((v, i, a) => a.findIndex(t => t.tokenAddress === v.tokenAddress) === i);
    
    return uniqueTokens;

  } catch (error) {
    console.error("Failed to fetch from DexScreener:", error);
    return [];
  }
};

export const fetchPairPrice = async (pairAddress: string): Promise<number | null> => {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
    const data = await response.json();
    if (data.pairs && data.pairs[0]) {
      return parseFloat(data.pairs[0].priceUsd);
    }
    return null;
  } catch (e) {
    return null;
  }
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD' }).format(val);
};

export const formatCompact = (val: number) => {
  return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(val);
};