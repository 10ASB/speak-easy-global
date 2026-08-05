import { Check, Copy, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Props = {
  committed: string;
  partial: string;
  languageLabel: string;
  onClear: () => void;
};

export function TranscriptPanel({ committed, partial, languageLabel, onClear }: Props) {
  const [copied, setCopied] = useState(false);
  const fullText = [committed, partial].filter(Boolean).join(" ").trim();
  const words = fullText ? fullText.split(/\s+/).length : 0;

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
    <section className="flex min-h-[22rem] flex-col rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Transcript
          </h2>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {languageLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 font-mono text-xs text-muted-foreground tabular-nums">
            {words} words · {fullText.length} chars
          </span>
          <Button variant="ghost" size="sm" onClick={copy} disabled={!fullText}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="sr-only sm:not-sr-only">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={download} disabled={!fullText}>
            <Download className="size-4" />
            <span className="sr-only sm:not-sr-only">Download</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={!fullText}>
            <Trash2 className="size-4" />
            <span className="sr-only sm:not-sr-only">Clear</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {fullText ? (
          <p className="font-mono text-[15px] leading-8 whitespace-pre-wrap text-foreground">
            {committed}
            {partial && (
              <span className="text-muted-foreground">{committed ? ` ${partial}` : partial}</span>
            )}
            <span className="caret-blink ml-0.5 inline-block h-5 w-[2px] translate-y-0.5 bg-primary" />
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
