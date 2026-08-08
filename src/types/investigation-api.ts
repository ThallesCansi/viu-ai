import { z } from "zod";
import type { AgentEvent, Investigation, MarketSignal, ToolCall, TopicCluster } from "@/types";

const signalSourceSchema = z.enum(["reddit", "x", "linkedin", "support", "other"]);
const sentimentSchema = z.enum(["positive", "negative", "neutral"]);

export const marketSignalSchema = z.object({
  id: z.string().min(1),
  source: signalSourceSchema,
  author: z.string().optional(),
  text: z.string().min(1),
  url: z.string().url().optional(),
  createdAt: z.string().optional(),
  sentiment: sentimentSchema,
  sentimentScore: z.number().min(-1).max(1).optional(),
  topic: z.string().optional(),
  engagement: z.number().nonnegative().optional(),
  relevance: z.number().min(0).max(1).optional(),
});

export const topicClusterSchema = z.object({
  topic: z.string().min(1),
  count: z.number().int().nonnegative(),
  changePct: z.number().optional(),
  sentiment: sentimentSchema,
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const agentInvestigationResultSchema = z.object({
  hypothesis: z.string().min(1),
  languageQualifier: z.enum([
    "probable_contributor",
    "correlation",
    "possible_cause",
    "insufficient_evidence",
  ]),
  confidence: z.number().min(0).max(100),
  urgency: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(["low", "medium", "high"]),
  }),
  summary: z.string().min(1),
  evidence: z.array(marketSignalSchema),
  clusters: z.array(topicClusterSchema),
  recommendation: z.string().min(1),
  decisionRequired: z.boolean(),
});

export const createInvestigationRequestSchema = z.object({
  objective: z.string().min(1).max(500).optional(),
});

const investigationSchema = agentInvestigationResultSchema.extend({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.literal("investigation_complete"),
  detectedAt: z.string().min(1),
  anomaly: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
  }),
  metrics: z.object({
    salesChangePct: z.number(),
    negativeSignalChangePct: z.number(),
    totalSignals: z.number().int().nonnegative(),
  }),
});

const agentEventSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  type: z.enum([
    "monitoring_tick",
    "signal_received",
    "anomaly_detected",
    "investigation_started",
    "tool_call_started",
    "tool_call_completed",
    "finding_created",
    "confidence_updated",
    "decision_required",
    "people_selected",
    "availability_found",
    "meeting_created",
    "voice_started",
    "decision_recorded",
    "action_created",
    "monitoring_resumed",
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  tool: z
    .object({
      name: z.string().min(1),
      provider: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const toolCallSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  name: z.string().min(1),
  query: z.string().optional(),
  status: z.enum(["waiting", "running", "complete", "failed"]),
  result: z.string().optional(),
});

export const createInvestigationResponseSchema = z.object({
  investigation: investigationSchema,
  toolCalls: z.array(toolCallSchema),
  events: z.array(agentEventSchema),
});

export type AgentInvestigationResult = Pick<
  Investigation,
  | "hypothesis"
  | "languageQualifier"
  | "confidence"
  | "urgency"
  | "summary"
  | "recommendation"
  | "decisionRequired"
> & {
  evidence: MarketSignal[];
  clusters: TopicCluster[];
};

export type CreateInvestigationRequest = { objective?: string };

export type CreateInvestigationResponse = {
  investigation: Investigation;
  toolCalls: ToolCall[];
  events: AgentEvent[];
};
