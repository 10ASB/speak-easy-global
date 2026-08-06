import { Mic, Square, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  isRecording: boolean;
  isTranscribing: boolean;
  level: number;
  elapsedMs: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
};

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const BARS = 40;

export function RecorderControls({
  isRecording,
  isTranscribing,
  level,
  elapsedMs,
  onStart,
  onStop,
  disabled,
}: Props) {
  // Rolling history of mic levels so the meter scrolls like a real waveform.
  const [levels, setLevels] = useState<number[]>(() => Array<number>(BARS).fill(0));
  const latest = useRef(level);
  latest.current = level;

  useEffect(() => {
    if (!isRecording) {
      setLevels(Array<number>(BARS).fill(0));
      return;
    }
    const id = window.setInterval(() => {
      setLevels((prev) => [...prev.slice(1), Math.min(1, latest.current)]);
    }, 70);
    return () => window.clearInterval(id);
  }, [isRecording]);

  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-2xl border bg-card p-6 transition-all duration-300 sm:flex-row sm:items-center",
        isRecording
          ? "border-live/60 shadow-[0_0_0_1px_var(--color-live),0_18px_50px_-30px_var(--color-live)]"
          : "border-border",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {isRecording && (
            <span
              className="pulse-ring absolute inset-0 rounded-full bg-live"
              aria-hidden="true"
            />
          )}
          <Button
            type="button"
            size="lg"
            disabled={disabled}
            onClick={isRecording ? onStop : onStart}
            style={isRecording ? { transform: `scale(${1 + Math.min(0.12, level * 0.18)})` } : undefined}
            className={cn(
              "relative size-20 rounded-full text-base font-semibold shadow-lg transition-all duration-150 hover:scale-105 active:scale-95",
              isRecording
                ? "bg-live text-live-foreground hover:bg-live/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <Square className="size-7" /> : <Mic className="size-8" />}
          </Button>
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "font-mono text-2xl tabular-nums transition-colors",
              isRecording ? "text-live" : "text-foreground",
            )}
          >
            {formatDuration(elapsedMs)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {isRecording ? (
              <>
                <span className="inline-block size-2 animate-pulse rounded-full bg-live" />
                Listening…
              </>
            ) : isTranscribing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Transcribing…
              </>
            ) : (
              <>
                Tap to record
                <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                  Space
                </kbd>
              </>
            )}
          </p>
        </div>
      </div>

      <div
        className="flex h-16 flex-1 items-center justify-between gap-[3px] overflow-hidden rounded-xl bg-background px-4"
        aria-hidden="true"
      >
        {levels.map((value, index) => {
          const height = isRecording ? Math.max(6, value * 100) : 5;
          return (
            <span
              key={index}
              className={cn(
                "w-full rounded-full transition-[height,background-color] duration-150 ease-out",
                isRecording ? "bg-live" : "bg-border",
              )}
              style={{
                height: `${Math.min(100, height)}%`,
                opacity: isRecording ? 0.45 + (index / BARS) * 0.55 : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
