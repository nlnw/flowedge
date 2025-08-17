FlipFlow is a tiny onchain coin‑flip dapp for Flow EVM Testnet. Connect your wallet, submit a flip transaction, and watch the global flip counter update. Hover over the counter to preview the last five flips, and jump to Flowscan to inspect your latest transaction. The app is a lightweight React + TypeScript frontend with modern wallet UX and zero backend.

Contracts deployed on testnet:

- https://evm-testnet.flowscan.io/address/0x1A9f9374F3f56e60B6CadEeEb2C34f991E5A507B?tab=contract

Key features:

- Wallet connect via ConnectKit/Wagmi; button reflects connection state.
- One‑click onchain action (flipCoin) with loading states and disabled UI until connected.
- Live reads for total flip count; hover tooltip shows the last five outcomes.
- Direct links to Flowscan for both the contract and your last transaction.

How it’s made

Frontend

- React + TypeScript single‑page app; entry at frontend.tsx renders App into #root with HMR via import.meta.hot.
- Styling in index.css (glassmorphism card, gradient branding, animated logo, accessible states).
- Components: App.tsx (main UI/logic), optional APITester.tsx (simple fetch tester; not mounted).

Wallets and chain

- Wagmi + ConnectKit providers wrap the app; configured for flowTestnet.
- WalletConnect project ID is set via getDefaultConfig, exposing modern wallet UX.

Onchain integration (viem)

- Public client: createPublicClient({ chain: flowTestnet, transport: http }) for reads.
- Wallet client: createWalletClient({ chain: flowTestnet, transport: custom(window.ethereum) }) for writes.
- Reads: getFlipCount and paged getFlipResults(startIndex, count) for the hover tooltip (last five flips).
- Write: flipCoin, then waitForTransactionReceipt and refresh counter.
- Post‑tx UX: “View last tx” link to Flowscan; contract address link shown as a short pill.

State and UX details

- React state hooks drive flipping/loading/tooltip states; button disabled when not connected or during tx.
- Defensive checks for account presence; errors logged to console.
- QueryClient from @tanstack/react-query is initialized for future caching, though reads are direct via viem.

Assets and types

- SVG assets (logo.svg, react.svg) with a module declaration in svg.d.ts.
- HTML shell (src/index.html) titled “Bun + React” and loads the module entry directly.

Notable bits

- Minimal, backend‑free architecture; everything happens client‑side.
- Simple, readable ABI embedded in App.tsx for the coin‑flip contract.
- Small UX flourish: hover tooltip with compact “Heads/Tails” pills and indices.
