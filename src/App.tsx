import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ConnectKitButton,
  ConnectKitProvider,
  getDefaultConfig,
} from "connectkit";
import { useEffect, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http as viemHttp,
} from "viem";
import { createConfig, http, useAccount, WagmiProvider } from "wagmi";
import { flowTestnet } from "wagmi/chains";
import { gemini } from "wagmi/connectors";

import reactLogo from "./react.svg";
import "./index.css";

const contractAddress = "0x1A9f9374F3f56e60B6CadEeEb2C34f991E5A507B";
const contractABI = [
  {
    inputs: [],
    name: "getFlipCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "flipCoin",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "startIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "count",
        type: "uint256",
      },
    ],
    name: "getFlipResults",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "isHeads",
            type: "bool",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "player",
            type: "address",
          },
        ],
        internalType: "struct CoinFlipper.FlipResult[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const wagmiConfig = createConfig(
  getDefaultConfig({
    chains: [flowTestnet],
    connectors: [
      gemini({
        appMetadata: {
          name: "My Wagmi App",
          url: "https://example.com",
          icons: ["https://example.com/favicon.ico"],
        },
      }),
    ],

    // Required API Keys
    walletConnectProjectId: "8e2bafed4a5154a18a506d99f7a5551d",

    // Required App Info
    appName: "flowflip",

    // Optional App Info
    appDescription: "Your App Description",
    appUrl: "https://family.co", // your app's url
    appIcon: "https://family.co/logo.png", // your app's icon, no bigger than 1024x1024px (max. 1MB)
  }),
);

const queryClient = new QueryClient();
const client = createPublicClient({
  chain: flowTestnet,
  transport: viemHttp(),
});
const walletClient = createWalletClient({
  chain: flowTestnet,
  transport: custom(window.ethereum),
});

function AppContent() {
  const [flipCount, setFlipCount] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [showFlipTooltip, setShowFlipTooltip] = useState(false);
  const [isLoadingFlips, setIsLoadingFlips] = useState(false);
  const [lastFiveFlips, setLastFiveFlips] = useState<
    { index: number; isHeads: boolean }[]
  >([]);
  const { isConnected } = useAccount();
  const shortAddress = `${contractAddress.slice(
    0,
    6,
  )}...${contractAddress.slice(-4)}`;

  useEffect(() => {
    const fetchFlipCount = async () => {
      try {
        const count = await client.readContract({
          address: contractAddress,
          abi: contractABI,
          functionName: "getFlipCount",
        });
        setFlipCount(Number(count));
      } catch (error) {
        console.error("Error fetching flip count:", error);
      }
    };

    fetchFlipCount();
  }, []);

  const handleHoverFlipCount = async () => {
    try {
      setShowFlipTooltip(true);
      if (flipCount === 0) {
        setLastFiveFlips([]);
        return;
      }
      setIsLoadingFlips(true);
      const count = Math.min(5, flipCount);
      const startIndex = flipCount - count;
      const results = (await client.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: "getFlipResults",
        args: [BigInt(startIndex), BigInt(count)],
      })) as Array<{ isHeads: boolean; timestamp: bigint; player: string }>;
      setLastFiveFlips(
        results.map((r, i) => ({
          isHeads: Boolean(r.isHeads),
          index: startIndex + i,
        })),
      );
    } catch (err) {
      console.error("Error fetching last flips:", err);
      setLastFiveFlips([]);
    } finally {
      setIsLoadingFlips(false);
    }
  };

  const handleFlipCoin = async () => {
    try {
      setIsFlipping(true);
      setTransactionHash(null);

      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      const addresses = await walletClient.getAddresses();
      const account = addresses[0] || null; // Ensure account is not undefined

      if (!account) {
        throw new Error("No account found");
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: "flipCoin",
        account,
      });

      setTransactionHash(hash as string);

      await client.waitForTransactionReceipt({ hash });

      const count = await client.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: "getFlipCount",
      });
      setFlipCount(Number(count));
    } catch (error) {
      console.error("Error flipping coin:", error);
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <>
      <header className="header">
        <ConnectKitButton />
      </header>

      <main className="app">
        <section
          className={`card glass ${!isConnected ? "disabled" : ""}`}
          aria-disabled={!isConnected}
        >
          <div className="hero">
            <div className="logo-container">
              <img
                src={reactLogo}
                alt="React Logo"
                className="logo react-logo"
              />
            </div>
            <h1 className="title gradient-text">FlipFlow</h1>
            <p className="subtitle">A tiny onchain coin flip on Flow Testnet</p>
          </div>

          <div className="stats">
            <div
              className="stat-card"
              onMouseEnter={handleHoverFlipCount}
              onMouseLeave={() => setShowFlipTooltip(false)}
            >
              <div className="stat-label">Total flips</div>
              <div className="stat-value">{flipCount}</div>
              {showFlipTooltip && (
                <div className="tooltip flips-tooltip" role="status">
                  {isLoadingFlips ? (
                    <span className="muted">Loading…</span>
                  ) : lastFiveFlips.length ? (
                    <div className="flips-row">
                      {lastFiveFlips.map((f) => (
                        <span
                          key={f.index}
                          className={`flip-pill ${
                            f.isHeads ? "heads" : "tails"
                          }`}
                        >
                          {`${f.index}: ${f.isHeads ? "Heads" : "Tails"}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">No flips yet</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleFlipCoin}
              disabled={isFlipping || !isConnected}
              aria-busy={isFlipping}
              data-loading={isFlipping || undefined}
            >
              {isFlipping
                ? "Flipping..."
                : isConnected
                  ? "Flip Coin"
                  : "Connect wallet to flip"}
            </button>
            {transactionHash && (
              <a
                className="pill tx-link"
                href={`https://evm-testnet.flowscan.io/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View last tx
              </a>
            )}
          </div>

          <div className="meta">
            <span className="pill">Flow Testnet</span>
            <span className="muted">Contract</span>
            <a
              className="link"
              href={`https://evm-testnet.flowscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress}
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="muted">Powered by</span>
        <a
          className="link"
          href="https://wagmi.sh"
          target="_blank"
          rel="noreferrer"
        >
          wagmi
        </a>
        <span className="dot" />
        <a
          className="link"
          href="https://viem.sh"
          target="_blank"
          rel="noreferrer"
        >
          viem
        </a>
      </footer>
    </>
  );
}

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <div className="page">
            <AppContent />
          </div>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
