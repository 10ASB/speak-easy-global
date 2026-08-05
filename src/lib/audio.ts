/**
 * Audio helpers: PCM -> WAV encoding, resampling, and file decoding.
 * Everything the app uploads is a complete 16 kHz mono WAV file so that any
 * browser (including Safari) produces bytes the transcription model can decode.
 */

export const TARGET_SAMPLE_RATE = 16000;

function concatFloat32(chunks: Float32Array[]): Float32Array {
  let length = 0;
  for (const chunk of chunks) length += chunk.length;
  const out = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Simple linear resampler — good enough for speech. */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx] ?? 0;
    const b = input[idx + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Encode mono float PCM as a standard 16-bit WAV file. */
export function encodeWav(chunks: Float32Array[] | Float32Array, sampleRate: number): Blob {
  const samples = Array.isArray(chunks) ? concatFloat32(chunks) : chunks;
  const resampled = resample(samples, sampleRate, TARGET_SAMPLE_RATE);
  const buffer = new ArrayBuffer(44 + resampled.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  const dataSize = resampled.length * 2;
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < resampled.length; i++) {
    const s = Math.max(-1, Math.min(1, resampled[i] ?? 0));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const SEGMENT_SECONDS = 90;

/**
 * Decode any browser-supported audio file and re-encode it as one or more
 * complete WAV segments so long recordings are transcribed in full.
 */
export async function decodeFileToWavSegments(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error("This browser cannot decode audio files.");
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    // Downmix to mono.
    const length = decoded.length;
    const mono = new Float32Array(length);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < length; i++) mono[i] = (mono[i] ?? 0) + (data[i] ?? 0);
    }
    if (decoded.numberOfChannels > 1) {
      for (let i = 0; i < length; i++) mono[i] = (mono[i] ?? 0) / decoded.numberOfChannels;
    }

    const perSegment = Math.floor(SEGMENT_SECONDS * decoded.sampleRate);
    const segments: Blob[] = [];
    for (let start = 0; start < length; start += perSegment) {
      const slice = mono.subarray(start, Math.min(start + perSegment, length));
      segments.push(encodeWav(slice, decoded.sampleRate));
    }
    return segments;
  } finally {
    void ctx.close();
  }
}
