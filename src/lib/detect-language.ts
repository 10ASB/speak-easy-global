/**
 * Script-based language detection for a finished transcript.
 * The model already auto-detects speech when no language code is sent; this
 * reads the returned text so the UI can show what was actually recognized,
 * including several languages mixed in one recording.
 */
export type DetectedScript = { label: string; count: number };

/** Semantic color token index (1-8) mapped in src/styles.css as --lang-N. */
export type ScriptSpec = { label: string; test: RegExp; tone: number };

const SCRIPTS: ScriptSpec[] = [
  { label: "Japanese", test: /[\u3040-\u30ff]/u, tone: 3 },
  { label: "Korean", test: /[\uac00-\ud7af\u1100-\u11ff]/u, tone: 4 },
  { label: "Chinese", test: /[\u4e00-\u9fff]/u, tone: 5 },
  { label: "Kannada", test: /[\u0c80-\u0cff]/u, tone: 2 },
  { label: "Devanagari", test: /[\u0900-\u097f]/u, tone: 6 },
  { label: "Bengali", test: /[\u0980-\u09ff]/u, tone: 7 },
  { label: "Gurmukhi", test: /[\u0a00-\u0a7f]/u, tone: 8 },
  { label: "Gujarati", test: /[\u0a80-\u0aff]/u, tone: 2 },
  { label: "Tamil", test: /[\u0b80-\u0bff]/u, tone: 3 },
  { label: "Telugu", test: /[\u0c00-\u0c7f]/u, tone: 4 },
  { label: "Malayalam", test: /[\u0d00-\u0d7f]/u, tone: 5 },
  { label: "Sinhala", test: /[\u0d80-\u0dff]/u, tone: 6 },
  { label: "Thai", test: /[\u0e00-\u0e7f]/u, tone: 7 },
  { label: "Arabic", test: /[\u0600-\u06ff\u0750-\u077f]/u, tone: 8 },
  { label: "Hebrew", test: /[\u0590-\u05ff]/u, tone: 2 },
  { label: "Greek", test: /[\u0370-\u03ff]/u, tone: 3 },
  { label: "Cyrillic", test: /[\u0400-\u04ff]/u, tone: 4 },
  { label: "Armenian", test: /[\u0530-\u058f]/u, tone: 5 },
  { label: "Georgian", test: /[\u10a0-\u10ff]/u, tone: 6 },
  { label: "Ethiopic", test: /[\u1200-\u137f]/u, tone: 7 },
  { label: "Latin", test: /[a-zA-ZÀ-ÖØ-öø-ÿ]/u, tone: 1 },
];

/** Languages/scripts present in the text, most prominent first. */
export function detectScripts(text: string): DetectedScript[] {
  if (!text.trim()) return [];
  const counts = new Map<string, number>();
  for (const char of text) {
    for (const script of SCRIPTS) {
      if (script.test.test(char)) {
        counts.set(script.label, (counts.get(script.label) ?? 0) + 1);
        break;
      }
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter(({ count }) => count > 1)
    .sort((a, b) => b.count - a.count);
}

/** Color tone (1-8) for a script label, for chips and highlights. */
export function toneFor(label: string): number {
  return SCRIPTS.find((s) => s.label === label)?.tone ?? 1;
}

export type WordToken = { text: string; label: string; tone: number };

/** Split text into words, tagging each with the dominant script in that word. */
export function tokenizeWords(text: string): WordToken[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const counts = new Map<string, number>();
      for (const char of word) {
        for (const script of SCRIPTS) {
          if (script.test.test(char)) {
            counts.set(script.label, (counts.get(script.label) ?? 0) + 1);
            break;
          }
        }
      }
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      const label = top?.[0] ?? "Symbols";
      return { text: word, label, tone: toneFor(label) };
    });
}
