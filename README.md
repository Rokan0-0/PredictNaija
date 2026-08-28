# PredictNaija

PredictNaija is a mobile-first, decentralized social prediction market built on the Somnia Testnet that lets Nigerians predict and stake STT on AFCON football, BBNaija entertainment, and Naira economics with zero jargon.

Live Demo: **[predictnaija-three.vercel.app](https://predictnaija-three.vercel.app/)**

---

## 🚀 Contract Details

* **Somnia Shannon Testnet Address**: `0x4d376BE252FBe590DbB3976AA3E12d393926ccEE`
* **Block Explorer Link**: **[Somnia Shannon Explorer - PredictNaijaManager](https://shannon-explorer.somnia.network/address/0x4d376BE252FBe590DbB3976AA3E12d393926ccEE)**

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | High-performance React framework for pages and routing |
| **Web3 Client Utilities** | Wagmi v2 & Viem | Type-safe JSON-RPC client and smart contract hooks |
| **Wallet Connector UI** | RainbowKit v2 | Premium, mobile-responsive wallet connection modal |
| **Styling & CSS** | TailwindCSS & Custom CSS | Custom light-mode tokens with glassmorphic accents |
| **Solidity Smart Contracts**| Hardhat & Solidity `0.8.20` | Local contract development compilation, testing, and scripts |

---

## 📸 Screenshots

### 📱 Feed Page (Mobile Layout)
*Placeholder: Insert Feed Page Screenshot here*

### 🪙 Market Details & Betting Slip
*Placeholder: Insert Betting Details Screen here*

### 🏆 Bettor Leaderboard
*Placeholder: Insert Leaderboard Screen here*

---

## ⚙️ How the Smart Contract Works (Pari-Mutuel Math)

PredictNaija does not use fixed bookmaker odds. Instead, it utilizes a **Pari-Mutuel betting pool** system where all stakes for a market are pooled together, and winners split the pool proportionally. This ensures the contract is **100% self-collateralized** and can never default.

The payout formula implemented in `PredictNaijaManager.sol` is:

$$\text{User Payout} = \left( \frac{\text{User Stake on Winning Outcome}}{\text{Total Stakes on Winning Outcome}} \right) \times \text{Total Pool}$$

### Example:
1. **Total Pool**: 100 STT (60 STT bet on outcome A, 40 STT bet on outcome B).
2. Outcome B wins.
3. If you staked 10 STT on outcome B, your payout is:
   $$\text{Payout} = \left( \frac{10}{40} \right) \times 100 = 25\text{ STT} \quad (15\text{ STT profit})$$

---

## 🔗 DreamDEX & Somnia Integration Notes

PredictNaija leverages the Somnia L1 ecosystem's speed and cost-effectiveness to bring Web3 to everyday social predictions:
* **Gas-Friendly Transactions**: Deployments and pool resolutions are ultra-affordable on Somnia's high-speed consensus.
* **DreamDEX Integration Potential**:
  * PredictNaija prediction shares can be wrapped as ERC-20 tokens, enabling users to trade their prediction positions prior to market resolution on AMMs like DreamDEX.
  * Staked STT pools can be routed to yield-generating liquidity pools on DreamDEX prior to settlement, increasing the total prize pool size for winners automatically.

---

## 💻 How to Run Locally

### 1. Prerequisites
* Install Node.js (v18+)
* Install MetaMask on browser or mobile

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Rokan0-0/PredictNaija.git
cd PredictNaija
npm install --legacy-peer-deps
```

### 3. Spin up Local Hardhat Node
Start the local blockchain emulator:
```bash
npx hardhat node
```

### 4. Deploy & Seed Contract Locally
In a separate terminal tab, compile and deploy the smart contract to the local node:
```bash
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/seedMarkets.ts --network localhost
```

### 5. Start Frontend Dev Server
Copy `.env.example` to `.env` and fill in the local contract address, then run:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** to view the app!
