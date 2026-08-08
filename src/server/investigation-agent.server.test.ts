import { MockModelClient } from "@open-agent-loops/core/mocks/mock-model";
import { describe, expect, it } from "vitest";

import { runInvestigation } from "@/server/investigation-agent.server";

const structuredResult = {
  hypothesis:
    "The onboarding verification step is the strongest suspected contributor to lower conversion.",
  languageQualifier: "probable_contributor",
  confidence: 84,
  urgency: { score: 70 },
  summary:
    "Customer friction is concentrated around onboarding verification while sales declined in the same period.",
  recommendation:
    "Review the verification flow and run a controlled experiment with a simpler onboarding experience.",
  decisionRequired: true,
} as const;

describe("runInvestigation", () => {
  it("steers early final answers until both evidence categories have been gathered", async () => {
    const model = new MockModelClient([
      {
        text: JSON.stringify(structuredResult),
      },
      {
        toolCalls: [
          {
            id: "call-market",
            name: "search_market_signals",
            arguments: { query: "onboarding complaints and sentiment" },
          },
        ],
      },
      {
        text: JSON.stringify(structuredResult),
      },
      {
        toolCalls: [
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

    expect(model.requests).toHaveLength(5);
    expect(model.requests[0]?.tools?.map((tool) => tool.name).sort()).toEqual([
      "get_sales_metrics",
      "search_market_signals",
    ]);
    expect(JSON.stringify(model.requests[1]?.messages)).toContain(
      "external market/customer signals and internal business performance",
    );
    expect(JSON.stringify(model.requests[3]?.messages)).toContain("internal business performance");
    expect(response.investigation).toMatchObject({
      id: "inv-result-id",
      title: "Onboarding Friction",
      status: "investigation_complete",
      confidence: 84,
      urgency: { score: 70, level: "high" },
      metrics: {
        salesChangePct: -11,
        negativeSignalChangePct: 36,
        totalSignals: 142,
      },
    });
    expect(response.investigation.evidence.length).toBeGreaterThan(0);
    expect(response.investigation.clusters.length).toBeGreaterThan(0);
    expect(response.investigation.hypothesis.toLowerCase()).toContain("onboarding");
    expect(response.toolCalls).toHaveLength(2);
    expect(response.toolCalls.map((call) => call.name).sort()).toEqual([
      "get_sales_metrics",
      "search_market_signals",
    ]);
    expect(response.toolCalls.every((call) => call.status === "complete")).toBe(true);
    expect(response.events.filter((event) => event.type === "tool_call_started")).toHaveLength(2);
    expect(response.events.filter((event) => event.type === "tool_call_completed")).toHaveLength(2);
    expect(JSON.stringify(response)).not.toContain("private reasoning");
  });

  it("rejects an invalid final model response after the evidence policy is satisfied", async () => {
    const model = new MockModelClient([
      {
        toolCalls: [
          {
            id: "call-market",
            name: "search_market_signals",
            arguments: {},
          },
          {
            id: "call-sales",
            name: "get_sales_metrics",
            arguments: {},
          },
        ],
      },
      { text: JSON.stringify({ hypothesis: "Incomplete" }) },
    ]);

    await expect(runInvestigation({ model })).rejects.toThrow();
  });

  it("fails after the bounded run when required evidence is still missing", async () => {
    const model = new MockModelClient(
      Array.from({ length: 8 }, () => ({ text: JSON.stringify(structuredResult) })),
    );

    await expect(runInvestigation({ model })).rejects.toThrow(
      "Evidence policy not satisfied within 8 steps",
    );
    expect(model.requests).toHaveLength(8);
  });
});
