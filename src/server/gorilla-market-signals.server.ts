import { z } from "zod";

import type { MarketSignal, SignalSource } from "@/types";

const gorillaSourceSchema = z.enum(["reddit", "twitter", "bluesky", "linkedin", "youtube"]);

const gorillaResultRowSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    source: z.string(),
    channel: z.string().optional(),
    title: z.string().optional(),
    url: z.string().optional(),
    author: z.string().optional(),
    body_snippet: z.string().optional(),
    score: z.number().optional(),
    num_comments: z.number().optional(),
    created_utc: z.union([z.number(), z.string()]).optional(),
    result_score: z.number().optional(),
    validation_score: z.number().optional(),
    matched_signals: z.array(z.string()).optional(),
    tier: z.string().optional(),
  })
  .passthrough();

const gorillaSearchStateSchema = z
  .object({
    search_id: z.string().min(1),
    status: z.enum(["running", "completed", "failed"]),
    suggested_interval_ms: z.number().positive().optional(),
    requested_sources: z.array(gorillaSourceSchema).optional(),
    done_sources: z.array(gorillaSourceSchema).optional(),
    pending_sources: z.array(gorillaSourceSchema).optional(),
    results: z.array(gorillaResultRowSchema).optional(),
    total: z.number().int().nonnegative().optional(),
    errors: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const gorillaErrorSchema = z
  .object({
    code: z.string().optional(),
    error: z.string().optional(),
    search_id: z.string().optional(),
  })
  .passthrough();

export type GorillaSource = z.infer<typeof gorillaSourceSchema>;

export type GorillaSignalMetadata = {
  id: string;
  numComments?: number;
  validationScore?: number;
  matchedSignals?: string[];
  tier?: string;
  channel?: string;
  sentimentSource: "not_provided_by_gorilla";
};

export type GorillaMarketSignalsResult = {
  provider: "gorilla";
  searchId: string;
  status: "running" | "completed" | "failed";
  partial: boolean;
  requestedSources: GorillaSource[];
  doneSources: GorillaSource[];
  pendingSources: GorillaSource[];
  errors: Record<string, string>;
  total: number;
  signals: MarketSignal[];
  signalMetadata: GorillaSignalMetadata[];
};

export type GorillaMarketSignalsProvider = {
  search(query: string, signal?: AbortSignal): Promise<GorillaMarketSignalsResult>;
};

type GorillaProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  sources?: GorillaSource[];
  since?: string;
  limit?: number;
  latencyBudgetMs?: number;
  pollIntervalMs?: number;
  minResults?: number;
  minDoneSources?: number;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
};

export class GorillaProviderError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly searchId?: string;

  constructor(
    message: string,
    options: { code: string; status?: number; searchId?: string; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.name = "GorillaProviderError";
    this.code = options.code;
    if (options.status !== undefined) this.status = options.status;
    if (options.searchId !== undefined) this.searchId = options.searchId;
  }
}

export class GorillaHttpMarketSignalsProvider implements GorillaMarketSignalsProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sources: GorillaSource[];
  private readonly since: string;
  private readonly limit: number;
  private readonly latencyBudgetMs: number;
  private readonly pollIntervalMs: number;
  private readonly minResults: number;
  private readonly minDoneSources: number;
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number, signal?: AbortSignal) => Promise<void>;

  constructor(options: GorillaProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://usegorilla.app/v1").replace(/\/$/, "");
    this.sources = options.sources ?? ["reddit", "twitter"];
    this.since = options.since ?? "90d";
    this.limit = options.limit ?? 25;
    this.latencyBudgetMs = options.latencyBudgetMs ?? 15_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_500;
    this.minResults = options.minResults ?? 10;
    this.minDoneSources = Math.min(options.minDoneSources ?? 1, this.sources.length);
    this.fetchImplementation = options.fetch ?? fetch;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? abortableSleep;
  }

  async search(query: string, signal?: AbortSignal): Promise<GorillaMarketSignalsResult> {
    const startedAt = this.now();
    const budgetController = new AbortController();
    const timeout = setTimeout(
      () => budgetController.abort(new Error("Gorilla tool latency budget reached.")),
      this.latencyBudgetMs,
    );
    const forwardAbort = () => budgetController.abort(signal?.reason);
    signal?.addEventListener("abort", forwardAbort, { once: true });
    let searchId: string | undefined;

    try {
      let state = await this.requestState(`${this.baseUrl}/v2-search-stream`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          query,
          since: this.since,
          limit: this.limit,
          sources: this.sources,
        }),
        signal: budgetController.signal,
      });
      searchId = state.search_id;

      while (true) {
        const normalized = normalizeGorillaRows(state.results ?? []);
        const requestedSources = state.requested_sources ?? this.sources;
        const doneSources = state.done_sources ?? [];
        const pendingSources =
          state.pending_sources ??
          requestedSources.filter((source) => !doneSources.includes(source));
        const successfulDoneSources = doneSources.filter(
          (source) => !(source in (state.errors ?? {})),
        );
        const enoughUsefulResults =
          normalized.signals.length >= this.minResults &&
          successfulDoneSources.length >= this.minDoneSources;
        const terminal = state.status !== "running";

        if (terminal || enoughUsefulResults) {
          if (normalized.signals.length < this.minResults) {
            throw new GorillaProviderError(
              `Gorilla returned ${normalized.signals.length} useful results; ${this.minResults} are required for the demo.`,
              { code: "insufficient_results", searchId },
            );
          }
          return {
            provider: "gorilla",
            searchId,
            status: state.status,
            partial: state.status !== "completed",
            requestedSources,
            doneSources,
            pendingSources,
            errors: state.errors ?? {},
            total: state.total ?? normalized.signals.length,
            signals: normalized.signals,
            signalMetadata: normalized.metadata,
          };
        }

        const elapsed = this.now() - startedAt;
        const remaining = this.latencyBudgetMs - elapsed;
        if (remaining <= 0) {
          throw new GorillaProviderError("Gorilla tool latency budget reached.", {
            code: "tool_timeout",
            searchId,
          });
        }

        const suggestedInterval = state.suggested_interval_ms ?? this.pollIntervalMs;
        await this.sleep(Math.min(suggestedInterval, remaining), budgetController.signal);
        state = await this.requestState(
          `${this.baseUrl}/v2-search-stream?id=${encodeURIComponent(searchId)}`,
          { headers: this.headers(), signal: budgetController.signal },
          searchId,
        );
      }
    } catch (error) {
      if (error instanceof GorillaProviderError) throw error;
      throw new GorillaProviderError("Gorilla search request failed.", {
        code: budgetController.signal.aborted ? "tool_timeout" : "request_failed",
        ...(searchId === undefined ? {} : { searchId }),
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
    };
  }

  private async requestState(url: string, init: RequestInit, searchId?: string) {
    let response: Response;
    try {
      response = await this.fetchImplementation(url, init);
    } catch (error) {
      throw new GorillaProviderError("Gorilla request failed.", {
        code: "request_failed",
        ...(searchId === undefined ? {} : { searchId }),
        cause: error,
      });
    }

    let payload: unknown;
    try {
      payload = (await response.json()) as unknown;
    } catch (error) {
      throw new GorillaProviderError("Gorilla returned invalid JSON.", {
        code: "invalid_response",
        status: response.status,
        ...(searchId === undefined ? {} : { searchId }),
        cause: error,
      });
    }
    if (!response.ok) {
      const providerError = gorillaErrorSchema.safeParse(payload);
      const code = providerError.success
        ? (providerError.data.code ?? `http_${response.status}`)
        : `http_${response.status}`;
      const message = providerError.success
        ? (providerError.data.error ?? `Gorilla request failed with HTTP ${response.status}.`)
        : `Gorilla request failed with HTTP ${response.status}.`;
      const responseSearchId = providerError.success
        ? (providerError.data.search_id ?? searchId)
        : searchId;
      throw new GorillaProviderError(message, {
        code,
        status: response.status,
        ...(responseSearchId === undefined ? {} : { searchId: responseSearchId }),
      });
    }
    return gorillaSearchStateSchema.parse(payload);
  }
}

