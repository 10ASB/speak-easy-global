import { Pause, Play, RotateCcw, Gauge } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { tokenizeWords } from "@/lib/detect-language";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  /** True while new text is still streaming in — playback then follows the stream. */
  isLive?: boolean;
};

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function PlaybackView({ text, isLive }: Props) {
  const words = useMemo(() => tokenizeWords(text), [text]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const scroller = useRef<HTMLDivElement>(null);
  const active = words[Math.min(index, words.length - 1)];

  // While streaming, the highlight rides the newest word.
  useEffect(() => {
    if (isLive) {
      setPlaying(false);
      setIndex(Math.max(0, words.length - 1));
    }
  }, [isLive, words.length]);

  useEffect(() => {
    if (!playing || isLive) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i + 1 >= words.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 320 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, words.length, isLive]);

  useEffect(() => {
    scroller.current
      ?.querySelector<HTMLElement>("[data-active='true']")
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [index]);

  const legend = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of words) map.set(w.label, w.tone);
    return [...map.entries()];
  }, [words]);

  const restart = () => {
    setIndex(0);
    setPlaying(true);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-lang-wash px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Playback
          </h2>
          {active && text.trim() && (
            <Badge
              className="rise-in border-0 font-mono text-[11px]"
              style={{
                backgroundColor: `color-mix(in oklab, var(--lang-${active.tone}) 22%, transparent)`,
                color: `var(--lang-${active.tone})`,
              }}
            >
              {active.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {words.length ? Math.min(index + 1, words.length) : 0}/{words.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!words.length || isLive}
            onClick={() => setPlaying((p) => !p)}
            className="transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            <span className="sr-only sm:not-sr-only">{playing ? "Pause" : "Play"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!words.length || isLive}
            onClick={restart}
            className="transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <RotateCcw className="size-4" />
            <span className="sr-only sm:not-sr-only">Restart</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed as 1) + 1) % SPEEDS.length]!)}
            className="font-mono transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <Gauge className="size-4" />
            {speed}x
          </Button>
        </div>
      </header>

      <div ref={scroller} className="max-h-56 overflow-y-auto px-5 py-4">
        {words.length ? (
          <p className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono text-[15px] leading-8">
            {words.map((word, i) => {
              const isActive = i === index;
              const isPast = i < index;
              return (
                <span
                  key={`${word.text}-${i}`}
                  data-active={isActive}
                  title={word.label}
                  className={cn(
                    "rounded-md px-1 transition-all duration-200",
                    isActive && "scale-[1.06] font-semibold",
                  )}
                  style={{
                    color: isActive || isPast ? `var(--lang-${word.tone})` : undefined,
                    opacity: isActive ? 1 : isPast ? 0.85 : 0.4,
                    backgroundColor: isActive
                      ? `color-mix(in oklab, var(--lang-${word.tone}) 24%, transparent)`
                      : undefined,
                    boxShadow: isActive
                      ? `0 0 0 1px color-mix(in oklab, var(--lang-${word.tone}) 45%, transparent)`
                      : undefined,
                  }}
                >
                  {word.text}
                </span>
              );
            })}
          </p>
        ) : (
          <p className="font-mono text-sm text-muted-foreground">
            Once there is a transcript, play it back word by word — each word is tinted by the
            language detected for it.
          </p>
        )}
      </div>

      {legend.length > 0 && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
          {legend.map(([label, tone]) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px]"
              style={{
                borderColor: `color-mix(in oklab, var(--lang-${tone}) 45%, transparent)`,
                color: `var(--lang-${tone})`,
              }}
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: `var(--lang-${tone})` }}
              />
              {label}
            </span>
          ))}
        </footer>
      )}
    </section>
  );
}
