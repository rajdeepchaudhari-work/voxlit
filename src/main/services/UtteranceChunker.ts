import { EventEmitter } from 'events'

/**
 * UtteranceChunker splits a live PCM stream into chunks at detected silence
 * gates so transcription can run in parallel with recording.
 *
 * Lifecycle:
 *   begin(utteranceId, engine)  — open a new utterance session
 *   pushPcm(chunk)              — feed float32 16kHz mono PCM as it arrives
 *   end()                       — user released the hotkey; emit the final chunk
 *   abort()                     — something failed; discard without emitting
 *
 * Emits:
 *   'chunk' { utteranceId, seq, pcm, isFinal }
 *     Intermediate chunks close when silence ≥ SILENCE_MS is detected AND
 *     chunk duration ≥ MIN_CHUNK_MS. Emitted WITHOUT trailing silence (we cut
 *     where the silence run began). The final chunk emitted on end() contains
 *     whatever audio followed the last silence gate, or the whole utterance
 *     if no gate ever fired.
 *
 * end() returns the raw concatenated PCM. Caller hands this to TranscriptManager
 * so a failed chunk can trigger a full-buffer fallback re-transcribe — the
 * "never worse than v1.0" guarantee.
 *
 * Pass-through mode (non-local engines): chunkedTranscription=false OR
 * engine !== 'local' collapses to one chunk per utterance. The chunker
 * accumulates the full buffer and emits it exactly once on end() with
 * isFinal=true. Cloud/Voxlit round-trip latency makes chunking net-negative
 * for those engines.
 */

type Engine = 'voxlit' | 'local' | 'cloud'

export interface UtteranceChunk {
  utteranceId: string
  seq: number
  pcm: Buffer
  isFinal: boolean
  /** Snapshotted at begin() time so a mid-utterance settings change can't
   *  enqueue later chunks against a different engine or model. */
  engine: Engine
  modelName: string
}

const SAMPLE_RATE = 16000
const BYTES_PER_SAMPLE = 4 // float32

// RMS window for silence detection. 20ms = 320 samples = 1280 bytes.
const RMS_WINDOW_MS = 20
const RMS_WINDOW_SAMPLES = (SAMPLE_RATE * RMS_WINDOW_MS) / 1000

// Tunables matching the plan. Exported as constants for the unit test to
// reason about deterministic behavior. If we ever expose these via settings,
// derive from `vadSensitivity` (currently dead scaffolding) — that's where
// the slider finally does something.
export const SILENCE_THRESHOLD = 0.01
export const SILENCE_MS = 600
export const MIN_CHUNK_MS = 1500
export const MAX_CHUNK_MS = 8000

export class UtteranceChunker extends EventEmitter {
  private active = false
  private passThrough = false
  private utteranceId: string | null = null
  private seq = 0
  // Snapshotted at begin() time. Emitted chunks carry these so the queue
  // dispatcher doesn't re-read settings at emit time — a change mid-utterance
  // must not split chunks across engines/models.
  private engine: Engine = 'local'
  private modelName: string = 'ggml-base.en'

  // The current chunk's PCM frames in arrival order.
  private currentChunk: Buffer[] = []
  private currentChunkBytes = 0

  // Full raw copy of every frame pushed this utterance — kept for the fallback
  // re-transcribe path. Released on end()/abort().
  private rawFrames: Buffer[] = []

  // Silence run state: a monotonically growing count of trailing bytes we've
  // observed below the RMS threshold (aligned to RMS windows).
  private silentTrailingBytes = 0

  // Partial-window remainder: if a pushed chunk's length isn't aligned to the
  // 20ms RMS window, carry the leftover samples into the next analyze pass.
  private analysisRemainder: Buffer = Buffer.alloc(0)

  // Absolute sample count for the chunk — used to enforce MIN/MAX durations
  // independent of PCM arrival cadence.
  private samplesInChunk = 0

  begin(utteranceId: string, engine: Engine, chunkedEnabled: boolean, modelName: string) {
    if (this.active) this.reset()
    this.active = true
    this.utteranceId = utteranceId
    this.seq = 0
    this.engine = engine
    this.modelName = modelName
    // Chunking is gated on BOTH the feature flag AND the engine: cloud/voxlit
    // network RTT makes chunking net-negative; Voxlit Server's GPT-4o-mini
    // post-process also wants full-utterance context. Local whisper.cpp is
    // the only engine where chunking pays off today.
    this.passThrough = !chunkedEnabled || engine !== 'local'
  }

