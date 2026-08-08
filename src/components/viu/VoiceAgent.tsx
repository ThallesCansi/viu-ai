import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { voiceService } from "@/services";
import { buildVoiceMeetingContext } from "@/services/presentation";
import type {
  CompanyPerson,
  DecisionMeeting,
  Investigation,
  PresentationDeck,
  VoiceSessionSnapshot,
  VoiceState,
} from "@/types";
import { StatusDot } from "@/components/viu/primitives";

const stateCopy: Record<VoiceState, { label: string; tone: "ok" | "agent" | "warn" | "danger" }> = {
  idle: { label: "Ready", tone: "ok" },
  ready: { label: "Ready", tone: "ok" },
  connecting: { label: "Connecting", tone: "agent" },
  speaking: { label: "Speaking", tone: "agent" },
  listening: { label: "Listening", tone: "warn" },
  thinking: { label: "Thinking", tone: "agent" },
  disconnected: { label: "Disconnected", tone: "warn" },
  error: { label: "Voice error", tone: "danger" },
  unavailable: { label: "Voice unavailable", tone: "danger" },
};

/**
 * Presentation-only voice surface. All behaviour comes from voiceService,
 * which is swapped for ElevenLabs in production.
 */
export function VoiceAgent({
  onStageChange,
  investigation,
  presentation,
  attendees,
  meeting,
  className,
}: {
  onStageChange: (stage: number) => void;
  investigation: Investigation;
  presentation: PresentationDeck;
  attendees?: CompanyPerson[];
  meeting?: DecisionMeeting | null;
  className?: string;
}) {
  const [session, setSession] = useState<VoiceSessionSnapshot>({
    state: "ready",
    active: false,
    transcript: [],
    error: null,
  });
  const presentationRef = useRef(presentation);
  presentationRef.current = presentation;

  useEffect(() => {
    const unsubscribe = voiceService.subscribe(setSession);
    return () => {
      unsubscribe();
      void voiceService.stopSession();
    };
  }, []);

  const bars = useMemo(() => Array.from({ length: 28 }, (_, i) => i), []);
  const animated = session.state === "speaking" || session.state === "listening";

  async function start() {
    const context = buildVoiceMeetingContext({
      investigation,
      presentation,
      ...(attendees ? { attendees } : {}),
      ...(meeting ? { meeting } : {}),
    });
    try {
      await voiceService.startSession({
        context,
        getPresentation: () => presentationRef.current,
        onStageChange,
      });
    } catch {
      // The service publishes a safe UI error. Slides and decisions remain available.
    }
  }

  async function stop() {
    await voiceService.stopSession();
  }

  const copy = stateCopy[session.state];

  return (
    <div className={cn("panel flex flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusDot tone={copy.tone} pulse={animated} />
          <span className="text-[13px] font-semibold">VIU AI Agent</span>
          <span className="text-[12px] text-muted-foreground">· {copy.label}</span>
        </div>
        <button
          type="button"
          onClick={() => (session.active ? void stop() : void start())}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
            session.active
              ? "border-danger/40 bg-danger-soft text-danger hover:bg-danger/20"
              : "border-agent/40 bg-agent-soft text-agent hover:bg-agent/20",
          )}
        >
          {session.active ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {session.active ? "End session" : "Start AI presentation"}
        </button>
      </div>

      <div className="flex h-14 items-center justify-center gap-[3px] border-b border-border bg-surface px-4">
        {bars.map((i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full",
              animated ? "bg-agent animate-wave" : "bg-border-strong",
            )}
            style={{
              height: `${18 + ((i * 37) % 22)}px`,
              animationDelay: `${(i % 9) * 90}ms`,
            }}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {session.transcript.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center text-[13px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <MicOff className="h-3.5 w-3.5" />
              Transcript will appear here during the briefing.
            </div>
            {session.error && <p className="max-w-xs text-[12px] text-danger">{session.error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {session.transcript.map((line) => (
              <div key={line.id} className="animate-rise">
                <div
                  className={cn(
                    "label-xs mb-1",
                    line.speaker === "agent" ? "text-agent" : "text-muted-foreground",
                  )}
                >
                  {line.speaker === "agent" ? "VIU AI Agent" : "Marina Costa"}
                </div>
                <p
                  className={cn(
                    "rounded-md border px-3 py-2 text-[13px] leading-relaxed",
                    line.speaker === "agent"
                      ? "border-agent/25 bg-agent-soft text-foreground"
                      : "border-border bg-muted text-foreground",
                  )}
                >
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
