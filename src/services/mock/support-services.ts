import { demoTranscript, meetingAgenda } from "@/data/demo";
import type { ActionService, CalendarService, VoiceService } from "@/services/types";
import type { AvailabilitySlot, FollowUpAction, VoiceState } from "@/types";
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
class MockVoiceService implements VoiceService {
  private listeners = new Set<(s: VoiceState) => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];

  private set(state: VoiceState) {
    this.listeners.forEach((l) => l(state));
  }

  subscribe(listener: (state: VoiceState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async startSession() {
    this.set("thinking");
    this.timers.push(setTimeout(() => this.set("speaking"), 700));
    this.timers.push(setTimeout(() => this.set("listening"), 6000));
    this.timers.push(setTimeout(() => this.set("thinking"), 9000));
    this.timers.push(setTimeout(() => this.set("speaking"), 10500));
    this.timers.push(setTimeout(() => this.set("ready"), 17000));
    return { sessionId: "voice-1", transcript: demoTranscript };
  }

  async stopSession() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.set("ready");
  }

  async sendContext() {
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
