import {
  HEADLINE_FINDING,
  HYPOTHESIS,
  INVESTIGATION_SUMMARY,
  PROPOSED_ACTION,
  RECOMMENDATION,
  baselineMetrics,
  evidenceSignals,
  meetingAgenda,
  topicClusters,
} from "@/data/demo";
import {
  mockBusinessMetricsService,
  mockCompanyDirectoryService,
  mockMarketSignalsService,
} from "@/services/mock/data-services";
import { mockActionService, mockCalendarService } from "@/services/mock/support-services";
import { config } from "@/services/config";
import { createRemoteInvestigation } from "@/services/http/investigations";
import {
  buildPresentationDeck,
  clampPresentationStage,
  resolvePresentationDeck,
} from "@/services/presentation";
import { guacoDecisionPlan, guacoInvestigation } from "@/data/guaco";
import type { AgentService, AgentSnapshot } from "@/services/types";
import type {
  AgentEvent,
  AgentEventType,
  Investigation,
  InvestigationStep,
  PresentationStage,
  ToolCall,
} from "@/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const clock = () =>
  new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const STEP_LABELS = [
  "Business anomaly detected",
  "Sales decline confirmed",
  "Market conversations retrieved",
  "Negative conversations clustered",
  "Evaluating dominant topics",
  "Comparing timing with business metrics",
  "Building hypothesis",
  "Assessing confidence",
  "Determining required action",
];

const buildSteps = (doneCount: number, activeIndex: number): InvestigationStep[] =>
  STEP_LABELS.map((label, i) => ({
    id: `step-${i}`,
    label,
    status: i < doneCount ? "done" : i === activeIndex ? "active" : "pending",
  }));

const INVESTIGATION_ID = guacoInvestigation.id;

const buildInvestigation = (partial: Partial<Investigation> = {}): Investigation => ({
  ...guacoInvestigation,
  status: "investigating",
  confidence: 0,
  urgency: { score: 0, level: "medium" },
  clusters: [],
  evidence: [],
  decisionRequired: false,
  ...partial,
});

const initialSnapshot = (): AgentSnapshot => ({
  status: "monitoring",
  running: false,
  cycle: 0,
  nextScanInSeconds: 120,
  lastCycleAt: null,
  events: [],
  metrics: baselineMetrics.map((m) => ({ ...m })),
  anomalyDetected: false,
  investigation: null,
  steps: [],
  toolCalls: [],
  people: [],
  availability: null,
  meeting: null,
  decision: null,
  followUps: [],
  presentation: null,
  presentationStage: 0,
  degraded: [],
});

class MockAgentEngine implements AgentService {
  private snapshot: AgentSnapshot = initialSnapshot();
  private listeners = new Set<(s: AgentSnapshot) => void>();
  private eventListeners = new Set<(e: AgentEvent) => void>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private busy = false;

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: (s: AgentSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeToEvents(listener: (e: AgentEvent) => void) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  getInvestigation(id: string) {
    return this.snapshot.investigation?.id === id ? this.snapshot.investigation : null;
  }

  private patch(next: Partial<AgentSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((l) => l(this.snapshot));
  }

  private emit(
    type: AgentEventType,
    title: string,
    extra: Partial<Omit<AgentEvent, "id" | "type" | "title">> = {},
  ) {
    const event: AgentEvent = {
      id: `ev-${++this.seq}`,
      timestamp: clock(),
      type,
      title,
      ...extra,
    };
    this.patch({ events: [event, ...this.snapshot.events].slice(0, 200) });
    this.eventListeners.forEach((l) => l(event));
    return event;
  }

  private upsertTool(tool: ToolCall) {
    const existing = this.snapshot.toolCalls.filter((t) => t.id !== tool.id);
    this.patch({ toolCalls: [...existing, tool] });
  }

  private updateInvestigation(patch: Partial<Investigation>) {
    if (!this.snapshot.investigation) return;
    const investigation = { ...this.snapshot.investigation, ...patch };
    const presentation = resolvePresentationDeck(investigation);
    this.patch({
      investigation,
      presentation,
      presentationStage: clampPresentationStage(
        this.snapshot.presentationStage,
        presentation.slides.length,
      ),
    });
  }

  // ---------------------------------------------------------------- monitoring

  startMonitoring() {
    if (this.tickTimer) return;
    this.patch({ running: true });
    this.monitoringCycle();
    this.tickTimer = setInterval(() => {
      const next = this.snapshot.nextScanInSeconds - 1;
      if (next <= 0) {
        this.patch({ nextScanInSeconds: 120 });
        if (this.snapshot.status === "monitoring") void this.monitoringCycle();
      } else {
        this.patch({ nextScanInSeconds: next });
      }
    }, 1000);
  }

  stopMonitoring() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.patch({ running: false });
  }

