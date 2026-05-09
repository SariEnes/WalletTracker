# Project Roadmap: Vibe Wallet Tracker

**Status:** Phase 1

## Phase 1: Genesis Scaffolding
**Technical Tasks:**
- [x] 1. Initialize Next.js 14 project with Tailwind CSS and strict TypeScript configurations.
- [x] 2. Define Tailwind design tokens for the "Digital Terminal" vibe (deep blacks, JetBrains Mono font, high-contrast neon accents).
- [x] 3. Set up the Supabase database schema with initial tables and prepare migration files as outlined in WalletTracker.md.

## Phase 2: Web3 Auth Shell [IN-PROGRESS]
- [x] Task 2.2: Build the `api/auth/wallet-nonce` route to generate EIP-191 challenge strings.
- [x] Task 2.3: Build the `api/auth/wallet-verify` route for signature validation and Supabase session creation.
- [x] Task 2.4: Build the Terminal-style Login UI using the `useConnect` and `useSignMessage` hooks from Wagmi.

## Phase 3: Bundle & Import Logic [IN-PROGRESS]
- [x] Task 3.1: Build NewBundleModal with Mass-Import logic[cite: 4].
- [x] Task 3.2: Implement Prioritized Regex (EVM > BTC > SOL)[cite: 4].
- [x] Task 3.3: Build api/bundles POST route for batch insertion[cite: 4].

## Phase 4: Live Data Pipeline [IN-PROGRESS]
- [x] Task 4.1: Build `lib/api/data-provider.ts` and `prices.ts` with Upstash Redis TTL.
- [x] Task 4.2: Scaffold Supabase Edge Function (`sync-bundle/index.ts`).
- [x] Task 4.3: Wire `useWallets` Realtime Hook.
## Phase 5: Terminal UI/UX [IN-PROGRESS]
- [x] Task 5.1: Build `WalletList.tsx` using `@tanstack/react-virtual`.
- [x] Task 5.2: Build 5-tab `WalletDetail.tsx` panel with Shimmers and Typewriter UX.
- [x] Task 5.3: Implement `GET /api/wallets/[address]` incorporating Redis cache.
## Phase 6: Hardening & Privacy Audit [IN-PROGRESS]
- [x] Task 6.1: Run Data Leak Audit across INSERTS/UPSERTS.
- [x] Task 6.2: Build Error Boundaries for terminal components.
- [x] Task 6.3: Implement Privacy Policy Page.
- [x] Task 6.4: Activate pg_cron for secure nonce rotation.
