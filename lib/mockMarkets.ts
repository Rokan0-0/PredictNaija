export interface Market {
  id: number;
  question: string;
  outcomes: string[];
  totalStakesPerOutcome: string[]; // BigInt string format
  totalPool: string; // BigInt string format
  resolutionTime: number; // UNIX timestamp
  category: "football" | "entertainment" | "economics";
  resolved: boolean;
  winningOutcomeIndex: number;
}

export const mockMarkets: Market[] = [
  {
    id: 0,
    question: "Will Super Eagles qualify for AFCON 2027?",
    outcomes: ["Yes - Nigeria qualifies", "No - Qualification fails"],
    totalStakesPerOutcome: ["5000000000000000000000", "2500000000000000000000"], // 5000 STT, 2500 STT
    totalPool: "7500000000000000000000", // 7500 STT
    resolutionTime: Math.floor(new Date("2026-12-15T23:59:59Z").getTime() / 1000),
    category: "football",
    resolved: false,
    winningOutcomeIndex: 0,
  },
  {
    id: 1,
    question: "Will Osimhen score in his next club match?",
    outcomes: ["Yes - Osimhen scores", "No - No goal scored"],
    totalStakesPerOutcome: ["12000000000000000000000", "8000000000000000000000"], // 12000 STT, 8000 STT
    totalPool: "20000000000000000000000", // 20000 STT
    resolutionTime: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60), // 3 days from now
    category: "football",
    resolved: false,
    winningOutcomeIndex: 0,
  },
  {
    id: 2,
    question: "Will dollar exceed ₦1,700 by September 30?",
    outcomes: ["Yes - Dollar >= ₦1,700", "No - Dollar < ₦1,700"],
    totalStakesPerOutcome: ["15000000000000000000000", "5000000000000000000000"], // 15000 STT, 5000 STT
    totalPool: "20000000000000000000000", // 20000 STT
    resolutionTime: Math.floor(new Date("2026-09-30T23:59:59Z").getTime() / 1000),
    category: "economics",
    resolved: false,
    winningOutcomeIndex: 0,
  },
  {
    id: 3,
    question: "Who gets evicted from BBNaija next week?",
    outcomes: ["Housemate A", "Housemate B", "No eviction"],
    totalStakesPerOutcome: ["3000000000000000000000", "4000000000000000000000", "1000000000000000000000"], // 3000 STT, 4000 STT, 1000 STT
    totalPool: "8000000000000000000000", // 8000 STT
    resolutionTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
    category: "entertainment",
    resolved: false,
    winningOutcomeIndex: 0,
  }
];
