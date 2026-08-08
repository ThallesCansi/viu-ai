import {
  AgentEventType as LoopEventType,
  SessionMemoryStore,
  isAssistantMessage,
  runAgent,
} from "@open-agent-loops/core";
import type { AgentEvent as LoopAgentEvent, ModelClient } from "@open-agent-loops/core";
import { OpenAICompatibleModel } from "@open-agent-loops/core/providers/openai";
import { z } from "zod";

import { investigationTools } from "@/server/investigation-tools.server";
import {
  agentInvestigationResultSchema,
  type AgentInvestigationResult,
  type CreateInvestigationResponse,
} from "@/types/investigation-api";
import type { AgentEvent, Investigation, ToolCall } from "@/types";

export const DEFAULT_INVESTIGATION_OBJECTIVE =
  "Investigate the detected business anomaly, gather sufficient evidence, and produce an actionable business investigation.";

const SYSTEM_PROMPT = `You are SignalRoom, an autonomous market-intelligence agent.

Decide which available tools to call, when to call them, and what arguments to use. Do not follow a predetermined tool sequence. Gather enough evidence to cross-reference external customer signals with internal business performance when that is warranted by the objective.

Do not claim causation unless the evidence establishes it. Prefer correlation, possible cause, probable contributor, or insufficient evidence. Never reveal chain-of-thought or hidden reasoning.

Your final assistant message must contain only one JSON object that conforms to this JSON Schema. Do not wrap it in Markdown. Use only evidence returned by tools and preserve evidence IDs, source text, source URLs, counts, and metrics exactly:
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
      onEvent: collector.observe,
      signal: controller.signal,
    });

    const output = extractFinalAssistantText(run.messages);
    const result = parseAgentResult(output);
    const investigation = buildInvestigation(result, collector.calledTools, now(), idFactory());

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
    thinking: "off",
    timeout: 45_000,
    maxRetries: 1,
    params: { temperature: 0.1 },
  });
}

function createEventCollector(sessionId: string): EventCollector {
  const events: AgentEvent[] = [];
  const toolCalls: ToolCall[] = [];
  const calledTools = new Set<string>();
  let eventSequence = 0;

  return {
    events,
    toolCalls,
    calledTools,
    observe(event) {
      if (event.type === LoopEventType.AgentStart) {
        events.push(
          createUiEvent(sessionId, ++eventSequence, "investigation_started", {
            title: "Featherless agent investigation started",
            description: "Open Agent Loops is selecting the evidence it needs.",
            timestamp: event.timestamp,
          }),
        );
        return;
      }

      if (event.type === LoopEventType.ToolStart) {
        calledTools.add(event.toolName);
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
        const tool = toolCalls.find((call) => call.id === event.toolCallId);
        if (tool) {
          Object.assign(tool, {
            status: event.isError ? "failed" : "complete",
            result: summarizeToolResult(event.toolName, event.result),
          } satisfies Partial<ToolCall>);
        }
        events.push(
          createUiEvent(sessionId, ++eventSequence, "tool_call_completed", {
            title: event.isError ? `${event.toolName} failed` : `${event.toolName} completed`,
            description: summarizeToolResult(event.toolName, event.result),
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
  calledTools: Set<string>,
  detectedAt: Date,
  id: string,
): Investigation {
  const usedMarketSignals = calledTools.has("search_market_signals");
  const usedSalesMetrics = calledTools.has("get_sales_metrics");
  const clusters = usedMarketSignals ? result.clusters : [];
  const evidence = usedMarketSignals ? result.evidence : [];
  const title = clusters[0]?.topic ?? "Business Anomaly";

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
      summary:
        "SignalRoom investigated a detected divergence across customer and business signals.",
    },
    metrics: {
      salesChangePct: usedSalesMetrics ? -11 : 0,
      negativeSignalChangePct: usedMarketSignals ? 36 : 0,
      totalSignals: usedMarketSignals ? 142 : 0,
    },
    ...result,
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

function summarizeToolResult(toolName: string, result: string) {
  if (toolName === "search_market_signals") {
    return "142 conversations analyzed · negative sentiment +36%";
  }
  if (toolName === "get_sales_metrics") {
    return "Sales $100K → $89K · change -11%";
  }
  return result.slice(0, 160);
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}
