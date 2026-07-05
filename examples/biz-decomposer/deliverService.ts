/**
 * deliverService.ts — Business Decomposer Agent
 * Fork point from solana_coralOS starter kit.
 * Replaces default deliverData() with institutional-grade business analysis.
 */

const FRAMEWORK_PROMPT = `You are a senior strategy consultant from McKinsey. 
Decompose the following business using ALL THREE frameworks:
1. 第一性原理 (First Principles) — Strip to root cause
2. 人性框架 (Human Nature) — What do buyers fear/want?
3. 商业模式 (Business Model) — Sell solutions, not commodities

Output structure:
## Executive Summary
## 1. First-Principles Analysis
### Root Cause
### Core Assumptions to Challenge
## 2. Human-Nature Analysis  
### Buyer Fears
### Buyer Desires
### Emotional Drivers
## 3. Business Model Analysis
### Revenue Streams
### Cost Structure
### Unit Economics
### Competitive Moat
## 4. Strategic Recommendations
### Immediate Actions (0-3 months)
### Medium-term (3-12 months)
### Risks & Mitigations
## 5. Key Metrics & KPIs`;

interface DecomposeRequest {
  business: string;
  industry?: string;
  depth?: 'basic' | 'standard' | 'deep';
}

interface DecomposeResult {
  request: DecomposeRequest;
  analysis: string;
  model: string;
  tokenCost: number;
  timestamp: string;
}

export async function deliverBusinessDecomposition(
  request: DecomposeRequest
): Promise<DecomposeResult> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: FRAMEWORK_PROMPT },
        { role: 'user', content: JSON.stringify({
          business: request.business,
          industry: request.industry ?? 'general',
          depth: request.depth ?? 'standard',
        })},
      ],
      max_tokens: request.depth === 'deep' ? 4000 : 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content ?? '';
  const usage = data.usage ?? { total_tokens: 0 };

  return {
    request,
    analysis: content,
    model: 'deepseek-chat',
    tokenCost: usage.total_tokens ?? 0,
    timestamp: new Date().toISOString(),
  };
}

export const SELLER_PROFILE = {
  name: 'BizDecomposer',
  description: 'AI Strategy Consultant — decomposes any business model using 14-step analysis',
  pricing: {
    basic: { sol: 0.0001, usdc: 0.02 },
    standard: { sol: 0.0005, usdc: 0.10 },
    deep: { sol: 0.001, usdc: 0.20 },
  },
  capabilities: [
    'Business model decomposition',
    'Market analysis & competitor mapping',
    'Unit economics calculation',
    'Strategic recommendations',
  ],
};

export type { DecomposeRequest, DecomposeResult };
