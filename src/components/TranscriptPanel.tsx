import { Check, Copy, Download, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  committed: string;
  partial: string;
  languageLabel: string;
  isLive?: boolean;
  onClear: () => void;
};

export function TranscriptPanel({
  committed,
  partial,
  languageLabel,
  isLive,
  onClear,
}: Props) {
  const [copied, setCopied] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fullText = [committed, partial].filter(Boolean).join(" ").trim();
  const words = fullText ? fullText.split(/\s+/).length : 0;

  // Keep the newest words in view while text streams in.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [committed, partial]);

  const copy = async () => {
    if (!fullText) return;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    if (!fullText) return;
    const url = URL.createObjectURL(new Blob([fullText], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `transcript-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className={cn(
        "flex min-h-[22rem] flex-col rounded-2xl border bg-card transition-colors duration-300",
        isLive ? "border-primary/50" : "border-border",
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Transcript
          </h2>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {languageLabel}
          </Badge>
          {isLive && (
            <span className="breathe flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-primary uppercase">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 font-mono text-xs text-muted-foreground tabular-nums">
            {words} words · {fullText.length} chars
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copy}
            disabled={!fullText}
            className="transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            {copied ? (
              <Check className="size-4 text-primary" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="sr-only sm:not-sr-only">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={download}
            disabled={!fullText}
            className="transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <Download className="size-4" />
            <span className="sr-only sm:not-sr-only">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!fullText}
            className="transition-transform hover:-translate-y-0.5 hover:text-destructive active:scale-95"
          >
            <Trash2 className="size-4" />
            <span className="sr-only sm:not-sr-only">Clear</span>
          </Button>
        </div>
      </header>

      <div
        ref={scroller}
        className="flex-1 overflow-y-auto px-5 py-5"
        aria-live="polite"
        aria-atomic="false"
      >
        {fullText ? (
          <p className="font-mono text-[15px] leading-8 whitespace-pre-wrap text-foreground">
            {committed}
            {partial && (
              <span className="rise-in text-muted-foreground">
                {committed ? ` ${partial}` : partial}
              </span>
            )}
            {isLive && (
              <span className="caret-blink ml-0.5 inline-block h-5 w-[2px] translate-y-0.5 bg-primary" />
            )}
          </p>
        ) : (
          <p className="font-mono text-sm leading-7 text-muted-foreground">
            Your words will appear here as you speak. Press the mic, or drop in an audio file below.
          </p>
        )}
      </div>
    </section>
  );
}
