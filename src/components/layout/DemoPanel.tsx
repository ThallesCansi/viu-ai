import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FlaskConical, Play } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { agentService } from "@/state/useAgent";

type Action = { label: string; run: () => void | Promise<void>; primary?: boolean };

/**
 * Discreet demo controller. Exists only to guarantee a reliable live
 * demonstration — the product itself advances autonomously.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions: Action[] = [
    { label: "Reset Scenario", run: () => agentService.reset() },
    { label: "Trigger Market Anomaly", run: () => agentService.triggerAnomaly() },
    { label: "Start Investigation", run: () => agentService.startInvestigation() },
    { label: "Complete Investigation", run: () => agentService.completeInvestigation() },
    { label: "Find Decision Makers", run: () => agentService.findDecisionMakers() },
    { label: "Schedule Meeting", run: () => agentService.scheduleMeeting() },
    {
      label: "Open Decision Room",
      run: async () => {
        await agentService.openDecisionRoom();
        void navigate({ to: "/decision-room" });
      },
    },
    { label: "Approve Decision", run: () => agentService.approveDecision("approved") },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Demo Mode
        </button>
      </SheetTrigger>
      <SheetContent className="w-[340px] border-l border-border bg-surface p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-sm">Demo Controls</SheetTitle>
          <SheetDescription className="text-xs">
            Simulates autonomous agent progress for presentation reliability.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 p-5">
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              void navigate({ to: "/" });
              await agentService.runFullDemo();
              void navigate({ to: "/decision-room" });
            }}
            className="mb-2 flex items-center justify-center gap-2 rounded-md border border-agent/40 bg-agent-soft px-3 py-2.5 text-[13px] font-semibold text-agent transition-colors hover:bg-agent/20"
          >
            <Play className="h-3.5 w-3.5" />
            Run Full Demo
          </button>
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                void a.run();
              }}
              className="rounded-md border border-border bg-card px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:border-border-strong hover:bg-accent"
            >
              {a.label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
