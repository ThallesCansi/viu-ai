import { EvidenceCard } from "@/components/viu/EvidenceCard";
import { SectionLabel } from "@/components/viu/primitives";
import type { MarketSignal, PresentationMetric, PresentationSlide } from "@/types";

export function PresentationSlideView({
  slide,
  evidence,
}: {
  slide: PresentationSlide;
  evidence: MarketSignal[];
}) {
  const selectedEvidence = slide.evidenceIds?.length
    ? slide.evidenceIds
        .map((id) => evidence.find((signal) => signal.id === id))
        .filter((signal): signal is MarketSignal => Boolean(signal))
    : [];

  return (
    <div>
      <SectionLabel className="text-agent">{slide.title}</SectionLabel>
      <h2 className="mt-2 max-w-4xl text-[24px] leading-tight font-semibold tracking-tight">
        {slide.headline}
      </h2>

      {slide.body && (
        <p className="mt-5 max-w-3xl text-[14px] leading-relaxed text-muted-foreground">
          {slide.body}
        </p>
      )}

      {slide.bullets?.length ? (
        <ul className="mt-5 max-w-3xl space-y-2 text-[14px] leading-relaxed text-muted-foreground">
          {slide.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-agent" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {slide.metrics?.length ? (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {slide.metrics.map((metric) => (
            <MetricTile key={`${metric.label}-${metric.value}`} metric={metric} />
          ))}
        </div>
      ) : null}

      {selectedEvidence.length ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {selectedEvidence.slice(0, 2).map((signal) => (
            <EvidenceCard key={signal.id} signal={signal} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricTile({ metric }: { metric: PresentationMetric }) {
  const tone = metric.tone ?? "neutral";
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "agent"
        ? "text-agent"
        : tone === "ok"
          ? "text-ok"
          : tone === "warn"
            ? "text-warn"
            : "text-foreground";

  return (
    <div>
      <SectionLabel>{metric.label}</SectionLabel>
      <div className={`mt-1 text-[15px] font-semibold ${toneClass}`}>{metric.value}</div>
    </div>
  );
}
