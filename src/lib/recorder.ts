import { encodeWav } from "./audio";

export type RecorderHandle = {
  /** Flush the remaining audio and stop the microphone. */
  stop: () => Promise<void>;
  /** Stop without emitting the remaining audio. */
  cancel: () => void;
};

export type RecorderOptions = {
  /** Called with each complete WAV window while recording. */
  onChunk: (wav: Blob) => void;
  /** 0..1 microphone level, for the meter. */
  onLevel?: (level: number) => void;
  /** Length of each streamed window in milliseconds. */
  windowMs?: number;
};

const MIN_WAV_BYTES = 2048;

export async function startRecorder({
  onChunk,
  onLevel,
  windowMs = 4000,
}: RecorderOptions): Promise<RecorderHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error("This browser does not support audio recording.");
  }

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  let pending: Float32Array[] = [];
  let pendingSamples = 0;
  let stopped = false;
  const samplesPerWindow = Math.floor((windowMs / 1000) * ctx.sampleRate);

  const flush = () => {
    if (!pending.length) return;
    const chunks = pending;
    pending = [];
    pendingSamples = 0;
    const wav = encodeWav(chunks, ctx.sampleRate);
    if (wav.size >= MIN_WAV_BYTES) onChunk(wav);
  };

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const input = event.inputBuffer.getChannelData(0);
    pending.push(new Float32Array(input));
    pendingSamples += input.length;

    if (onLevel) {
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += (input[i] ?? 0) ** 2;
      onLevel(Math.min(1, Math.sqrt(sum / input.length) * 4));
    }

    if (pendingSamples >= samplesPerWindow) flush();
  };

  source.connect(processor);
  // Required in some browsers for the processor to run; gain-free sink.
  const silent = ctx.createGain();
  silent.gain.value = 0;
  processor.connect(silent);
  silent.connect(ctx.destination);

  const teardown = () => {
    stopped = true;
    processor.onaudioprocess = null;
    try {
      processor.disconnect();
      silent.disconnect();
      source.disconnect();
    } catch {
      // already disconnected
    }
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    onLevel?.(0);
  };

  return {
    stop: async () => {
      if (stopped) return;
      flush();
      teardown();
    },
    cancel: () => {
      pending = [];
      pendingSamples = 0;
      teardown();
    },
  };
}
