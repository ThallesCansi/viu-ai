import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { agentService, useAgent } from "@/state/useAgent";
import { Chip, SectionLabel, StatusDot } from "@/components/viu/primitives";
import { VoiceAgent } from "@/components/viu/VoiceAgent";
import { EvidenceDrawer } from "@/components/viu/EvidenceDrawer";
import { PresentationSlideView } from "@/components/viu/PresentationSlideView";
import { clampPresentationStage, getSlideNavigation } from "@/services/presentation";
import { guacoDecisionPlan } from "@/data/guaco";
import type { PresentationStage } from "@/types";

export const Route = createFileRoute("/decision-room")({
  head: () => ({
    meta: [
      { title: "Decision Room — VIU AI" },
      {
        name: "description",
        content:
          "VIU AI presents its investigation, answers questions by voice and captures the business decision.",
      },
      { property: "og:title", content: "Decision Room — VIU AI" },
      {
        property: "og:description",
        content: "Live agent briefing and decision capture for the onboarding friction anomaly.",
      },
    ],
  }),
  component: DecisionRoom,
});

function DecisionRoom() {
  const {
    investigation,
    presentation,
    presentationStage,
    decision,
    followUps,
    status,
    people,
    meeting,
  } = useAgent();
  const [outcome, setOutcome] = useState<string | null>(null);

  useEffect(() => {
    if (!presentation) return;
    const clamped = clampPresentationStage(presentationStage, presentation.slides.length);
    if (clamped !== presentationStage) agentService.setPresentationStage(clamped);
  }, [presentation, presentationStage]);

  if (!investigation || !presentation || presentation.slides.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-20 text-center">
        <p className="text-[14px] font-medium">No decision presentation is active.</p>
        <Link to="/" className="mt-3 inline-block text-[13px] text-agent hover:underline">
          Back to intelligence
        </Link>
      </div>
    );
  }

  const stage = clampPresentationStage(presentationStage, presentation.slides.length);
  const setStage = (s: PresentationStage) => agentService.setPresentationStage(s);
  const navigation = getSlideNavigation(presentation);
  const currentSlide = presentation.slides[stage];

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 grid-noise" />
      <div className="relative mx-auto max-w-[1500px] px-8 py-7">
        <header className="mb-6 flex items-start justify-between gap-6">
          <div>
            <SectionLabel>Decision room</SectionLabel>
            <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{investigation.title}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-agent/40 bg-agent-soft px-3 py-2">
            <StatusDot tone="agent" pulse />
            <span className="text-[12px] font-medium text-agent">VIU AI Agent · Presenting</span>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-4 gap-4">
          <HeroStat
            label="Sales"
            value={`${investigation.metrics.salesChangePct > 0 ? "+" : ""}${investigation.metrics.salesChangePct}%`}
            tone={investigation.metrics.salesChangePct < 0 ? "danger" : "agent"}
          />
          <HeroStat
            label="Negative signals"
            value={`${investigation.metrics.negativeSignalChangePct > 0 ? "+" : ""}${investigation.metrics.negativeSignalChangePct}%`}
            tone={investigation.metrics.negativeSignalChangePct > 0 ? "danger" : "agent"}
          />
          <HeroStat label="Confidence" value={`${investigation.confidence}%`} tone="agent" />
          <HeroStat
            label="Urgency"
            value={investigation.urgency.level.toUpperCase()}
            tone={investigation.urgency.level === "high" ? "danger" : "agent"}
          />
        </div>

        <div className="grid grid-cols-[1fr_420px] items-start gap-5">
          <section className="panel min-h-[460px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex gap-1">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStage(item.index)}
                    className={
                      "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors " +
                      (item.index === stage
                        ? "bg-agent-soft text-agent"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {stage + 1} / {presentation.slides.length}
                </span>
                <NavButton disabled={stage === 0} onClick={() => setStage(stage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </NavButton>
                <NavButton
                  disabled={stage === presentation.slides.length - 1}
                  onClick={() => setStage(stage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </NavButton>
              </div>
            </div>

            <div key={stage} className="animate-rise p-7">
              {currentSlide && (
                <PresentationSlideView slide={currentSlide} evidence={investigation.evidence} />
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              <EvidenceDrawer
                signals={investigation.evidence}
                trigger={
                  <button className="rounded-md border border-border px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    Show supporting evidence
                  </button>
                }
              />
            </div>
          </section>

          <div className="flex flex-col gap-5">
            <VoiceAgent
              className="h-[420px]"
              investigation={investigation}
              presentation={presentation}
              attendees={people}
              meeting={meeting}
              onStageChange={setStage}
            />
          </div>
        </div>

        <section className="panel mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SectionLabel className="text-danger">Decision required</SectionLabel>
            {decision && <Chip tone="ok">Decision {decision.outcome}</Chip>}
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-6 p-5">
            <div>
              <p className="max-w-3xl text-[15px] font-medium leading-snug">
                {investigation.recommendation}
              </p>
              <div className="mt-5 flex flex-wrap gap-10">
                <Tile label="Owner" value={guacoDecisionPlan.owner} />
                <Tile label="Primary metric" value={guacoDecisionPlan.primaryMetric} />
                <Tile label="Duration" value={guacoDecisionPlan.durationLabel} />
              </div>
              <div className="mt-4">
                <SectionLabel>Secondary metrics</SectionLabel>
                <div className="mt-1.5 flex gap-2">
                  {guacoDecisionPlan.secondaryMetrics.map((metric) => (
                    <Chip key={metric} tone="muted">
                      {metric}
                    </Chip>
                  ))}
                </div>
              </div>

              {!decision ? (
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOutcome("approved");
                      void agentService.approveDecision("approved");
                    }}
                    className="rounded-md border border-ok/40 bg-ok-soft px-4 py-2 text-[13px] font-semibold text-ok transition-colors hover:bg-ok/20"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOutcome("modified");
                      void agentService.approveDecision("modified");
                    }}
                    className="rounded-md border border-warn/40 bg-warn-soft px-4 py-2 text-[13px] font-semibold text-warn transition-colors hover:bg-warn/20"
                  >
                    Modify
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOutcome("rejected");
                      void agentService.approveDecision("rejected");
                    }}
                    className="rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-ok/40 bg-ok-soft px-3 py-2">
                  <Check className="h-4 w-4 text-ok" />
                  <span className="text-[13px] font-semibold uppercase tracking-wider text-ok">
                    Decision {outcome ?? decision.outcome}
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border bg-surface p-4">
              <SectionLabel>Follow-up execution</SectionLabel>
              {followUps.length === 0 ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  VIU AI will execute the decision once approved.
                </p>
              ) : (
                <>
                  <ul className="mt-2.5 space-y-1.5">
                    {followUps.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 text-[13px]">
                        <span
                          className={
                            "flex h-3.5 w-3.5 items-center justify-center rounded-full border " +
                            (f.status === "complete" ? "border-ok/40 bg-ok-soft" : "border-border")
                          }
                        >
                          {f.status === "complete" && <Check className="h-2 w-2 text-ok" />}
                        </span>
                        <span
                          className={
                            f.status === "complete" ? "text-foreground" : "text-muted-foreground"
                          }
                        >
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {status === "monitoring_outcome" && (
                    <p className="mt-3 text-[12px] text-muted-foreground">
                      Monitoring will continue automatically. Next decision checkpoint:{" "}
                      <span className="text-foreground">{guacoDecisionPlan.durationLabel}</span>.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function NavButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function HeroStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "agent";
}) {
  return (
    <div className="panel p-4">
      <div className="label-xs">{label}</div>
      <div
        className={
          "mt-1.5 text-[24px] font-semibold tracking-tight tabular-nums " +
          (tone === "danger" ? "text-danger" : tone === "agent" ? "text-agent" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "danger" | "agent" }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div
        className={
          "mt-1 text-[15px] font-semibold " +
          (tone === "danger" ? "text-danger" : tone === "agent" ? "text-agent" : "text-foreground")
        }
      >
        {value}
      </div>
    </div>
  );
}
