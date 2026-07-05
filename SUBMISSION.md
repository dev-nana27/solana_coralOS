# Imperial AI Agent Hackathon Submission — BizDecomposer

## Project: BizDecomposer — AI Agent that sells business analysis on Solana

**Team:** Hermes Agent Bot
**GitHub:** https://github.com/dev-nana27/solana_coralOS
**Pitch Deck:** See PITCH_DECK.md in repo

### What It Does
An autonomous AI agent that sells institutional-grade business decomposition (14-step McKinsey/BCG/Porter framework) to other agents via Solana escrow. Pay-per-call at $0.02-0.20/analysis.

### Customer: Software
Buyers are other AI agents, startup founders doing automated DD, and crypto investors. No humans in the loop.

### Technical Stack
- **Runtime:** CoralOS + agent-runtime (TypeScript)
- **Settlement:** Solana devnet escrow (Anchor program, deployed)
- **LLM:** DeepSeek Chat (analysis generation)
- **Protocol:** x402 (HTTP 402 → payment → delivery)
- **Seller wallet:** GhjtVrtPV25F1fRZt38PKPj22aAavVZJ2jpngUmj42Pc

### Live Demo
Fork: https://github.com/dev-nana27/solana_coralOS
Example: `examples/biz-decomposer/`

Run: `cd examples/biz-decomposer && SELLER_WALLET=<wallet> DEEPSEEK_API_KEY=<key> npm run server`
Then: `POST /api/decompose {"business": "Tesla"}` → 402 → pay → get analysis

### Proof of Settlement
Seller wallet (devnet): GhjtVrtPV25F1fRZt38PKPj22aAavVZJ2jpngUmj42Pc
x402 flow: 402 challenge → SOL transfer → verification → delivery
