import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvestigationStep, ToolCall } from "@/types";

export function StepTimeline({ steps }: { steps: InvestigationStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-3 py-1.5">
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
              step.status === "done" && "border-ok/40 bg-ok-soft text-ok",
              step.status === "active" && "border-agent/50 bg-agent-soft text-agent",
              step.status === "pending" && "border-border text-muted-foreground",
            )}
          >
            {step.status === "done" ? (
              <Check className="h-2.5 w-2.5" />
            ) : step.status === "active" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-agent" />
            ) : null}
          </span>
          <span
            className={cn(
              "text-[13px]",
              step.status === "pending" ? "text-muted-foreground" : "text-foreground",
              step.status === "active" && "font-medium text-agent",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

const toolTone = {
  waiting: "border-border text-muted-foreground",
  running: "border-agent/40 text-agent",
  complete: "border-ok/35 text-ok",
  failed: "border-danger/40 text-danger",
} as const;

export function ToolActivity({ tools }: { tools: ToolCall[] }) {
  if (!tools.length) {
    return <p className="text-[13px] text-muted-foreground">No tool calls yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {tools.map((tool) => (
        <div key={tool.id} className="panel p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-foreground">{tool.provider}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                toolTone[tool.status],
              )}
            >
              {tool.status === "running" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {tool.status}
            </span>
          </div>
          <div className="mt-1 font-mono text-[12px] text-agent">{tool.name}()</div>
          {tool.query && (
            <div className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground">
              query: {tool.query}
            </div>
          )}
          <div className="mt-2 text-[12px] text-muted-foreground">
            {tool.result ?? (tool.status === "waiting" ? "Waiting" : "…")}
          </div>
        </div>
      ))}
    </div>
  );
}
