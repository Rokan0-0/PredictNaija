# PredictNaija — Complete Build Guide
### Somnia × DreamDEX Event Contracts Hackathon | Deadline: Sept 8, 2026

---

## What you're building

A mobile-first social prediction market where everyday Nigerians bet on real-world
outcomes — football, BBNaija, dollar rate — using DreamDEX Event Contracts on Somnia
Testnet. No crypto jargon. No wallet modals on page one. Just pick a side, stake an
amount, and win if you're right.

---

## Your tool stack

| Tool | What you use it for |
|---|---|
| Google Antigravity (your main AI) | Writing all code, logic, and copy |
| v0.dev | Generating polished React UI from descriptions |
| 21st.dev | Grabbing ready-made components (cards, feed, leaderboard) |
| Shadcn/ui | Base component system that v0 outputs by default |
| Remix or Next.js | App framework (Next.js recommended — v0 outputs it natively) |
| Wagmi + RainbowKit | Wallet connection (hidden behind a "Play Now" button) |
| DreamDEX SDK | Creating and resolving Event Contracts on Somnia Testnet |
| Somnia Testnet RPC | Chain: RPC https://dream-rpc.somnia.network |
| Vercel | Free deployment in one click |
| Figma (free) | Slide deck mockups only |

---

## Phase 1 — Setup (Day 1, ~3 hours)

### Step 1.1 — Scaffold the project

Prompt to give Antigravity:

```
Create a new Next.js 14 app with TypeScript, Tailwind CSS, and Shadcn/ui.
App name: predictnaiija. Install wagmi v2, viem, and @rainbow-me/rainbowkit.
Configure a custom chain for Somnia Testnet:
  chainId: 50312
  name: "Somnia Testnet"
  rpcUrl: "https://dream-rpc.somnia.network"
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }
  blockExplorer: "https://shannon-explorer.somnia.network"
Set up the WagmiProvider and RainbowKitProvider wrapping the app in layout.tsx.
```

### Step 1.2 — Install DreamDEX SDK

Prompt:

```
Install the DreamDEX Event Contracts SDK from npm. Show me the import path
and initialize the client pointed at Somnia Testnet with a read-only provider.
Create a lib/dreamdex.ts file that exports the initialized client.
```

> If DreamDEX SDK is not on npm, prompt: "Use viem to interact with the
> DreamDEX Event Contract ABI directly. Find the ABI from the DreamDEX
> documentation at https://docs.dreamdex.io and create a typed contract
> client in lib/dreamdex.ts"

### Step 1.3 — Deploy your test Event Contract

This is the most important technical step. Do this early so you have a real
contract to demo.

Prompt to Antigravity:

```
Using the DreamDEX SDK (or viem with the Event Contract ABI), write a script
at scripts/createMarket.ts that creates an Event Contract on Somnia Testnet
with these parameters:
  question: "Will Nigeria beat Ghana in their next AFCON qualifier?"
  outcomes: ["Yes — Nigeria wins", "No — Ghana wins or draw"]
  resolutionTime: <unix timestamp 7 days from now>
  category: "football"
Log the deployed contract address when done.
Run it with: npx ts-node scripts/createMarket.ts
```

Save every contract address you deploy. You'll need them for the demo.

---

## Phase 2 — Core App Pages (Days 2–4)

Build in this order. Each section has a prompt you paste into v0.dev for the
UI, then Antigravity to wire up the logic.

---

### Page 1: Feed (Home screen)

**v0.dev prompt:**
```
Design a mobile-first prediction market feed for an app called PredictNaija.
Dark background (#0A0A0F). Green accent (#00C853). Nigerian aesthetic — bold,
energetic, confident.

Each prediction card shows:
- Category badge (⚽ Football / 🎬 Entertainment / 💰 Economics)
- Question in large bold text e.g. "Will Nigeria beat Ghana?"
- Two outcome buttons side by side (e.g. "Yes 65%" | "No 35%")
- Total pool amount and time remaining
- A "Predict Now" CTA button in green

Top of screen: PredictNaija logo + leaderboard icon (trophy).
Bottom nav: Feed | My Bets | Leaderboard | Profile

Use Shadcn Card, Badge, Button components. Tailwind only. Mobile-first (375px base).
```