export function createGorillaMarketSignalsProviderFromEnv(): GorillaMarketSignalsProvider {
  const apiKey = process.env["GORILLA_API_KEY"];
  if (!apiKey) {
    throw new GorillaProviderError("GORILLA_API_KEY is not configured on the server.", {
      code: "missing_configuration",
    });
  }

  return new GorillaHttpMarketSignalsProvider({
    apiKey,
    baseUrl: process.env["GORILLA_BASE_URL"] ?? "https://usegorilla.app/v1",
    sources: configuredSources(process.env["GORILLA_SOURCES"]),
    since: process.env["GORILLA_SINCE"] ?? "90d",
    limit: positiveIntegerEnv("GORILLA_RESULT_LIMIT", 25),
    latencyBudgetMs: positiveIntegerEnv("GORILLA_TOOL_TIMEOUT_MS", 15_000),
    pollIntervalMs: positiveIntegerEnv("GORILLA_POLL_INTERVAL_MS", 1_500),
    minResults: positiveIntegerEnv("GORILLA_MIN_RESULTS", 10),
    minDoneSources: positiveIntegerEnv("GORILLA_MIN_DONE_SOURCES", 1),
  });
}

export function normalizeGorillaRows(rows: z.infer<typeof gorillaResultRowSchema>[]) {
  const signals: MarketSignal[] = [];
  const metadata: GorillaSignalMetadata[] = [];

  for (const row of rows) {
    const id = String(row.id).trim();
    const text = normalizedText(row.title, row.body_snippet);
    if (!id || !text) continue;

    const source = normalizeSource(row.source);
    const url = validUrl(row.url);
    const createdAt = normalizeCreatedAt(row.created_utc);
    const engagement = nonnegative(row.score);
    const relevance = boundedScore(row.result_score);
    const author = trimmed(row.author);
    const numComments = nonnegative(row.num_comments);
    const validationScore = boundedScore(row.validation_score);
    const tier = trimmed(row.tier);
    const channel = trimmed(row.channel);

    signals.push({
      id,
      source,
      text,
      sentiment: "neutral",
      ...(author === undefined ? {} : { author }),
      ...(url === undefined ? {} : { url }),
      ...(createdAt === undefined ? {} : { createdAt }),
      ...(engagement === undefined ? {} : { engagement }),
      ...(relevance === undefined ? {} : { relevance }),
    });

    metadata.push({
      id,
      sentimentSource: "not_provided_by_gorilla",
      ...(numComments === undefined ? {} : { numComments }),
      ...(validationScore === undefined ? {} : { validationScore }),
      ...(row.matched_signals === undefined ? {} : { matchedSignals: row.matched_signals }),
      ...(tier === undefined ? {} : { tier }),
      ...(channel === undefined ? {} : { channel }),
    });
  }

  return { signals, metadata };
}

