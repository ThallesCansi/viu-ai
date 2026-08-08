import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, CalendarCheck, Check, Loader2 } from "lucide-react";
import { agentService, useAgent } from "@/state/useAgent";
import { Chip, SectionLabel, StatusDot } from "@/components/viu/primitives";
import { StepTimeline, ToolActivity } from "@/components/viu/AgentProgress";
import { ClusterBars } from "@/components/viu/ClusterBars";
import { EvidenceCard } from "@/components/viu/EvidenceCard";
import { EvidenceDrawer } from "@/components/viu/EvidenceDrawer";
import {
  HEADLINE_FINDING,
  RECOMMENDATION_REASON,
  meetingAgenda,
} from "@/data/demo";
import { statusLabels } from "@/components/layout/TopBar";

export const Route = createFileRoute("/investigations/$investigationId")({
  head: () => ({
    meta: [
      { title: "Autonomous Investigation — VIU AI" },
      {
        name: "description",
        content:
          "Step-by-step autonomous investigation: tool activity, topic clusters, evidence and agent recommendation.",
      },
      { property: "og:title", content: "Autonomous Investigation — VIU AI" },
      {
        property: "og:description",
        content: "Evidence, clusters and confidence behind a VIU AI investigation.",
      },
    ],
  }),
  component: InvestigationDetail,
});

