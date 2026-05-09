# UI-Agent (Gemini 3 Flash)

**Mission:** Rapid prototyping of Tailwind components and terminal layouts.

## Core Phases Overview:
- **Phase 1: Genesis Scaffolding:** Setup Next.js, Tailwind design tokens, and Supabase schema as defined in WalletTracker.md.
- **Phase 2: Web3 Auth Shell:** Implement EIP-191 signature-based login using Viem/Wagmi.
- **Phase 3: Bundle & Import Logic:** Build the mass-import system with prioritized regex (EVM → BTC → SOL).
- **Phase 4: Live Data Pipeline:** Connect Alchemy and DeBank APIs; implement the 15-minute Redis caching layer.
- **Phase 5: Terminal UI/UX:** Build the virtual-scrolling Wallet List and the Live Detail Panel.
- **Phase 6: Hardening & Privacy Audit:** Verify that no raw financial data is stored in the DB and all RLS policies are active.