  private async monitoringCycle() {
    if (this.snapshot.status !== "monitoring") return;
    this.patch({ cycle: this.snapshot.cycle + 1, lastCycleAt: clock() });
    this.emit("monitoring_tick", "Monitoring market signals", {
      tool: { name: "search_market_signals", provider: "Gorilla" },
    });
    await sleep(1400);
    if (this.snapshot.status !== "monitoring") return;
    const n = 88 + Math.floor(Math.random() * 20);
    this.emit("signal_received", `${n} new conversations evaluated`);
    await sleep(900);
    if (this.snapshot.status !== "monitoring") return;
    this.emit("monitoring_tick", "No meaningful anomaly detected");
  }

  // ------------------------------------------------------------------- phases

  reset() {
    this.stopMonitoring();
    this.snapshot = initialSnapshot();
    this.busy = false;
    this.listeners.forEach((l) => l(this.snapshot));
    this.startMonitoring();
  }

  async triggerAnomaly() {
    if (this.snapshot.anomalyDetected) return;
    this.patch({ status: "anomaly_detected", anomalyDetected: true });
    this.emit("anomaly_detected", "Market anomaly detected", {
      description: guacoInvestigation.anomaly.summary,
    });

    if (!config.useMockAgent) {
      await sleep(500);
      await this.startInvestigation();
      return;
    }

    await sleep(900);
    this.emit("tool_call_started", "Cross-referencing internal business metrics", {
      tool: { name: "get_sales_metrics", provider: "Sales Data" },
    });
    await mockBusinessMetricsService.getMetrics();
    await sleep(800);
    this.emit("tool_call_completed", "Métricas regionais simuladas recuperadas", {
      tool: { name: "get_sales_metrics", provider: "Sales Data" },
    });
    await sleep(700);
    // Autonomy: the agent starts investigating without user input.
    void this.startInvestigation();
  }

  async startInvestigation() {
    if (this.busy || this.snapshot.investigation) return;
    this.busy = true;
    const investigation = buildInvestigation();
    this.patch({
      status: "investigating",
      investigation,
      presentation: resolvePresentationDeck(investigation),
      steps: buildSteps(0, 0),
      metrics: this.snapshot.metrics.map((m) =>
        m.id === "investigations"
          ? { ...m, value: 1, formattedValue: "1", status: "attention" }
          : m,
      ),
    });
    this.emit("investigation_started", "Autonomous investigation started", {
      description: guacoInvestigation.title,
    });

    if (!config.useMockAgent) {
      try {
        const response = await createRemoteInvestigation();
        this.patch({
          status: response.investigation.status,
          investigation: response.investigation,
          presentation: resolvePresentationDeck(response.investigation),
          steps: buildSteps(STEP_LABELS.length, -1),
          toolCalls: response.toolCalls,
          events: [...response.events, ...this.snapshot.events].slice(0, 200),
          degraded: this.snapshot.degraded.filter((item) => item !== "Autonomous agent"),
        });
        this.busy = false;
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown agent error";
        this.patch({
          degraded: [...new Set([...this.snapshot.degraded, "Autonomous agent"])],
        });
        this.emit("finding_created", "Real agent unavailable — using demo fallback", {
          description: message,
        });
        // Fall through to the deterministic mock investigation so the demo stays usable.
      }
    }

    await sleep(600);
    this.patch({ steps: buildSteps(1, 1) });

    this.upsertTool({
      id: "t-sales",
      provider: "Sales Data",
      name: "get_sales_metrics",
      status: "running",
    });
    await sleep(900);
    this.upsertTool({
      id: "t-sales",
      provider: "Sales Data",
      name: "get_sales_metrics",
      status: "complete",
      result: "Campinas +11.3% · Grande ABC -11.4% vs meta",
    });
    this.patch({ steps: buildSteps(2, 2) });

    this.upsertTool({
      id: "t-gorilla-1",
      provider: "Gorilla",
      name: "search_market_signals",
      query: '"gua.co" OR "guaco" restaurante — menções públicas',
      status: "running",
    });
    this.emit("tool_call_started", "Searching market conversations", {
      tool: { name: "search_market_signals", provider: "Gorilla" },
    });
    await mockMarketSignalsService.searchSignals();
    await sleep(1000);
    this.upsertTool({
      id: "t-gorilla-1",
      provider: "Gorilla",
      name: "search_market_signals",
      query: '"gua.co" OR "guaco" restaurante — menções públicas',
      status: "complete",
      result: "50 registros brutos · 11 relevantes",
    });
    this.emit("tool_call_completed", "11 conversas relevantes retidas após filtragem", {
      tool: { name: "search_market_signals", provider: "Gorilla" },
    });
    this.patch({ steps: buildSteps(3, 3) });

    await sleep(900);
    this.updateInvestigation({ clusters: guacoInvestigation.clusters });
    this.emit("finding_created", "Sinais agrupados em 4 clusters temáticos");
    this.patch({ steps: buildSteps(4, 4) });
    this.busy = false;
  }

