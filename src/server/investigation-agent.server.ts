import {
  AgentEventType as LoopEventType,
  SessionMemoryStore,
  isAssistantMessage,
  runAgent,
  userMessage,
} from "@open-agent-loops/core";
import type { AgentEvent as LoopAgentEvent, ModelClient } from "@open-agent-loops/core";
import { OpenAICompatibleModel } from "@open-agent-loops/core/providers/openai";
import { z } from "zod";

import {
  investigationTools,
  marketSignalsObservationSchema,
  salesMetricsObservationSchema,
  type MarketSignalsObservation,
  type SalesMetricsObservation,
} from "@/server/investigation-tools.server";
import {
  agentInvestigationResultSchema,
  type AgentInvestigationResult,
  type CreateInvestigationResponse,
} from "@/types/investigation-api";
import type { AgentEvent, Investigation, MarketSignal, ToolCall, TopicCluster } from "@/types";

export const DEFAULT_INVESTIGATION_OBJECTIVE =
  "Investigate the detected business anomaly. No supporting evidence has been loaded yet. Gather sufficient evidence and produce an actionable business investigation.";

const SYSTEM_PROMPT = `You are VIU AI, an autonomous market-intelligence agent.

Decide which available tools to call, when to call them, and what arguments to use. Do not follow a predetermined tool sequence. A business investigation cannot be completed until evidence from both external market/customer signals and internal business performance has been gathered. The two evidence categories are independent, so when both are missing and both tools are appropriate, request both tools in the same assistant turn so they can run together.

Ground the hypothesis, summary, confidence, urgency score, and recommendation only in returned tool observations. When topic clusters are available, identify the strongest supported finding from their counts and relevance; never substitute a generic issue that does not appear in the evidence.

Do not claim causation unless the evidence establishes it. Prefer correlation, possible cause, probable contributor, or insufficient evidence. Never reveal chain-of-thought or hidden reasoning.

Your final assistant message must contain only one JSON object that conforms to this JSON Schema. Do not wrap it in Markdown. The server derives evidence, topic clusters, business metrics, and urgency level from validated tool observations; do not invent or include them in your final object:
${JSON.stringify(z.toJSONSchema(agentInvestigationResultSchema))}`;

const DEFAULT_AGENT_TIMEOUT_MS = 90_000;
const DEFAULT_MODEL_REQUEST_TIMEOUT_MS = 40_000;
const AGENT_MAX_STEPS = 8;

export class AgentConfigurationError extends Error {}

type RunInvestigationOptions = {
  objective?: string;
  model?: ModelClient;
  signal?: AbortSignal;
  now?: () => Date;
  idFactory?: () => string;
};

type EventCollector = {
  observe: (event: LoopAgentEvent) => void;
  events: AgentEvent[];
  toolCalls: ToolCall[];
  calledTools: Set<string>;
  observations: {
    marketSignals: MarketSignalsObservation[];
    salesMetrics: SalesMetricsObservation[];
  };
};

export async function runInvestigation(
  options: RunInvestigationOptions = {},
): Promise<CreateInvestigationResponse> {
  const investigationStartedAt = Date.now();
  let investigationOutcome = "failed";
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const sessionId = `investigation-${idFactory()}`;
  const collector = createEventCollector(sessionId);
  const controller = new AbortController();
  const agentTimeoutMs = positiveIntegerEnv("AGENT_TIMEOUT_MS", DEFAULT_AGENT_TIMEOUT_MS);
  const timeout = setTimeout(
    () => controller.abort(new Error("Agent investigation timed out.")),
    agentTimeoutMs,
  );
  const forwardAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const model = options.model ?? createFeatherlessModel();
    const run = await runAgent({
      model,
      memory: new SessionMemoryStore(),
      sessionId,
      system: SYSTEM_PROMPT,
      prompt: options.objective ?? DEFAULT_INVESTIGATION_OBJECTIVE,
      tools: investigationTools,
      maxSteps: AGENT_MAX_STEPS,
      hooks: {
        drainFollowUp: () => {
          const missing = missingEvidenceCategories(collector.calledTools);
          return missing.length > 0
            ? [userMessage({ content: evidencePolicyFollowUp(missing) })]
            : [];
        },
      },
      onEvent: collector.observe,
      signal: controller.signal,
    });

    assertEvidencePolicySatisfied(collector.calledTools);
    const output = extractFinalAssistantText(run.messages);
    const result = parseAgentResult(output);
    const investigation = buildInvestigation(result, collector.observations, now(), idFactory());

    collector.events.push(
      createUiEvent(sessionId, collector.events.length + 1, "confidence_updated", {
        title: `Confidence updated to ${result.confidence}%`,
      }),
      createUiEvent(sessionId, collector.events.length + 2, "finding_created", {
        title: "Autonomous investigation completed",
        description: result.hypothesis,
      }),
    );
    if (result.decisionRequired) {
      collector.events.push(
        createUiEvent(sessionId, collector.events.length + 1, "decision_required", {
          title: "Human decision required",
          description: result.recommendation,
        }),
      );
    }

    const response = {
      investigation,
      toolCalls: collector.toolCalls,
      events: [...collector.events].reverse(),
    };
    investigationOutcome = "completed";
    return response;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
    logDevelopmentTiming("investigation_finished", {
      durationMs: Date.now() - investigationStartedAt,
      outcome: investigationOutcome,
    });
  }
}

