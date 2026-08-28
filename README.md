# PredictNaija — Mobile-First Prediction Market on Somnia

PredictNaija is a social prediction market where everyday Nigerians bet on real-world outcomes — sports (Super Eagles, club matches), entertainment (BBNaija evictions), and economics (Naira exchange rates) — using STT tokens on the Somnia Testnet.

By abstracting away standard crypto jargon, removing complicated wallet modals from the homepage, and introducing intuitive local details (such as live Naira (₦) equivalents and viral WhatsApp sharing), PredictNaija bridges the gap between Web3 tech and consumer-facing retail betting in Nigeria.

---

## 🛠️ Tech Stack

| Tool/Library | Usage |
|---|---|
| **Next.js 14** | Main web framework (App Router) |
| **Tailwind CSS** | Styling (Custom deep-dark `#0A0A0F` & Nigeria Green `#00C853` theme) |
| **Solidity v0.8.20** | Smart contract language |
| **Hardhat v2** | Contract compilation, local testing, and deployment |
| **Wagmi v2 & Viem v2** | Ethereum client & wallet hooks integration |
| **RainbowKit** | Web3 connection interface (custom themed) |

---

## 🌐 Smart Contract Architecture

The core logic runs fully on-chain via the `PredictNaijaManager.sol` smart contract, deployed on the **Somnia Shannon Testnet**:
- **Market Creation**: Allows the admin to deploy prediction markets with custom titles, outcomes, resolution times, and categories.
- **Pari-Mutuel Betting**: Users place bets on any outcome index by staking native STT tokens.
- **Settle and Payouts**: The admin resolves a market to the winning outcome, locking future bets. Winners can then claim their payouts, which are calculated proportionally: `(userStake * totalPool) / totalWinningPool`.
- **Leaderboard Stats**: Bettor win counts and earnings are aggregated on-chain for gas-efficient leaderboard displays.

---

## 🚀 Local Development Guide

Follow these steps to run the project locally with a mock local network:

### 1. Clone the repo and install dependencies
```bash
npm install
```

### 2. Start the local Hardhat node
Launch a local blockchain node (already configured with default private keys in `.env`):
```bash
npx hardhat node
```

### 3. Compile and test the smart contracts
In a separate terminal, compile and run the contract test suite:
```bash
npx hardhat test
```

### 4. Deploy and seed prediction markets
Deploy the manager contract to the local node and seed it with 6 pre-configured markets:
```bash
# Deploy contract
npx hardhat run scripts/deploy.ts --network localhost

# Set NEXT_PUBLIC_MARKET_MANAGER_ADDRESS in your .env to the logged address (e.g. 0x5FbDB2315678afecb367f032d93F642f64180aa3)

# Seed the markets
npx hardhat run scripts/seedMarkets.ts --network localhost
```

### 5. Run the frontend application
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Use Chrome DevTools in Mobile view (375px) for the designed experience.

---

## 🔗 Deploying to Somnia Testnet

To deploy the contracts to the live **Somnia Shannon Testnet**:
1. Get STT tokens from the [Somnia Shannon Faucet](https://faucet.somnia.network).
2. Update `PRIVATE_KEY` in your `.env` file to your funded wallet private key.
3. Run the deployment and seeding commands:
```bash
npx hardhat run scripts/deploy.ts --network somniaTestnet
# Update NEXT_PUBLIC_MARKET_MANAGER_ADDRESS in .env with the deployed address
npx hardhat run scripts/seedMarkets.ts --network somniaTestnet
```

---

## 🏆 Hackathon Submission Info
- **Project**: PredictNaija
- **Event**: Somnia × DreamDEX Event Contracts Hackathon
- **Deadline**: September 8, 2026
