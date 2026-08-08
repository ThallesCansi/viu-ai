import { createFileRoute, Link } from "@tanstack/react-router";
import { useAgent } from "@/state/useAgent";
import { Chip, SectionLabel, StatusDot } from "@/components/viu/primitives";
import { statusLabels } from "@/components/layout/TopBar";

export const Route = createFileRoute("/investigations/")({
  head: () => ({
    meta: [
      { title: "Investigations — VIU AI" },
      {
        name: "description",
        content:
          "Autonomous investigations opened by VIU AI when market and business signals diverge.",
      },
      { property: "og:title", content: "Investigations — VIU AI" },
      {
        property: "og:description",
        content: "Autonomous investigations opened by the VIU AI market intelligence agent.",
      },
    ],
  }),
  component: InvestigationsPage,
});

function InvestigationsPage() {
  const { investigation } = useAgent();

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-7">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Investigations</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Opened autonomously when internal metrics and external signals diverge.
        </p>
      </header>

      {!investigation ? (
        <div className="panel flex flex-col items-center gap-2 px-6 py-16 text-center">
          <StatusDot tone="ok" pulse />
          <p className="text-[14px] font-medium">No open investigations</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            The agent is monitoring. An investigation will appear here automatically when a
            meaningful anomaly is detected.
          </p>
        </div>
      ) : (
        <Link
          to="/investigations/$investigationId"
          params={{ investigationId: investigation.id }}
          className="panel block p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[16px] font-semibold">{investigation.title}</span>
                <Chip tone="danger">High priority</Chip>
                <Chip tone="agent">
                  <StatusDot tone="agent" pulse className="mr-0.5" />
                  {statusLabels[investigation.status]}
                </Chip>
              </div>
              <p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">
                {investigation.anomaly.summary}
              </p>
            </div>
            <div className="text-right">
              <SectionLabel>Detected</SectionLabel>
              <div className="text-[13px]">{investigation.detectedAt}</div>
            </div>
          </div>

          <div className="mt-5 flex gap-10 border-t border-border pt-4">
            <div>
              <SectionLabel>Sales</SectionLabel>
              <div className="text-[15px] font-semibold text-danger tabular-nums">
                {investigation.metrics.salesChangePct}%
              </div>
            </div>
            <div>
              <SectionLabel>Negative signals</SectionLabel>
              <div className="text-[15px] font-semibold text-danger tabular-nums">
                +{investigation.metrics.negativeSignalChangePct}%
              </div>
            </div>
            <div>
              <SectionLabel>Confidence</SectionLabel>
              <div className="text-[15px] font-semibold tabular-nums">
                {investigation.confidence ? `${investigation.confidence}%` : "Calculating"}
              </div>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
