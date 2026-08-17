/**
 * Custom vocabulary. Terms are sent to the transcription model as a prompt hint,
 * which biases recognition toward names, jargon and acronyms.
 */
const KEY = "voicescribe.glossary.v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadGlossary(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function saveGlossary(terms: string[]): string[] {
  const cleaned = [...new Set(terms.map((t) => t.trim()).filter(Boolean))].slice(0, 200);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(cleaned));
    } catch {
      // best effort
    }
  }
  return cleaned;
}

/** Prompt hint for the transcription model, or "" when the glossary is empty. */
export function glossaryPrompt(terms: string[]): string {
  if (!terms.length) return "";
  return `Spell these terms exactly when you hear them: ${terms.join(", ")}.`;
}
