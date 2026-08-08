import { Settings } from "lucide-react";
import { StatusDot } from "@/components/viu/primitives";
import { WORKSPACE } from "@/data/demo";
import { useAgent } from "@/state/useAgent";
import { DemoPanel } from "@/components/layout/DemoPanel";
import type { AgentStatus } from "@/types";

export const statusLabels: Record<AgentStatus, string> = {
  monitoring: "Monitoring",
  anomaly_detected: "Anomaly detected",
  investigating: "Investigating",
  investigation_complete: "Investigation complete",
  decision_required: "Decision required",
  scheduling: "Scheduling",
  meeting_ready: "Meeting ready",
  presenting: "Presenting",
  awaiting_decision: "Awaiting decision",
  executing_action: "Executing action",
  monitoring_outcome: "Monitoring outcome",
};

export function TopBar() {
  const { status } = useAgent();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/60 px-6 backdrop-blur">
      <div className="flex items-center gap-3 text-[13px]">
        <span className="font-semibold text-foreground">{WORKSPACE.company}</span>
        <span className="text-border-strong">/</span>
        <span className="text-muted-foreground">{WORKSPACE.agentName}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-2 py-1">
          <StatusDot tone="danger" pulse />
          <span className="text-[11px] font-semibold tracking-wider text-danger">LIVE</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-2.5 py-1">
          <StatusDot tone={status === "monitoring" ? "ok" : "agent"} pulse />
          <span className="text-[12px] text-muted-foreground">{statusLabels[status]}</span>
        </div>
        <DemoPanel />
        <button
          type="button"
          aria-label="Settings"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
