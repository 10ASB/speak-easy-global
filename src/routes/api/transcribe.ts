import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const MODEL = "openai/gpt-4o-transcribe";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_PREFIXES = ["audio/", "video/webm", "video/mp4", "application/octet-stream"];

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "Transcription is not configured." }, { status: 500 });
        }

        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return Response.json({ error: "Expected an audio file upload." }, { status: 400 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Could not read the uploaded audio." }, { status: 400 });
        }

        const file = form.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return Response.json({ error: "No audio was received." }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return Response.json(
            { error: "That audio is larger than 20 MB. Try a shorter clip." },
            { status: 413 },
          );
        }
        const fileType = file.type || "audio/wav";
        if (!ALLOWED_PREFIXES.some((prefix) => fileType.startsWith(prefix))) {
          return Response.json(
            { error: `Unsupported audio type: ${fileType}` },
            { status: 400 },
          );
        }

        const language = form.get("language");
        const upstream = new FormData();
        upstream.append("model", MODEL);
        upstream.append("file", file, file.name || "recording.wav");
        upstream.append("stream", "true");
        if (typeof language === "string" && /^[a-z]{2,3}$/.test(language) && language !== "auto") {
          upstream.append("language", language);
        }

        const response = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          console.error(`Transcription failed [${response.status}]: ${detail}`);
          const message =
            response.status === 429
              ? "Too many requests right now — wait a moment and try again."
              : response.status === 402
                ? "AI credits are exhausted for this workspace."
                : `Transcription failed (${response.status}). ${detail.slice(0, 300)}`;
          return Response.json({ error: message }, { status: response.status });
        }

        return new Response(response.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
