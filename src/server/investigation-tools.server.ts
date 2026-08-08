import { defineTool } from "@open-agent-loops/core";
import { z } from "zod";

import { SALES_CURRENT, SALES_PREVIOUS, evidenceSignals, topicClusters } from "@/data/demo";
import {
  GorillaProviderError,
  createGorillaMarketSignalsProviderFromEnv,
  type GorillaMarketSignalsProvider,
  type GorillaMarketSignalsResult,
} from "@/server/gorilla-market-signals.server";
import { marketSignalSchema, topicClusterSchema } from "@/types/investigation-api";
import type { MarketSignal, TopicCluster } from "@/types";

const signalMetadataSchema = z.object({
  id: z.string().min(1),
  numComments: z.number().nonnegative().optional(),
  validationScore: z.number().min(0).max(1).optional(),
  matchedSignals: z.array(z.string()).optional(),
  tier: z.string().optional(),
  channel: z.string().optional(),
  sentimentSource: z.literal("not_provided_by_gorilla"),
});

const marketSignalsProviderMetadataSchema = z.object({
  provider: z.enum(["gorilla", "mock"]),
  attemptedProvider: z.enum(["gorilla"]).optional(),
  fallbackUsed: z.boolean(),
  degraded: z.boolean(),
  degradedReason: z.string().optional(),
  searchId: z.string().optional(),
  status: z.enum(["running", "completed", "failed", "mock", "fallback"]),
  partial: z.boolean(),
  requestedSources: z.array(z.string()),
  doneSources: z.array(z.string()),
  pendingSources: z.array(z.string()),
  errors: z.record(z.string(), z.string()),
  realConversationCount: z.number().int().nonnegative(),
  signalMetadata: z.array(signalMetadataSchema),
  aggregation: z.object({
    topicClustersSource: z.enum(["derived_keyword_rules", "demo_fixture"]),
    sentimentClassificationSource: z.enum([
      "not_provided_by_gorilla_domain_neutral",
      "demo_fixture",
    ]),
    negativeSentimentChangePctSource: z.literal("demo_fixture_not_gorilla"),
  }),
});

export const marketSignalsObservationSchema = z.object({
  conversationsAnalyzed: z.number().int().nonnegative(),
  topicClusters: z.array(topicClusterSchema),
  negativeSentimentChangePct: z.number(),
  representativeEvidence: z.array(marketSignalSchema),
  providerMetadata: marketSignalsProviderMetadataSchema,
});

export const salesMetricsObservationSchema = z.object({
  previousSales: z.number(),
  currentSales: z.number(),
  changePct: z.number(),
});

export type MarketSignalsObservation = z.infer<typeof marketSignalsObservationSchema>;
export type SalesMetricsObservation = z.infer<typeof salesMetricsObservationSchema>;

const marketSignalsFixture = marketSignalsObservationSchema.parse({
  conversationsAnalyzed: 142,
  topicClusters,
  negativeSentimentChangePct: 36,
  representativeEvidence: evidenceSignals.filter((signal) =>
    ["reddit", "x", "linkedin"].includes(signal.source),
  ),
  providerMetadata: {
    provider: "mock",
    fallbackUsed: false,
    degraded: false,
    status: "mock",
    partial: false,
    requestedSources: [],
    doneSources: [],
    pendingSources: [],
    errors: {},
    realConversationCount: 0,
    signalMetadata: [],
    aggregation: {
      topicClustersSource: "demo_fixture",
      sentimentClassificationSource: "demo_fixture",
      negativeSentimentChangePctSource: "demo_fixture_not_gorilla",
    },
  },
});

const salesMetricsFixture = salesMetricsObservationSchema.parse({
  previousSales: SALES_PREVIOUS,
  currentSales: SALES_CURRENT,
  changePct: -11,
});

export const searchMarketSignalsTool = defineTool({
  name: "search_market_signals",
  description:
    "Search external customer and market conversations for real evidence. Returns provider provenance and explicitly labels demo-derived aggregation or fallback data.",
  parameters: z.object({
    query: z.string().max(300).optional().describe("Optional focus for the market-signal search."),
  }),
  execute: async (args, context) => {
    const observation = await executeMarketSignalSearch(
      args.query ?? "customer onboarding verification friction complaints",
      context.signal === undefined ? {} : { signal: context.signal },
    );
    return {
      content: JSON.stringify(observation),
      details: observation,
    };
  },
});

export const getSalesMetricsTool = defineTool({
  name: "get_sales_metrics",
  description:
    "Retrieve previous and current sales plus the percentage change for the detected business anomaly.",
  parameters: z.object({
    period: z
      .string()
      .max(100)
      .optional()
      .describe("Optional comparison period requested by the investigation."),
  }),
  execute: async () => ({
    content: JSON.stringify(salesMetricsFixture),
    details: salesMetricsFixture,
  }),
});

