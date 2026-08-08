import { demoTranscript, meetingAgenda } from "@/data/demo";
import type { ActionService, CalendarService, VoiceService } from "@/services/types";
import type { AvailabilitySlot, FollowUpAction, VoiceSessionSnapshot } from "@/types";
import { followUpChecklist } from "@/data/demo";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Google Calendar adapter stand-in. */
export const mockCalendarService: CalendarService = {
  async findAvailability() {
    await delay(900);
    const slot: AvailabilitySlot = {
      date: "Today",
      startTime: "3:30 PM",
      endTime: "3:50 PM",
      durationMinutes: 20,
    };
    return slot;
  },
  async createMeeting({ investigationId, title, attendees, slot, agenda }) {
    await delay(1100);
    return {
      id: "meet-1",
      title,
      investigationId,
      attendees,
      date: slot.date,
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes,
      agenda: agenda.length ? agenda : meetingAgenda,
      calendarStatus: "created",
    };
  },
};

/** ElevenLabs adapter stand-in. */
export class MockVoiceService implements VoiceService {
  private listeners = new Set<(snapshot: VoiceSessionSnapshot) => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private snapshot: VoiceSessionSnapshot = {
    state: "ready",
    active: false,
    transcript: [],
    error: null,
  };

  private patch(next: Partial<VoiceSessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  subscribe(listener: (snapshot: VoiceSessionSnapshot) => void) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  async startSession(input: Parameters<VoiceService["startSession"]>[0]) {
    await this.stopSession();
    this.patch({ state: "thinking", active: true, transcript: [], error: null });

    this.timers.push(setTimeout(() => this.patch({ state: "speaking" }), 700));
    demoTranscript.forEach((line, index) => {
      this.timers.push(
        setTimeout(
          () => {
            this.patch({ transcript: [...this.snapshot.transcript, line] });
            const slideCount = input.getPresentation().slides.length;
            input.onStageChange(Math.min(index, Math.max(0, slideCount - 1)));
          },
          index * 4200 + 900,
        ),
      );
    });
    this.timers.push(setTimeout(() => this.patch({ state: "listening" }), 6000));
    this.timers.push(setTimeout(() => this.patch({ state: "thinking" }), 9000));
    this.timers.push(setTimeout(() => this.patch({ state: "speaking" }), 10500));
    this.timers.push(setTimeout(() => this.patch({ state: "ready", active: false }), 17000));
    return { sessionId: "voice-mock-1" };
  }

  async stopSession() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.patch({ state: "ready", active: false });
  }

  async sendContext(_context: string) {
    /* no-op in mock */
  }
}

export const mockVoiceService: VoiceService = new MockVoiceService();

export const mockActionService: ActionService = {
  async createFollowUp() {
    const actions: FollowUpAction[] = followUpChecklist.map((label, i) => ({
      id: `fa-${i}`,
      label,
      status: "pending",
    }));
    return actions;
  },
};
