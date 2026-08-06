import { FileAudio, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  onFile: (file: File) => void;
  disabled?: boolean;
  busyLabel?: string | null;
};

export function AudioDropzone({ onFile, disabled, busyLabel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "group flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-8 text-center transition-all duration-200",
        !disabled && "hover:border-primary/60 hover:bg-card",
        dragging && "scale-[1.01] border-primary bg-accent/40 shadow-[0_0_0_1px_var(--color-primary)]",
        disabled && "opacity-60",
      )}

    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/webm,video/mp4"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {busyLabel ? (
        <>
          <FileAudio className="size-6 animate-pulse text-primary" />
          <p className="text-sm text-foreground">{busyLabel}</p>
        </>
      ) : (
        <>
          <Upload
            className={cn(
              "size-6 transition-all duration-200",
              dragging
                ? "-translate-y-1 text-primary"
                : "text-muted-foreground group-hover:-translate-y-0.5 group-hover:text-primary",
            )}
          />

          <p className="text-sm text-foreground">
            Drop an audio file here, or{" "}
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            mp3, wav, m4a, webm, ogg · up to 20 MB · long files are split automatically
          </p>
        </>
      )}
    </div>
  );
}
