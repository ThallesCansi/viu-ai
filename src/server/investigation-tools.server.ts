import { defineTool } from "@open-agent-loops/core";
import { z } from "zod";

import { SALES_CURRENT, SALES_PREVIOUS, evidenceSignals, topicClusters } from "@/data/demo";
import { marketSignalSchema, topicClusterSchema } from "@/types/investigation-api";

export const marketSignalsObservationSchema = z.object({
  conversationsAnalyzed: z.number().int().nonnegative(),
  topicClusters: z.array(topicClusterSchema),
  negativeSentimentChangePct: z.number(),
  representativeEvidence: z.array(marketSignalSchema),
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
});

const salesMetricsFixture = salesMetricsObservationSchema.parse({
  previousSales: SALES_PREVIOUS,
  currentSales: SALES_CURRENT,
  changePct: -11,
});

export const searchMarketSignalsTool = defineTool({
  name: "search_market_signals",
  description:
    "Search external customer and market conversations for relevant signals, topic clusters, sentiment changes, and representative evidence.",
  parameters: z.object({
    query: z.string().max(300).optional().describe("Optional focus for the market-signal search."),
  }),
  execute: async () => ({
    content: JSON.stringify(marketSignalsFixture),
    details: marketSignalsFixture,
  }),
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
