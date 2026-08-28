import type { Metadata } from "next";
import { Providers } from "./providers";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "PredictNaija — Bet & Win with No Jargon",
  description: "Mobile-first prediction market for football, entertainment, and economics on Somnia Testnet.",
  openGraph: {
    title: "PredictNaija — Bet & Win with No Jargon",
    description: "Mobile-first prediction market for football, entertainment, and economics on Somnia Testnet.",
    url: "https://predictnaija.vercel.app",
    siteName: "PredictNaija",
    images: [
      {
        url: "https://predictnaija.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "PredictNaija Preview",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PredictNaija — Bet & Win with No Jargon",
    description: "Mobile-first prediction market for football, entertainment, and economics on Somnia Testnet.",
    images: ["https://predictnaija.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-foreground min-h-screen flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-background flex flex-col relative border-x border-border">
          <Providers>
            <Header />
            <main className="flex-1 pb-24 px-4 pt-4">
              {children}
            </main>
            <BottomNav />
          </Providers>
        </div>
      </body>
    </html>
  );
}
