import { cn } from "@/lib/utils";
import { Chip } from "@/components/viu/primitives";
import type { TopicCluster } from "@/types";

export function ClusterBars({
  clusters,
  className,
}: {
  clusters: TopicCluster[];
  className?: string;
}) {
  const max = Math.max(1, ...clusters.map((c) => c.count));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {clusters.map((cluster, i) => {
        const dominant = i === 0;
        return (
          <div key={cluster.topic}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-[13px]",
                    dominant ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {cluster.topic}
                </span>
                {dominant && <Chip tone="danger">High relevance</Chip>}
              </div>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                {cluster.count} signals
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full origin-left animate-bar rounded-full",
                  dominant ? "bg-danger" : "bg-border-strong",
                )}
                style={{ width: `${(cluster.count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
