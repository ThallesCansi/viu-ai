import { WORKSPACE } from "@/data/demo";
import { guacoPresentation, guacoVoiceContext, isGuacoInvestigation } from "@/data/guaco";
import type {
  CompanyPerson,
  DecisionMeeting,
  Investigation,
  PresentationDeck,
  PresentationSlide,
  VoiceMeetingContext,
} from "@/types";

const qualifierCopy: Record<Investigation["languageQualifier"], string> = {
  probable_contributor:
    "The evidence supports a probable contributor; causality has not been established.",
  correlation: "The evidence establishes correlation only; causality has not been established.",
  possible_cause: "The evidence supports a possible cause, but causality has not been established.",
  insufficient_evidence:
    "The available evidence is insufficient to establish a causal relationship.",
};

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

function metricTone(value: number): "danger" | "ok" | "neutral" {
  if (value < 0) return "danger";
  if (value > 0) return "ok";
  return "neutral";
}

/**
 * Deterministically adapts the validated investigation into safe structured UI data.
 * Future: PresentationDeck may be generated directly by the autonomous agent backend
 * once the investigation latency path is stable.
 */
export function buildPresentationDeck(investigation: Investigation): PresentationDeck {
  const dominantCluster = [...investigation.clusters].sort((a, b) => b.count - a.count)[0];
  const clusterBullets = investigation.clusters.map(
    (cluster) => `${cluster.topic}: ${cluster.count} conversations (${cluster.sentiment})`,
  );
  const evidenceIds = investigation.evidence.map((signal) => signal.id);

  const slides: PresentationSlide[] = [
    {
      id: `${investigation.id}-change`,
      title: "What changed?",
      headline: `Sales changed ${signedPercent(investigation.metrics.salesChangePct)} while negative customer signals changed ${signedPercent(investigation.metrics.negativeSignalChangePct)}.`,
      metrics: [
        {
          label: "Sales",
          value: signedPercent(investigation.metrics.salesChangePct),
          tone: metricTone(investigation.metrics.salesChangePct),
        },
        {
          label: "Negative signals",
          value: signedPercent(investigation.metrics.negativeSignalChangePct),
          tone: investigation.metrics.negativeSignalChangePct > 0 ? "danger" : "ok",
        },
        {
          label: "Conversations analyzed",
          value: String(investigation.metrics.totalSignals),
          tone: "neutral",
        },
      ],
    },
    {
      id: `${investigation.id}-customers`,
      title: "What customers are saying",
      headline: dominantCluster
        ? `${dominantCluster.topic} is the largest topic cluster in the available customer evidence.`
        : "The available customer evidence is summarized below.",
      ...(clusterBullets.length ? { bullets: clusterBullets } : {}),
      ...(evidenceIds.length ? { evidenceIds } : {}),
    },
    {
      id: `${investigation.id}-finding`,
      title: "What we found",
      headline: investigation.hypothesis,
      body: `${investigation.summary} ${qualifierCopy[investigation.languageQualifier]}`,
      metrics: [
        { label: "Confidence", value: `${investigation.confidence}%`, tone: "agent" },
        {
          label: "Urgency",
          value: `${investigation.urgency.score} / 100`,
          tone: investigation.urgency.level === "high" ? "danger" : "warn",
        },
        {
          label: "Qualifier",
          value: investigation.languageQualifier.replaceAll("_", " "),
          tone: "neutral",
        },
      ],
    },
    {
      id: `${investigation.id}-recommendation`,
      title: "Recommendation",
      headline: investigation.recommendation,
      bullets: [
        investigation.decisionRequired
          ? "A human business decision is required."
          : "No immediate human business decision is required.",
        "Continue monitoring internal performance and customer signals after any intervention.",
      ],
    },
  ];

  return {
    id: `deck-${investigation.id}`,
    title: investigation.title,
    summary: investigation.summary,
    slides,
  };
}

/**
 * Returns the fixed GUA.CO demo deck when the fixed investigation is active,
 * otherwise falls back to the derived deck.
 */
export function resolvePresentationDeck(investigation: Investigation): PresentationDeck {
  if (isGuacoInvestigation(investigation)) return guacoPresentation;
  return buildPresentationDeck(investigation);
}

export function buildSlideStructure(presentation: PresentationDeck): string {
  return presentation.slides
    .map((slide, index) => `${index + 1} - ${slide.title}: ${slide.headline}`)
    .join("\n");
}

