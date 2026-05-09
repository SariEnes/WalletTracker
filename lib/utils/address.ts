export interface ParsedAddress {
  address: string;
  chain_type: "evm" | "bitcoin" | "solana" | "stellar";
}

export function parseWalletAddresses(text: string): ParsedAddress[] {
  // 1. EVM: 0x followed by 40 hex characters (case-insensitive)
  const evmMatches = text.match(/0x[a-fA-F0-9]{40}/gi) || [];
  
  // 2. Bitcoin (P2PKH, P2SH, Bech32)
  const btcMatches = text.match(/\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[q|p][a-z0-9]{39,59})\b/g) || [];

  // 3. Stellar: G followed by 55 base32 characters (case-insensitive)
  const stellarMatches = text.match(/G[a-zA-Z2-7]{55}/gi) || [];
  
  // 4. Solana: 32-44 base58 characters (case-sensitive)
  const solanaMatches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g) || [];

  let allMatches: ParsedAddress[] = [
    ...evmMatches.map(addr => ({ address: addr, chain_type: "evm" as const })),
    ...btcMatches.map(addr => ({ address: addr, chain_type: "bitcoin" as const })),
    ...stellarMatches.map(addr => ({ address: addr, chain_type: "stellar" as const })),
    ...solanaMatches.map(addr => ({ address: addr, chain_type: "solana" as const }))
  ];

  // Filter out Solana matches that are just substrings of EVM/Stellar/BTC matches
  allMatches = allMatches.filter(item => {
    if (item.chain_type !== "solana") return true;
    const isSubstring = allMatches.some(
      other => other.chain_type !== "solana" && other.address.includes(item.address)
    );
    return !isSubstring;
  });

  // Remove duplicates
  const uniqueMap = new Map<string, ParsedAddress>();
  allMatches.forEach(item => {
    const key = item.address.toLowerCase();
    if (!uniqueMap.has(key)) {
      if (item.chain_type === "stellar") {
        uniqueMap.set(key, { ...item, address: item.address.toUpperCase() });
      } else {
        uniqueMap.set(key, item);
      }
    }
  });

  return Array.from(uniqueMap.values());
}

export function isValidEVMAddress(address: string): boolean {
  return /^(0x)?[0-9a-fA-F]{40}$/.test(address);
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(address);
}

export function isValidAddress(address: string): boolean {
  return isValidEVMAddress(address) || isValidSolanaAddress(address) || isValidStellarAddress(address);
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

