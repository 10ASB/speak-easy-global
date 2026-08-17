/**
 * Spoken editing commands.
 *
 * The model transcribes commands literally ("new paragraph", "period"), so we
 * interpret them here and apply the edit instead of keeping the words.
 */
export type CommandResult = {
  /** Text after the commands were applied. */
  text: string;
  /** Human labels of the commands that fired, for the UI hint. */
  applied: string[];
};

type Rule = {
  label: string;
  /** Matches the spoken phrase anywhere in the chunk. */
  pattern: RegExp;
  apply: (before: string) => string;
};

const PUNCT: [string, string][] = [
  ["period", "."],
  ["full stop", "."],
  ["comma", ","],
  ["question mark", "?"],
  ["exclamation mark", "!"],
  ["exclamation point", "!"],
  ["colon", ":"],
  ["semicolon", ";"],
  ["dash", " — "],
  ["open quote", ' "'],
  ["close quote", '" '],
];

const RULES: Rule[] = [
  {
    label: "new paragraph",
    pattern: /\bnew paragraph\b/gi,
    apply: (before) => `${before.trimEnd()}\n\n`,
  },
  { label: "new line", pattern: /\bnew line\b/gi, apply: (before) => `${before.trimEnd()}\n` },
  {
    label: "delete that",
    pattern: /\b(?:delete|scratch) that\b/gi,
    apply: (before) => deleteLastSentence(before),
  },
  {
    label: "delete last word",
    pattern: /\bdelete last word\b/gi,
    apply: (before) => before.trimEnd().split(/\s+/).slice(0, -1).join(" "),
  },
  {
    label: "clear all",
    pattern: /\b(?:clear all|select all delete)\b/gi,
    apply: () => "",
  },
  ...PUNCT.map<Rule>(([phrase, mark]) => ({
    label: phrase,
    pattern: new RegExp(`\\b${phrase}\\b`, "gi"),
    apply: (before) => `${before.replace(/[\s]+$/, "")}${mark}`,
  })),
];

function deleteLastSentence(text: string): string {
  const trimmed = text.trimEnd();
  const cut = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("?"),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("\n"),
  );
  return cut > 0 ? trimmed.slice(0, cut + 1) : "";
}

/**
 * Fold a freshly transcribed chunk into the running text, honoring any spoken
 * commands it contains. Words around the command are kept.
 */
export function applyVoiceCommands(existing: string, chunk: string): CommandResult {
  const applied: string[] = [];
  let text = existing;
  let rest = chunk;

  // Walk the chunk left-to-right, applying commands where they appear.
  for (let guard = 0; guard < 50; guard++) {
    let earliest: { rule: Rule; index: number; length: number } | null = null;
    for (const rule of RULES) {
      const re = new RegExp(rule.pattern.source, "i");
      const match = re.exec(rest);
      if (match && (earliest === null || match.index < earliest.index)) {
        earliest = { rule, index: match.index, length: match[0].length };
      }
    }
    if (!earliest) break;

    const before = rest.slice(0, earliest.index).trim();
    if (before) text = text ? `${text.trimEnd()} ${before}` : before;
    text = earliest.rule.apply(text);
    applied.push(earliest.rule.label);
    rest = rest.slice(earliest.index + earliest.length);
  }

  const tail = rest.trim();
  if (tail) {
    text = text && !/[\n\s]$/.test(text) ? `${text} ${tail}` : `${text}${tail}`;
  }
  return { text: text.replace(/[ \t]+\n/g, "\n"), applied };
}

export const VOICE_COMMAND_HELP: { phrase: string; effect: string }[] = [
  { phrase: '"new paragraph"', effect: "Break into a new paragraph" },
  { phrase: '"new line"', effect: "Start a new line" },
  { phrase: '"delete that"', effect: "Remove the last sentence" },
  { phrase: '"delete last word"', effect: "Remove the last word" },
  { phrase: '"period" / "comma"', effect: "Insert punctuation" },
  { phrase: '"question mark"', effect: "Insert ?" },
  { phrase: '"clear all"', effect: "Empty the transcript" },
];
