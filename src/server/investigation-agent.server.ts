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

Decide which available tools to call, when to call them, and what arguments to use. Do not follow a predetermined tool sequence. A business investigation cannot be completed until evidence from both external market/customer signals and internal business performance has been gathered.

Ground the hypothesis, summary, confidence, urgency score, and recommendation only in returned tool observations. When topic clusters are available, identify the strongest supported finding from their counts and relevance; never substitute a generic issue that does not appear in the evidence.

Do not claim causation unless the evidence establishes it. Prefer correlation, possible cause, probable contributor, or insufficient evidence. Never reveal chain-of-thought or hidden reasoning.

Your final assistant message must contain only one JSON object that conforms to this JSON Schema. Do not wrap it in Markdown. The server derives evidence, topic clusters, business metrics, and urgency level from validated tool observations; do not invent or include them in your final object:
${JSON.stringify(z.toJSONSchema(agentInvestigationResultSchema))}`;

const AGENT_TIMEOUT_MS = 60_000;
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
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const sessionId = `investigation-${idFactory()}`;
  const collector = createEventCollector(sessionId);
  const model = options.model ?? createFeatherlessModel();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("Agent investigation timed out.")),
    AGENT_TIMEOUT_MS,
  );
  const forwardAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
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

    return {
      investigation,
      toolCalls: collector.toolCalls,
      events: [...collector.events].reverse(),
    };
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", forwardAbort);
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
    timeout: 45_000,
    maxRetries: 1,
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

      if (event.type === LoopEventType.ToolStart) {
        toolCalls.push({
          id: event.toolCallId,
          provider: providerFor(event.toolName),
          name: event.toolName,
          query: JSON.stringify(event.args),
          status: "running",
        });
        events.push(
          createUiEvent(sessionId, ++eventSequence, "tool_call_started", {
            title: `Agent called ${event.toolName}`,
            tool: { name: event.toolName, provider: providerFor(event.toolName) },
            metadata: { arguments: event.args },
            timestamp: event.timestamp,
          }),
        );
        return;
      }

      if (event.type === LoopEventType.ToolEnd) {
        const observation = event.isError
          ? undefined
          : validateAndStoreObservation(event.toolName, event.result, observations);
        if (observation) {
          calledTools.add(event.toolName);
        }
        const summary = summarizeToolResult(event.toolName, event.result, observation);
        const tool = toolCalls.find((call) => call.id === event.toolCallId);
        if (tool) {
          Object.assign(tool, {
            status: event.isError ? "failed" : "complete",
            result: summary,
          } satisfies Partial<ToolCall>);
        }
        events.push(
          createUiEvent(sessionId, ++eventSequence, "tool_call_completed", {
            title: event.isError ? `${event.toolName} failed` : `${event.toolName} completed`,
            description: summary,
            tool: { name: event.toolName, provider: providerFor(event.toolName) },
            metadata: { result: event.result, isError: event.isError },
            timestamp: event.timestamp,
          }),
        );
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

function providerFor(toolName: string) {
  return toolName === "search_market_signals" ? "Demo Market Data" : "Demo Sales Data";
}

function summarizeToolResult(toolName: string, result: string, observation?: unknown) {
  if (toolName === "search_market_signals" && observation) {
    const marketSignals = marketSignalsObservationSchema.parse(observation);
    const sign = marketSignals.negativeSentimentChangePct > 0 ? "+" : "";
    return `${marketSignals.conversationsAnalyzed} conversations analyzed · negative sentiment ${sign}${marketSignals.negativeSentimentChangePct}%`;
  }
  if (toolName === "get_sales_metrics" && observation) {
    const salesMetrics = salesMetricsObservationSchema.parse(observation);
    return `Sales ${formatCurrency(salesMetrics.previousSales)} → ${formatCurrency(salesMetrics.currentSales)} · change ${salesMetrics.changePct}%`;
  }
  return result.slice(0, 160);
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
