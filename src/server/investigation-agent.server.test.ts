/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { MockModelClient } from "@open-agent-loops/core/mocks/mock-model";

import { evidenceSignals, topicClusters } from "@/data/demo";
import { runInvestigation } from "@/server/investigation-agent.server";

const structuredResult = {
  hypothesis:
    "The onboarding verification step is the strongest suspected contributor to lower conversion.",
  languageQualifier: "probable_contributor",
  confidence: 84,
  urgency: { score: 82, level: "high" },
  summary:
    "Customer friction is concentrated around onboarding verification while sales declined in the same period.",
  evidence: evidenceSignals.slice(0, 3),
  clusters: topicClusters,
  recommendation:
    "Review the verification flow and run a controlled experiment with a simpler onboarding experience.",
  decisionRequired: true,
} as const;

describe("runInvestigation", () => {
  test("lets the model choose tools and returns only validated observable output", async () => {
    const model = new MockModelClient([
      {
        toolCalls: [
          {
            id: "call-market",
            name: "search_market_signals",
            arguments: { query: "onboarding complaints and sentiment" },
          },
          {
            id: "call-sales",
            name: "get_sales_metrics",
            arguments: { period: "current versus previous" },
          },
        ],
      },
      {
        reasoning: "private reasoning that must never reach the API response",
        text: JSON.stringify(structuredResult),
      },
    ]);
    const ids = ["session-id", "result-id"];

    const response = await runInvestigation({
      model,
      now: () => new Date("2026-08-08T15:00:00.000Z"),
      idFactory: () => ids.shift() ?? "extra-id",
    });

    expect(model.requests).toHaveLength(2);
    expect(model.requests[0]?.tools?.map((tool) => tool.name).sort()).toEqual([
      "get_sales_metrics",
      "search_market_signals",
    ]);
    expect(response.investigation).toMatchObject({
      id: "inv-result-id",
      title: "Onboarding Friction",
      status: "investigation_complete",
      confidence: 84,
      metrics: {
        salesChangePct: -11,
        negativeSignalChangePct: 36,
        totalSignals: 142,
      },
    });
    expect(response.toolCalls).toHaveLength(2);
    expect(response.toolCalls.every((call) => call.status === "complete")).toBe(true);
    expect(response.events.filter((event) => event.type === "tool_call_started")).toHaveLength(2);
    expect(response.events.filter((event) => event.type === "tool_call_completed")).toHaveLength(2);
    expect(JSON.stringify(response)).not.toContain("private reasoning");
  });

  test("rejects an invalid final model response", async () => {
    const model = new MockModelClient([{ text: JSON.stringify({ hypothesis: "Incomplete" }) }]);

    await expect(runInvestigation({ model })).rejects.toThrow();
  });
});
