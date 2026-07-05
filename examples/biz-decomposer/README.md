# BizDecomposer — Agent that sells Business Analysis

An autonomous AI agent that sells institutional-grade business decomposition
on Solana devnet. Buyers pay in SOL → agent delivers McKinsey/BCG/Porter analysis.

## Architecture

```
Buyer Agent ──POST /api/decompose──→ Seller Agent (BizDecomposer)
                    │                        │
                    │ 402 + payment challenge │
                    ◄─────────────────────────│
                    │                         │
                    │ SOL transfer to escrow  │
                    ├────────────────────────→│ (Solana devnet)
                    │                         │
                    │ x-payment-proof + retry  │
                    ├────────────────────────→│
                    │                         │
                    │ Business analysis JSON  │
                    ◄─────────────────────────│
```

## Run

```bash
# Set your wallet
export SELLER_WALLET=<your-devnet-wallet>
export DEEPSEEK_API_KEY=<your-key>

# Start the seller
npm run server
```

## API

- `POST /api/decompose` — Submit business for analysis (expect 402 first time)
- `GET /api/agent-card` — Discovery metadata for agent-to-agent marketplaces
