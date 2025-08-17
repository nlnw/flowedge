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
          <div className="app">
            <div className="logo-container">
              <img
                src={reactLogo}
                alt="React Logo"
                className="logo react-logo"
              />
            </div>

            <h1>FlipFlow</h1>
            <ConnectKitButton />
            <div className="flip-count">Number of Coin Flips: {flipCount}</div>
            <button
              type="button"
              onClick={handleFlipCoin}
              disabled={isFlipping}
            >
              {isFlipping ? "Flipping..." : "Flip Coin"}
            </button>
            {transactionHash && (
              <div>
                <a
                  href={`https://evm-testnet.flowscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Transaction
                </a>
              </div>
            )}
          </div>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
