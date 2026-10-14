import * as ort from 'onnxruntime-web';
import type { ModelEngineStatus } from '../types/crm';

// Point WASM paths to our local self-hosted public wasm directory
ort.env.wasm.wasmPaths = '/wasm/';
ort.env.wasm.numThreads = 1;

let leadSession: ort.InferenceSession | null = null;
let paymentSession: ort.InferenceSession | null = null;
let isInitializing = false;

export const engineStatus: ModelEngineStatus = {
  leadScoringReady: false,
  paymentPredictionReady: false,
  backend: 'WASM',
  latencyMs: 0,
  inferenceCount: 0
};

export async function initEdgeAI(): Promise<ModelEngineStatus> {
  if (leadSession && paymentSession) {
    return engineStatus;
  }

  if (isInitializing) {
    return engineStatus;
  }

  isInitializing = true;

  try {
    console.log("Initializing Smartlance Edge AI (ONNX Runtime Web - Local WASM)...");
    const t0 = performance.now();

    // 1. Load Lead Scoring Model
    if (!leadSession) {
      leadSession = await ort.InferenceSession.create('/models/lead_scoring_model.onnx', {
        executionProviders: ['wasm']
      });
      engineStatus.leadScoringReady = true;
    }

    // 2. Load Payment Prediction Model
    if (!paymentSession) {
      paymentSession = await ort.InferenceSession.create('/models/payment_prediction_model.onnx', {
        executionProviders: ['wasm']
      });
      engineStatus.paymentPredictionReady = true;
    }

    const t1 = performance.now();
    engineStatus.latencyMs = Math.round(t1 - t0);
    console.log(`Smartlance Edge AI ready in ${engineStatus.latencyMs}ms! Both models running on-device.`);
  } catch (err) {
    console.warn("Could not load native ONNX model via WASM (fallback to calibrated heuristics):", err);
    engineStatus.backend = 'HeuristicFallback';
    engineStatus.leadScoringReady = true;
    engineStatus.paymentPredictionReady = true;
  } finally {
    isInitializing = false;
  }

  return engineStatus;
}

/**
 * Predicts Lead Conversion Score (0 - 100) on-device
 */
export async function predictLeadScore(lead: {
  companySize: number;
  estimatedBudget: number;
  interactionCount: number;
  hasNda: boolean;
  decisionMakerInvolved: boolean;
  source: string;
  industry: string;
}): Promise<{ score: number; probability: number; latencyMs: number }> {
  await initEdgeAI();

  const tStart = performance.now();

  if (leadSession) {
    try {
      const feeds: Record<string, ort.Tensor> = {
        company_size: new ort.Tensor('float32', new Float32Array([lead.companySize]), [1, 1]),
        estimated_budget: new ort.Tensor('float32', new Float32Array([lead.estimatedBudget]), [1, 1]),
        interaction_count: new ort.Tensor('float32', new Float32Array([lead.interactionCount]), [1, 1]),
        has_nda: new ort.Tensor('float32', new Float32Array([lead.hasNda ? 1.0 : 0.0]), [1, 1]),
        decision_maker_involved: new ort.Tensor('float32', new Float32Array([lead.decisionMakerInvolved ? 1.0 : 0.0]), [1, 1]),
        source: new ort.Tensor('string', [lead.source], [1, 1]),
        industry: new ort.Tensor('string', [lead.industry], [1, 1]),
      };

      const results = await leadSession.run(feeds);
      const probData = results.probabilities.data as Float32Array;
      
      // Index 1 corresponds to converted probability
      const conversionProb = Math.min(Math.max(probData[1], 0.01), 0.99);
      const score = Math.round(conversionProb * 100);
      const latencyMs = Math.round(performance.now() - tStart);

      engineStatus.inferenceCount++;
      return { score, probability: parseFloat(conversionProb.toFixed(3)), latencyMs };
    } catch (err) {
      console.error("ONNX lead inference failed, switching to calibrated heuristic:", err);
    }
  }

  // Calibrated Heuristic Fallback (Calibrated for INR ₹)
  let logit = -2.8 
    + 0.0000005 * lead.estimatedBudget
    + 0.18 * lead.interactionCount
    + (lead.hasNda ? 0.9 : 0)
    + (lead.decisionMakerInvolved ? 1.1 : 0);

  if (lead.source === 'referral') logit += 1.4;
  else if (lead.source === 'inbound') logit += 0.7;
  else if (lead.source === 'cold_outreach') logit -= 0.5;

  if (lead.industry === 'tech') logit += 0.4;
  else if (lead.industry === 'finance') logit += 0.5;

  const prob = 1 / (1 + Math.exp(-logit));
  const finalProb = Math.min(Math.max(prob, 0.05), 0.98);
  const latencyMs = Math.round(performance.now() - tStart);

  engineStatus.inferenceCount++;
  return {
    score: Math.round(finalProb * 100),
    probability: parseFloat(finalProb.toFixed(3)),
    latencyMs
  };
}

/**
 * Predicts Invoice Payment Delay (in days) on-device
 */
export async function predictPaymentDelay(invoice: {
  amount: number;
  paymentTermDays: number;
  priorLatePayments: number;
  daysUntilDue: number;
  disputedItems: boolean;
  clientType: string;
}): Promise<{ predictedLateDays: number; riskLevel: 'low' | 'moderate' | 'high' | 'critical'; latencyMs: number }> {
  await initEdgeAI();

  const tStart = performance.now();

  let lateDays = 0;

  if (paymentSession) {
    try {
      const feeds: Record<string, ort.Tensor> = {
        amount: new ort.Tensor('float32', new Float32Array([invoice.amount]), [1, 1]),
        payment_term_days: new ort.Tensor('float32', new Float32Array([invoice.paymentTermDays]), [1, 1]),
        prior_late_payments: new ort.Tensor('float32', new Float32Array([invoice.priorLatePayments]), [1, 1]),
        days_until_due: new ort.Tensor('float32', new Float32Array([invoice.daysUntilDue]), [1, 1]),
        disputed_items: new ort.Tensor('float32', new Float32Array([invoice.disputedItems ? 1.0 : 0.0]), [1, 1]),
        client_type: new ort.Tensor('string', [invoice.clientType], [1, 1]),
      };

      const results = await paymentSession.run(feeds);
      const lateData = results.variable.data as Float32Array;
      lateDays = Math.max(0, Math.round(lateData[0]));
    } catch (err) {
      console.error("ONNX payment inference failed, using fallback:", err);
      lateDays = calculatePaymentFallback(invoice);
    }
  } else {
    lateDays = calculatePaymentFallback(invoice);
  }

  const latencyMs = Math.round(performance.now() - tStart);
  engineStatus.inferenceCount++;

  let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
  if (lateDays > 21) riskLevel = 'critical';
  else if (lateDays > 12) riskLevel = 'high';
  else if (lateDays > 5) riskLevel = 'moderate';

  return {
    predictedLateDays: lateDays,
    riskLevel,
    latencyMs
  };
}

function calculatePaymentFallback(invoice: {
  amount: number;
  paymentTermDays: number;
  priorLatePayments: number;
  daysUntilDue: number;
  disputedItems: boolean;
  clientType: string;
}): number {
  let days = 0.0000025 * invoice.amount + 0.12 * invoice.paymentTermDays + 4.5 * invoice.priorLatePayments;
  if (invoice.disputedItems) days += 14.0;
  if (invoice.clientType === 'enterprise') days += 5.0;
  else if (invoice.clientType === 'startup') days += 2.5;
  return Math.max(0, Math.round(days));
}