function createFeatherlessModel(): ModelClient {
  const apiKey = process.env["FEATHERLESS_API_KEY"];
  if (!apiKey) {
    throw new AgentConfigurationError("FEATHERLESS_API_KEY is not configured on the server.");
  }

  return new OpenAICompatibleModel({
    apiKey,
    baseURL: process.env["FEATHERLESS_BASE_URL"] ?? "https://api.featherless.ai/v1",
    model: process.env["FEATHERLESS_MODEL"] ?? "Qwen/Qwen3-32B",
    thinking: "auto",
    timeout: positiveIntegerEnv("FEATHERLESS_REQUEST_TIMEOUT_MS", DEFAULT_MODEL_REQUEST_TIMEOUT_MS),
    maxRetries: 0,
    params: { temperature: 0.1 },
  });
}

function createEventCollector(sessionId: string): EventCollector {
  const events: AgentEvent[] = [];
  const toolCalls: ToolCall[] = [];
  const calledTools = new Set<string>();
  const observations = {
    marketSignals: [] as MarketSignalsObservation[],
    salesMetrics: [] as SalesMetricsObservation[],
  };
  const toolStartedAt = new Map<string, number>();
  let modelTurn: { step: number; startedAt: number } | undefined;
  let eventSequence = 0;

  return {
    events,
    toolCalls,
    calledTools,
    observations,
    observe(event) {
      if (event.type === LoopEventType.AgentStart) {
        events.push(
          createUiEvent(sessionId, ++eventSequence, "investigation_started", {
            title: "VIU AI investigation started",
            description: "Open Agent Loops is selecting the evidence it needs.",
            timestamp: event.timestamp,
          }),
        );
        return;
      }

      if (event.type === LoopEventType.TurnStart) {
        modelTurn = { step: event.step, startedAt: event.timestamp };
        logDevelopmentTiming("model_turn_started", { step: event.step });
        return;
      }

      if (event.type === LoopEventType.Message && isAssistantMessage(event.message)) {
        if (modelTurn) {
          logDevelopmentTiming("model_turn_completed", {
            step: modelTurn.step,
            durationMs: event.timestamp - modelTurn.startedAt,
          });
          modelTurn = undefined;
        }
        return;
      }

      if (event.type === LoopEventType.ToolStart) {
        const provider = providerFor(event.toolName);
        toolStartedAt.set(event.toolCallId, event.timestamp);
        logDevelopmentTiming("tool_started", { tool: event.toolName });
        toolCalls.push({
          id: event.toolCallId,
          provider,
          name: event.toolName,
          query: JSON.stringify(event.args),
          status: "running",
        });
        events.push(
          createUiEvent(sessionId, ++eventSequence, "tool_call_started", {
            title:
              event.toolName === "search_market_signals" && provider === "Gorilla"
                ? "Gorilla search started"
                : `Agent called ${event.toolName}`,
            tool: { name: event.toolName, provider },
            metadata: { arguments: event.args },
            timestamp: event.timestamp,
          }),
        );
        return;
      }

      if (event.type === LoopEventType.ToolEnd) {
        const startedAt = toolStartedAt.get(event.toolCallId);
        logDevelopmentTiming("tool_completed", {
          tool: event.toolName,
          durationMs: startedAt === undefined ? undefined : event.timestamp - startedAt,
          outcome: event.isError ? "failed" : "completed",
        });
        toolStartedAt.delete(event.toolCallId);
        const observation = event.isError
          ? undefined
          : validateAndStoreObservation(event.toolName, event.result, observations);
        if (observation) {
          calledTools.add(event.toolName);
        }
        const provider = providerFor(event.toolName, observation);
        const summary = summarizeToolResult(event.toolName, event.result, observation);
        const tool = toolCalls.find((call) => call.id === event.toolCallId);
        if (tool) {
          Object.assign(tool, {
            provider,
            status: event.isError ? "failed" : "complete",
            result: summary,
          } satisfies Partial<ToolCall>);
        }
        events.push(
          createUiEvent(sessionId, ++eventSequence, "tool_call_completed", {
            title: event.isError ? `${event.toolName} failed` : `${event.toolName} completed`,
            description: summary,
            tool: { name: event.toolName, provider },
            metadata: { result: event.result, isError: event.isError },
            timestamp: event.timestamp,
          }),
        );
        if (event.toolName === "search_market_signals" && observation) {
          appendMarketProviderEvents(
            events,
            marketSignalsObservationSchema.parse(observation),
            sessionId,
            () => ++eventSequence,
            event.timestamp,
          );
        }
      }

      // ReasoningDelta, TextDelta, and complete model messages are intentionally
      // discarded. They may contain hidden reasoning and are not UI observability.
    },
  };
}

