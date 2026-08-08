import type { Conversation as ElevenLabsConversation, PartialOptions } from "@elevenlabs/react";

import { changePresentationSlide } from "@/services/presentation";
import type { VoiceService } from "@/services/types";
import type { TranscriptLine, VoiceSessionSnapshot } from "@/types";

type SessionAuthorization =
  { authorization: "public"; agentId: string } | { authorization: "signed_url"; signedUrl: string };

const initialSnapshot = (): VoiceSessionSnapshot => ({
  state: "ready",
  active: false,
  transcript: [],
  error: null,
});

export class ElevenLabsVoiceService implements VoiceService {
  private session: ElevenLabsConversation | null = null;
  private snapshot = initialSnapshot();
  private listeners = new Set<(snapshot: VoiceSessionSnapshot) => void>();
  private transcriptSequence = 0;

  subscribe(listener: (snapshot: VoiceSessionSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  private patch(next: Partial<VoiceSessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  private appendTranscript(line: Omit<TranscriptLine, "id">) {
    const transcriptLine: TranscriptLine = {
      ...line,
      id: `voice-${++this.transcriptSequence}`,
    };
    this.patch({ transcript: [...this.snapshot.transcript, transcriptLine] });
  }

  async startSession(input: Parameters<VoiceService["startSession"]>[0]) {
    await this.stopSession();
    this.patch({ state: "connecting", active: true, transcript: [], error: null });

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported by this browser.");
      }
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());

      const authorization = await fetchSessionAuthorization();
      const sessionAuthorization =
        authorization.authorization === "signed_url"
          ? ({ signedUrl: authorization.signedUrl, connectionType: "websocket" } as const)
          : ({ agentId: authorization.agentId } as const);

      const options: PartialOptions = {
        ...sessionAuthorization,
        dynamicVariables: { ...input.context },
        clientTools: {
          change_slide: (parameters: { slide_number?: unknown }) =>
            changePresentationSlide(parameters, input.getPresentation(), input.onStageChange),
        },
        onConnect: () => this.patch({ state: "listening", active: true }),
        onDisconnect: (details) => {
          if (details.reason === "error") {
            this.patch({ state: "error", active: false, error: details.message });
          } else {
            this.patch({ state: "disconnected", active: false });
          }
          this.session = null;
        },
        onError: (message) => this.patch({ state: "error", active: false, error: message }),
        onMessage: ({ message, role }) => {
          if (!message.trim()) return;
          this.appendTranscript({ speaker: role === "agent" ? "agent" : "user", text: message });
        },
        onModeChange: ({ mode }) =>
          this.patch({ state: mode === "speaking" ? "speaking" : "listening", active: true }),
        onStatusChange: ({ status }) => {
          if (status === "connecting") this.patch({ state: "connecting", active: true });
          if (status === "disconnecting") this.patch({ state: "thinking", active: true });
        },
      };

      const { Conversation } = await import("@elevenlabs/react");
      this.session = await Conversation.startSession(options);
      return { sessionId: this.session.getId() };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Voice agent unavailable.";
      this.patch({ state: "unavailable", active: false, error: message });
      throw error;
    }
  }

  async stopSession() {
    const session = this.session;
    this.session = null;
    if (session) await session.endSession();
    if (this.snapshot.active) this.patch({ state: "disconnected", active: false });
  }

  async sendContext(context: string) {
    if (!this.session) return;
    this.session.sendContextualUpdate(context);
  }
}

async function fetchSessionAuthorization(): Promise<SessionAuthorization> {
  const response = await fetch("/api/voice/session", {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const payload = (await response.json()) as SessionAuthorization | { error?: string };
  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error ? payload.error : "Voice authorization failed.",
    );
  }
  if (!("authorization" in payload)) throw new Error("Voice authorization response is invalid.");
  return payload;
}

export const elevenLabsVoiceService: VoiceService = new ElevenLabsVoiceService();
