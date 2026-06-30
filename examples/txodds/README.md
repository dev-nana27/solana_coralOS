# Example: TxODDS World Cup Oracle

> An agent that **sells verified World Cup data for devnet SOL**. It fetches verified TxODDS odds on
> devnet, an LLM turns them into a one-line value call, and the kit's escrow settles the delivery —
> automatically, on-chain. Free tier, devnet, no Docker.

This is the worked answer to the track brief — *build an agent that sells a real service and gets paid
in SOL* — pointed at the hackathon's own dataset ([TxODDS' **TxLINE**](https://txline-docs.txodds.com)).

## What it is

```
examples/txodds/
  agent/
    edge.ts       analyzeEdge(): verified odds -> an LLM value call + confidence (the product)
    service.ts    the deliverService() fork point: data -> LLM edge -> the string the buyer pays for
    escrow.ts     buyer-side escrow client (deposit/release); fetches the IDL on-chain
    txline.ts     standalone TxLINE data client (guest auth + fixtures/odds/scores)
  server/
    proxy.ts      live-data + escrow backend: subscribes on devnet, serves /api/board /api/edge /api/settle
    mint.ts       one-time: mint a free-tier TxLINE token into .env (optional)
  web/            React 18 app (no build): the board, the agent's call, auto-settlement links
  escrow/         the Anchor escrow contract (the settlement spine) + its client/tests
```

## The product

`analyzeEdge()` is the on-thesis transform: **verified de-margined odds in → an LLM value call out**,
paid for on delivery. The proxy exposes it at `/api/edge`; the same function is the body of the
standalone `deliverService()` reference in `service.ts` if you fork the agent.

## Run it

From the repo root (this is what `npm run dev` does):

```sh
npm install --prefix scripts && node scripts/setup.js   # devnet wallets → .env (fund the buyer)
# add ANTHROPIC_API_KEY to .env, then:
npm run dev            # proxy (:8801) + Oracle UI (:3020), opens the browser
```

Or run the two processes by hand from `examples/txodds/`:

```sh
npm install
npm run proxy          # live data + escrow on http://localhost:8801
npm run web            # the Oracle UI on http://localhost:3020
```

The proxy needs `BUYER_KEYPAIR_B58` in the repo `.env` (from `node scripts/setup.js`) funded with a
little devnet SOL. It subscribes that wallet to the free World Cup tier on devnet, then serves **only
fixtures with verified live odds**. The browser never sees the token or the key — everything sensitive
stays in the proxy. Without funding/a key, the board shows clearly-labelled sample data.

## Verified on devnet (2026-06)

| Check | Value |
|---|---|
| Devnet program | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` |
| Devnet API host | `https://txline-dev.txodds.com` |
| Free tier | service **level 1** — World Cup & Int Friendlies, on-chain price **0** |

**Three corrections** vs. the published TxODDS examples — all already applied in `server/proxy.ts`:
1. **Host:** use `txline-dev.txodds.com` (the repo's `oracle-dev.txodds.com` does not resolve).
2. **Mint:** subscribe with the treasury's `4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG`, **not** the
   IDL's stale `TXLINE_MINT`. `subscribe_v2` is in the IDL but not deployed on devnet, so use the legacy
   `subscribe(1, 4)` with the real mint.
3. **Odds path:** `/api/odds/snapshot/{fixtureId}` — a path segment, not a query param.

## The escrow contract

The settlement spine lives in [`escrow/`](escrow/README.md) — the only Rust in the kit, deployed to
devnet and called (not forked) by `agent/escrow.ts`. The demo runs against the deployed program with no
local build; `escrow/README.md` covers building/redeploying your own.
