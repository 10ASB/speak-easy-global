import { Check, Copy, Loader2, Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { detectScripts, toneFor } from "@/lib/detect-language";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  level: number;
  elapsedMs: number;
  text: string;
  onStart: () => void;
  onStop: () => void;
  onClose: () => void;
};

const BARS = 28;

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Floating dictation capsule — the Windows+H style surface.
 * Wakes over the page, listens, shows words as they land, and hands the text
 * off to the clipboard so it can be pasted wherever the user was typing.
 */
export function DictationOverlay({
  open,
  isRecording,
  isTranscribing,
  level,
  elapsedMs,
  text,
  onStart,
  onStop,
  onClose,
}: Props) {
  const [levels, setLevels] = useState<number[]>(() => Array<number>(BARS).fill(0));
  const [copied, setCopied] = useState(false);
  const latest = useRef(level);
  latest.current = level;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRecording) {
      setLevels(Array<number>(BARS).fill(0));
      return;
    }
    const id = window.setInterval(
      () => setLevels((prev) => [...prev.slice(1), Math.min(1, latest.current)]),
      70,
    );
    return () => window.clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [text]);

  const copy = async () => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  // Esc dismisses, Enter copies and dismisses — same muscle memory as native dictation.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isRecording) onStop();
        onClose();
      }
      if (event.key === "Enter" && !event.shiftKey && text.trim()) {
        event.preventDefault();
        void copy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isRecording, text, onStop, onClose]);

  if (!open) return null;

  const scripts = detectScripts(text).slice(0, 4);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="dialog"
        aria-label="Voice dictation"
        className="rise-in pointer-events-auto w-full max-w-xl overflow-hidden rounded-3xl border border-primary/40 bg-card/95 shadow-[0_30px_80px_-30px_var(--color-primary)] backdrop-blur-xl"
      >
        <div className="lang-wash flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="relative flex size-9 shrink-0 items-center justify-center">
            {isRecording && (
              <span className="pulse-ring absolute inset-0 rounded-full bg-live" aria-hidden />
            )}
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full transition-colors",
                isRecording ? "bg-live text-live-foreground" : "bg-primary text-primary-foreground",
              )}
            >
              <Mic className="size-4" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {isRecording ? "Listening" : isTranscribing ? "Transcribing" : "Ready"}
            </p>
            <p className="truncate text-sm text-foreground">
              {isRecording
                ? "Speak naturally — any language."
                : isTranscribing
                  ? "Finishing the last words…"
                  : "Press the mic or hit Enter to copy what you dictated."}
            </p>
          </div>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              isRecording ? "text-live" : "text-muted-foreground",
            )}
          >
            {formatDuration(elapsedMs)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close dictation"
            onClick={() => {
              if (isRecording) onStop();
              onClose();
            }}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex items-end gap-[3px] px-4 pt-4" aria-hidden>
          {levels.map((value, i) => (
            <span
              key={i}
              className="flex-1 rounded-full transition-all duration-100"
              style={{
                height: `${6 + value * 34}px`,
                backgroundColor: isRecording
                  ? `color-mix(in oklab, var(--color-live) ${35 + value * 65}%, transparent)`
                  : "var(--color-muted)",
              }}
            />
          ))}
        </div>

        <div ref={scroller} className="max-h-32 overflow-y-auto px-4 py-3">
          {text.trim() ? (
            <p className="font-mono text-sm leading-7 text-foreground">
              {text}
              {(isRecording || isTranscribing) && (
                <span className="caret-blink ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary" />
              )}
            </p>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              Your words will appear here as you speak…
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {scripts.length ? (
              scripts.map(({ label }) => (
                <span
                  key={label}
                  className="rounded-full px-2 py-0.5 font-mono text-[10px]"
                  style={{
                    backgroundColor: `color-mix(in oklab, var(--lang-${toneFor(label)}) 20%, transparent)`,
                    color: `var(--lang-${toneFor(label)})`,
                  }}
                >
                  {label}
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <kbd className="rounded border border-border px-1.5 py-0.5">Esc</kbd> to close
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copy}
              disabled={!text.trim()}
              className="transition-transform active:scale-95"
            >
              {copied ? <Check className="size-4 text-lang-2" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              size="sm"
              onClick={isRecording ? onStop : onStart}
              className={cn(
                "transition-transform active:scale-95",
                isRecording && "bg-live text-live-foreground hover:bg-live/90",
              )}
            >
              {isRecording ? (
                <>
                  <Square className="size-4" /> Stop
                </>
              ) : isTranscribing ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Wait
                </>
              ) : (
                <>
                  <Mic className="size-4" /> Dictate
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