function buildInvestigation(
  result: AgentInvestigationResult,
  observations: EventCollector["observations"],
  detectedAt: Date,
  id: string,
): Investigation {
  const marketSignals = observations.marketSignals.at(-1);
  const salesMetrics = observations.salesMetrics.at(-1);
  if (!marketSignals || !salesMetrics) {
    throw new Error("Validated evidence observations are missing after the agent run.");
  }

  const clusters = marketSignals.topicClusters.map(toTopicCluster);
  const evidence = marketSignals.representativeEvidence.map(toMarketSignal);
  const title = clusters[0]?.topic ?? "Business Anomaly";
  const urgencyScore = result.urgency.score;

  return {
    id: `inv-${id}`,
    title: toTitleCase(title),
    status: "investigation_complete",
    detectedAt: detectedAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    anomaly: {
      title: "Emerging business risk",
      summary: "VIU AI investigated a detected divergence across customer and business signals.",
    },
    metrics: {
      salesChangePct: salesMetrics.changePct,
      negativeSignalChangePct: marketSignals.negativeSentimentChangePct,
      totalSignals: marketSignals.conversationsAnalyzed,
    },
    ...result,
    urgency: {
      score: urgencyScore,
      level: urgencyLevelFor(urgencyScore),
    },
    clusters,
    evidence,
  };
}

function extractFinalAssistantText(messages: Awaited<ReturnType<typeof runAgent>>["messages"]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message && isAssistantMessage(message) && message.content.trim()) {
      return message.content;
    }
  }
  throw new Error("The agent completed without a final structured response.");
}

function parseAgentResult(output: string): AgentInvestigationResult {
  const withoutFence = output
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < firstBrace) {
    throw new Error("The agent response did not contain a JSON object.");
  }

  let value: unknown;
  try {
    value = JSON.parse(withoutFence.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new Error("The agent response was not valid JSON.");
  }
  return agentInvestigationResultSchema.parse(value) as AgentInvestigationResult;
}

function createUiEvent(
  sessionId: string,
  sequence: number,
  type: AgentEvent["type"],
  input: Omit<AgentEvent, "id" | "timestamp" | "type"> & { timestamp?: number },
): AgentEvent {
  const { timestamp, ...event } = input;
  return {
    id: `${sessionId}-event-${sequence}`,
    timestamp: new Date(timestamp ?? Date.now()).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    type,
    ...event,
  };
}

function providerFor(toolName: string, observation?: unknown) {
  if (toolName !== "search_market_signals") return "Demo Sales Data";
  if (observation) {
    const metadata = marketSignalsObservationSchema.parse(observation).providerMetadata;
    if (metadata.fallbackUsed) return "Gorilla → Demo fallback";
    return metadata.provider === "gorilla" ? "Gorilla" : "Demo Market Data";
  }
  return process.env["VITE_USE_MOCK_MARKET_SIGNALS"] === "false" ? "Gorilla" : "Demo Market Data";
}

