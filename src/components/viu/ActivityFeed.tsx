import { cn } from "@/lib/utils";
import type { AgentEvent, AgentEventType } from "@/types";

const toneByType: Partial<Record<AgentEventType, string>> = {
  anomaly_detected: "bg-danger",
  decision_required: "bg-danger",
  investigation_started: "bg-agent",
  tool_call_started: "bg-agent",
  tool_call_completed: "bg-ok",
  finding_created: "bg-warn",
  confidence_updated: "bg-agent",
  people_selected: "bg-agent",
  availability_found: "bg-ok",
  meeting_created: "bg-ok",
  voice_started: "bg-agent",
  decision_recorded: "bg-ok",
  action_created: "bg-ok",
  monitoring_resumed: "bg-ok",
};

export function ActivityFeed({
  events,
  className,
  emptyLabel = "Waiting for the next monitoring cycle…",
}: {
  events: AgentEvent[];
  className?: string;
  emptyLabel?: string;
}) {
  if (!events.length) {
    return (
      <div className={cn("px-4 py-6 text-[13px] text-muted-foreground", className)}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className={cn("flex flex-col", className)}>
      {events.map((event) => (
        <li
          key={event.id}
          className="animate-feed-in flex items-start gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
        >
          <span className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {event.timestamp}
          </span>
          <span
            className={cn(
              "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
              toneByType[event.type] ?? "bg-muted-foreground",
            )}
          />
          <div className="min-w-0">
            <div className="text-[13px] leading-snug text-foreground">{event.title}</div>
            {event.description && (
              <div className="text-[12px] text-muted-foreground">{event.description}</div>
            )}
            {event.tool && (
              <div className="mt-1 font-mono text-[11px] text-agent">
                {event.tool.provider}.{event.tool.name}()
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
