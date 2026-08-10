import { createFileRoute } from "@tanstack/react-router";
import { AudioWaveform, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AudioDropzone } from "@/components/AudioDropzone";
import { HistoryPanel } from "@/components/HistoryPanel";
import { LanguagePicker } from "@/components/LanguagePicker";
import { PlaybackView } from "@/components/PlaybackView";
import { RecorderControls } from "@/components/RecorderControls";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { useTranscription } from "@/hooks/use-transcription";
import { MAX_UPLOAD_BYTES, decodeFileToWavSegments } from "@/lib/audio";
import {
  clearHistory,
  deleteTranscript,
  loadHistory,
  saveTranscript,
  type TranscriptRecord,
} from "@/lib/history";
import { languageLabel } from "@/lib/languages";
import { startRecorder, type RecorderHandle } from "@/lib/recorder";

const TITLE = "VoiceScribe — Live Voice to Text in 80+ Languages";
const DESCRIPTION =
  "Record your voice and watch it become text in real time, or upload an audio file. Auto-detects and transcribes 80+ languages, with transcripts saved privately in your browser.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [language, setLanguage] = useState("auto");
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<TranscriptRecord[]>([]);
  const [woke, setWoke] = useState(false);

  const recorder = useRef<RecorderHandle | null>(null);
  const startedAt = useRef(0);
  const lastSaved = useRef("");
  const { committed, partial, isTranscribing, error, setError, setCommitted, transcribe, reset } =
    useTranscription();

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    return () => window.clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
    setError(null);
  }, [error, setError]);

  const persist = useCallback(
    (text: string, source: "microphone" | "file") => {
      const trimmed = text.trim();
      if (!trimmed || trimmed === lastSaved.current) return;
      lastSaved.current = trimmed;
      setHistory(saveTranscript({ text: trimmed, language, source }));
    },
    [language],
  );

  const handleStart = useCallback(async () => {
    try {
      recorder.current = await startRecorder({
        onChunk: (wav) => void transcribe(wav, language),
        onLevel: setLevel,
      });
      startedAt.current = Date.now();
      setElapsedMs(0);
      setIsRecording(true);
      lastSaved.current = "";
    } catch (err) {
      const name = (err as Error).name;
      toast.error(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access is needed to record. Allow it in your browser and try again."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : (err as Error).message || "Could not start recording.",
      );
    }
  }, [language, transcribe]);

  const handleStop = useCallback(async () => {
    const handle = recorder.current;
    recorder.current = null;
    setIsRecording(false);
    setLevel(0);
    await handle?.stop();
  }, []);

  // Save the finished transcript once the queue drains after recording stops.
  useEffect(() => {
    if (isRecording || isTranscribing || !committed.trim()) return;
    persist(committed, fileStatus ? "file" : "microphone");
  }, [isRecording, isTranscribing, committed, persist, fileStatus]);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error("That file is larger than 20 MB. Try a shorter clip.");
        return;
      }
      setFileStatus(`Decoding ${file.name}…`);
      try {
        const segments = await decodeFileToWavSegments(file);
        if (!segments.length) {
          toast.error("That file has no audio to transcribe.");
          return;
        }
        lastSaved.current = "";
        for (const [index, segment] of segments.entries()) {
          setFileStatus(`Transcribing part ${index + 1} of ${segments.length}…`);
          await transcribe(segment, language);
        }
        toast.success("Transcription complete.");
      } catch {
        toast.error("That audio file could not be decoded. Try mp3, wav, m4a, or webm.");
      } finally {
        setFileStatus(null);
      }
    },
    [language, transcribe],
  );

  const handleClear = useCallback(() => {
    reset();
    lastSaved.current = "";
    setElapsedMs(0);
  }, [reset]);

  // Space toggles recording when focus isn't in a field or control.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, button, [role='combobox'], [contenteditable='true']"))
        return;
      event.preventDefault();
      if (isRecording) void handleStop();
      else if (!fileStatus) void handleStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRecording, fileStatus, handleStart, handleStop]);

  // Wake-up hotkey (the Windows+H equivalent for this app): Ctrl/⌘ + Shift + H
  // opens the floating dictation capsule and starts listening right away.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !event.shiftKey || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "h") return;
      event.preventDefault();
      if (isRecording) {
        void handleStop();
        return;
      }
      if (fileStatus) return;
      setWoke(true);
      void handleStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isRecording, fileStatus, handleStart, handleStop]);

  return (
    <div className="aurora min-h-screen bg-stage">
      <DictationOverlay
        open={woke}
        isRecording={isRecording}
        isTranscribing={isTranscribing}
        level={level}
        elapsedMs={elapsedMs}
        text={[committed, partial].filter(Boolean).join(" ").trim()}
        onStart={handleStart}
        onStop={handleStop}
        onClose={() => setWoke(false)}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-primary uppercase">
              <AudioWaveform className="size-4" />
              VoiceScribe
            </p>
            <h1 className="mt-2 bg-gradient-to-r from-lang-1 via-lang-3 to-lang-4 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
              Speak. See it written.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Live transcription in 80+ languages — record straight from your mic or drop in a file.
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="size-3.5 text-primary" />
              Wake it anywhere with
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                Ctrl
              </kbd>
              +
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                Shift
              </kbd>
              +
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                H
              </kbd>
            </p>
          </div>
          <LanguagePicker value={language} onChange={setLanguage} disabled={isRecording} />
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <main className="flex flex-col gap-6">
            <RecorderControls
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              level={level}
              elapsedMs={elapsedMs}
              onStart={handleStart}
              onStop={handleStop}
              disabled={!!fileStatus}
            />

            <TranscriptPanel
              committed={committed}
              partial={partial}
              languageLabel={languageLabel(language)}
              isLive={isRecording || isTranscribing}
              onClear={handleClear}
            />

            <PlaybackView
              text={[committed, partial].filter(Boolean).join(" ").trim()}
              isLive={isRecording || isTranscribing}
            />

            <AudioDropzone onFile={handleFile} disabled={isRecording} busyLabel={fileStatus} />

            <div className="grid gap-3 sm:grid-cols-2">
              <p className="flex items-start gap-2 rounded-xl border border-lang-3/30 bg-card/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-lang-3" />
                Leave the language on Auto-detect and just start talking — switch it manually for
                noisy audio or heavy accents.
              </p>
              <p className="flex items-start gap-2 rounded-xl border border-lang-2/30 bg-card/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-lang-2" />
                Transcripts stay in this browser. Audio is only sent for transcription and never
                stored.
              </p>
            </div>
          </main>

          <HistoryPanel
            items={history}
            onOpen={(record) => {
              handleClear();
              lastSaved.current = record.text.trim();
              setCommitted(record.text);
            }}
            onDelete={(id) => setHistory(deleteTranscript(id))}
            onClearAll={() => setHistory(clearHistory())}
          />
        </div>
      </div>
    </div>
  );
}

