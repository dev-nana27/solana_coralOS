# The TxODDS World Cup API — what it offers, and the roadmap built strictly on it

This demo sells **one real thing**: verified TxODDS **World Cup** football data, fetched through a
token-gated Solana subscription, turned into an LLM value call, and settled in devnet SOL. The whole
point is that it's *verified* — not mock, not scraped, not a second-hand feed.

So the rule for every feature on this page is: **stay inside the TxLINE API.** No second odds provider,
no web scraping, no fabricated numbers. Everything below is derived from the three snapshots TxLINE
already gives us (`fixtures`, `odds`, `scores`). That constraint *is* the credibility.

> The on-screen demo can fall back to clearly-labelled **demo data** when the token/proxy is offline
> (so a booth never shows an error) — but that fallback is always badged, and never presented as live.

---

## 1. Why this matters

The kit's thesis is three pillars made legible on one screen:

```
verified data (TxLINE)  →  reasoning (LLM edge)  →  settlement (Solana escrow)
```

- **Sticking to one real API is the demo's integrity.** "An agent sells *verified* World Cup data and
  gets paid trustlessly" only lands if the data is genuinely TxODDS. The moment you bolt on a second
  source or a mock, the story becomes "a dashboard," not "an oracle."
- **It's a reason to keep paying.** A live, moving, token-gated feed is something an agent will *re-buy*
  — that's the recurring-micropayment economy the kit is about. A one-shot static fetch isn't.
- **Depth sells.** The same TxLINE snapshots already carry more than we surface today (multiple markets,
  scores, line history via polling). Showing that depth proves the data is rich, not a single number.

---

## 2. What the World Cup API actually offers

The full surface we build on — the kit's client is [`agent/txline.ts`](agent/txline.ts), the wallet/token
holder is [`server/proxy.ts`](server/proxy.ts):

| Capability | Endpoint | Returns | In the kit today |
|---|---|---|---|
| **Fixtures** | `GET /api/fixtures/snapshot` | `Fixture[]` — `FixtureId`, `Competition`/`CompetitionId`, `Participant1`/`Participant2`, `Participant1IsHome`, `StartTime` | `client.fixtures()` · proxy `/api/fixtures` · the grid |
| **Odds** | `GET /api/odds/snapshot/{fixtureId}` | markets `[]` — `Bookmaker`, `SuperOddsType` (`1X2`, totals, BTTS…), `PriceNames` (`part1/draw/part2`), `Pct` (**de-margined** implied %) | `client.odds()` · proxy `/api/odds?fixtureId=` · the board |
| **Scores** | `GET /api/scores/snapshot/{fixtureId}` | score events | `client.scores()` — **not yet proxied** |

**Access model** (why the proxy exists): every call needs **both** a public guest JWT
(`POST /auth/guest/start`) **and** the activated `X-Api-Token`. The token comes from a one-time on-chain
subscribe (`server/mint.ts`); the browser never holds it — the proxy does. Host:
`https://txline-dev.txodds.com`.

**Free tier:** service level 1 = **World Cup + International Friendlies** (Int Friendlies is
`CompetitionId 430`), on-chain price 0 — that's the entire catalog this demo draws from.

**Two properties that shape everything below:**
- **Snapshots, not streams.** Each call is a point-in-time picture. "Live movement" = *you poll the
  snapshot over time* and diff it — there's no websocket to subscribe to.
- **De-margined already.** `Pct` is the StablePrice de-margined probability — no bookmaker-overround
  math to do; the verified probability is handed to you.

---

## 3. The roadmap — every item grounded in the API

Each feature lists **why it matters**, the **exact TxLINE call** it uses (no new source), how it
**surfaces** in the UI, and its **settlement tie** where relevant.

### 1) Full thesis on one screen — verified → edge → SOL  *(highest wow)*

- **Why:** collapses the entire pitch into one view — judges literally watch the money move.
- **API:** reuses `/api/odds/snapshot/{id}` (the verified input). That snapshot is fed to the seller's
  `edge` verb, which runs the LLM and returns `{call, confidence}`; the buyer then settles via escrow.
  **No new endpoint** — it's the odds snapshot + the agent + the escrow tx already in the kit.
- **Surface:** beside the odds board, render the agent's one-line **call + confidence**, and a
  **Settle** button that links the deposit/release on Explorer (`…/tx/{sig}?cluster=devnet`).
