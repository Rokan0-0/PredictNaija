"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, Info, Loader2, ExternalLink, Home, Briefcase } from "lucide-react";
import Link from "next/link";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { predictNaijaAbi } from "@/lib/abi";
import { mockMarkets, Market } from "@/lib/mockMarkets";
import { fetchNgnRate, convertSttToNgn } from "@/lib/ngnRate";

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  
  const id = Number(params.id);

  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>("");
  const [ngnRate, setNgnRate] = useState(1600);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch NGN exchange rate
  useEffect(() => {
    fetchNgnRate().then((rate) => setNgnRate(rate));
  }, []);

  // Fetch market from contract
  const { data: contractMarkets } = useReadContract({
    abi: predictNaijaAbi,
    address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
    functionName: "getMarkets",
  });

  // Find the current market
  const market: Market | undefined = React.useMemo(() => {
    if (contractMarkets && Array.isArray(contractMarkets) && contractMarkets.length > id) {
      const m = (contractMarkets as any[])[id];
      return {
        id: Number(m.id),
        question: m.question,
        outcomes: m.outcomes,
        totalStakesPerOutcome: m.totalStakesPerOutcome.map((s: bigint) => s.toString()),
        totalPool: m.totalPool.toString(),
        resolutionTime: Number(m.resolutionTime),
        category: m.category as any,
        resolved: m.resolved,
        winningOutcomeIndex: Number(m.winningOutcomeIndex),
      };
    }
    return mockMarkets.find((m) => m.id === id);
  }, [contractMarkets, id]);

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Watch for transaction statuses
  useEffect(() => {
    if (txError) {
      const msg = txError.message.toLowerCase();
      if (msg.includes("rejected") || msg.includes("denied")) {
        setErrorMessage("You cancelled the prediction. No worries!");
      } else if (msg.includes("insufficient funds")) {
        setErrorMessage("Not enough STT. Get testnet tokens at the Somnia faucet.");
      } else {
        setErrorMessage("Transaction failed. Please check your balance and try again.");
      }
    }
  }, [txError]);

  if (!market) {
    return (
      <div className="text-center py-12 flex flex-col items-center gap-4">
        <p className="text-sm text-gray-400">Prediction market not found.</p>
        <Link href="/" className="text-xs text-[#00C853] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to feed
        </Link>
      </div>
    );
  }

  const totalStt = Number(formatEther(BigInt(market.totalPool)));
  const timeLeft = market.resolutionTime - Math.floor(Date.now() / 1000);
  const isClosed = timeLeft <= 0;

  // Calculate live winnings projection
  const calculatePotentialWin = () => {
    if (selectedOutcome === null || !stakeAmount || isNaN(Number(stakeAmount))) {
      return 0;
    }

    const stakeVal = Number(stakeAmount);
    if (stakeVal <= 0) return 0;

    const outcomePoolStr = market.totalStakesPerOutcome[selectedOutcome];
    const outcomePool = Number(formatEther(BigInt(outcomePoolStr)));
    const totalPoolVal = Number(formatEther(BigInt(market.totalPool)));

    // Formula: (stakeAmount / (outcomePool + stakeAmount)) * (totalPool + stakeAmount)
    const share = stakeVal / (outcomePool + stakeVal);
    const projectedPayout = share * (totalPoolVal + stakeVal);
    
    return Number(projectedPayout.toFixed(2));
  };

  const potentialWin = calculatePotentialWin();
  const potentialWinNgn = convertSttToNgn(potentialWin, ngnRate);
  const stakeNgn = convertSttToNgn(Number(stakeAmount || 0), ngnRate);

  const handlePredictClick = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (selectedOutcome === null) {
      setErrorMessage("Please pick an outcome first!");
      return;
    }

    const stakeVal = Number(stakeAmount);
    if (isNaN(stakeVal) || stakeVal <= 0) {
      setErrorMessage("Please enter a valid stake amount greater than 0.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setShowModal(true);
      writeContract({
        abi: predictNaijaAbi,
        address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
        functionName: "placeBet",
        args: [BigInt(market.id), BigInt(selectedOutcome)],
        value: parseEther(stakeAmount),
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to submit prediction");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back Header */}
      <div className="flex items-center justify-between border-b border-border pb-3 -mx-4 px-4 sticky top-12 bg-background/90 backdrop-blur-md z-30">
        <Link href="/" className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-secondary text-foreground border border-border">
          {market.category}
        </span>
        <div className="w-8" /> {/* Spacer to align title */}
      </div>

      {/* Info Cards */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold text-foreground leading-snug">
          {market.question}
        </h2>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border p-3 rounded-xl">
          <Clock size={15} className="text-[#00C853]" />
          <span>
            {market.resolved
              ? "Resolved outcome: " + market.outcomes[market.winningOutcomeIndex]
              : isClosed
              ? "Betting closed. Awaiting resolution."
              : `Betting active. Ends in ${Math.ceil(timeLeft / (24 * 60 * 60))} days`}
          </span>
        </div>
      </div>

      {/* Action / Betting section */}
      {!market.resolved && !isClosed && (
        <div className="flex flex-col gap-5">
          {/* Outcome Buttons */}
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pick an Outcome</span>
            <div className="flex flex-col gap-2">
              {market.outcomes.map((outcome, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedOutcome(idx);
                    setErrorMessage(null);
                  }}
                  className={`w-full py-3.5 px-4 rounded-xl text-left text-sm font-bold border transition-all flex justify-between items-center ${
                    selectedOutcome === idx
                      ? "bg-[#00C853]/15 border-[#00C853] text-[#00C853] shadow-[0_0_12px_rgba(0,200,83,0.15)]"
                      : "bg-card border-border text-foreground hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span>{outcome}</span>
                  {selectedOutcome === idx && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stake Input */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Stake (STT)</span>
              {stakeAmount && !isNaN(Number(stakeAmount)) && (
                <span className="text-xs text-muted-foreground">≈ ₦{stakeNgn.toLocaleString()}</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="Enter STT amount e.g. 50"
                value={stakeAmount}
                onChange={(e) => {
                  setStakeAmount(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isTxPending || isConfirming}
                className="w-full bg-card border border-border rounded-xl py-3.5 px-4 text-foreground text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-[#00C853] transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">STT</span>
            </div>
          </div>

          {/* Projected Payout */}
          {potentialWin > 0 && (
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-1 animate-fade-in">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Estimated Return (Win)</span>
              <span className="text-md font-bold text-[#00C853]">
                {potentialWin.toLocaleString()} STT <span className="text-muted-foreground font-normal text-xs">(≈ ₦{potentialWinNgn.toLocaleString()})</span>
              </span>
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Info size={11} /> Payout is pari-mutuel; actual odds may change as others bet.
              </p>
            </div>
          )}

          {/* Error and Success States */}
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

          {/* Predict Button */}
          <button
            onClick={handlePredictClick}
            disabled={isTxPending || isConfirming}
            className={`w-full py-4 rounded-xl text-center text-xs font-extrabold uppercase tracking-wider transition-all border ${
              isTxPending || isConfirming
                ? "bg-secondary border-border text-gray-500 cursor-not-allowed"
                : "bg-[#00C853] border-transparent text-[#0A0A0F] hover:bg-[#00E676] active:scale-[0.98]"
            }`}
          >
            {!mounted
              ? "Loading..."
              : isConfirming
              ? "Confirming on Somnia..."
              : isTxPending
              ? "Submitting prediction..."
              : isConnected
              ? "Confirm Prediction"
              : "Connect Wallet to Predict"}
          </button>
        </div>
      )}

      {/* Closed / Resolved States */}
      {(market.resolved || isClosed) && (
        <div className="bg-card border border-border p-6 rounded-2xl flex flex-col items-center text-center gap-3">
          <div className="p-3 bg-secondary rounded-full text-[#00C853]">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-md font-bold text-foreground">
            {market.resolved ? "This market is settled!" : "Betting has closed!"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-[85%]">
            {market.resolved
              ? `The winning outcome is "${market.outcomes[market.winningOutcomeIndex]}". You can claim any winnings from the "My Bets" page.`
              : "Bets are locked while waiting for the real-world outcome to resolve. The admin will settle the contract soon."}
          </p>
          <Link
            href="/my-bets"
            className="mt-2 text-xs font-bold text-[#00C853] hover:underline"
          >
            Check your bets →
          </Link>
        </div>
      )}

      {/* Transaction Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Head */}
            <div className="flex flex-col items-center text-center gap-3">
              {txError ? (
                <>
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
                    <AlertTriangle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Prediction Failed</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    {txError.message.toLowerCase().includes("rejected") || txError.message.toLowerCase().includes("denied")
                      ? "You cancelled the transaction in your wallet. Feel free to try again when you are ready!"
                      : txError.message.toLowerCase().includes("insufficient funds")
                      ? "You do not have enough STT tokens. Get free tokens at the Somnia faucet."
                      : "Something went wrong while submitting your prediction. Please try again."}
                  </p>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setErrorMessage(null);
                    }}
                    className="w-full mt-2 py-3 bg-secondary border border-border text-foreground hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-colors"
                  >
                    Close & Retry
                  </button>
                </>
              ) : isConfirmed ? (
                <>
                  <div className="p-3 bg-green-500/10 text-[#00C853] rounded-full">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Prediction Confirmed!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your prediction has been successfully recorded on the Somnia blockchain.
                  </p>

                  {/* Details Card */}
                  <div className="w-full bg-slate-50 border border-border rounded-xl p-4 text-left flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Market:</span>
                      <span className="font-bold text-foreground text-right max-w-[70%] truncate">{market.question}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Prediction:</span>
                      <span className="font-extrabold text-[#00C853]">{market.outcomes[selectedOutcome ?? 0]}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Stake:</span>
                      <span className="font-bold text-foreground">{stakeAmount} STT (≈ ₦{stakeNgn.toLocaleString()})</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Est. Return:</span>
                      <span className="font-extrabold text-foreground text-right">{potentialWin.toLocaleString()} STT (≈ ₦{potentialWinNgn.toLocaleString()})</span>
                    </div>
                  </div>

                  {/* Somnia Explorer Link */}
                  {txHash && (
                    <a
                      href={`https://shannon-explorer.somnia.network/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-[#00C853] flex items-center gap-1 mt-1 transition-colors"
                    >
                      View on Somnia Explorer <ExternalLink size={12} />
                    </a>
                  )}

                  {/* Navigation Buttons */}
                  <div className="w-full flex flex-col gap-2 mt-4">
                    <Link
                      href="/my-bets"
                      onClick={() => setShowModal(false)}
                      className="w-full py-3 bg-[#00C853] text-black hover:bg-[#00E676] rounded-xl text-xs font-extrabold uppercase text-center tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Briefcase size={14} /> View My Predictions
                    </Link>
                    <Link
                      href="/"
                      onClick={() => setShowModal(false)}
                      className="w-full py-3 bg-secondary border border-border text-foreground hover:bg-slate-100 rounded-xl text-xs font-bold uppercase text-center tracking-wider transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Home size={14} /> Back to Feed
                    </Link>
                  </div>
                </>
              ) : isConfirming ? (
                <>
                  <div className="p-3 text-[#00C853] animate-spin rounded-full">
                    <Loader2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Confirming Prediction...</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    Somnia blockchain is verifying and resolving your transaction. This typically takes 2-5 seconds.
                  </p>
                  
                  {/* Details Card */}
                  <div className="w-full bg-slate-50 border border-border rounded-xl p-4 text-left flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Prediction:</span>
                      <span className="font-bold text-foreground">{market.outcomes[selectedOutcome ?? 0]}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-foreground">{stakeAmount} STT</span>
                    </div>
                  </div>

                  {txHash && (
                    <a
                      href={`https://shannon-explorer.somnia.network/tx/${txHash}`}
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
                  <h3 className="text-lg font-bold text-foreground">Awaiting Signature</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    Please check your wallet and approve the transaction to place your prediction.
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
