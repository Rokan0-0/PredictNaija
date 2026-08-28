"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { Share2, Clock, Coins, ChevronRight } from "lucide-react";
import { predictNaijaAbi } from "@/lib/abi";
import { mockMarkets, Market } from "@/lib/mockMarkets";
import { fetchNgnRate, convertSttToNgn } from "@/lib/ngnRate";

const CATEGORIES = [
  { id: "all", label: "All Markets" },
  { id: "football", label: "Football" },
  { id: "entertainment", label: "BBNaija & Ent" },
  { id: "economics", label: "Economics" },
];

export default function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [ngnRate, setNgnRate] = useState(1600);
  const [activeTab, setActiveTab] = useState<"open" | "resolved">("open");

  // Fetch NGN exchange rate
  useEffect(() => {
    fetchNgnRate().then((rate) => setNgnRate(rate));
  }, []);

  // Fetch markets from smart contract
  const { data: contractMarkets, isLoading, isError } = useReadContract({
    abi: predictNaijaAbi,
    address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
    functionName: "getMarkets",
  });

  // Map contract data or fallback to mock markets
  const rawMarkets: Market[] = React.useMemo(() => {
    if (contractMarkets && Array.isArray(contractMarkets) && contractMarkets.length > 0) {
      return (contractMarkets as any[]).map((m) => ({
        id: Number(m.id),
        question: m.question,
        outcomes: m.outcomes,
        totalStakesPerOutcome: m.totalStakesPerOutcome.map((s: bigint) => s.toString()),
        totalPool: m.totalPool.toString(),
        resolutionTime: Number(m.resolutionTime),
        category: m.category as any,
        resolved: m.resolved,
        winningOutcomeIndex: Number(m.winningOutcomeIndex),
      }));
    }
    return mockMarkets;
  }, [contractMarkets]);

  // Filter markets
  const filteredMarkets = React.useMemo(() => {
    return rawMarkets.filter((m) => {
      const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
      const matchesTab = activeTab === "open" ? !m.resolved : m.resolved;
      return matchesCategory && matchesTab;
    });
  }, [rawMarkets, selectedCategory, activeTab]);

  // Helper to share to WhatsApp
  const shareToWhatsApp = (e: React.MouseEvent, market: Market) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/market/${market.id}`;
    const text = `I just predicted on PredictNaija: *${market.question}*\n\nThink you can do better? Predict now: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Helper to calculate percentages
  const getPercentages = (stakesStr: string[], totalStr: string) => {
    const total = BigInt(totalStr);
    if (total === BigInt(0)) {
      return stakesStr.map(() => 50);
    }
    return stakesStr.map((s) => {
      const stake = BigInt(s);
      return Math.round(Number((stake * BigInt(100)) / total));
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#00C853]/20 to-[#00C853]/5 border border-[#00C853]/25 p-4 relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-[10px] bg-[#00C853] text-[#0A0A0F] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Hackathon Live
          </span>
          <h1 className="text-xl font-extrabold text-white mt-1.5 leading-tight">
            Predict. Win. Repeat.
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-[90%]">
            Bet on Nigerian trends with zero crypto jargon. Win payouts directly in STT.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 translate-y-3 translate-x-1 opacity-20 pointer-events-none">
          <Coins size={120} className="text-[#00C853]" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border">
        <button
          onClick={() => setActiveTab("open")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors ${
            activeTab === "open"
              ? "bg-[#00C853] text-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Bets
        </button>
        <button
          onClick={() => setActiveTab("resolved")}
          className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors ${
            activeTab === "resolved"
              ? "bg-[#00C853] text-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Settled Bets
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
              selectedCategory === cat.id
                ? "bg-secondary border-[#00C853] text-[#00C853] shadow-[0_0_8px_rgba(0,200,83,0.1)]"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Market Cards */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          // Skeletons
          [1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse flex flex-col gap-3">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-10 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-2xl p-6">
            <p className="text-sm text-muted-foreground">
              No {activeTab} prediction markets right now.
            </p>
            {activeTab === "open" && (
              <p className="text-xs text-muted-foreground mt-1">
                Check back soon or create one in the Admin page!
              </p>
            )}
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const totalStt = Number(formatEther(BigInt(market.totalPool)));
            const totalNgn = convertSttToNgn(totalStt, ngnRate);
            const percentages = getPercentages(market.totalStakesPerOutcome, market.totalPool);
            const timeLeft = market.resolutionTime - Math.floor(Date.now() / 1000);
            const isClosed = timeLeft <= 0;

            return (
              <Link
                key={market.id}
                href={`/market/${market.id}`}
                className="glass-card rounded-2xl p-5 border border-border flex flex-col gap-4 relative overflow-hidden group block"
              >
                {/* Top Badge & Info */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                    {market.category}
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12.5} className="text-[#00C853]" />
                    <span>
                      {market.resolved
                        ? "Resolved"
                        : isClosed
                        ? "Voting Closed"
                        : `${Math.ceil(timeLeft / (24 * 60 * 60))} days left`}
                    </span>
                  </div>
                </div>

                {/* Question */}
                <h3 className="text-md font-bold text-foreground group-hover:text-[#00C853] transition-colors leading-snug">
                  {market.question}
                </h3>

                {/* Outcome Percentages Split */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground px-1">
                    <span>{market.outcomes[0]} ({percentages[0]}%)</span>
                    <span>({percentages[1]}%) {market.outcomes[1]}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-[#00C853] h-full transition-all duration-500" 
                      style={{ width: `${percentages[0]}%` }}
                    />
                    <div 
                      className="bg-gray-300 h-full transition-all duration-500" 
                      style={{ width: `${percentages[1]}%` }}
                    />
                  </div>
                </div>

                {/* Footer Metrics & Actions */}
                <div className="flex justify-between items-center border-t border-border pt-3.5 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Total Pool</span>
                    <span className="text-xs font-bold text-foreground">
                      {totalStt.toLocaleString()} STT <span className="text-muted-foreground font-normal">({`≈ ₦${totalNgn.toLocaleString()}`})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => shareToWhatsApp(e, market)}
                      className="p-2 rounded-xl bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-[#00C853] transition-all"
                      title="Share to WhatsApp"
                    >
                      <Share2 size={15} />
                    </button>
                    
                    <span className="flex items-center gap-1 text-xs font-bold text-[#00C853] group-hover:translate-x-0.5 transition-transform">
                      {market.resolved ? "View Result" : "Predict"} <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