export function buildDetailedMeetingContext(input: {
  investigation: Investigation;
  presentation: PresentationDeck;
  attendees?: CompanyPerson[];
  meeting?: DecisionMeeting | null;
}): string {
  const { investigation, presentation, attendees = [], meeting } = input;
  const lines = [
    `Investigation: ${investigation.title}`,
    `Detected anomaly: ${investigation.anomaly.title}. ${investigation.anomaly.summary}`,
    `Business metrics: sales change ${signedPercent(investigation.metrics.salesChangePct)}; negative customer signal change ${signedPercent(investigation.metrics.negativeSignalChangePct)}; conversations analyzed ${investigation.metrics.totalSignals}.`,
    `Primary hypothesis: ${investigation.hypothesis}`,
    `Causality qualifier: ${investigation.languageQualifier}. ${qualifierCopy[investigation.languageQualifier]}`,
    `Confidence: ${investigation.confidence}%. Urgency: ${investigation.urgency.score}/100 (${investigation.urgency.level}).`,
    `Executive summary: ${investigation.summary}`,
    `Recommendation: ${investigation.recommendation}`,
    `Human decision required: ${investigation.decisionRequired ? "yes" : "no"}.`,
    `Presentation: ${presentation.slides.length} slides.`,
  ];

  if (investigation.clusters.length) {
    lines.push(
      `Topic clusters: ${investigation.clusters
        .map((cluster) => `${cluster.topic} (${cluster.count}, ${cluster.sentiment})`)
        .join("; ")}.`,
    );
  }

  if (investigation.evidence.length) {
    lines.push("Representative evidence:");
    investigation.evidence.forEach((signal, index) => {
      const metadata = [
        `source=${signal.source}`,
        signal.author ? `author=${signal.author}` : null,
        signal.url ? `url=${signal.url}` : null,
        signal.engagement !== undefined ? `engagement=${signal.engagement}` : null,
        signal.relevance !== undefined ? `relevance=${signal.relevance}` : null,
      ].filter(Boolean);
      lines.push(`${index + 1}. ${signal.text} (${metadata.join(", ")})`);
    });
  }

  if (attendees.length) {
    lines.push(
      `Selected attendees: ${attendees
        .map((person) => `${person.name}, ${person.role}: ${person.reason}`)
        .join("; ")}.`,
    );
  }

  if (meeting) {
    lines.push(
      `Meeting: ${meeting.title}; ${meeting.date} at ${meeting.startTime}; ${meeting.durationMinutes} minutes.`,
    );
  }

  lines.push(
    "Known limitation: only the validated evidence supplied by the investigation may be presented; do not invent evidence or infer causality.",
  );

  // Future: replace derived detailed context with an agent-generated detailed
  // decision report when the backend provides one.
  return lines.join("\n");
}

export function buildVoiceMeetingContext(input: {
  investigation: Investigation;
  presentation: PresentationDeck;
  attendees?: CompanyPerson[];
  meeting?: DecisionMeeting | null;
  company?: string;
}): VoiceMeetingContext {
  const { investigation, presentation, attendees, meeting } = input;
  if (isGuacoInvestigation(investigation)) return guacoVoiceContext;
  return {
    empresa: input.company ?? WORKSPACE.company,
    objetivo_reuniao: `Review ${investigation.title} and decide whether intervention is required.`,
    numero_slides: presentation.slides.length,
    estrutura_slides: buildSlideStructure(presentation),
    resumo_executivo: presentation.summary,
    contexto_detalhado: buildDetailedMeetingContext({
      investigation,
      presentation,
      ...(attendees ? { attendees } : {}),
      ...(meeting ? { meeting } : {}),
    }),
  };
}

export function clampPresentationStage(stage: number, slideCount: number): number {
  if (slideCount <= 0) return 0;
  return Math.min(Math.max(Math.trunc(stage), 0), slideCount - 1);
}

export function getSlideNavigation(presentation: PresentationDeck) {
  return presentation.slides.map((slide, index) => ({
    id: slide.id,
    index,
    label: `${index + 1}. ${slide.title}`,
  }));
}

export function changePresentationSlide(
  params: { slide_number?: unknown },
  presentation: PresentationDeck,
  onStageChange: (stage: number) => void,
): string {
  const slideNumber = normalizePresentationSlideNumber(params.slide_number);
  if (slideNumber === null || slideNumber < 1 || slideNumber > presentation.slides.length) {
    return `Invalid slide number. This presentation has ${presentation.slides.length} slides.`;
  }

  onStageChange(slideNumber - 1);
  return `Slide ${slideNumber} displayed`;
}

export function normalizePresentationSlideNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : null;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