function summarizeToolResult(toolName: string, result: string, observation?: unknown) {
  if (toolName === "search_market_signals" && observation) {
    const marketSignals = marketSignalsObservationSchema.parse(observation);
    const metadata = marketSignals.providerMetadata;
    if (metadata.fallbackUsed) {
      return `${marketSignals.conversationsAnalyzed} demo conversations · Gorilla degraded (${metadata.degradedReason ?? "provider_error"}) · fallback used`;
    }
    const sign = marketSignals.negativeSentimentChangePct > 0 ? "+" : "";
    const providerLabel =
      metadata.provider === "gorilla" ? "real Gorilla conversations" : "demo conversations";
    const partialLabel = metadata.partial ? " · partial" : "";
    return `${marketSignals.conversationsAnalyzed} ${providerLabel}${partialLabel} · negative sentiment ${sign}${marketSignals.negativeSentimentChangePct}% (demo aggregate)`;
  }
  if (toolName === "get_sales_metrics" && observation) {
    const salesMetrics = salesMetricsObservationSchema.parse(observation);
    return `Sales ${formatCurrency(salesMetrics.previousSales)} → ${formatCurrency(salesMetrics.currentSales)} · change ${salesMetrics.changePct}%`;
  }
  return result.slice(0, 160);
}

function appendMarketProviderEvents(
  events: AgentEvent[],
  observation: MarketSignalsObservation,
  sessionId: string,
  nextSequence: () => number,
  timestamp: number,
) {
  const metadata = observation.providerMetadata;
  if (metadata.fallbackUsed) {
    if (metadata.searchId) {
      events.push(
        createUiEvent(sessionId, nextSequence(), "signal_received", {
          title: "Gorilla search_id generated",
          description: metadata.searchId,
          tool: { name: "search_market_signals", provider: "Gorilla" },
          metadata: { searchId: metadata.searchId },
          timestamp,
        }),
      );
    }
    events.push(
      createUiEvent(sessionId, nextSequence(), "signal_received", {
        title: "Gorilla degraded — demo fallback used",
        description: `Provider outcome: ${metadata.degradedReason ?? "provider_error"}`,
        tool: { name: "search_market_signals", provider: "Gorilla → Demo fallback" },
        metadata: {
          degraded: true,
          fallbackUsed: true,
          searchId: metadata.searchId,
          errors: metadata.errors,
        },
        timestamp,
      }),
    );
    return;
  }
  if (metadata.provider !== "gorilla") return;

  events.push(
    createUiEvent(sessionId, nextSequence(), "signal_received", {
      title: "Gorilla search_id generated",
      ...(metadata.searchId === undefined ? {} : { description: metadata.searchId }),
      tool: { name: "search_market_signals", provider: "Gorilla" },
      metadata: { searchId: metadata.searchId },
      timestamp,
    }),
  );
  for (const source of metadata.doneSources) {
    events.push(
      createUiEvent(sessionId, nextSequence(), "signal_received", {
        title: `${gorillaSourceLabel(source)} completed`,
        tool: { name: "search_market_signals", provider: "Gorilla" },
        metadata: { source, searchId: metadata.searchId },
        timestamp,
      }),
    );
  }
  events.push(
    createUiEvent(sessionId, nextSequence(), "signal_received", {
      title: `${metadata.realConversationCount} real conversations available`,
      tool: { name: "search_market_signals", provider: "Gorilla" },
      metadata: {
        searchId: metadata.searchId,
        partial: metadata.partial,
        doneSources: metadata.doneSources,
        pendingSources: metadata.pendingSources,
        errors: metadata.errors,
      },
      timestamp,
    }),
  );
  if (metadata.degraded) {
    events.push(
      createUiEvent(sessionId, nextSequence(), "signal_received", {
        title: "Gorilla returned source-level errors",
        description: "Successful source results were preserved.",
        tool: { name: "search_market_signals", provider: "Gorilla" },
        metadata: {
          degraded: true,
          searchId: metadata.searchId,
          errors: metadata.errors,
        },
        timestamp,
      }),
    );
  }
  if (metadata.partial) {
    events.push(
      createUiEvent(sessionId, nextSequence(), "signal_received", {
        title: "Gorilla partial results returned",
        description: `${metadata.pendingSources.length} source(s) still pending`,
        tool: { name: "search_market_signals", provider: "Gorilla" },
        metadata: {
          searchId: metadata.searchId,
          doneSources: metadata.doneSources,
          pendingSources: metadata.pendingSources,
        },
        timestamp,
      }),
    );
  }
}

