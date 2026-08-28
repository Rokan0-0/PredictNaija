import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const contractAddress = process.env.NEXT_PUBLIC_MARKET_MANAGER_ADDRESS;

async function main() {
  if (!contractAddress) {
    console.error("Please set NEXT_PUBLIC_MARKET_MANAGER_ADDRESS in your .env file");
    process.exit(1);
  }

  console.log("Seeding markets for PredictNaijaManager at:", contractAddress);

  const [deployer] = await hre.ethers.getSigners();
  const PredictNaijaManager = await hre.ethers.getContractFactory("PredictNaijaManager");
  const manager = PredictNaijaManager.attach(contractAddress) as any;

  const now = Math.floor(Date.now() / 1000);
  const threeDays = now + (3 * 24 * 60 * 60);
  const sevenDays = now + (7 * 24 * 60 * 60);
  const sept30 = Math.floor(new Date("2026-09-30T23:59:59Z").getTime() / 1000);
  const nov30 = Math.floor(new Date("2026-11-30T23:59:59Z").getTime() / 1000);
  const dec15 = Math.floor(new Date("2026-12-15T23:59:59Z").getTime() / 1000);

  const marketsToSeed = [
    {
      question: "Will Super Eagles qualify for AFCON 2027?",
      outcomes: ["Yes", "No"],
      resolutionTime: dec15,
      category: "football"
    },
    {
      question: "Will Osimhen score in his next club match?",
      outcomes: ["Yes", "No"],
      resolutionTime: threeDays,
      category: "football"
    },
    {
      question: "Who gets evicted from BBNaija next week?",
      outcomes: ["Housemate A", "Housemate B", "No eviction"],
      resolutionTime: sevenDays,
      category: "entertainment"
    },
    {
      question: "Will dollar exceed ₦1,700 by September 30?",
      outcomes: ["Yes", "No"],
      resolutionTime: sept30,
      category: "economics"
    },
    {
      question: "Will Burna Boy release an album before December?",
      outcomes: ["Yes", "No"],
      resolutionTime: nov30,
      category: "entertainment"
    },
    {
      question: "Will petrol price increase in September?",
      outcomes: ["Yes", "No"],
      resolutionTime: sept30,
      category: "economics"
    }
  ];

  for (const m of marketsToSeed) {
    console.log(`Creating market: "${m.question}" (${m.category})...`);
    const tx = await manager.createMarket(
      m.question,
      m.outcomes,
      m.resolutionTime,
      m.category
    );
    await tx.wait();
    console.log("Market created successfully.");
  }

  console.log("All 6 markets seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
