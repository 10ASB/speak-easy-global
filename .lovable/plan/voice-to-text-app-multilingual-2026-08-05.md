# Voice-to-Text App (Multilingual)

A single-page app that turns speech into text — record live in the browser and watch words appear as you speak, or drop in an existing audio file. Auto-detects language and supports 90+ languages.

## What gets built

**Main page (`/`)** — one focused workspace:
- Big record button with a live mic level meter and elapsed timer
- Transcript panel: live in-progress text in a lighter shade, finalized text solid
- Drag-and-drop / file-picker zone for existing audio (mp3, wav, m4a, webm)
- Language selector defaulting to "Auto-detect", with a searchable list of supported languages
- Transcript actions: copy, download as .txt, clear
- Word/character count and detected language badge

**History** — past transcripts saved locally in the browser (no account, no sign-up), listed in a side panel with timestamp, language, and a preview. Click to reopen, delete individually or clear all. Survives refresh; nothing leaves the device except the audio sent for transcription.

## How transcription works

- Recording captures raw audio and encodes complete WAV chunks every few seconds, so each chunk is transcribable on any browser including Safari.
- Chunks stream to a server endpoint that calls Lovable AI speech-to-text and streams the transcript back, so text appears while you speak.
- Uploaded files go through the same endpoint in one pass; long files are split into segments and stitched back together so nothing is cut off.
- The API key stays server-side.

## Design direction

Dark, studio-console feel: near-black background, warm amber accent for the live/recording state, monospace transcript type on a soft card, generous line height for readability. Motion is limited to the level meter and a subtle caret while transcribing.

## Technical notes

- `src/routes/index.tsx` replaces the placeholder page (SEO head with unique title/description/og tags).
- `src/routes/api/transcribe.ts` — server route, `multipart/form-data` in, SSE transcript deltas out; forwards to `https://ai.gateway.lovable.dev/v1/audio/transcriptions` with `openai/gpt-4o-transcribe` and `stream: "true"`; validates size/MIME, surfaces gateway 4xx/5xx verbatim.
- `src/lib/recorder.ts` — Web Audio PCM capture + WAV encoder (16 kHz mono), rolling-window chunking, empty-clip guard.
- `src/hooks/use-transcription.ts` — SSE consumption, partial vs committed text state.
- `src/lib/history.ts` — localStorage-backed transcript history.
- Components split under `src/components/`: `RecorderControls`, `TranscriptPanel`, `AudioDropzone`, `LanguagePicker`, `HistoryPanel`.
- No database or auth; Lovable Cloud is not needed.

## Error handling surfaced in UI

Mic permission denied, empty/silent recording, unsupported or oversized file, rate limit (429), credits exhausted (402) — each with a plain-language message and a retry path.
