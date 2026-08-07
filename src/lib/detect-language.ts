/**
 * Script-based language detection for a finished transcript.
 * The model already auto-detects speech when no language code is sent; this
 * reads the returned text so the UI can show what was actually recognized,
 * including several languages mixed in one recording.
 */
export type DetectedScript = { label: string; count: number };

const SCRIPTS: { label: string; test: RegExp }[] = [
  { label: "Japanese", test: /[\u3040-\u30ff]/u },
  { label: "Korean", test: /[\uac00-\ud7af\u1100-\u11ff]/u },
  { label: "Chinese", test: /[\u4e00-\u9fff]/u },
  { label: "Kannada", test: /[\u0c80-\u0cff]/u },
  { label: "Devanagari", test: /[\u0900-\u097f]/u },
  { label: "Bengali", test: /[\u0980-\u09ff]/u },
  { label: "Gurmukhi", test: /[\u0a00-\u0a7f]/u },
  { label: "Gujarati", test: /[\u0a80-\u0aff]/u },
  { label: "Tamil", test: /[\u0b80-\u0bff]/u },
  { label: "Telugu", test: /[\u0c00-\u0c7f]/u },
  { label: "Malayalam", test: /[\u0d00-\u0d7f]/u },
  { label: "Sinhala", test: /[\u0d80-\u0dff]/u },
  { label: "Thai", test: /[\u0e00-\u0e7f]/u },
  { label: "Arabic", test: /[\u0600-\u06ff\u0750-\u077f]/u },
  { label: "Hebrew", test: /[\u0590-\u05ff]/u },
  { label: "Greek", test: /[\u0370-\u03ff]/u },
  { label: "Cyrillic", test: /[\u0400-\u04ff]/u },
  { label: "Armenian", test: /[\u0530-\u058f]/u },
  { label: "Georgian", test: /[\u10a0-\u10ff]/u },
  { label: "Ethiopic", test: /[\u1200-\u137f]/u },
  { label: "Latin", test: /[a-zA-ZÀ-ÖØ-öø-ÿ]/u },
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