function configuredSources(raw: string | undefined): GorillaSource[] {
  if (!raw) return ["reddit", "twitter"];
  const parsed = raw
    .split(",")
    .map((source) => source.trim().toLowerCase())
    .filter((source): source is GorillaSource => gorillaSourceSchema.safeParse(source).success);
  return parsed.length > 0 ? [...new Set(parsed)] : ["reddit", "twitter"];
}

function positiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function normalizedText(title: string | undefined, body: string | undefined) {
  const parts = [trimmed(title), trimmed(body)].filter((value): value is string => Boolean(value));
  return [...new Set(parts)].join(" — ").slice(0, 800);
}

function normalizeSource(source: string): SignalSource {
  if (source.toLowerCase() === "twitter") return "x";
  if (source.toLowerCase() === "reddit") return "reddit";
  if (source.toLowerCase() === "linkedin") return "linkedin";
  return "other";
}

function normalizeCreatedAt(value: number | string | undefined) {
  if (value === undefined) return undefined;
  const numeric = typeof value === "number" ? value : Number(value);
  const milliseconds = Number.isFinite(numeric)
    ? numeric < 1_000_000_000_000
      ? numeric * 1_000
      : numeric
    : Date.parse(String(value));
  if (!Number.isFinite(milliseconds)) return undefined;
  return new Date(milliseconds).toISOString();
}

function validUrl(value: string | undefined) {
  const candidate = trimmed(value);
  if (!candidate) return undefined;
  try {
    return new URL(candidate).toString();
  } catch {
    return undefined;
  }
}

function trimmed(value: string | undefined) {
  const result = value?.trim();
  return result ? result : undefined;
}

function nonnegative(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function boundedScore(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : undefined;
}

function abortableSleep(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}
