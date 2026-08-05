import { useCallback, useRef, useState } from "react";

type StreamEvent = {
  type?: string;
  delta?: string;
  text?: string;
};

/**
 * Streams audio windows to /api/transcribe and exposes committed vs in-progress
 * transcript text. Requests are queued so chunks stay in order.
 */
export function useTranscription() {
  const [committed, setCommitted] = useState("");
  const [partial, setPartial] = useState("");
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const abort = useRef<AbortController | null>(null);

  const runTranscription = useCallback(async (blob: Blob, language: string) => {
    const controller = new AbortController();
    abort.current = controller;
    const form = new FormData();
    form.append("file", blob, "recording.wav");
    form.append("language", language);

    const response = await fetch("/api/transcribe", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      let message = `Transcription failed (${response.status}).`;
      try {
        const body = (await response.json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // keep default
      }
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let event: StreamEvent;
        try {
          event = JSON.parse(payload) as StreamEvent;
        } catch {
          continue;
        }
        if (event.type === "transcript.text.delta" && event.delta) {
          finalText += event.delta;
          setPartial(finalText);
        } else if (event.type === "transcript.text.done" && typeof event.text === "string") {
          finalText = event.text;
        }
      }
    }

    const text = finalText.trim();
    setPartial("");
    if (text) {
      setCommitted((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
    }
    return text;
  }, []);

  const transcribe = useCallback(
    (blob: Blob, language: string) => {
      setPending((n) => n + 1);
      const task = queue.current.then(async () => {
        try {
          await runTranscription(blob, language);
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setError((err as Error).message);
          setPartial("");
        } finally {
          setPending((n) => Math.max(0, n - 1));
        }
      });
      queue.current = task;
      return task;
    },
    [runTranscription],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    queue.current = Promise.resolve();
    setCommitted("");
    setPartial("");
    setError(null);
    setPending(0);
  }, []);

  return {
    committed,
    partial,
    pending,
    isTranscribing: pending > 0,
    error,
    setError,
    setCommitted,
    transcribe,
    reset,
  };
}
