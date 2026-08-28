"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Briefcase, Coins, Award, HelpCircle, CheckCircle, AlertTriangle, Clock, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { predictNaijaAbi } from "@/lib/abi";
import { mockMarkets, Market } from "@/lib/mockMarkets";
import { fetchNgnRate, convertSttToNgn } from "@/lib/ngnRate";

interface UserBetItem {
  market: Market;
  outcomesBetOn: {
    outcome: string;
    outcomeIndex: number;
    amount: string; // STT in formatEther
  }[];
  totalUserStake: string; // STT in formatEther
  isClaimed: boolean;
  hasWinnings: boolean;
  potentialPayout: string;
}

export default function MyBetsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [activeTab, setActiveTab] = useState<"active" | "settled">("active");
  const [ngnRate, setNgnRate] = useState(1600);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [activeClaimMarketId, setActiveClaimMarketId] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch NGN exchange rate
  useEffect(() => {
    fetchNgnRate().then((rate) => setNgnRate(rate));
  }, []);

  // Fetch all markets
  const { data: contractMarkets, isLoading: isMarketsLoading } = useReadContract({
    abi: predictNaijaAbi,
    address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
    functionName: "getMarkets",
  });

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

  // Read claim state for all markets for this user
  // (In a production app, we would batch this or use a subgraph. 
  // For this high-fidelity hackathon prototype, we can fetch all details using standard hooks.
  // We'll write a mock fallback if not on a live node).
  const [userBetsList, setUserBetsList] = useState<UserBetItem[]>([]);
  const [isLoadingBets, setIsLoadingBets] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      setUserBetsList([]);
      return;
    }

    const loadUserBets = async () => {
      setIsLoadingBets(true);
      const items: UserBetItem[] = [];

      try {
        // If we are using mock fallback (i.e. process env is empty or mock is triggered)
        // we can generate mock user bets for the demo
        if (!process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS) {
          const generatedMockBets: UserBetItem[] = [
            {
              market: rawMarkets[0],
              outcomesBetOn: [
                { outcome: rawMarkets[0].outcomes[0], outcomeIndex: 0, amount: "100" }
              ],
              totalUserStake: "100",
              isClaimed: false,
              hasWinnings: false,
              potentialPayout: "150", // PROJECTED
            },
            {
              market: {
                ...rawMarkets[1],
                resolved: true,
                winningOutcomeIndex: 0,
              },
              outcomesBetOn: [
                { outcome: rawMarkets[1].outcomes[0], outcomeIndex: 0, amount: "50" }
              ],
              totalUserStake: "50",
              isClaimed: false,
              hasWinnings: true,
              potentialPayout: "125",
            }
          ];
          setUserBetsList(generatedMockBets);
          setIsLoadingBets(false);
          return;
        }

        // Live contract querying
        const { createPublicClient, http } = await import("viem");
        const { hardhat, somniaTestnet } = await import("../providers");

        const isLocalhost = process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS === "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const client = createPublicClient({
          chain: isLocalhost ? hardhat : somniaTestnet,
          transport: http(isLocalhost ? "http://127.0.0.1:8545" : "https://api.infra.testnet.somnia.network")
        });

        for (const m of rawMarkets) {
          // Check if user staked on this market
          const userTotalStakeRaw = await client.readContract({
            address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
            abi: predictNaijaAbi,
            functionName: "userTotalStakes",
            args: [BigInt(m.id), address as `0x${string}`]
          }) as bigint;

          if (userTotalStakeRaw > BigInt(0)) {
            const outcomesBetOn: any[] = [];
            
            for (let i = 0; i < m.outcomes.length; i++) {
              const stakeRaw = await client.readContract({
                address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
                abi: predictNaijaAbi,
                functionName: "userBets",
                args: [BigInt(m.id), address as `0x${string}`, BigInt(i)]
              }) as bigint;

              if (stakeRaw > BigInt(0)) {
                outcomesBetOn.push({
                  outcome: m.outcomes[i],
                  outcomeIndex: i,
                  amount: formatEther(stakeRaw)
                });
              }
            }

            const isClaimed = await client.readContract({
              address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
              abi: predictNaijaAbi,
              functionName: "claimed",
              args: [BigInt(m.id), address as `0x${string}`]
            }) as boolean;

            const hasWinnings = m.resolved && outcomesBetOn.some(x => x.outcomeIndex === m.winningOutcomeIndex);

            // Calculate potential payout
            let potentialPayout = "0";
            if (m.resolved) {
              const userBetAmount = outcomesBetOn.find(x => x.outcomeIndex === m.winningOutcomeIndex)?.amount || "0";
              const winningPool = Number(formatEther(BigInt(m.totalStakesPerOutcome[m.winningOutcomeIndex])));
              const totalPool = Number(formatEther(BigInt(m.totalPool)));
              if (winningPool > 0) {
                potentialPayout = ((Number(userBetAmount) * totalPool) / winningPool).toFixed(2);
              }
            } else {
              // Just project based on current split
              const activeOutcomes = outcomesBetOn.map(o => {
                const stakeVal = Number(o.amount);
                const winPool = Number(formatEther(BigInt(m.totalStakesPerOutcome[o.outcomeIndex])));
                const totalPool = Number(formatEther(BigInt(m.totalPool)));
                if (winPool > 0) {
                  return ((stakeVal * totalPool) / winPool).toFixed(2);
                }
                return "0";
              });
              potentialPayout = activeOutcomes.length > 0 ? activeOutcomes[0] : "0";
            }

            items.push({
              market: m,
              outcomesBetOn,
              totalUserStake: formatEther(userTotalStakeRaw),
              isClaimed,
              hasWinnings,
              potentialPayout
            });
          }
        }

        setUserBetsList(items);
      } catch (err) {
        console.error("Error loading user bets:", err);
      } finally {
        setIsLoadingBets(false);
      }
    };

    loadUserBets();
  }, [isConnected, address, rawMarkets]);

  const { writeContract, data: claimTxHash, isPending: isClaimPending, error: claimTxError } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
    hash: claimTxHash
  });

  const handleClaim = (marketId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveClaimMarketId(marketId);
    setShowClaimModal(true);

    try {
      writeContract({
        abi: predictNaijaAbi,
        address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
        functionName: "claimWinnings",
        args: [BigInt(marketId)]
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to submit claim");
    }
  };

  const filteredBets = userBetsList.filter((item) => {
    return activeTab === "active" ? !item.market.resolved : item.market.resolved;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
          <Briefcase size={22} className="text-[#00C853]" /> My Predictions
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Track your predictions and claim your payouts on resolved outcomes.
        </p>
      </div>

      {!mounted ? (
        <div className="text-center py-12 flex justify-center items-center">
          <Loader2 className="animate-spin text-[#00C853]" size={28} />
        </div>
      ) : !isConnected ? (
        // Wallet not connected
        <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center text-center gap-4 py-12">
          <div className="p-4 bg-secondary rounded-full text-muted-foreground">
            <Coins size={36} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Wallet Not Connected</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[80%] mx-auto">
              Please connect your wallet to view your active predictions and settled wins.
            </p>
          </div>
          <button
            onClick={() => openConnectModal?.()}
            className="px-6 py-2.5 bg-[#00C853] text-black text-xs font-bold rounded-xl hover:bg-[#00E676] active:scale-[0.98] transition-all"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors ${
                activeTab === "active"
                  ? "bg-[#00C853] text-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active ({userBetsList.filter(x => !x.market.resolved).length})
            </button>
            <button
              onClick={() => setActiveTab("settled")}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-colors ${
                activeTab === "settled"
                  ? "bg-[#00C853] text-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Settled ({userBetsList.filter(x => x.market.resolved).length})
            </button>
          </div>

          {/* Feedback alerts */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-[#00C853] p-3.5 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle size={16} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Bet cards list */}
          {isLoadingBets || isMarketsLoading ? (
            // Loading Skeletons
            [1, 2].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-border animate-pulse flex flex-col gap-3">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))
          ) : filteredBets.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl p-6">
              <HelpCircle size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                You have no {activeTab} predictions.
              </p>
              <Link
                href="/"
                className="mt-3 inline-block px-4 py-2 bg-secondary border border-border text-[#00C853] text-xs font-bold rounded-xl hover:border-[#00C853] transition-colors"
              >
                Browse Markets
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredBets.map((item) => {
                const totalStake = Number(item.totalUserStake);
                const totalStakeNgn = convertSttToNgn(totalStake, ngnRate);
                const payout = Number(item.potentialPayout);
                const payoutNgn = convertSttToNgn(payout, ngnRate);

                return (
                  <div
                    key={item.market.id}
                    className="glass-card rounded-2xl p-5 border border-border flex flex-col gap-4 relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-secondary text-foreground">
                        {item.market.category}
                      </span>
                      
                      {item.market.resolved ? (
                        item.hasWinnings ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[#00C853]">
                            Winner
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                            Loss
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock size={11} className="text-[#00C853]" /> Active
                        </span>
                      )}
                    </div>

                    {/* Question */}
                    <h3 className="text-sm font-bold text-foreground leading-snug">
                      {item.market.question}
                    </h3>

                    {/* Betted Outcomes details */}
                    <div className="bg-gray-100 rounded-xl p-3 border border-border flex flex-col gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Your Prediction</span>
                      {item.outcomesBetOn.map((o, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-foreground">
                          <span className="font-semibold">{o.outcome}</span>
                          <span className="font-bold">{o.amount} STT</span>
                        </div>
                      ))}
                    </div>

                    {/* Stakes & Payouts details */}
                    <div className="flex justify-between border-t border-border pt-3.5 items-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Your Stake</span>
                        <span className="text-xs font-bold text-foreground">
                          {totalStake} STT <span className="text-[10px] text-muted-foreground font-normal">({`≈ ₦${totalStakeNgn.toLocaleString()}`})</span>
                        </span>
                      </div>

                      <div className="flex flex-col text-right">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                          {item.market.resolved ? "Amount Won" : "Est. Return"}
                        </span>
                        <span className={`text-xs font-bold ${item.market.resolved && item.hasWinnings ? "text-[#00C853]" : "text-foreground"}`}>
                          {item.market.resolved && !item.hasWinnings ? "0" : payout} STT{" "}
                          {(!item.market.resolved || item.hasWinnings) && (
                            <span className="text-[10px] text-muted-foreground font-normal">({`≈ ₦${payoutNgn.toLocaleString()}`})</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Claim Button for Settled Wins */}
                    {item.market.resolved && item.hasWinnings && (
                      <div className="border-t border-border pt-3 mt-1 flex justify-end">
                        {item.isClaimed ? (
                          <div className="flex items-center gap-1 text-xs text-[#00C853] font-bold">
                            <CheckCircle size={14} /> Payout Claimed
                          </div>
                        ) : (
                          <button
                            onClick={() => handleClaim(item.market.id)}
                            disabled={isClaimPending || isClaimConfirming}
                            className="px-4 py-2 bg-[#00C853] hover:bg-[#00E676] text-black text-xs font-extrabold rounded-xl uppercase tracking-wider transition-colors"
                          >
                            {isClaimConfirming
                              ? "Claiming..."
                              : isClaimPending
                              ? "Submitting..."
                              : "Claim Winnings"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {/* Winnings Claim Confirmation Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Head */}
            <div className="flex flex-col items-center text-center gap-3">
              {claimTxError ? (
                <>
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Claim Failed</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    {claimTxError.message.toLowerCase().includes("rejected") || claimTxError.message.toLowerCase().includes("denied")
                      ? "You cancelled the claim request in your wallet."
                      : "Something went wrong while submitting your claim. Please check your network and try again."}
                  </p>
                  <button
                    onClick={() => {
                      setShowClaimModal(false);
                      setErrorMessage(null);
                    }}
                    className="w-full mt-2 py-3 bg-secondary border border-border text-foreground hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-colors"
                  >
                    Close & Retry
                  </button>
                </>
              ) : isClaimSuccess ? (
                <>
                  <div className="p-3 bg-green-500/10 text-[#00C853] rounded-full">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Winnings Claimed!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your payouts have been transferred back to your wallet.
                  </p>

                  {/* Details Card */}
                  {activeClaimMarketId !== null && userBetsList.find(x => x.market.id === activeClaimMarketId) && (
                    <div className="w-full bg-slate-50 border border-border rounded-xl p-4 text-left flex flex-col gap-2 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Market:</span>
                        <span className="font-bold text-foreground text-right max-w-[70%] truncate">
                          {userBetsList.find(x => x.market.id === activeClaimMarketId)?.market.question}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Claim Value:</span>
                        <span className="font-extrabold text-[#00C853]">
                          {userBetsList.find(x => x.market.id === activeClaimMarketId)?.potentialPayout} STT
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Somnia Explorer Link */}
                  {claimTxHash && (
                    <a
                      href={`https://shannon-explorer.somnia.network/tx/${claimTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-[#00C853] flex items-center gap-1 mt-1 transition-colors"
                    >
                      View transaction <ExternalLink size={12} />
                    </a>
                  )}

                  {/* Navigation Buttons */}
                  <div className="w-full flex flex-col gap-2 mt-4">
                    <button
                      onClick={() => {
                        setShowClaimModal(false);
                        window.location.reload();
                      }}
                      className="w-full py-3 bg-[#00C853] text-black hover:bg-[#00E676] rounded-xl text-xs font-extrabold uppercase text-center tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      Close & Refresh Balance
                    </button>
                  </div>
                </>
              ) : isClaimConfirming ? (
                <>
                  <div className="p-3 text-[#00C853] animate-spin rounded-full">
                    <Loader2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Confirming Claim...</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    Awaiting block verification for your winnings release.
                  </p>

                  {claimTxHash && (
                    <a
                      href={`https://shannon-explorer.somnia.network/tx/${claimTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-[#00C853] flex items-center gap-1 mt-1 transition-colors"
                    >
                      View explorer status <ExternalLink size={12} />
                    </a>
                  )}
                </>
              ) : (
                <>
                  <div className="p-3 text-[#00C853] animate-pulse rounded-full animate-spin">
                    <Loader2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Sign Claim</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    Please approve the claim contract call in your connected wallet.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