**Antigravity wiring prompt:**
```
In app/page.tsx, fetch all open prediction markets from our DreamDEX client
in lib/dreamdex.ts. Map each market to the PredictionCard component from v0.
Display loading skeletons while fetching. Handle empty state with a message:
"No open markets right now — check back soon."
For now, also hardcode 3 sample markets in lib/mockMarkets.ts so the UI
always has content during development.
```

---

### Page 2: Market Detail + Place Prediction

**v0.dev prompt:**
```
Design a market detail page for PredictNaija (dark #0A0A0F, green #00C853).

Top: back arrow + category badge + question headline (large, bold, 2 lines max)
Middle:
  - Two outcome buttons, full width, one highlights green when selected
  - A number input for stake amount in STT (label: "Your stake")
  - Below input: "You could win: X STT" — updates live as user types
  - Progress bar showing % split between outcomes (e.g. 65% Yes / 35% No)
Bottom:
  - "Confirm Prediction" button (green, full width)
  - Small text: "Powered by DreamDEX on Somnia"
  - If wallet not connected: button says "Connect to Predict" instead
```

**Antigravity wiring prompt:**
```
In app/market/[id]/page.tsx:
1. Fetch the market by contract address from DreamDEX client
2. When user selects an outcome and enters a stake amount, calculate potential
   winnings as: (userStake / totalPoolForOutcome) * totalPool
3. On "Confirm Prediction" click:
   a. If wallet not connected, trigger RainbowKit connect modal
   b. If connected, call the DreamDEX Event Contract's placeBet() function
      with the selected outcome index and stake amount in STT
   c. Show a loading state ("Submitting to Somnia...")
   d. On success: show a green toast "Prediction placed! 🎉" and navigate back to feed
   e. On error: show red toast with the error message
```

---

### Page 3: My Bets

**v0.dev prompt:**
```
Design a "My Bets" page for PredictNaija (dark theme, green accent).

Two tabs at top: "Active" | "Settled"

Active bet card shows:
- Market question
- Your prediction (e.g. "You said: Nigeria wins")
- Your stake + potential win
- Time remaining pill

Settled bet card shows:
- Market question
- Result (WIN in green or LOSS in muted red)
- Amount won or lost

Empty state for no bets: "You haven't made any predictions yet" + "Browse Markets" button
```

**Antigravity wiring prompt:**
```
In app/my-bets/page.tsx:
1. Get connected wallet address from wagmi useAccount hook
2. Fetch all Event Contract addresses from our markets list
3. For each contract, call getUserBets(walletAddress) from the DreamDEX SDK
4. Separate into active (not yet resolved) and settled (resolved)
5. For settled bets, check if user's outcome matched the resolution result
6. Display winnings for won bets, 0 for lost bets
```

---

### Page 4: Leaderboard

**v0.dev prompt:**
```
Design a leaderboard page for PredictNaija (dark theme, green accent).

Header: "Top Predictors This Week 🏆"

Leaderboard row shows:
- Rank number (1, 2, 3 with gold/silver/bronze colors, rest in white)
- Wallet address shortened (0x1a2b...9f0e)
- Number of correct predictions
- Total STT won

Top 3 rows have a subtle colored background (gold/silver/bronze tint).
Current user's row is always visible at bottom even if not in top 10,
highlighted with green border.
```

**Antigravity wiring prompt:**
```
In app/leaderboard/page.tsx:
1. Fetch all settled markets from DreamDEX
2. For each market, get the list of winners and their payout amounts
3. Aggregate by wallet address: count wins, sum total STT won
4. Sort descending by total STT won
5. Display top 20. Pin the connected user's row at the bottom of the list.
If the on-chain aggregation is too slow, cache results in a simple
localStorage object updated every 5 minutes.
```

---

### Page 5: Create Market (Admin only — for your demo)

You need to be able to create markets live during the demo. Build a simple
admin page at /admin that only works when connected with your wallet.

