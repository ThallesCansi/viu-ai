import type {
  AgentEvent,
  AvailabilitySlot,
  BusinessMetric,
  CompanyPerson,
  DecisionMeeting,
  DecisionRecord,
  FollowUpAction,
  Investigation,
  InvestigationStep,
  MarketSignal,
  PresentationDeck,
  PresentationStage,
  ToolCall,
  VoiceMeetingContext,
  VoiceSessionSnapshot,
} from "@/types";

export interface AgentSnapshot {
  status: Investigation["status"];
  running: boolean;
  cycle: number;
  nextScanInSeconds: number;
  lastCycleAt: string | null;
  events: AgentEvent[];
  metrics: BusinessMetric[];
  anomalyDetected: boolean;
  investigation: Investigation | null;
  steps: InvestigationStep[];
  toolCalls: ToolCall[];
  people: CompanyPerson[];
  availability: AvailabilitySlot | null;
  meeting: DecisionMeeting | null;
  decision: DecisionRecord | null;
  followUps: FollowUpAction[];
  presentation: PresentationDeck | null;
  presentationStage: PresentationStage;
  degraded: string[];
}

export interface MarketSignalsService {
  /** Gorilla-backed in production. */
  searchSignals(query?: string): Promise<MarketSignal[]>;
}

export interface BusinessMetricsService {
  getMetrics(): Promise<BusinessMetric[]>;
}

export interface CompanyDirectoryService {
  getRelevantPeople(investigationId: string): Promise<CompanyPerson[]>;
}

export interface CalendarService {
  findAvailability(people: CompanyPerson[]): Promise<AvailabilitySlot>;
  createMeeting(input: {
    investigationId: string;
    title: string;
    attendees: CompanyPerson[];
    slot: AvailabilitySlot;
    agenda: string[];
  }): Promise<DecisionMeeting>;
}

export interface VoiceService {
  startSession(input: {
    context: VoiceMeetingContext;
    getPresentation: () => PresentationDeck;
    onStageChange: (stage: number) => void;
  }): Promise<{ sessionId: string }>;
  stopSession(): Promise<void>;
  sendContext(context: string): Promise<void>;
  subscribe(listener: (snapshot: VoiceSessionSnapshot) => void): () => void;
}

export interface ActionService {
  createFollowUp(decision: DecisionRecord): Promise<FollowUpAction[]>;
}

export interface AgentService {
  getSnapshot(): AgentSnapshot;
  subscribe(listener: (snapshot: AgentSnapshot) => void): () => void;
  subscribeToEvents(listener: (event: AgentEvent) => void): () => void;
  getInvestigation(id: string): Investigation | null;

  startMonitoring(): void;
  stopMonitoring(): void;

  reset(): void;
  triggerAnomaly(): Promise<void>;
  startInvestigation(): Promise<void>;
  completeInvestigation(): Promise<void>;
  findDecisionMakers(): Promise<void>;
  scheduleMeeting(): Promise<void>;
  openDecisionRoom(): Promise<void>;
  setPresentationStage(stage: PresentationStage): void;
  approveDecision(outcome?: "approved" | "modified" | "rejected"): Promise<void>;
  runFullDemo(): Promise<void>;
}
