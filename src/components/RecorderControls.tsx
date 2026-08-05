import { Mic, Square, Loader2 } from "lucide-react";
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

const BARS = 28;

export function RecorderControls({
  isRecording,
  isTranscribing,
  level,
  elapsedMs,
  onStart,
  onStop,
  disabled,
}: Props) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          size="lg"
          disabled={disabled}
          onClick={isRecording ? onStop : onStart}
          className={cn(
            "size-20 shrink-0 rounded-full text-base font-semibold shadow-lg transition-transform active:scale-95",
            isRecording
              ? "bg-live text-live-foreground hover:bg-live/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <Square className="size-7" /> : <Mic className="size-8" />}
        </Button>
        <div>
          <p className="font-mono text-2xl tabular-nums text-foreground">
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
              "Tap to record"
            )}
          </p>
        </div>
      </div>

      <div
        className="flex h-16 flex-1 items-center justify-between gap-[3px] overflow-hidden rounded-xl bg-background px-4"
        aria-hidden="true"
      >
        {Array.from({ length: BARS }).map((_, index) => {
          const wave = isRecording
            ? Math.max(0.08, level * (0.45 + 0.55 * Math.abs(Math.sin(index * 0.7 + level * 12))))
            : 0.05;
          return (
            <span
              key={index}
              className={cn(
                "w-full rounded-full transition-all duration-100",
                isRecording ? "bg-live" : "bg-border",
              )}
              style={{ height: `${Math.min(100, wave * 100)}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
