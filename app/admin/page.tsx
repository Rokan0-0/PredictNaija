"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Shield, AlertTriangle, CheckCircle, PlusCircle, Settings, Award, Loader2 } from "lucide-react";
import { predictNaijaAbi } from "@/lib/abi";
import { mockMarkets, Market } from "@/lib/mockMarkets";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [adminWallet, setAdminWallet] = useState<string>("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

  // Load admin wallet address from env
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ADMIN_WALLET) {
      setAdminWallet(process.env.NEXT_PUBLIC_ADMIN_WALLET);
    }
  }, []);

  // Form states
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("football");
  const [outcomeA, setOutcomeA] = useState("Yes");
  const [outcomeB, setOutcomeB] = useState("No");
  const [daysToResolution, setDaysToResolution] = useState("7");

  // Resolution states
  const [selectedResolveMarket, setSelectedResolveMarket] = useState<number | null>(null);
  const [winningOutcome, setWinningOutcome] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = isConnected && address?.toLowerCase() === adminWallet.toLowerCase();

  // Fetch all markets for resolution
  const { data: contractMarkets, refetch: refetchMarkets } = useReadContract({
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
    // Only return mock if not on live contract network
    if (!process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS) {
      return mockMarkets;
    }
    return [];
  }, [contractMarkets]);

  const activeMarkets = rawMarkets.filter((m) => !m.resolved);

  const { writeContract, data: txHash, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isConfirmed) {
      setSuccessMessage("Transaction confirmed successfully!");
      setQuestion("");
      setOutcomeA("Yes");
      setOutcomeB("No");
      setSelectedResolveMarket(null);
      setWinningOutcome(null);
      refetchMarkets();
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [isConfirmed, refetchMarkets]);

  const handleCreateMarket = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!question.trim()) {
      setErrorMessage("Please enter a question.");
      return;
    }

    const outcomes = [outcomeA.trim(), outcomeB.trim()].filter(x => x !== "");
    if (outcomes.length < 2) {
      setErrorMessage("Please provide at least 2 outcomes.");
      return;
    }

    const days = Number(daysToResolution);
    if (isNaN(days) || days <= 0) {
      setErrorMessage("Invalid resolution time.");
      return;
    }

    const resolutionTimestamp = Math.floor(Date.now() / 1000) + (days * 24 * 60 * 60);

    try {
      writeContract({
        abi: predictNaijaAbi,
        address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
        functionName: "createMarket",
        args: [question, outcomes, BigInt(resolutionTimestamp), category],
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to deploy new market");
    }
  };

  const handleResolveMarket = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (selectedResolveMarket === null || winningOutcome === null) {
      setErrorMessage("Please select a market and the winning outcome.");
      return;
    }

    try {
      writeContract({
        abi: predictNaijaAbi,
        address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
        functionName: "resolveMarket",
        args: [BigInt(selectedResolveMarket), BigInt(winningOutcome)],
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to resolve market");
    }
  };

  if (!mounted) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-[#00C853]" size={28} />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-card border border-border p-8 rounded-2xl flex flex-col items-center text-center gap-4 py-12">
        <Shield size={36} className="text-gray-500" />
        <div>
          <h3 className="text-sm font-bold text-white">Admin Access Guard</h3>
          <p className="text-xs text-gray-500 mt-1">
            Please connect the admin wallet to access the management tools.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-2xl flex flex-col items-center text-center gap-4 py-12">
        <AlertTriangle size={36} className="text-red-400" />
        <div>
          <h3 className="text-sm font-bold text-white">Access Denied</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Your connected wallet address: <span className="text-gray-400 font-mono text-[10px] block mt-1 break-all">{address}</span>
            does not match the configured Admin Wallet:
            <span className="text-[#00C853] font-mono text-[10px] block mt-1 break-all">{adminWallet}</span>
          </p>
        </div>
      </div>
    );
  }

  const selectedMarketObj = rawMarkets.find(m => m.id === selectedResolveMarket);

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
          <Settings size={22} className="text-[#00C853]" /> Admin Panel
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Deploy and settle PredictNaija contracts live on Somnia Testnet.
        </p>
      </div>

      {/* Success/Error Feedbacks */}
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

      {/* Deploy Section */}
      <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border pb-2.5">
          <PlusCircle size={16} className="text-[#00C853]" /> Deploy New Market
        </h3>

        {/* Question */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-muted-foreground">Market Question</label>
          <input
            type="text"
            placeholder="e.g. Will Super Eagles beat Ghana?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="bg-background border border-border rounded-xl py-3 px-4 text-foreground text-xs font-semibold focus:outline-none focus:border-[#00C853]"
          />
        </div>

        {/* Category & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-background border border-border rounded-xl py-3 px-4 text-foreground text-xs font-semibold focus:outline-none focus:border-[#00C853]"
            >
              <option value="football">Football</option>
              <option value="entertainment">Entertainment</option>
              <option value="economics">Economics</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Resolves In</label>
            <select
              value={daysToResolution}
              onChange={(e) => setDaysToResolution(e.target.value)}
              className="bg-background border border-border rounded-xl py-3 px-4 text-foreground text-xs font-semibold focus:outline-none focus:border-[#00C853]"
            >
              <option value="1">1 Day</option>
              <option value="3">3 Days</option>
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
        </div>

        {/* Outcomes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Outcome A</label>
            <input
              type="text"
              placeholder="e.g. Yes"
              value={outcomeA}
              onChange={(e) => setOutcomeA(e.target.value)}
              className="bg-background border border-border rounded-xl py-3 px-4 text-foreground text-xs font-semibold focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Outcome B</label>
            <input
              type="text"
              placeholder="e.g. No"
              value={outcomeB}
              onChange={(e) => setOutcomeB(e.target.value)}
              className="bg-background border border-border rounded-xl py-3 px-4 text-foreground text-xs font-semibold focus:outline-none"
            />
          </div>
        </div>

        {/* Deploy Submit */}
        <button
          onClick={handleCreateMarket}
          disabled={isTxPending || isConfirming}
          className="w-full mt-2 py-3 bg-[#00C853] text-[#0A0A0F] hover:bg-[#00E676] text-xs font-extrabold rounded-xl uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {isConfirming
            ? "Confirming Market..."
            : isTxPending
            ? "Deploying to Somnia..."
            : "Deploy Market to Somnia"}
        </button>
      </div>

      {/* Resolve Section */}
      <div className="bg-card border border-border p-5 rounded-2xl flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border pb-2.5">
          <Award size={16} className="text-[#00C853]" /> Resolve Prediction Market
        </h3>

        {activeMarkets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active markets to resolve.</p>
        ) : (
          <>
            {/* Market Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Select Market</label>
              <select
                value={selectedResolveMarket !== null ? selectedResolveMarket : ""}
                onChange={(e) => {
                  setSelectedResolveMarket(e.target.value ? Number(e.target.value) : null);
                  setWinningOutcome(null);
                }}
                className="bg-background border border-border rounded-xl py-3 px-4 text-foreground text-xs font-semibold focus:outline-none"
              >
                <option value="">-- Choose Active Market --</option>
                {activeMarkets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.question}
                  </option>
                ))}
              </select>
            </div>

            {/* Winning Outcome selection */}
            {selectedMarketObj && (
              <div className="flex flex-col gap-2.5 animate-fade-in">
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Pick Winning Outcome</label>
                <div className="flex flex-col gap-2">
                  {selectedMarketObj.outcomes.map((outcome, idx) => (
                    <button
                      key={idx}
                      onClick={() => setWinningOutcome(idx)}
                      className={`w-full py-2.5 px-3 rounded-lg text-left text-xs font-bold border transition-all flex justify-between items-center ${
                        winningOutcome === idx
                          ? "bg-[#00C853]/15 border-[#00C853] text-[#00C853]"
                          : "bg-background border-border text-foreground hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <span>{outcome}</span>
                      {winningOutcome === idx && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resolve Submit */}
            <button
              onClick={handleResolveMarket}
              disabled={isTxPending || isConfirming || selectedResolveMarket === null || winningOutcome === null}
              className="w-full py-3 bg-[#FF3D00] text-white hover:bg-red-600 text-xs font-extrabold rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming
                ? "Settle Confirming..."
                : isTxPending
                ? "Settle Submitting..."
                : "Settle and Distribute Payouts"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
