/**
 * VIU AI — core domain models.
 * These types are the contract between the UI and the service layer.
 * Real backends (Open Agent Loops, Gorilla, Featherless, Google Calendar,
 * ElevenLabs) must produce these same shapes.
 */

export type AgentStatus =
  | "monitoring"
  | "anomaly_detected"
  | "investigating"
  | "investigation_complete"
  | "decision_required"
  | "scheduling"
  | "meeting_ready"
  | "presenting"
  | "awaiting_decision"
  | "executing_action"
  | "monitoring_outcome";

export interface BusinessMetric {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  changePct?: number;
  trend: "up" | "down" | "stable";
  status: "healthy" | "attention" | "critical";
}

export type SignalSource = "reddit" | "x" | "linkedin" | "support" | "other";

export interface MarketSignal {
  id: string;
  source: SignalSource;
  author?: string;
  text: string;
  url?: string;
  createdAt?: string;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore?: number;
  topic?: string;
  engagement?: number;
  relevance?: number;
}

export interface TopicCluster {
  topic: string;
  count: number;
  changePct?: number;
  sentiment: "positive" | "negative" | "neutral";
  relevanceScore?: number;
}

export interface Investigation {
  id: string;
  title: string;
  status: AgentStatus;
  detectedAt: string;
  anomaly: {
    title: string;
    summary: string;
  };
  metrics: {
    salesChangePct: number;
    negativeSignalChangePct: number;
    totalSignals: number;
  };
  hypothesis: string;
  languageQualifier:
    "possible_cause" | "probable_contributor" | "correlation" | "insufficient_evidence";
  confidence: number;
  urgency: {
    score: number;
    level: "low" | "medium" | "high";
  };
  summary: string;
  clusters: TopicCluster[];
  evidence: MarketSignal[];
  recommendation: string;
  decisionRequired: boolean;
}

export interface CompanyPerson {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  required: boolean;
  available: boolean;
  reason: string;
}

export interface DecisionMeeting {
  id: string;
  title: string;
  investigationId: string;
  attendees: CompanyPerson[];
  date: string;
  startTime: string;
  durationMinutes: number;
  agenda: string[];
  calendarStatus: "not_created" | "creating" | "created" | "failed";
}

export type AgentEventType =
  | "monitoring_tick"
  | "signal_received"
  | "anomaly_detected"
  | "investigation_started"
  | "tool_call_started"
  | "tool_call_completed"
  | "finding_created"
  | "confidence_updated"
  | "decision_required"
  | "people_selected"
  | "availability_found"
  | "meeting_created"
  | "voice_started"
  | "decision_recorded"
  | "action_created"
  | "monitoring_resumed";

export interface AgentEvent {
  id: string;
  timestamp: string;
  /** Observable action only — never model chain-of-thought. */
  type: AgentEventType;
  title: string;
  description?: string;
  tool?: {
    name: string;
    provider?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  provider: string;
  name: string;
  query?: string;
  status: "waiting" | "running" | "complete" | "failed";
  result?: string;
}

export interface InvestigationStep {
  id: string;
  label: string;
  status: "done" | "active" | "pending";
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface DecisionRecord {
  id: string;
  title: string;
  investigationId: string;
  status: "active" | "completed" | "rejected";
  triggeredBy: string;
  decision: string;
  proposedAction: string;
  owner: string;
  primaryMetric: string;
  secondaryMetrics: string[];
  durationDays: number;
  createdAt: string;
  followUpInDays: number;
  outcome: "approved" | "modified" | "rejected";
}

export interface FollowUpAction {
  id: string;
  label: string;
  status: "pending" | "running" | "complete";
}

export interface IntegrationStatus {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "ready" | "connected" | "ready_to_connect" | "demo_dataset" | "unavailable";
  group: "agent" | "sources" | "internal" | "future";
}

export interface TranscriptLine {
  id: string;
  speaker: "agent" | "user";
  text: string;
}

export type VoiceState =
  | "idle"
  | "ready"
  | "connecting"
  | "speaking"
  | "listening"
  | "thinking"
  | "disconnected"
  | "error"
  | "unavailable";

export interface VoiceSessionSnapshot {
  state: VoiceState;
  active: boolean;
  transcript: TranscriptLine[];
  error: string | null;
}

export interface PresentationMetric {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "agent" | "ok" | "warn";
}

export interface PresentationSlide {
  id: string;
  title: string;
  headline: string;
  body?: string;
  bullets?: string[];
  metrics?: PresentationMetric[];
  evidenceIds?: string[];
  speakerNotes?: string;
}

export interface PresentationDeck {
  id: string;
  title: string;
  summary: string;
  slides: PresentationSlide[];
}

export interface VoiceMeetingContext {
  empresa: string;
  objetivo_reuniao: string;
  numero_slides: number;
  estrutura_slides: string;
  resumo_executivo: string;
  contexto_detalhado: string;
}

export type PresentationStage = number;
