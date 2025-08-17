import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ConnectKitButton,
  ConnectKitProvider,
  getDefaultConfig,
} from "connectkit";
import { createConfig, http, WagmiProvider } from "wagmi";
import { flowTestnet } from "wagmi/chains";
import { gemini } from "wagmi/connectors";

import reactLogo from "./react.svg";
import "./index.css";

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

export function App() {
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
          </div>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
