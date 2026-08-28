import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PredictNaijaManager", function () {
  async function deployPredictNaijaFixture() {
    const [owner, bettor1, bettor2] = await ethers.getSigners();
    const PredictNaijaManager = await ethers.getContractFactory("PredictNaijaManager");
    const manager = await PredictNaijaManager.deploy();
    return { manager, owner, bettor1, bettor2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { manager, owner } = await deployPredictNaijaFixture();
      expect(await manager.owner()).to.equal(owner.address);
    });
  });

  describe("Market Management", function () {
    it("Should allow the owner to create a market", async function () {
      const { manager } = await deployPredictNaijaFixture();
      const question = "Will Nigeria beat Ghana?";
      const outcomes = ["Yes", "No"];
      const resolutionTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const category = "football";

      await expect(manager.createMarket(question, outcomes, resolutionTime, category))
        .to.emit(manager, "MarketCreated")
        .withArgs(0, question, outcomes, resolutionTime, category);

      const market = await manager.markets(0);
      expect(market.question).to.equal(question);
      expect(market.category).to.equal(category);
      expect(market.resolved).to.be.false;
    });

    it("Should not allow non-owners to create a market", async function () {
      const { manager, bettor1 } = await deployPredictNaijaFixture();
      const question = "Will Nigeria beat Ghana?";
      const outcomes = ["Yes", "No"];
      const resolutionTime = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        manager.connect(bettor1).createMarket(question, outcomes, resolutionTime, "football")
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Betting & Payouts", function () {
    it("Should allow users to place bets and claim payouts correctly", async function () {
      const { manager, owner, bettor1, bettor2 } = await deployPredictNaijaFixture();
      
      const question = "Will Nigeria beat Ghana?";
      const outcomes = ["Yes", "No"];
      const resolutionTime = Math.floor(Date.now() / 1000) + 3600;
      const category = "football";

      await manager.createMarket(question, outcomes, resolutionTime, category);

      // Bettor 1 bets 10 ETH/STT on "Yes" (Index 0)
      const bet1 = ethers.parseEther("10");
      await manager.connect(bettor1).placeBet(0, 0, { value: bet1 });

      // Bettor 2 bets 20 ETH/STT on "No" (Index 1)
      const bet2 = ethers.parseEther("20");
      await manager.connect(bettor2).placeBet(0, 1, { value: bet2 });

      // Bettor 1 bets another 10 ETH/STT on "Yes" (Index 0)
      const bet3 = ethers.parseEther("10");
      await manager.connect(bettor1).placeBet(0, 0, { value: bet3 });

      // Market state check
      const stakes = await manager.getTotalStakesPerOutcome(0);
      expect(stakes[0]).to.equal(ethers.parseEther("20")); // 10 + 10
      expect(stakes[1]).to.equal(ethers.parseEther("20")); // 20
      
      const market = await manager.markets(0);
      expect(market.totalPool).to.equal(ethers.parseEther("40")); // 20 + 20

      // Resolve market: "Yes" wins (Index 0)
      await manager.resolveMarket(0, 0);

      const marketAfterResolve = await manager.markets(0);
      expect(marketAfterResolve.resolved).to.be.true;
      expect(marketAfterResolve.winningOutcomeIndex).to.equal(0);

      // Bettor 1 claims winnings
      // Total pool = 40, Winning pool = 20, Bettor 1 stake = 20.
      // Expected payout = (20 * 40) / 20 = 40.
      const initialBalance = await ethers.provider.getBalance(bettor1.address);
      const tx = await manager.connect(bettor1).claimWinnings(0);
      const receipt = await tx.wait();
      const gasUsed = receipt ? receipt.gasUsed * receipt.gasPrice : BigInt(0);

      const finalBalance = await ethers.provider.getBalance(bettor1.address);
      expect(finalBalance + gasUsed - initialBalance).to.equal(ethers.parseEther("40"));

      // Try claiming again should fail
      await expect(manager.connect(bettor1).claimWinnings(0)).to.be.revertedWith("Winnings already claimed");

      // Bettor 2 (losing outcome) tries to claim, should fail
      await expect(manager.connect(bettor2).claimWinnings(0)).to.be.revertedWith("You did not bet on the winning outcome");
    });
  });
});
