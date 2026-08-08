import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { agentService, useAgent } from "@/state/useAgent";
import { Chip, SectionLabel, StatusDot } from "@/components/viu/primitives";
import { VoiceAgent } from "@/components/viu/VoiceAgent";
import { ClusterBars } from "@/components/viu/ClusterBars";
import { EvidenceCard } from "@/components/viu/EvidenceCard";
import { EvidenceDrawer } from "@/components/viu/EvidenceDrawer";
import { HEADLINE_FINDING, PROPOSED_ACTION, RECOMMENDATION } from "@/data/demo";
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

const stages = [
  "What changed?",
  "What customers are saying",
  "What we found",
  "Recommendation",
] as const;

function DecisionRoom() {
  const { investigation, presentationStage, decision, followUps, status } = useAgent();
  const [outcome, setOutcome] = useState<string | null>(null);

  if (!investigation) {
    return (
      <div className="mx-auto max-w-[900px] px-8 py-20 text-center">
        <p className="text-[14px] font-medium">No decision meeting is active.</p>
        <Link to="/" className="mt-3 inline-block text-[13px] text-agent hover:underline">
          Back to intelligence
        </Link>
      </div>
    );
  }

  const stage = presentationStage;
  const setStage = (s: PresentationStage) => agentService.setPresentationStage(s);

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
          <HeroStat label="Sales" value="↓ 11%" tone="danger" />
          <HeroStat label="Negative signals" value="↑ 36%" tone="danger" />
          <HeroStat label="Confidence" value={`${investigation.confidence || 84}%`} tone="agent" />
          <HeroStat label="Urgency" value="HIGH" tone="danger" />
        </div>

        <div className="grid grid-cols-[1fr_420px] items-start gap-5">
          <section className="panel min-h-[460px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex gap-1">
                {stages.map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(i as PresentationStage)}
                    className={
                      "rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors " +
                      (i === stage
                        ? "bg-agent-soft text-agent"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground")
                    }
                  >
                    {i + 1}. {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <NavButton
                  disabled={stage === 0}
                  onClick={() => setStage(Math.max(0, stage - 1) as PresentationStage)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </NavButton>
                <NavButton
                  disabled={stage === 3}
                  onClick={() => setStage(Math.min(3, stage + 1) as PresentationStage)}
                >
                  <ChevronRight className="h-4 w-4" />
                </NavButton>
              </div>
            </div>

            <div key={stage} className="animate-rise p-7">
              {stage === 0 && (
                <StageBlock
                  eyebrow="What changed?"
                  statement="Sales declined 11% while negative customer sentiment increased 36%."
                >
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <Tile label="Previous sales" value="$100K" />
                    <Tile label="Current sales" value="$89K" tone="danger" />
                    <Tile label="Conversations evaluated" value="142" />
                  </div>
                </StageBlock>
              )}

              {stage === 1 && (
                <StageBlock
                  eyebrow="What customers are saying"
                  statement="Negative conversations are concentrating into one dominant topic."
                >
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    <ClusterBars clusters={investigation.clusters} />
                    <div className="flex flex-col gap-3">
                      {investigation.evidence.slice(0, 2).map((s) => (
                        <EvidenceCard key={s.id} signal={s} />
                      ))}
                    </div>
                  </div>
                </StageBlock>
              )}

              {stage === 2 && (
                <StageBlock
                  eyebrow="What we found"
                  statement="27 relevant conversations are concentrated around onboarding friction, particularly the new verification step."
                >
                  <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
                    {HEADLINE_FINDING} Correlation detected — causality has not been established.
                  </p>
                  <div className="mt-6 flex gap-10">
                    <Tile label="Confidence" value="84%" tone="agent" />
                    <Tile label="Urgency" value="82 / 100" tone="danger" />
                    <Tile label="Qualifier" value="Probable contributor" />
                  </div>
                </StageBlock>
              )}

              {stage === 3 && (
                <StageBlock
                  eyebrow="Recommendation"
                  statement="Evaluate a simplified onboarding flow through a controlled experiment or rollback."
                >
                  <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
                    {RECOMMENDATION}
                  </p>
                </StageBlock>
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
            <VoiceAgent className="h-[420px]" onStageChange={(s) => setStage(s)} />
          </div>
        </div>

        <section className="panel mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SectionLabel className="text-danger">Decision required</SectionLabel>
            {decision && <Chip tone="ok">Decision {decision.outcome}</Chip>}
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-6 p-5">
            <div>
              <p className="max-w-3xl text-[15px] font-medium leading-snug">{PROPOSED_ACTION}</p>
              <div className="mt-5 flex flex-wrap gap-10">
                <Tile label="Owner" value="Pedro Lima" />
                <Tile label="Primary metric" value="Onboarding completion rate" />
                <Tile label="Duration" value="14 days" />
              </div>
              <div className="mt-4">
                <SectionLabel>Secondary metrics</SectionLabel>
                <div className="mt-1.5 flex gap-2">
                  <Chip tone="muted">Trial conversion</Chip>
                  <Chip tone="muted">Negative onboarding sentiment</Chip>
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
                            (f.status === "complete"
                              ? "border-ok/40 bg-ok-soft"
                              : "border-border")
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
                      <span className="text-foreground">14 days</span>.
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

function StageBlock({
  eyebrow,
  statement,
  children,
}: {
  eyebrow: string;
  statement: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel className="text-agent">{eyebrow}</SectionLabel>
      <h2 className="mt-2 max-w-4xl text-[24px] leading-tight font-semibold tracking-tight">
        {statement}
      </h2>
      {children}
    </div>
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