  async completeInvestigation() {
    if (!this.snapshot.investigation || this.busy) return;
    if (!config.useMockAgent && this.snapshot.investigation.status === "investigation_complete") {
      return;
    }
    this.busy = true;
    this.updateInvestigation({ clusters: guacoInvestigation.clusters });
    this.patch({ steps: buildSteps(5, 5) });

    this.upsertTool({
      id: "t-gorilla-2",
      provider: "Gorilla",
      name: "search_market_signals",
      query: '"gua.co campinas" OR "gua.co abc"',
      status: "running",
    });
    this.emit("tool_call_started", "Requesting additional evidence", {
      tool: { name: "search_market_signals", provider: "Gorilla" },
    });
    await sleep(1200);
    this.upsertTool({
      id: "t-gorilla-2",
      provider: "Gorilla",
      name: "search_market_signals",
      query: '"gua.co campinas" OR "gua.co abc"',
      status: "complete",
      result: "6 evidências-chave selecionadas",
    });
    this.emit("finding_created", "11 evidências explicitamente ligadas à marca retidas");
    this.updateInvestigation({ evidence: guacoInvestigation.evidence });
    this.patch({ steps: buildSteps(6, 6) });

    await sleep(900);
    this.emit(
      "finding_created",
      "Associação entre sinal social recente e desempenho regional simulado",
    );
    this.patch({ steps: buildSteps(7, 7) });

    await sleep(800);
    this.updateInvestigation({
      confidence: guacoInvestigation.confidence,
      urgency: guacoInvestigation.urgency,
    });
    this.emit("confidence_updated", `Confidence updated to ${guacoInvestigation.confidence}%`);
    await sleep(600);
    this.patch({ steps: buildSteps(9, -1), status: "investigation_complete" });
    this.updateInvestigation({
      status: "investigation_complete",
      summary: guacoInvestigation.summary,
      decisionRequired: true,
    });
    this.emit("finding_created", guacoInvestigation.hypothesis);
    await sleep(700);
    this.patch({ status: "decision_required" });
    this.updateInvestigation({ status: "decision_required" });
    this.emit("decision_required", "Human decision required", {
      description: "Cross-functional product decision with high commercial impact.",
    });
    this.upsertTool({
      id: "t-directory",
      provider: "Company Directory",
      name: "get_relevant_people",
      status: "waiting",
    });
    this.busy = false;
  }

  async findDecisionMakers() {
    if (this.busy) return;
    this.busy = true;
    this.upsertTool({
      id: "t-directory",
      provider: "Company Directory",
      name: "get_relevant_people",
      status: "running",
    });
    this.emit("tool_call_started", "Selecting required decision makers", {
      tool: { name: "get_relevant_people", provider: "Company Directory" },
    });
    const people = await mockCompanyDirectoryService.getRelevantPeople(INVESTIGATION_ID);
    await sleep(900);
    this.patch({ people });
    this.upsertTool({
      id: "t-directory",
      provider: "Company Directory",
      name: "get_relevant_people",
      status: "complete",
      result: "3 decision makers selected",
    });
    this.emit("people_selected", "3 decision makers selected", {
      description: "Marina Costa, Pedro Lima, Ana Souza",
    });
    this.busy = false;
  }

