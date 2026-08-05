export type TranscriptRecord = {
  id: string;
  text: string;
  language: string;
  source: "microphone" | "file";
  createdAt: number;
  title: string;
};

const KEY = "voicescribe.history.v1";
const MAX_ITEMS = 50;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadHistory(): TranscriptRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is TranscriptRecord =>
        !!item && typeof item === "object" && typeof (item as TranscriptRecord).text === "string",
    );
  } catch {
    return [];
  }
}

function persist(items: TranscriptRecord[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // storage full or unavailable — history is best-effort
  }
}

export function makeTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Empty transcript";
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export function saveTranscript(
  input: Omit<TranscriptRecord, "id" | "createdAt" | "title">,
): TranscriptRecord[] {
  const record: TranscriptRecord = {
    ...input,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    createdAt: Date.now(),
    title: makeTitle(input.text),
  };
  const next = [record, ...loadHistory()];
  persist(next);
  return next.slice(0, MAX_ITEMS);
}

export function deleteTranscript(id: string): TranscriptRecord[] {
  const next = loadHistory().filter((item) => item.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): TranscriptRecord[] {
  persist([]);
  return [];
}
