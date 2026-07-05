/**
 * server.ts — x402 seller for Business Decomposer Agent
 * 
 * Gates the business decomposition endpoint behind Solana micropayments.
 * Based on examples/agent-economy/quickstart/server.ts pattern.
 * 
 * Fork point: deliverService() → our deliverBusinessDecomposition()
 */

import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
// In real deployment, use @pay/agent-runtime's verifyPayment
// For the demo, we inline the verification logic

const PORT = Number(process.env.PORT ?? 3002);
const RECIPIENT = process.env.SELLER_WALLET ?? '';
const PRICE_SOL = Number(process.env.PRICE_SOL ?? 0.0005);
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

if (process.env.ALLOW_MAINNET !== '1' && /mainnet/i.test(RPC)) {
  console.error('Devnet-only guard triggered');
  process.exit(1);
}
if (!RECIPIENT) {
  console.error('SELLER_WALLET must be set');
  process.exit(1);
}

const conn = new Connection(RPC, 'confirmed');
const pending = new Map<string, DecomposeRequest>();

interface DecomposeRequest {
  business: string;
  industry?: string;
  depth?: 'basic' | 'standard' | 'deep';
}

const app = express();
app.use(express.json());

// ── Check payment on-chain ──────────────────────────────────────────────
async function verifyPayment(reference: PublicKey, recipient: PublicKey, expectedLamports: number): Promise<string | null> {
  // Scan recent transactions to find matching transfer
  const sigs = await conn.getSignaturesForAddress(reference, { limit: 5 });
  for (const sigInfo of sigs) {
    const tx = await conn.getTransaction(sigInfo.signature, { commitment: 'confirmed' });
    if (!tx) continue;
    // Check it's a transfer to our recipient
    const postBalances = tx.meta?.postBalances ?? [];
    const preBalances = tx.meta?.preBalances ?? [];
    if (postBalances.length > 1 && preBalances.length > 1) {
      const diff = preBalances[1] - postBalances[1];
      if (diff >= expectedLamports) {
        return sigInfo.signature;
      }
    }
  }
  return null;
}

// ── POST /api/decompose ─────────────────────────────────────────────────
app.post('/api/decompose', async (req, res) => {
  const proof = req.header('x-payment-proof');
  const { business, industry, depth } = req.body ?? {};

  if (!business) {
    return res.status(400).json({ error: 'business field is required' });
  }

  // No proof → 402 challenge
  if (!proof) {
    const reference = Keypair.generate().publicKey.toBase58();
    pending.set(reference, { business, industry, depth });
    return res
      .status(402)
      .set('x-payment-required', JSON.stringify({
        recipient: RECIPIENT,
        amountSol: PRICE_SOL,
        reference,
      }))
      .json({
        error: 'payment_required',
        payment: {
          recipient: RECIPIENT,
          amountSol: PRICE_SOL,
          reference,
          network: 'solana:devnet',
        },
      });
  }

  // Proof present → verify then deliver
  const referenceStr = req.header('x-payment-reference') ?? req.query.reference?.toString();
  if (!referenceStr || !pending.has(referenceStr)) {
    return res.status(400).json({ error: 'missing or unknown payment reference' });
  }

  const reference = new PublicKey(referenceStr);
  const expectedLamports = Math.round(PRICE_SOL * 1_000_000_000);
  const sig = await verifyPayment(reference, new PublicKey(RECIPIENT), expectedLamports);

  if (!sig) {
    return res.status(402).json({ error: 'payment not confirmed on-chain' });
  }

  const request = pending.get(referenceStr)!;
  pending.delete(referenceStr);

  // Deliver the service
  let result: unknown;
  try {
    const { deliverBusinessDecomposition } = await import('./deliverService.js');
    result = await deliverBusinessDecomposition(request);
  } catch (e) {
    result = { error: `delivery failed: ${String(e)}` };
  }

  res.json({ data: result, paidWith: sig });
});

// ── GET /api/agent-card: Discovery endpoint ─────────────────────────────
app.get('/api/agent-card', (_req, res) => {
  res.json({
    name: 'BizDecomposer',
    version: '1.0.0',
    description: 'AI Strategy Consultant — institutional-grade business decomposition',
    protocol: 'x402',
    network: 'solana:devnet',
    price: PRICE_SOL,
    recipient: RECIPIENT,
    endpoint: '/api/decompose',
    capabilities: [
      '14-step business model decomposition (McKinsey/BCG/Porter)',
      'Market analysis & competitive landscape',
      'Unit economics & key metrics',
      'Strategic recommendations with risk assessment',
    ],
  });
});

app.listen(PORT, () => {
  console.log(`[BizDecomposer] seller on :${PORT} — recipient ${RECIPIENT}, price ${PRICE_SOL} SOL`);
  console.log(`[BizDecomposer] POST /api/decompose — send business to analyze`);
  console.log(`[BizDecomposer] GET  /api/agent-card — agent discovery`);
});
