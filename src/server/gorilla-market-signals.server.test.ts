import { describe, expect, it, vi } from "vitest";

import {
  GorillaHttpMarketSignalsProvider,
  GorillaProviderError,
} from "@/server/gorilla-market-signals.server";
import { executeMarketSignalSearch } from "@/server/investigation-tools.server";

const noDelay = async () => undefined;

describe("GorillaHttpMarketSignalsProvider", () => {
  it("starts a search, polls by search_id, and returns completed normalized results", async () => {
    const fetchMock = mockFetch([
      jsonResponse(
        {
          search_id: "search-completed",
          status: "running",
          requested_sources: ["reddit", "twitter"],
          suggested_interval_ms: 1,
        },
        202,
      ),
      jsonResponse({
        search_id: "search-completed",
        status: "completed",
        requested_sources: ["reddit", "twitter"],
        done_sources: ["reddit", "twitter"],
        pending_sources: [],
        results: gorillaRows(10),
        total: 10,
        errors: {},
      }),
    ]);
    const provider = providerFor(fetchMock);

    const result = await provider.search("onboarding verification complaints");

    expect(result).toMatchObject({
      searchId: "search-completed",
      status: "completed",
      partial: false,
      doneSources: ["reddit", "twitter"],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/v2-search-stream?id=search-completed");
    expect(result.signals[0]).toMatchObject({
      source: "reddit",
      url: "https://reddit.com/r/saas/comments/row-0",
      engagement: 100,
      relevance: 0.9,
    });
    expect(result.signalMetadata[0]).toMatchObject({
      numComments: 12,
      validationScore: 0.8,
      channel: "saas",
    });
  });

  it("returns useful partial results after one requested source completes", async () => {
    const fetchMock = mockFetch([
      jsonResponse(
        {
          search_id: "search-partial",
          status: "running",
          requested_sources: ["reddit", "twitter"],
          suggested_interval_ms: 1,
        },
        202,
      ),
      jsonResponse({
        search_id: "search-partial",
        status: "running",
        requested_sources: ["reddit", "twitter"],
        done_sources: ["reddit"],
        pending_sources: ["twitter"],
        results: gorillaRows(10),
        total: 10,
        errors: {},
      }),
    ]);

    const result = await providerFor(fetchMock).search("onboarding friction");

    expect(result).toMatchObject({
      searchId: "search-partial",
      status: "running",
      partial: true,
      doneSources: ["reddit"],
      pendingSources: ["twitter"],
    });
    expect(result.signals).toHaveLength(10);
  });

  it.each([
    [401, "missing_auth"],
    [402, "insufficient_credits"],
    [429, "rate_limit"],
  ])("handles HTTP %i without retrying the POST", async (status, code) => {
    const fetchMock = mockFetch([jsonResponse({ code, error: `Gorilla ${code}` }, status)]);

    await expect(providerFor(fetchMock).search("onboarding friction")).rejects.toMatchObject({
      status,
      code,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("keeps successful source results when another source reports an error", async () => {
    const fetchMock = mockFetch([
      jsonResponse(
        {
          search_id: "search-source-error",
          status: "running",
          suggested_interval_ms: 1,
        },
        202,
      ),
      jsonResponse({
        search_id: "search-source-error",
        status: "completed",
        requested_sources: ["reddit", "twitter"],
        done_sources: ["reddit", "twitter"],
        pending_sources: [],
        results: gorillaRows(10),
        errors: { twitter: "upstream_timeout" },
      }),
    ]);

    const result = await providerFor(fetchMock).search("onboarding friction");

    expect(result.signals).toHaveLength(10);
    expect(result.errors).toEqual({ twitter: "upstream_timeout" });
    expect(result.status).toBe("completed");
  });

  it("preserves search_id when polling fails and never starts a second POST", async () => {
    const fetchMock = mockFetch([
      jsonResponse(
        {
          search_id: "search-poll-failure",
          status: "running",
          suggested_interval_ms: 1,
        },
        202,
      ),
      jsonResponse({ code: "internal", error: "Temporary poll failure" }, 500),
    ]);

    await expect(providerFor(fetchMock).search("onboarding friction")).rejects.toMatchObject({
      code: "internal",
      searchId: "search-poll-failure",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === "POST")).toHaveLength(1);
  });
});

describe("market signal fallback", () => {
  it("returns deterministic fallback metadata for a degraded Gorilla provider", async () => {
    const provider = {
      search: vi.fn().mockRejectedValue(
        new GorillaProviderError("Out of credits", {
          code: "insufficient_credits",
          status: 402,
          searchId: "preserved-search-id",
        }),
      ),
    };

    const observation = await executeMarketSignalSearch("onboarding friction", {
      provider,
      useMock: false,
    });

    expect(observation.representativeEvidence.length).toBeGreaterThan(0);
    expect(observation.providerMetadata).toMatchObject({
      provider: "mock",
      attemptedProvider: "gorilla",
      fallbackUsed: true,
      degraded: true,
      degradedReason: "insufficient_credits",
      searchId: "preserved-search-id",
      status: "fallback",
      realConversationCount: 0,
    });
  });
});

function providerFor(fetchImplementation: ReturnType<typeof mockFetch>) {
  return new GorillaHttpMarketSignalsProvider({
    apiKey: "test-key",
    baseUrl: "https://gorilla.test/v1",
    sources: ["reddit", "twitter"],
    latencyBudgetMs: 5_000,
    pollIntervalMs: 1,
    minResults: 10,
    minDoneSources: 1,
    fetch: fetchImplementation as unknown as typeof fetch,
    sleep: noDelay,
  });
}

function mockFetch(responses: Response[]) {
  return vi.fn(async (..._arguments: Parameters<typeof fetch>) => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected HTTP request");
    return response;
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function gorillaRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    source: "reddit",
    channel: "saas",
    title: `Onboarding verification complaint ${index}`,
    body_snippet: "The verification setup makes onboarding frustrating.",
    url: `https://reddit.com/r/saas/comments/row-${index}`,
    author: `u/customer-${index}`,
    created_utc: 1_716_480_000 + index,
    score: 100 + index,
    num_comments: 12 + index,
    result_score: 0.9,
    validation_score: 0.8,
    matched_signals: ["pain_or_frustration"],
    tier: "hot",
  }));
}