**Antigravity prompt:**
```
Create app/admin/page.tsx — a simple form to create a new DreamDEX Event Contract.
Fields:
  - Question (text input)
  - Category (select: Football | Entertainment | Economics)
  - Outcome A (text, default "Yes")
  - Outcome B (text, default "No")
  - Resolution date (date picker)
  - Submit button: "Deploy Market to Somnia"

On submit, call the createMarket script logic from Phase 1 but as a client-side
wagmi writeContract call. Show the deployed contract address on success.
Guard the page: if connected wallet !== process.env.NEXT_PUBLIC_ADMIN_WALLET,
show "Access denied."
```

---

## Phase 3 — The Nigerian Detail (Days 4–5)

This is what separates you from every other submission. Small touches that
show judges you thought about a real audience.

### 3.1 — Naira display alongside STT

Prompt:
```
Add a naira conversion display throughout the app. Create lib/ngnRate.ts
that fetches the current USD/NGN rate from https://open.er-api.com/v6/latest/USD
(free, no key needed). Assume 1 STT = $0.01 for testnet purposes.
Show amounts as: "50 STT (≈ ₦812)" everywhere a stake or prize is shown.
Cache the rate in localStorage for 1 hour.
```

### 3.2 — Pre-seeded real markets for the demo

Create these 6 markets on testnet before the demo. They make the app feel alive.

Prompt:
```
Create a script scripts/seedMarkets.ts that deploys 6 Event Contracts:
1. "Will Super Eagles qualify for AFCON 2027?" (Football, resolves Dec 2026)
2. "Will Osimhen score in his next club match?" (Football, resolves in 3 days)
3. "Who gets evicted from BBNaija next week?" — 3 outcomes: ["Housemate A", "Housemate B", "No eviction"] (Entertainment)
4. "Will dollar exceed ₦1,700 by September 30?" (Economics, resolves Sept 30)
5. "Will Burna Boy release an album before December?" (Entertainment)
6. "Will petrol price increase in September?" (Economics)
Run and log all contract addresses. Save them to lib/seededMarkets.ts
```

### 3.3 — Share to WhatsApp

Nigerians share everything on WhatsApp. This is your viral loop.

