/**
 * Transcript data model.
 *
 * A session is a list of segments — one per transcribed audio window (mic) or
 * per file part. Segments carry timing (for captions and jump-to-timestamp),
 * a speaker index (diarization) and a confidence score (0..1).
 */
export type Segment = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  /** 1-based speaker index; 0 = not diarized yet. */
  speaker: number;
  /** 0..1 — below 0.75 is surfaced as "double-check this". */
  confidence: number;
};

export type FormatMode = "raw" | "prose" | "notes";

export const FORMAT_MODES: { value: FormatMode; label: string; hint: string }[] = [
  { value: "raw", label: "Raw", hint: "Exactly what was said, no clean-up" },
  { value: "prose", label: "Prose", hint: "Auto punctuation and capitalization" },
  { value: "notes", label: "Notes", hint: "Bullet points split on pauses" },
];

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function segmentsToText(segments: Segment[]): string {
  return segments
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function speakerCount(segments: Segment[]): number {
  return new Set(segments.map((s) => s.speaker).filter((n) => n > 0)).size;
}

/** Color tone (1-8) for a speaker index, so speaker tags stay stable. */
export function speakerTone(speaker: number): number {
  return ((Math.max(1, speaker) - 1) % 8) + 1;
}

export function formatTimecode(ms: number, withMs = false): string {
  const total = Math.max(0, Math.floor(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  const base = `${hours > 0 ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return withMs ? `${base}.${String(millis).padStart(3, "0")}` : base;
}

/**
 * Apply the chosen formatting mode to the segment text for display/export.
 * "prose" is a light local clean-up; the AI pass (see /api/analyze) refines it
 * further when the user asks for polished output.
 */
export function applyFormatMode(segments: Segment[], mode: FormatMode): string {
  const parts = segments.map((s) => s.text.trim()).filter(Boolean);
  if (!parts.length) return "";
  if (mode === "notes") return parts.map((part) => `• ${sentenceCase(part)}`).join("\n");
  if (mode === "prose") {
    return parts
      .map((part) => {
        const cleaned = sentenceCase(part);
        return /[.!?…。！？]$/.test(cleaned) ? cleaned : `${cleaned}.`;
      })
      .join(" ");
  }
  return parts.join(" ");
}

function sentenceCase(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
