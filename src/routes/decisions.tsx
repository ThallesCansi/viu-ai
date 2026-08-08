import { createFileRoute } from "@tanstack/react-router";
import { useAgent } from "@/state/useAgent";
import { Chip, SectionLabel } from "@/components/viu/primitives";

export const Route = createFileRoute("/decisions")({
  head: () => ({
    meta: [
      { title: "Decisions — VIU AI" },
      {
        name: "description",
        content: "History of business decisions captured and tracked by the VIU AI agent.",
      },
      { property: "og:title", content: "Decisions — VIU AI" },
      {
        property: "og:description",
        content: "Approved actions, owners and monitored metrics tracked by VIU AI.",
      },
    ],
  }),
  component: DecisionsPage,
});

function DecisionsPage() {
  const { decision } = useAgent();

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-7">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Decisions</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Business decisions triggered by autonomous investigations, with follow-up tracking.
        </p>
      </header>

      {!decision ? (
        <div className="panel px-6 py-16 text-center">
          <p className="text-[14px] font-medium">No decisions recorded yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Decisions appear here after they are captured in the decision room.
          </p>
        </div>
      ) : (
        <article className="panel p-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[16px] font-semibold">{decision.title}</h2>
                <Chip tone={decision.status === "active" ? "ok" : "muted"}>{decision.status}</Chip>
              </div>
              <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
                {decision.proposedAction}
              </p>
            </div>
            <div className="text-right">
              <SectionLabel>Created</SectionLabel>
              <div className="text-[13px]">{decision.createdAt}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-6 border-t border-border pt-4">
            <Field label="Triggered by" value={decision.triggeredBy} />
            <Field label="Decision" value={decision.decision} />
            <Field label="Owner" value={decision.owner} />
            <Field label="Follow-up" value={`${decision.followUpInDays} days`} />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <SectionLabel>Metrics monitored</SectionLabel>
            <div className="mt-2 flex gap-2">
              <Chip tone="agent">{decision.primaryMetric}</Chip>
              {decision.secondaryMetrics.map((m) => (
                <Chip key={m} tone="muted">
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 text-[13px]">{value}</div>
    </div>
  );
}
