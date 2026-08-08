import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EvidenceCard, sourceLabels } from "@/components/viu/EvidenceCard";
import type { MarketSignal, SignalSource } from "@/types";

const order: SignalSource[] = ["reddit", "x", "linkedin", "support", "other"];

export function EvidenceDrawer({
  signals,
  trigger,
}: {
  signals: MarketSignal[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const grouped = order
    .map((source) => ({ source, items: signals.filter((s) => s.source === source) }))
    .filter((g) => g.items.length);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-[620px] max-w-[92vw] gap-0 border-l border-border bg-background p-0 sm:max-w-[620px]">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="text-sm">
            Supporting evidence · {signals.length} signals
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-65px)] overflow-y-auto px-6 py-5">
          {grouped.map((group) => (
            <section key={group.source} className="mb-6">
              <div className="label-xs mb-2.5">
                {sourceLabels[group.source]} · {group.items.length}
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map((s) => (
                  <EvidenceCard key={s.id} signal={s} />
                ))}
              </div>
            </section>
          ))}
          {!signals.length && (
            <p className="text-[13px] text-muted-foreground">
              Evidence is still being collected by the agent.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