Prompt:
```
Add a share button to each market card. On click, open WhatsApp with a
pre-filled message:
"I just predicted [OUTCOME] on [QUESTION] on PredictNaija! 🔥
Think you can do better? Join me: https://predictnaiija.vercel.app/market/[ID]"
Use: window.open(`https://wa.me/?text=${encodeURIComponent(message)}`)
```

---

## Phase 4 — Polish (Day 6)

### 4.1 — Loading states everywhere

Prompt:
```
Add Shadcn Skeleton components as loading states for:
- The market feed (3 skeleton cards)
- Market detail page
- My Bets page
- Leaderboard
Use Suspense boundaries in Next.js where appropriate.
```

### 4.2 — Error handling

Prompt:
```
Add a global error boundary in app/error.tsx. For wallet errors, map these
specific messages to friendly Nigerian-tone responses:
- "user rejected transaction" → "You cancelled the prediction. No worries!"
- "insufficient funds" → "Not enough STT. Get testnet tokens at the Somnia faucet."
- "network error" → "Connection issue. Check your network and try again."
Show errors as toast notifications using Shadcn's Sonner component.
```

### 4.3 — Mobile responsiveness check

Prompt:
```
Audit every page for mobile (375px), tablet (768px), and desktop (1280px).
Fix any overflow, padding, or font size issues. The primary target is mobile —
desktop should look good but is secondary.
```

---

## Phase 5 — Submission Materials (Days 7–8)

### 5.1 — GitHub repo

Prompt:
```
Write a professional README.md for PredictNaija with these sections:
- Project overview (2 paragraphs)
- Live demo link
- Screenshots (I'll add these)
- Tech stack table
- How to run locally (step by step)
- How DreamDEX Event Contracts are used
- DreamDEX SDK feedback (what was clear, what was confusing, what's missing)
- Team
```

### 5.2 — Demo video script (2 minutes 30 seconds)

Record in this exact order — this order maximizes judge impact:

```
0:00–0:20  Hook: "What if your grandma in Lagos could bet on the Super Eagles 
           using blockchain — without knowing what blockchain is?"
           Show the app on mobile. Open the feed. It looks like a normal app.

0:20–0:55  Place a prediction live on screen.
           Pick "Nigeria beats Ghana" market. Enter stake. Hit confirm.
           Show the Somnia transaction confirming in ~1 second.
           Show the success toast.

0:55–1:20  Show My Bets page with the placed bet.
           Show the Leaderboard.
           Tap the WhatsApp share button — show the pre-filled message.

1:20–1:50  Show the Admin panel. Create a new market live.
           "Dollar above ₦1,800 by October?" — deploy it.
           Show it appear instantly on the feed.

1:50–2:10  Architecture slide: DreamDEX Event Contract → Somnia Testnet →
           PredictNaija frontend. 30 seconds of technical credibility.

2:10–2:30  Close: "Nigeria has 220 million people. Zero of them are using
           prediction markets today. PredictNaija changes that — one bet at a time."
```

### 5.3 — Presentation deck (8 slides)

Build in Figma or Canva. Dark theme. Green accent. Nigerian flag colors subtly.

```
Slide 1: Title — PredictNaija logo + tagline "Predict. Win. Repeat."
Slide 2: The problem — "Prediction markets exist. Nigerians don't use them. Why?"
Slide 3: The insight — show the gap diagram (competitors all target crypto natives)
Slide 4: The solution — 3 screenshots of the app
Slide 5: How it works — DreamDEX + Somnia architecture (simple diagram)
Slide 6: Market categories — Football / Entertainment / Economics with examples
Slide 7: Traction potential — Nigeria stats (220M people, mobile-first nation, 
         sports betting market size)
Slide 8: Roadmap — Testnet (now) → Mainnet → Mobile app → Telegram mini-app
```

### 5.4 — DreamDEX SDK Feedback Report

The judges require this. It shows you actually used the SDK deeply.
Write honestly. Judges respect real feedback.

Template:
```
## DreamDEX SDK Feedback — PredictNaija Team

### What worked well
- [Note 2-3 things that were smooth]

### Pain points
- [Note anything confusing, broken, or missing docs]

### Missing features we needed
- Multi-outcome markets (beyond binary Yes/No)
- Market category tagging on-chain
- Event to listen for market resolution (we polled instead)

### Documentation gaps
- [Be specific — judges use this to improve the SDK]

### Overall rating: X/10
```

---

## Judging score estimate (honest)

| Criterion | Weight | Your likely score | Why |
|---|---|---|---|
| Technical Implementation | 25% | 20/25 | Full DreamDEX + Somnia integration, real contracts |
| Innovation & Originality | 20% | 18/20 | Only consumer-facing app, unique market |
| User Experience | 20% | 19/20 | Mobile-first, Nigerian context, WhatsApp share |
| Business Impact | 20% | 18/20 | 220M user market argument is compelling |
| Presentation | 15% | 13/15 | Clear demo, relatable pitch |
| **Total** | **100%** | **~88/100** | **Strong podium finish** |

---

## Daily schedule

| Day | Focus |
|---|---|
| Day 1 | Phase 1: Scaffold + DreamDEX setup + first contract deployed |
| Day 2 | Phase 2: Feed page + Market detail page |
| Day 3 | Phase 2: My Bets + Leaderboard |
| Day 4 | Phase 2: Admin panel + Phase 3: Nigerian details |
| Day 5 | Phase 3: Seed 6 markets + WhatsApp share + Naira conversion |
| Day 6 | Phase 4: Polish, error handling, mobile audit |
| Day 7 | Deploy to Vercel + Record demo video + Write README |
| Day 8 | Submission: GitHub + video + deck + SDK feedback report |

---

## If something breaks

**DreamDEX SDK missing / broken:**
Use viem to call the contract ABI directly. Ask Antigravity:
"Write a viem contract client for this ABI: [paste ABI from DreamDEX docs]"

**Somnia Testnet down:**
Get STT testnet tokens at: https://faucet.somnia.network
Check status at: https://shannon-explorer.somnia.network

**Contract won't deploy:**
Make sure your wallet has STT. Gas on Somnia is very cheap — a few STT is enough.

**v0.dev output looks off:**
Add to the end of your v0 prompt: "Make it look premium and intentional,
not like a default template. Use custom font weights and tight spacing."

---

*Built for the Somnia × DreamDEX Event Contracts Hackathon*
*Deadline: September 8, 2026, 11:00 UTC*