- **Status: ✅ shipped.** The transform is factored into [`agent/edge.ts`](agent/edge.ts) (`analyzeEdge`,
  with a deterministic fallback, unit-tested) and shared by the agent's `edge` verb *and* two new proxy
  routes:
  - `GET /api/edge?fixtureId=` — verified odds + fixtures → `{teams, market, analysis:{call, confidence}}`.
  - `GET /api/settle?amount=` — a **real devnet escrow deposit→release** ([`agent/escrow.ts`](agent/escrow.ts));
    self-pays from the buyer wallet (set `SELLER_WALLET` to pay a distinct seller), returns the two tx
    signatures + the escrow PDA, all as Explorer links. Returns `{ok:false}` (UI falls back) if no funded
    wallet / RPC.

### 2) Line movement — a sparkline per outcome

- **Why:** "verified data, *moving*" proves it's a feed worth re-buying, not a static fetch — the most
  on-thesis upgrade after #1.
- **API:** poll `/api/odds/snapshot/{id}` on an interval; because the API is snapshot-based, **movement
  is a series of snapshots**. Keep the last *N* `Pct` vectors per fixture in the proxy (in-memory ring).
- **Surface:** a small sparkline under each outcome bar + a Δ vs the previous snapshot.
- **Honest note:** pre-match lines drift slowly — shorten the poll for a demo, or seed the series from
  the labelled demo data so the sparkline has shape on day one.

### 3) Live scores / in-play

- **Why:** in-play is the highest-value sports data — it shows the API's depth, not just pre-match odds.
- **API:** `/api/scores/snapshot/{id}` — `client.scores()` **already exists**; just expose a proxy route
  `GET /api/scores?fixtureId=`.
- **Surface:** a live-score chip on the featured match (and cards).
- **Honest caveat:** free-tier fixtures are usually **pre-match**, so scores are often empty until a live
  match exists in the catalog — **gate the chip on data presence** so it only appears when real.

### 4) More markets — beyond 1X2

- **Why:** depth for almost no cost — the snapshot you already fetch carries **multiple** `SuperOddsType`
  markets; surfacing them shows the data is rich.
- **API:** **same** `/api/odds/snapshot/{id}`; iterate every `SuperOddsType` (1X2, Over/Under totals,
  BTTS…) instead of picking only `1X2`.
- **Surface:** a segmented control / tabs that switch the board between markets; the `edge` call can
  target the selected market.

### 5) Competition filter — World Cup vs Int Friendlies

- **Why:** the free tier bundles two competitions; a toggle frames "World Cup" cleanly and shows there's
  a catalog behind it.
- **API:** `/api/fixtures/snapshot` returns `Competition` per fixture — group/filter client-side — or
  `client.fixtures(competitionId)` with `FRIENDLIES_COMPETITION_ID = 430`.
- **Surface:** a segmented filter above the match grid.

---

## 4. How it all stays inside one API

```
                         ┌─────────────────────────── TxLINE (txline-dev.txodds.com) ───────────────────────────┐
  one-time subscribe ───▶│  /auth/guest/start (JWT)   /api/fixtures   /api/odds/{id}   /api/scores/{id}          │
  (server/mint.ts)       └──────────────────────────────────────▲───────────────────────────────────────────────┘
                                                                 │ JWT + X-Api-Token (held server-side)
                         ┌───────────── proxy (server/proxy.ts) ─┴─────────────┐        the browser holds NO secrets
   web (this folder) ───▶│ /api/fixtures  /api/odds  [+ /api/edge /api/scores] │◀─── fetch() only hits the proxy
                         └──────────────────────────────────────────────────────┘
                                       │ same odds snapshot
                                       ▼
   seller `edge` (service.ts) ── LLM ──▶ {call, confidence} ── buyer escrow deposit→release ──▶ Explorer tx
                                                                         (the `reference` threads the order)
```

Every box draws from the **same three TxLINE snapshots**. The LLM edge and the escrow settlement are
*transformations of* that data and the payment for it — not new data.

## 5. What we deliberately don't do

- **No second data provider** — keeps "verified" honest and the demo legible.
- **No margin math** — `Pct` is already de-margined (StablePrice).
- **No mainnet** — devnet only; the kit's guard enforces it.
- **No unlabelled mock** — the demo fallback exists only so a booth never blanks, and it's always badged.

## 6. Suggested build order (for a demo)

1. **#1 thesis-on-one-screen** — the headline; reuses everything, adds the edge + Explorer link.
2. **#4 more markets** — almost free (same payload), adds visible depth.
3. **#5 competition filter** — cheap, frames the catalog.
4. **#2 line movement** — the "it's alive" moment.
5. **#3 live scores** — data-permitting (often pre-match on the free tier).

See also: [`README.md`](README.md) (one-time subscribe + run) and the standalone `txline` service
reference in [`agent/service.ts`](agent/service.ts).