export const investigationTools = [searchMarketSignalsTool, getSalesMetricsTool];

type ExecuteMarketSignalSearchOptions = {
  signal?: AbortSignal;
  provider?: GorillaMarketSignalsProvider;
  useMock?: boolean;
};

export async function executeMarketSignalSearch(
  query: string,
  options: ExecuteMarketSignalSearchOptions = {},
): Promise<MarketSignalsObservation> {
  const useMock = options.useMock ?? process.env["VITE_USE_MOCK_MARKET_SIGNALS"] !== "false";
  if (useMock) return marketSignalsFixture;

  try {
    const provider = options.provider ?? createGorillaMarketSignalsProviderFromEnv();
    const result = await provider.search(query, options.signal);
    return buildGorillaObservation(result);
  } catch (error) {
    return buildFallbackObservation(error);
  }
}

function buildGorillaObservation(result: GorillaMarketSignalsResult): MarketSignalsObservation {
  return marketSignalsObservationSchema.parse({
    conversationsAnalyzed: result.signals.length,
    topicClusters: deriveTopicClusters(result.signals),
    negativeSentimentChangePct: marketSignalsFixture.negativeSentimentChangePct,
    representativeEvidence: result.signals,
    providerMetadata: {
      provider: "gorilla",
      fallbackUsed: false,
      degraded: Object.keys(result.errors).length > 0,
      status: result.status,
      partial: result.partial,
      searchId: result.searchId,
      requestedSources: result.requestedSources,
      doneSources: result.doneSources,
      pendingSources: result.pendingSources,
      errors: result.errors,
      realConversationCount: result.signals.length,
      signalMetadata: result.signalMetadata,
      aggregation: {
        topicClustersSource: "derived_keyword_rules",
        sentimentClassificationSource: "not_provided_by_gorilla_domain_neutral",
        negativeSentimentChangePctSource: "demo_fixture_not_gorilla",
      },
    },
  });
}

function buildFallbackObservation(error: unknown): MarketSignalsObservation {
  const providerError =
    error instanceof GorillaProviderError
      ? error
      : new GorillaProviderError("Unexpected Gorilla provider failure.", {
          code: "unexpected_error",
          cause: error,
        });
  const requestedSources = configuredSourceNames();

  return marketSignalsObservationSchema.parse({
    ...marketSignalsFixture,
    providerMetadata: {
      provider: "mock",
      attemptedProvider: "gorilla",
      fallbackUsed: true,
      degraded: true,
      degradedReason: providerError.code,
      ...(providerError.searchId === undefined ? {} : { searchId: providerError.searchId }),
      status: "fallback",
      partial: false,
      requestedSources,
      doneSources: [],
      pendingSources: requestedSources,
      errors: { gorilla: providerError.code },
      realConversationCount: 0,
      signalMetadata: [],
      aggregation: {
        topicClustersSource: "demo_fixture",
        sentimentClassificationSource: "demo_fixture",
        negativeSentimentChangePctSource: "demo_fixture_not_gorilla",
      },
    },
  });
}

function deriveTopicClusters(signals: MarketSignal[]): TopicCluster[] {
  const definitions = [
    {
      topic: "onboarding friction",
      pattern: /\b(onboarding|verification|sign[ -]?up|setup|activation)\b/i,
    },
    { topic: "pricing", pattern: /\b(price|pricing|cost|expensive|subscription)\b/i },
    { topic: "performance", pattern: /\b(slow|latency|performance|crash|timeout)\b/i },
    {
      topic: "feature requests",
      pattern: /\b(feature|request|wish|needs?|missing|support for)\b/i,
    },
  ];

  const clusters = definitions
    .map(({ topic, pattern }) => {
      const matches = signals.filter((signal) => pattern.test(signal.text));
      const relevance = matches
        .map((signal) => signal.relevance)
        .filter((value): value is number => value !== undefined);
      return {
        topic,
        count: matches.length,
        sentiment: "neutral" as const,
        ...(relevance.length === 0
          ? {}
          : {
              relevanceScore: relevance.reduce((sum, value) => sum + value, 0) / relevance.length,
            }),
      };
    })
    .filter((cluster) => cluster.count > 0)
    .sort((left, right) => right.count - left.count);

  return clusters.length > 0
    ? clusters
    : [{ topic: "market conversations", count: signals.length, sentiment: "neutral" }];
}

function configuredSourceNames() {
  const sources = process.env["GORILLA_SOURCES"]
    ?.split(",")
    .map((source) => source.trim())
    .filter(Boolean);
  return sources && sources.length > 0 ? sources : ["reddit", "twitter"];
}