  async scheduleMeeting() {
    if (this.busy) return;
    this.busy = true;
    if (!this.snapshot.people.length) {
      this.busy = false;
      await this.findDecisionMakers();
      this.busy = true;
    }
    this.patch({ status: "scheduling" });
    this.upsertTool({
      id: "t-calendar",
      provider: "Google Calendar",
      name: "find_availability",
      status: "running",
    });
    this.emit("tool_call_started", "Checking calendar availability", {
      tool: { name: "find_availability", provider: "Google Calendar" },
    });
    const attendees = this.snapshot.people.filter((p) => p.required);
    const slot = await mockCalendarService.findAvailability(attendees);
    this.patch({ availability: slot });
    this.upsertTool({
      id: "t-calendar",
      provider: "Google Calendar",
      name: "find_availability",
      status: "complete",
      result: `${slot.date} ${slot.startTime} – ${slot.endTime}`,
    });
    this.emit("availability_found", `Common availability found — ${slot.startTime}`);

    const creating = await mockCalendarService.createMeeting({
      investigationId: INVESTIGATION_ID,
      title: `Decision Review — ${guacoInvestigation.title}`,
      attendees,
      slot,
      agenda: meetingAgenda,
    });
    this.patch({
      meeting: { ...creating, calendarStatus: "creating" },
    });
    this.emit("tool_call_started", "Meeting creation requested", {
      tool: { name: "create_event", provider: "Google Calendar" },
    });
    await sleep(1100);
    this.patch({ meeting: creating, status: "meeting_ready" });
    this.emit("meeting_created", "Decision meeting created", {
      description: `Decision Review — ${guacoInvestigation.title} · Today 3:30 PM`,
    });
    this.busy = false;
  }

  async openDecisionRoom() {
    this.patch({ status: "presenting", presentationStage: 0 });
    this.emit("voice_started", "Voice presentation started", {
      tool: { name: "start_session", provider: "ElevenLabs" },
    });
    await sleep(400);
  }

  setPresentationStage(stage: PresentationStage) {
    this.patch({
      presentationStage: clampPresentationStage(
        stage,
        this.snapshot.presentation?.slides.length ?? 0,
      ),
    });
  }

  async approveDecision(outcome: "approved" | "modified" | "rejected" = "approved") {
    if (this.busy) return;
    this.busy = true;
    const decision = {
      id: "dec-1",
      title: "Onboarding Experiment",
      investigationId: INVESTIGATION_ID,
      status: outcome === "rejected" ? ("rejected" as const) : ("active" as const),
      triggeredBy: "Market anomaly",
      decision: "Simplify onboarding verification",
      proposedAction: guacoDecisionPlan.proposedAction,
      owner: guacoDecisionPlan.owner,
      primaryMetric: guacoDecisionPlan.primaryMetric,
      secondaryMetrics: guacoDecisionPlan.secondaryMetrics,
      durationDays: guacoDecisionPlan.durationDays,
      createdAt: "Today",
      followUpInDays: 14,
      outcome,
    };
    this.patch({ status: "awaiting_decision", decision });
    this.emit("decision_recorded", `Decision recorded: ${outcome}`, {
      description: guacoDecisionPlan.proposedAction,
    });

    if (outcome === "rejected") {
      this.patch({ status: "monitoring" });
      this.emit("monitoring_resumed", "Monitoring resumed");
      this.busy = false;
      return;
    }

    const followUps = await mockActionService.createFollowUp(decision);
    this.patch({ status: "executing_action", followUps });
    for (let i = 0; i < followUps.length; i++) {
      await sleep(650);
      this.patch({
        followUps: this.snapshot.followUps.map((f, idx) =>
          idx === i
            ? { ...f, status: "complete" }
            : idx === i + 1
              ? { ...f, status: "running" }
              : f,
        ),
      });
      this.emit("action_created", followUps[i]?.label ?? "Follow-up action created");
    }
    await sleep(600);
    this.patch({ status: "monitoring_outcome" });
    this.emit(
      "monitoring_resumed",
      `Monitoring resumed — next checkpoint in ${guacoDecisionPlan.durationLabel}`,
    );
    this.busy = false;
  }

  async runFullDemo() {
    this.reset();
    await sleep(1800);
    await this.triggerAnomaly();
    await sleep(5200);
    await this.completeInvestigation();
    await sleep(1400);
    await this.findDecisionMakers();
    await sleep(1200);
    await this.scheduleMeeting();
    await sleep(1000);
    await this.openDecisionRoom();
  }
}

export const mockAgentService: AgentService = new MockAgentEngine();
