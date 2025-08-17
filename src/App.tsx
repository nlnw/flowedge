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
import { createConfig, http, WagmiProvider } from "wagmi";
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

export function App() {
  const [flipCount, setFlipCount] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
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

  const handleFlipCoin = async () => {
    try {
      setIsFlipping(true);
      setTransactionHash(null);

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

      setTransactionHash(hash as string); // Explicitly cast hash to string

      // Wait for the transaction to be mined
      await client.waitForTransactionReceipt({ hash });

      // Update the flip count
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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <div className="page">
            <header className="header">
              <ConnectKitButton />
            </header>

            <main className="app">
              <section className="card glass">
                <div className="hero">
                  <div className="logo-container">
                    <img
                      src={reactLogo}
                      alt="React Logo"
                      className="logo react-logo"
                    />
                  </div>
                  <h1 className="title gradient-text">FlipFlow</h1>
                  <p className="subtitle">
                    A tiny onchain coin flip on Flow Testnet
                  </p>
                </div>

                <div className="stats">
                  <div className="stat-card">
                    <div className="stat-label">Total flips</div>
                    <div className="stat-value">{flipCount}</div>
                  </div>
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

                <div className="actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleFlipCoin}
                    disabled={isFlipping}
                    aria-busy={isFlipping}
                    data-loading={isFlipping || undefined}
                  >
                    {isFlipping ? "Flipping..." : "Flip Coin"}
                  </button>
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
          </div>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
