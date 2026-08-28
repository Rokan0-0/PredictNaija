"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { Trophy, Award, Coins, HelpCircle } from "lucide-react";
import { predictNaijaAbi } from "@/lib/abi";
import { fetchNgnRate, convertSttToNgn } from "@/lib/ngnRate";

interface LeaderboardEntry {
  address: string;
  winsCount: number;
  totalEarnings: number; // in STT
}

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [ngnRate, setNgnRate] = useState(1600);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Fetch NGN exchange rate
  useEffect(() => {
    fetchNgnRate().then((rate) => setNgnRate(rate));
  }, []);

  // Fetch unique bettors
  const { data: bettorsList, isLoading: isBettorsLoading } = useReadContract({
    abi: predictNaijaAbi,
    address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
    functionName: "getUniqueBettors",
  });

  useEffect(() => {
    const loadLeaderboardData = async () => {
      setIsLoadingLeaderboard(true);

      try {
        // If we are in mock mode / no contract deployed, load high fidelity mock leaderboard data
        if (!process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS || !bettorsList || !Array.isArray(bettorsList) || bettorsList.length === 0) {
          const mockLeaderboard: LeaderboardEntry[] = [
            { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", winsCount: 12, totalEarnings: 15200 },
            { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", winsCount: 9, totalEarnings: 8400 },
            { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", winsCount: 6, totalEarnings: 5100 },
            { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", winsCount: 5, totalEarnings: 3200 },
            { address: "0x15d34AAf54a67C68900fa3783903d2FA7A4293BC", winsCount: 4, totalEarnings: 2800 },
            { address: "0x2546BcD3b6a900fa2b585dd299e03d12FA4293BC", winsCount: 3, totalEarnings: 1500 },
          ];

          // If the user's wallet is connected and not in mock leaderboard, add them as a participant
          if (isConnected && address) {
            const userInMock = mockLeaderboard.find(x => x.address.toLowerCase() === address.toLowerCase());
            if (!userInMock) {
              mockLeaderboard.push({
                address: address,
                winsCount: 1,
                totalEarnings: 125,
              });
            }
          }

          // Sort by earnings
          mockLeaderboard.sort((a, b) => b.totalEarnings - a.totalEarnings);
          setLeaderboard(mockLeaderboard);
          setIsLoadingLeaderboard(false);
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

        const list: LeaderboardEntry[] = [];
        for (const bettor of bettorsList as string[]) {
          const wins = await client.readContract({
            address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
            abi: predictNaijaAbi,
            functionName: "userWinsCount",
            args: [bettor as `0x${string}`]
          }) as bigint;

          const earningsRaw = await client.readContract({
            address: process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS as `0x${string}`,
            abi: predictNaijaAbi,
            functionName: "userTotalEarnings",
            args: [bettor as `0x${string}`]
          }) as bigint;

          list.push({
            address: bettor,
            winsCount: Number(wins),
            totalEarnings: Number(formatEther(earningsRaw))
          });
        }

        // Sort descending by total STT won
        list.sort((a, b) => b.totalEarnings - a.totalEarnings);
        setLeaderboard(list);
      } catch (err) {
        console.error("Error fetching leaderboard details:", err);
      } finally {
        setIsLoadingLeaderboard(false);
      }
    };

    loadLeaderboardData();
  }, [bettorsList, isConnected, address]);

  // Shorten address helper
  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Find user's rank
  const userRankIndex = leaderboard.findIndex(
    (x) => x.address.toLowerCase() === address?.toLowerCase()
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
          <Trophy size={22} className="text-[#00C853] drop-shadow-[0_0_6px_rgba(0,200,83,0.4)]" /> Top Predictors
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Rankings are calculated on total STT won on resolved prediction pools.
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="flex px-4 py-3 bg-slate-100 text-[10px] uppercase font-bold text-muted-foreground border-b border-border">
          <div className="w-12 text-center">Rank</div>
          <div className="flex-1">Predictor</div>
          <div className="w-14 text-center">Wins</div>
          <div className="w-24 text-right">STT Won</div>
        </div>

        {/* Rows */}
        {isLoadingLeaderboard || isBettorsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex px-4 py-4 border-b border-border items-center animate-pulse">
              <div className="w-12 h-4 bg-muted rounded mx-auto" />
              <div className="flex-1 h-4 bg-muted rounded mx-2" />
              <div className="w-14 h-4 bg-muted rounded mx-auto" />
              <div className="w-24 h-4 bg-muted rounded ml-auto" />
            </div>
          ))
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 p-6">
            <HelpCircle size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No predictor data found.</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to predict and win!</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {leaderboard.slice(0, 10).map((entry, index) => {
              const isCurrentUser = address && entry.address.toLowerCase() === address.toLowerCase();
              const rank = index + 1;
              const earningsNgn = convertSttToNgn(entry.totalEarnings, ngnRate);

              // Styling for Top 3
              let rankStyle = "text-muted-foreground font-bold";
              let rowStyle = "border-b border-border";
              
              if (rank === 1) {
                rankStyle = "text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.4)] font-extrabold text-sm";
                rowStyle = "bg-[#FFD700]/10 border-b border-[#FFD700]/20";
              } else if (rank === 2) {
                rankStyle = "text-[#C0C0C0] drop-shadow-[0_0_8px_rgba(192,192,192,0.4)] font-extrabold text-sm";
                rowStyle = "bg-[#C0C0C0]/10 border-b border-[#C0C0C0]/20";
              } else if (rank === 3) {
                rankStyle = "text-[#CD7F32] drop-shadow-[0_0_8px_rgba(205,127,50,0.4)] font-extrabold text-sm";
                rowStyle = "bg-[#CD7F32]/10 border-b border-[#CD7F32]/20";
              }

              if (isCurrentUser) {
                rowStyle += " border-x-2 border-[#00C853]/40 bg-[#00C853]/5";
              }

              return (
                <div key={entry.address} className={`flex px-4 py-4 items-center text-xs font-semibold ${rowStyle}`}>
                  <div className={`w-12 text-center ${rankStyle}`}>{rank}</div>
                  <div className="flex-1 font-bold text-foreground flex items-center gap-1.5">
                    {shortenAddress(entry.address)}
                    {isCurrentUser && (
                      <span className="text-[9px] bg-[#00C853]/15 text-[#00C853] font-bold px-1.5 py-0.5 rounded border border-[#00C853]/25">
                        You
                      </span>
                    )}
                  </div>
                  <div className="w-14 text-center text-muted-foreground font-bold">{entry.winsCount}</div>
                  <div className="w-24 text-right flex flex-col">
                    <span className="font-extrabold text-foreground">{entry.totalEarnings.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">₦{earningsNgn.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}

            {/* Pin User at Bottom if not in Top 10 */}
            {isConnected && userRankIndex >= 10 && (
              <div className="border-t-2 border-[#00C853] bg-[#00C853]/5 flex px-4 py-4 items-center text-xs font-semibold">
                <div className="w-12 text-center text-[#00C853] font-bold">{userRankIndex + 1}</div>
                <div className="flex-1 font-bold text-foreground flex items-center gap-1.5">
                  {shortenAddress(address!)}
                  <span className="text-[9px] bg-[#00C853]/15 text-[#00C853] font-bold px-1.5 py-0.5 rounded border border-[#00C853]/25">
                    You
                  </span>
                </div>
                <div className="w-14 text-center text-muted-foreground font-bold">
                  {leaderboard[userRankIndex].winsCount}
                </div>
                <div className="w-24 text-right flex flex-col">
                  <span className="font-extrabold text-[#00C853]">
                    {leaderboard[userRankIndex].totalEarnings.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ₦{convertSttToNgn(leaderboard[userRankIndex].totalEarnings, ngnRate).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