function InvestigationDetail() {
  const navigate = useNavigate();
  const {
    investigation,
    steps,
    toolCalls,
    people,
    availability,
    meeting,
    status,
  } = useAgent();

  // Autonomy: once the agent flags a decision, it prepares people + scheduling itself.
  useEffect(() => {
    if (status === "decision_required" && people.length === 0) {
      void agentService.findDecisionMakers();
    }
  }, [status, people.length]);

  useEffect(() => {
    if (people.length > 0 && !meeting && status === "decision_required") {
      const t = setTimeout(() => void agentService.scheduleMeeting(), 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [people.length, meeting, status]);

  if (!investigation) {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-20 text-center">
        <p className="text-[14px] font-medium">This investigation is no longer active.</p>
        <Link to="/investigations" className="mt-3 inline-block text-[13px] text-agent hover:underline">
          Back to investigations
        </Link>
      </div>
    );
  }

  const complete = investigation.confidence > 0;
  const evidence = investigation.evidence;

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-7">
      <Link
        to="/investigations"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Investigations
      </Link>

      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <SectionLabel>Autonomous investigation</SectionLabel>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">{investigation.title}</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            {investigation.anomaly.summary}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="danger">High priority</Chip>
          <Chip tone={complete ? "ok" : "agent"}>
            <StatusDot tone={complete ? "ok" : "agent"} pulse={!complete} className="mr-0.5" />
            {complete ? "Investigation complete" : statusLabels[investigation.status]}
          </Chip>
        </div>
      </header>

      {complete && (
        <section className="animate-rise panel mb-6 border-warn/30 bg-warn-soft p-5">
          <p className="max-w-3xl text-[16px] leading-snug font-medium">{HEADLINE_FINDING}</p>
          <div className="mt-5 flex flex-wrap gap-10">
            <Stat label="Sales change" value="-11%" tone="danger" />
            <Stat label="Negative signal change" value="+36%" tone="danger" />
            <Stat label="Related conversations" value="27" />
            <Stat label="Confidence" value={`${investigation.confidence}%`} tone="agent" />
            <Stat label="Urgency" value={`${investigation.urgency.score} / 100`} tone="danger" />
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">
            Correlation detected. Causality has not been established.
          </p>
        </section>
      )}

      <div className="grid grid-cols-[1fr_360px] items-start gap-5">
        <div className="flex flex-col gap-5">
          <Panel title="Agent tools">
            <ToolActivity tools={toolCalls} />
          </Panel>

          <Panel title="Dominant customer topics">
            {investigation.clusters.length ? (
              <ClusterBars clusters={investigation.clusters} />
            ) : (
              <p className="text-[13px] text-muted-foreground">Clustering conversations…</p>
            )}
          </Panel>

          {complete && (
            <>
              <Panel title="What VIU AI found">
                <p className="text-[13px] leading-relaxed text-foreground">
                  {investigation.summary}
                </p>
                <div className="mt-4 rounded-md border border-border bg-surface p-4">
                  <SectionLabel>Primary hypothesis</SectionLabel>
                  <p className="mt-1.5 text-[13px] leading-relaxed">{investigation.hypothesis}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full origin-left animate-bar rounded-full bg-agent"
                        style={{ width: `${investigation.confidence}%` }}
                      />
                    </div>
                    <span className="font-mono text-[12px] text-agent tabular-nums">
                      confidence {investigation.confidence}%
                    </span>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Supporting evidence"
                action={
                  <EvidenceDrawer
                    signals={evidence}
                    trigger={
                      <button className="rounded-md border border-border px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                        Show all evidence
                      </button>
                    }
                  />
                }
              >
                <div className="flex flex-col gap-3">
                  {evidence.slice(0, 3).map((s) => (
                    <EvidenceCard key={s.id} signal={s} />
                  ))}
                </div>
              </Panel>

              <section className="panel border-danger/35 bg-danger-soft p-5">
                <SectionLabel className="text-danger">Agent recommendation</SectionLabel>
                <p className="mt-2 max-w-3xl text-[15px] leading-snug font-medium">
                  {investigation.recommendation}
                </p>
                <div className="mt-4 flex gap-10">
                  <Stat label="Urgency" value="High" tone="danger" />
                  <Stat label="Decision required" value="Yes" tone="danger" />
                </div>
                <p className="mt-4 max-w-3xl text-[12px] text-muted-foreground">
                  {RECOMMENDATION_REASON}
                </p>
              </section>

              <DecisionPreparation
                people={people}
                availability={availability}
                meeting={meeting}
                onJoin={() => {
                  void agentService.openDecisionRoom();
                  void navigate({ to: "/decision-room" });
                }}
              />
            </>
          )}
        </div>

        <div className="sticky top-0 flex flex-col gap-5">
          <Panel title="Investigation timeline">
            <StepTimeline steps={steps} />
          </Panel>
          <Panel title="Language qualifier">
            <p className="text-[13px] text-muted-foreground">
              Classified as{" "}
              <span className="font-medium text-warn">
                {investigation.languageQualifier.replace("_", " ")}
              </span>
              . VIU AI reports suspected contributors and confidence, never definitive causality.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "agent";
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div
        className={
          "text-[18px] font-semibold tabular-nums " +
          (tone === "danger" ? "text-danger" : tone === "agent" ? "text-agent" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <SectionLabel>{title}</SectionLabel>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function DecisionPreparation({
  people,
  availability,
  meeting,
  onJoin,
}: {
  people: ReturnType<typeof useAgent>["people"];
  availability: ReturnType<typeof useAgent>["availability"];
  meeting: ReturnType<typeof useAgent>["meeting"];
  onJoin: () => void;
}) {
  const steps = [
    { label: "Selecting required decision makers", done: people.length > 0 },
    { label: "Checking organizational responsibilities", done: people.length > 0 },
    { label: "Checking calendar availability", done: !!availability },
    { label: "Preparing decision brief", done: meeting?.calendarStatus === "created" },
  ];

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <SectionLabel>Preparing business decision</SectionLabel>
        <p className="mt-1 text-[13px] text-muted-foreground">
          VIU AI determined that human judgment is required and is preparing a decision meeting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 p-4">
        <div className="flex flex-col gap-2">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[13px]">
              {s.done ? (
                <Check className="h-3.5 w-3.5 text-ok" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-agent" />
              )}
              <span className={s.done ? "text-foreground" : "text-muted-foreground"}>
                {s.label}
                {s.done ? "" : "…"}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <SectionLabel>Scheduling</SectionLabel>
          {!availability ? (
            <p className="mt-2 text-[13px] text-muted-foreground">Checking calendars…</p>
          ) : (
            <>
              <div className="mt-2 text-[13px]">
                Common availability found —{" "}
                <span className="font-medium">
                  {availability.date}, {availability.startTime} – {availability.endTime}
                </span>{" "}
                <span className="text-muted-foreground">({availability.durationMinutes} min)</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[13px]">
                {meeting?.calendarStatus === "created" ? (
                  <>
                    <CalendarCheck className="h-3.5 w-3.5 text-ok" />
                    <span className="text-ok">Meeting created</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-agent" />
                    <span className="text-muted-foreground">Creating calendar event…</span>
                  </>
                )}
              </div>
              <ol className="mt-3 space-y-1">
                {(meeting?.agenda ?? meetingAgenda).map((item, i) => (
                  <li key={item} className="text-[12px] text-muted-foreground">
                    {i + 1}. {item}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {people.length > 0 && (
        <div className="grid grid-cols-2 gap-3 border-t border-border p-4">
          {people.map((p) => (
            <div
              key={p.id}
              className="animate-rise flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3.5"
            >
              <div>
                <div className="text-[13px] font-medium">{p.name}</div>
                <div className="text-[12px] text-muted-foreground">{p.role}</div>
                <p className="mt-1.5 max-w-xs text-[12px] text-muted-foreground">{p.reason}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Chip tone={p.required ? "agent" : "muted"}>
                  {p.required ? "Required" : "Not invited yet"}
                </Chip>
                {p.required && <Chip tone="ok">Available</Chip>}
              </div>
            </div>
          ))}
        </div>
      )}

      {meeting?.calendarStatus === "created" && (
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-3">
          <div className="text-[13px]">
            <span className="font-medium">{meeting.title}</span>{" "}
            <span className="text-muted-foreground">
              · {meeting.date} {meeting.startTime} · {meeting.attendees.length} participants
            </span>
          </div>
          <button
            type="button"
            onClick={onJoin}
            className="rounded-md border border-agent/40 bg-agent-soft px-3 py-1.5 text-[12px] font-semibold text-agent transition-colors hover:bg-agent/20"
          >
            Join decision room
          </button>
        </div>
      )}
    </section>
  );
}
