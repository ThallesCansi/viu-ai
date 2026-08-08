import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useAgent } from "@/state/useAgent";
import { MetricCard } from "@/components/viu/MetricCard";
import { ActivityFeed } from "@/components/viu/ActivityFeed";
import { Chip, SectionLabel, StatusDot } from "@/components/viu/primitives";
import { statusLabels } from "@/components/layout/TopBar";
import { integrations } from "@/data/demo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Market Intelligence — VIU AI" },
      {
        name: "description",
        content:
          "VIU AI continuously monitors customer, market and business signals and investigates meaningful changes automatically.",
      },
      { property: "og:title", content: "Market Intelligence — VIU AI" },
      {
        property: "og:description",
        content: "VIU AI continuously monitors customer, market and business signals and investigates meaningful changes automatically.",
      },
    ],
  }),
  component: IntelligencePage,
});

function SourceCard({ name, sub, tone }: { name: string; sub: string; tone: "ok" | "agent" }) {
  return (
    <div className="panel flex items-center justify-between px-3.5 py-3">
      <div>
        <div className="text-[13px] font-medium">{name}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      <StatusDot tone={tone} pulse={tone === "agent"} />
    </div>
  );
}

function IntelligencePage() {
  const {
    metrics,
    events,
    status,
    lastCycleAt,
    nextScanInSeconds,
    anomalyDetected,
    investigation,
  } = useAgent();

  const sources = integrations.filter((i) => i.group === "sources" || i.id === "gorilla");
  const internal = integrations.filter((i) => i.group === "internal");

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-7">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight">Market Intelligence</h1>
        <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
          VIU AI continuously monitors customer, market and business signals and investigates
          meaningful changes automatically.
        </p>
      </header>

      <div className="panel relative mb-6 overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 grid-noise" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-agent/40 bg-agent-soft">
              <StatusDot tone="agent" pulse />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">Market Intelligence Agent</span>
                <Chip tone="danger">Live</Chip>
              </div>
              <div className="text-[12px] text-muted-foreground">
                Autonomous monitoring across external market and internal business data
              </div>
            </div>
          </div>
          <div className="flex gap-8 text-right">
            <div>
              <SectionLabel>Status</SectionLabel>
              <div className="mt-1 text-[13px] font-medium text-agent">{statusLabels[status]}</div>
            </div>
            <div>
              <SectionLabel>Last cycle</SectionLabel>
              <div className="mt-1 font-mono text-[13px] tabular-nums">{lastCycleAt ?? "—"}</div>
            </div>
            <div>
              <SectionLabel>Next scan</SectionLabel>
              <div className="mt-1 font-mono text-[13px] tabular-nums">
                in {Math.floor(nextScanInSeconds / 60)}m {nextScanInSeconds % 60}s
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>

      {anomalyDetected && (
        <section className="animate-rise mb-6 rounded-lg border border-danger/40 bg-danger-soft p-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
                  Emerging business risk
                </span>
              </div>
              <p className="mt-2 max-w-xl text-[14px] text-foreground">
                VIU AI detected an unusual change across internal and external signals.
              </p>
              <div className="mt-4 flex gap-8">
                <div>
                  <SectionLabel>Sales performance</SectionLabel>
                  <div className="text-[18px] font-semibold text-danger tabular-nums">↓ 11%</div>
                </div>
                <div>
                  <SectionLabel>Negative customer signals</SectionLabel>
                  <div className="text-[18px] font-semibold text-danger tabular-nums">↑ 36%</div>
                </div>
                <div>
                  <SectionLabel>Conversations evaluated</SectionLabel>
                  <div className="text-[18px] font-semibold tabular-nums">142</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <StatusDot tone="agent" pulse />
                <span className="text-[12px] font-medium text-agent">
                  Investigating automatically
                </span>
              </div>
              {investigation && (
                <Link
                  to="/investigations/$investigationId"
                  params={{ investigationId: investigation.id }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-card px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-accent"
                >
                  Open investigation <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-[1fr_400px] gap-5">
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SectionLabel>Live agent activity</SectionLabel>
            <div className="flex items-center gap-2">
              <StatusDot tone="ok" pulse />
              <span className="text-[11px] text-muted-foreground">streaming</span>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <ActivityFeed events={events.slice(0, 40)} />
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <div>
            <SectionLabel className="mb-2.5">Signal sources</SectionLabel>
            <div className="flex flex-col gap-2">
              {sources.map((s) => (
                <SourceCard
                  key={s.id}
                  name={s.name}
                  sub={s.id === "gorilla" ? "External intelligence" : "Connected"}
                  tone={s.id === "gorilla" ? "agent" : "ok"}
                />
              ))}
            </div>
          </div>
          <div>
            <SectionLabel className="mb-2.5">Internal business data</SectionLabel>
            <div className="flex flex-col gap-2">
              {internal.map((s) => (
                <SourceCard key={s.id} name={s.name} sub="Connected" tone="ok" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
