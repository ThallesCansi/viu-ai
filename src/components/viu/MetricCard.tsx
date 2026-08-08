import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessMetric } from "@/types";

const statusTone = {
  healthy: "text-ok",
  attention: "text-warn",
  critical: "text-danger",
} as const;

export function MetricCard({ metric }: { metric: BusinessMetric }) {
  const Icon =
    metric.trend === "up" ? ArrowUpRight : metric.trend === "down" ? ArrowDownRight : ArrowRight;

  return (
    <div className="panel p-4">
      <div className="label-xs">{metric.name}</div>
      <div className="mt-2 flex items-end justify-between">
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {metric.formattedValue}
        </div>
        {metric.changePct !== undefined && metric.trend !== "stable" && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[12px] font-semibold tabular-nums",
              statusTone[metric.status],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {Math.abs(metric.changePct)}%
          </div>
        )}
      </div>
      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full origin-left animate-bar rounded-full",
            metric.status === "critical"
              ? "bg-danger"
              : metric.status === "attention"
                ? "bg-warn"
                : "bg-ok",
          )}
          style={{ width: `${Math.min(100, Math.abs(metric.changePct ?? 20) * 2 + 20)}%` }}
        />
      </div>
    </div>
  );
}