  pushPcm(chunk: Buffer): void {
    if (!this.active) return
    this.rawFrames.push(chunk)
    this.currentChunk.push(chunk)
    this.currentChunkBytes += chunk.length
    this.samplesInChunk += chunk.length / BYTES_PER_SAMPLE

    if (this.passThrough) return

    this.analyzeForBoundary(chunk)
  }

  end(): Buffer {
    if (!this.active) return Buffer.alloc(0)
    const utteranceId = this.utteranceId!

    // Emit the final chunk (whatever audio followed the last silence gate, or
    // the entire utterance if no gate ever fired).
    const pcm = Buffer.concat(this.currentChunk, this.currentChunkBytes)
    this.emit('chunk', {
      utteranceId,
      seq: this.seq++,
      pcm,
      isFinal: true,
      engine: this.engine,
      modelName: this.modelName,
    } satisfies UtteranceChunk)

    // Return the raw shadow for the fallback path. Main+TranscriptManager hold
    // onto it only until the utterance finalizes, so memory pressure is bounded
    // to one in-flight utterance (~1.9MB per 30s of audio).
    const rawBytes = this.rawFrames.reduce((n, b) => n + b.length, 0)
    const raw = Buffer.concat(this.rawFrames, rawBytes)
    this.reset()
    return raw
  }

  abort(): void {
    if (!this.active) return
    this.reset()
  }

  // ─── internals ──────────────────────────────────────────────────────────

  private analyzeForBoundary(chunk: Buffer): void {
    // Build a window over (leftover from last pass) + (this chunk) so we
    // analyze 20ms windows aligned to sample boundaries.
    const input = this.analysisRemainder.length > 0
      ? Buffer.concat([this.analysisRemainder, chunk])
      : chunk

    const windowBytes = RMS_WINDOW_SAMPLES * BYTES_PER_SAMPLE
    let offset = 0

    while (offset + windowBytes <= input.length) {
      const rms = rmsFloat32(input, offset, RMS_WINDOW_SAMPLES)
      if (rms < SILENCE_THRESHOLD) {
        this.silentTrailingBytes += windowBytes
      } else {
        this.silentTrailingBytes = 0
      }
      offset += windowBytes

      // Check chunk-boundary conditions after each window so a boundary fires
      // promptly rather than waiting for the end of the pcm chunk.
      if (this.shouldCutNow()) {
        this.cutChunk()
      }
    }

    this.analysisRemainder = input.slice(offset)

    // Also enforce the MAX duration cap even outside silence — if the speaker
    // is talking continuously for > MAX_CHUNK_MS, force-close so the queue
    // can start processing something.
    if (this.samplesInChunk >= (SAMPLE_RATE * MAX_CHUNK_MS) / 1000) {
      this.cutChunk()
    }
  }

  private shouldCutNow(): boolean {
    const silentMs = (this.silentTrailingBytes / BYTES_PER_SAMPLE / SAMPLE_RATE) * 1000
    const chunkMs = (this.samplesInChunk / SAMPLE_RATE) * 1000
    return silentMs >= SILENCE_MS && chunkMs >= MIN_CHUNK_MS
  }

  private cutChunk(): void {
    if (!this.active || !this.utteranceId) return
    if (this.currentChunkBytes === 0) return

    const pcm = Buffer.concat(this.currentChunk, this.currentChunkBytes)
    this.emit('chunk', {
      utteranceId: this.utteranceId,
      seq: this.seq++,
      pcm,
      isFinal: false,
      engine: this.engine,
      modelName: this.modelName,
    } satisfies UtteranceChunk)

    this.currentChunk = []
    this.currentChunkBytes = 0
    this.samplesInChunk = 0
    this.silentTrailingBytes = 0
    // Intentionally keep analysisRemainder — it's the unanalyzed tail of
    // sample data from the last pushPcm, belongs to the *next* chunk.
  }

  private reset(): void {
    this.active = false
    this.passThrough = false
    this.utteranceId = null
    this.seq = 0
    this.engine = 'local'
    this.modelName = 'ggml-base.en'
    this.currentChunk = []
    this.currentChunkBytes = 0
    this.rawFrames = []
    this.silentTrailingBytes = 0
    this.analysisRemainder = Buffer.alloc(0)
    this.samplesInChunk = 0
  }
}

function rmsFloat32(buf: Buffer, byteOffset: number, sampleCount: number): number {
  let sum = 0
  for (let i = 0; i < sampleCount; i++) {
    const v = buf.readFloatLE(byteOffset + i * BYTES_PER_SAMPLE)
    sum += v * v
  }
  return Math.sqrt(sum / sampleCount)
}
