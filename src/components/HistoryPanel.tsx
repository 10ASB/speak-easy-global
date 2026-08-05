import { FileAudio, History, Mic, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { languageLabel } from "@/lib/languages";
import type { TranscriptRecord } from "@/lib/history";

type Props = {
  items: TranscriptRecord[];
  onOpen: (record: TranscriptRecord) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
};

function formatWhen(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel({ items, onOpen, onDelete, onClearAll }: Props) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-border bg-sidebar">
      <header className="flex items-center justify-between gap-2 border-b border-sidebar-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-sidebar-foreground uppercase">
          <History className="size-4 text-primary" />
          Saved on this device
        </h2>
        {items.length > 0 && (
          <Button variant="ghost" size="icon" onClick={onClearAll} aria-label="Clear all history">
            <Trash2 className="size-4" />
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          Finished transcripts are saved here in your browser — no account needed. Nothing is stored
          on a server.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-sidebar-border overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="group relative">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="w-full px-4 py-3 pr-10 text-left transition-colors hover:bg-sidebar-accent"
              >
                <p className="truncate text-sm text-sidebar-foreground">{item.title}</p>
                <p className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  {item.source === "microphone" ? (
                    <Mic className="size-3" />
                  ) : (
                    <FileAudio className="size-3" />
                  )}
                  {formatWhen(item.createdAt)} · {languageLabel(item.language)}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete transcript"
                onClick={() => onDelete(item.id)}
                className="absolute top-2.5 right-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