function gorillaSourceLabel(source: string) {
  if (source === "twitter") return "X";
  return toTitleCase(source);
}

function validateAndStoreObservation(
  toolName: string,
  result: string,
  observations: EventCollector["observations"],
) {
  let value: unknown;
  try {
    value = JSON.parse(result);
  } catch {
    throw new Error(`${toolName} returned a non-JSON observation.`);
  }

  if (toolName === "search_market_signals") {
    const observation = marketSignalsObservationSchema.parse(value);
    observations.marketSignals.push(observation);
    return observation;
  }
  if (toolName === "get_sales_metrics") {
    const observation = salesMetricsObservationSchema.parse(value);
    observations.salesMetrics.push(observation);
    return observation;
  }
  return undefined;
}

type MissingEvidenceCategory = "external market/customer signals" | "internal business performance";

function missingEvidenceCategories(calledTools: Set<string>): MissingEvidenceCategory[] {
  const missing: MissingEvidenceCategory[] = [];
  if (!calledTools.has("search_market_signals")) {
    missing.push("external market/customer signals");
  }
  if (!calledTools.has("get_sales_metrics")) {
    missing.push("internal business performance");
  }
  return missing;
}

function evidencePolicyFollowUp(missing: MissingEvidenceCategory[]) {
  if (missing.length === 2) {
    return `Evidence policy not satisfied. You have not yet gathered ${missing.join(" and ")} evidence. The available evidence tools are independent; request both in the same turn when appropriate, choosing their arguments yourself, before concluding.`;
  }
  return `Evidence policy not satisfied. You have not yet gathered ${missing.join(" and ")} evidence. Use the available tools to obtain the missing evidence before concluding.`;
}

function assertEvidencePolicySatisfied(calledTools: Set<string>) {
  const missing = missingEvidenceCategories(calledTools);
  if (missing.length > 0) {
    throw new Error(
      `Evidence policy not satisfied within ${AGENT_MAX_STEPS} steps. Missing ${missing.join(" and ")} evidence.`,
    );
  }
}

function urgencyLevelFor(score: number): Investigation["urgency"]["level"] {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function positiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    console.warn(`[VIU AI] Ignoring invalid ${name}; using ${fallback}ms.`);
    return fallback;
  }
  return value;
}

function logDevelopmentTiming(
  event: string,
  metadata: Record<string, number | string | undefined>,
) {
  if (process.env["NODE_ENV"] !== "development") return;
  const safeMetadata = Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, number | string] => {
      return entry[1] !== undefined;
    }),
  );
  console.info(`[VIU AI timing] ${event}`, safeMetadata);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toTopicCluster(cluster: MarketSignalsObservation["topicClusters"][number]): TopicCluster {
  return {
    topic: cluster.topic,
    count: cluster.count,
    sentiment: cluster.sentiment,
    ...(cluster.changePct === undefined ? {} : { changePct: cluster.changePct }),
    ...(cluster.relevanceScore === undefined ? {} : { relevanceScore: cluster.relevanceScore }),
  };
}

function toMarketSignal(
  signal: MarketSignalsObservation["representativeEvidence"][number],
): MarketSignal {
  return {
    id: signal.id,
    source: signal.source,
    text: signal.text,
    sentiment: signal.sentiment,
    ...(signal.author === undefined ? {} : { author: signal.author }),
    ...(signal.url === undefined ? {} : { url: signal.url }),
    ...(signal.createdAt === undefined ? {} : { createdAt: signal.createdAt }),
    ...(signal.sentimentScore === undefined ? {} : { sentimentScore: signal.sentimentScore }),
    ...(signal.topic === undefined ? {} : { topic: signal.topic }),
    ...(signal.engagement === undefined ? {} : { engagement: signal.engagement }),
    ...(signal.relevance === undefined ? {} : { relevance: signal.relevance }),
  };
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}
