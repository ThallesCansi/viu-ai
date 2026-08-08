import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAgent } from "@/state/useAgent";
import { ActivityFeed } from "@/components/viu/ActivityFeed";
import { SectionLabel } from "@/components/viu/primitives";
import type { AgentEventType } from "@/types";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Agent Activity — VIU AI" },
      {
        name: "description",
        content:
          "Full auditable execution history of the VIU AI agent: tool calls, findings, decisions and actions.",
      },
      { property: "og:title", content: "Agent Activity — VIU AI" },
      {
        property: "og:description",
        content: "Observable, auditable agent execution history.",
      },
    ],
  }),
  component: ActivityPage,
});

const filters: { id: string; label: string; types?: AgentEventType[] }[] = [
  { id: "all", label: "All" },
  { id: "tools", label: "Tools", types: ["tool_call_started", "tool_call_completed"] },
  {
    id: "decisions",
    label: "Decisions",
    types: ["decision_required", "decision_recorded", "people_selected"],
  },
  {
    id: "external",
    label: "External Data",
    types: ["signal_received", "monitoring_tick", "anomaly_detected"],
  },
  {
    id: "actions",
    label: "Actions",
    types: ["action_created", "meeting_created", "availability_found", "monitoring_resumed"],
  },
];

function ActivityPage() {
  const { events } = useAgent();
  const [active, setActive] = useState("all");

  const selected = filters.find((f) => f.id === active);
  const filtered = selected?.types ? events.filter((e) => selected.types!.includes(e.type)) : events;

  return (
    <div className="mx-auto max-w-[1100px] px-8 py-7">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight">Agent Activity</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Observable execution history. Reasoning is never exposed — only actions, tool calls and
          results.
        </p>
      </header>

      <div className="mb-4 flex gap-1.5">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActive(f.id)}
            className={
              "rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors " +
              (active === f.id
                ? "border-agent/40 bg-agent-soft text-agent"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <SectionLabel>{filtered.length} events</SectionLabel>
        </div>
        <ActivityFeed events={filtered} emptyLabel="No events for this filter yet." />
      </section>
    </div>
  );
}
