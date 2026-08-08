import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "agent" | "muted";

const dotTone: Record<Tone, string> = {
  ok: "bg-ok text-ok",
  warn: "bg-warn text-warn",
  danger: "bg-danger text-danger",
  agent: "bg-agent text-agent",
  muted: "bg-muted-foreground text-muted-foreground",
};

export function StatusDot({
  tone = "ok",
  pulse = false,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <span className={cn("h-2 w-2 rounded-full", dotTone[tone])} />
      {pulse && (
        <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", dotTone[tone])} />
      )}
    </span>
  );
}

const chipTone: Record<Tone, string> = {
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/30 bg-warn-soft text-warn",
  danger: "border-danger/35 bg-danger-soft text-danger",
  agent: "border-agent/35 bg-agent-soft text-agent",
  muted: "border-border bg-muted text-muted-foreground",
};

export function Chip({
  tone = "muted",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        chipTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("label-xs", className)}>{children}</div>;
}
