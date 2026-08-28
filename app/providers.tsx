"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { RainbowKitProvider, darkTheme, Chain } from "@rainbow-me/rainbowkit";
import { hardhat } from "wagmi/chains";
export { hardhat };

import "@rainbow-me/rainbowkit/styles.css";

// Configure Somnia Testnet
export const somniaTestnet: Chain = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.infra.testnet.somnia.network"] },
    public: { http: ["https://api.infra.testnet.somnia.network"] },
  },
  blockExplorers: {
    default: { name: "Somnia Shannon Explorer", url: "https://shannon-explorer.somnia.network" },
  },
  testnet: true,
};

// Wagmi configuration
export const config = createConfig({
  chains: [somniaTestnet, hardhat],
  transports: {
    [somniaTestnet.id]: http(),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00C853",
            accentColorForeground: "#000000",
            borderRadius: "large",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
