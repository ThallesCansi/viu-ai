import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/viu/primitives";
import type { MarketSignal, SignalSource } from "@/types";

export const sourceLabels: Record<SignalSource, string> = {
  reddit: "Reddit",
  x: "X",
  linkedin: "LinkedIn",
  support: "Support",
  other: "Other",
};

export function EvidenceCard({ signal, className }: { signal: MarketSignal; className?: string }) {
  return (
    <article className={cn("panel flex flex-col gap-2.5 p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
            {sourceLabels[signal.source]}
          </span>
          {signal.author && (
            <span className="truncate text-[12px] text-muted-foreground">{signal.author}</span>
          )}
        </div>
        {signal.createdAt && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {signal.createdAt}
          </span>
        )}
      </div>

      <p className="text-[13px] leading-relaxed text-foreground">“{signal.text}”</p>

      <div className="flex flex-wrap items-center gap-2">
        <Chip
          tone={
            signal.sentiment === "negative"
              ? "danger"
              : signal.sentiment === "positive"
                ? "ok"
                : "muted"
          }
        >
          {signal.sentiment}
        </Chip>
        {signal.topic && <Chip tone="warn">{signal.topic}</Chip>}
        <span className="font-mono text-[11px] text-muted-foreground">
          engagement {signal.engagement ?? 0}
        </span>
        {signal.relevance !== undefined && (
          <span className="font-mono text-[11px] text-muted-foreground">
            relevance {Math.round(signal.relevance * 100)}%
          </span>
        )}
        {signal.url && (
          <a
            href={signal.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[12px] text-agent hover:underline"
          >
            View source <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
