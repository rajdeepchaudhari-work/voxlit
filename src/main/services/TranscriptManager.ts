import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFile } from 'child_process'
import * as https from 'https'
import { app } from 'electron'
import type { TranscriptSegment } from '@shared/ipc-types'
import type { SessionStore } from './SessionStore'
import { stitch } from './TranscriptStitcher'

/**
 * TranscriptManager receives VAD-gated PCM buffers (or per-utterance chunks
 * from UtteranceChunker), invokes whisper-cli (local) or OpenAI API (cloud)
 * or the Voxlit Server, and emits one 'segment' event per completed utterance.
 *
 * Two entry patterns:
 *
 *   1. Single-shot (backward compat, cloud + voxlit engines):
 *      enqueue(pcm, engine, modelName) — one chunk, one emit.
 *
 *   2. Chunked (v2, local engine only):
 *      enqueueChunk(id, seq, pcm, engine, modelName, isFinal) × N
 *      finalizeUtterance(id, rawPcm)
 *      — N chunks transcribe serially, stitched into one emit at the end.
 *
 * The global queue stays serial: two whisper-cli processes sharing Metal
 * crash with GGML_ASSERT, so we never run them concurrently.
 *
 * Events emitted:
 *   'segment' (segment: TranscriptSegment)
 *   'empty'   — utterance produced no text (silence, hallucination, or failure)
 */
type Engine = 'voxlit' | 'local' | 'cloud'

type ChunkState = 'pending' | 'running' | 'done' | 'failed'

interface ChunkEntry {
  seq: number
  pcm: Buffer
  state: ChunkState
  text: string
  /** True if this is a synthetic chunk that carries the full raw utterance —
   *  used as the single-shot fallback when one or more normal chunks failed. */
  isFallback: boolean
}

interface UtteranceState {
  id: string
  engine: Engine
  modelName: string
  startedAtMs: number
  chunks: Map<number, ChunkEntry>
  /** Set when the caller has signaled "no more chunks will be enqueued for
   *  this utterance" — e.g. user released the hotkey. Emission is gated on
   *  this flag so we don't emit mid-utterance. */
  finalized: boolean
  /** Raw concatenated PCM for the whole utterance. Only set for chunked
   *  calls; single-shot enqueue() leaves this null (fallback would just
   *  re-run the same buffer that already failed). */
  rawPcm: Buffer | null
  cancelled: boolean
  fallbackTriggered: boolean
  /** Set the instant we call `emit('segment'|'empty')`. Guards against a
   *  concurrent maybeEmit run double-emitting for the same utterance when
   *  two chunks settle in quick succession. */
  emitted: boolean
}

/** Pending work item in the global FIFO. Points into an UtteranceState so
 *  cancellation (flipping state.cancelled) short-circuits at process time
 *  without needing to scrub the queue. */
interface PendingWork {
  utteranceId: string
  seq: number
}

export class TranscriptManager extends EventEmitter {
  private utterances = new Map<string, UtteranceState>()
  private pending: PendingWork[] = []
  private processing = false
  // Resolves when any in-flight warmup finishes — real transcription waits on this
  private warmupDone: Promise<void> = Promise.resolve()

  private warmedUp = false

  constructor(
    private readonly sessionStore: SessionStore,
    private readonly getCloudConfig: () => { openaiApiKey?: string },
    private readonly getDefaultModel: () => string = () => 'ggml-small.en',
    private readonly getVoxlitServer: () => { url: string; token: string } = () => ({ url: '', token: '' })
  ) {
    super()
    // Warmup deferred to first enqueue — avoids blocking app startup
    // and competing with window creation for CPU/GPU
  }

  private warmup() {
    const model = this.getDefaultModel()
    // Large/medium models take 20-40s to warm up — longer than it saves, and
    // causes a Metal GPU conflict if the user speaks before warmup finishes.
    if (model.includes('large') || model.includes('medium')) {
      console.log('[TranscriptManager] Skipping warmup for large model (too slow to be useful)')
      return
    }

    const silence = this.pcmToWav(Buffer.alloc(16000 * 4)) // 1s silence
    const wavPath = join(tmpdir(), 'voxlit_warmup.wav')
    try {
      writeFileSync(wavPath, silence)
      const binaryName = process.arch === 'arm64' ? 'whisper-cli-arm64' : 'whisper-cli-x64'
      const binaryPath = app.isPackaged
        ? join(process.resourcesPath, 'binaries', binaryName)
        : join(app.getAppPath(), 'resources/binaries', binaryName)
      const modelPath = app.isPackaged
        ? join(process.resourcesPath, 'models', model + '.bin')
        : join(app.getAppPath(), 'resources/models', model + '.bin')
      const threads = String(Math.min(8, require('os').cpus().length))

      this.warmupDone = new Promise<void>((resolve) => {
        execFile(binaryPath, ['-m', modelPath, '-f', wavPath, '--no-prints', '-t', threads], { timeout: 30_000 }, (err) => {
          try { unlinkSync(wavPath) } catch (_) {}
          if (err) console.warn('[TranscriptManager] Warmup failed:', err.message)
          else console.log('[TranscriptManager] Whisper warmed up')
          resolve()  // always resolve — don't block future transcriptions on warmup failure
        })
      })
    } catch (e) {
      console.warn('[TranscriptManager] Warmup setup failed:', (e as Error).message)
    }
  }

  /**
   * Backward-compat single-shot entry. Creates a one-chunk utterance and
   * immediately finalizes it. Used by cloud/voxlit engines (which always
   * pass through one full buffer) and by any caller that hasn't moved to
   * the chunked API yet.
   */
  enqueue(pcmBuffer: Buffer, engine: Engine = 'voxlit', modelName = 'ggml-base.en') {
    const id = randomUUID()
    this.enqueueChunk(id, 0, pcmBuffer, engine, modelName, /*isFinal*/ true)
    // rawPcm=null — if the only chunk fails, re-running the same buffer would
    // just fail the same way. Match today's behavior: emit 'empty' on failure.
    this.finalizeUtterance(id, null)
  }

  /**
   * Append a chunk to the given utterance. `seq` must be monotonically
   * increasing per utterance. `isFinal` signals "the chunker closed the
   * utterance with this chunk" — NOT "the utterance is finalized." Caller
   * must still invoke finalizeUtterance() to authorize emission.
   */
  enqueueChunk(
    utteranceId: string,
    seq: number,
    pcm: Buffer,
    engine: Engine,
    modelName: string,
    _isFinal: boolean,
  ): void {
    // Trigger warmup on first local enqueue — deferred from constructor so
    // app startup isn't blocked by Metal GPU priming.
    if (engine === 'local' && !this.warmedUp) {
      this.warmedUp = true
      this.warmup()
    }

    let u = this.utterances.get(utteranceId)
    if (!u) {
      u = {
        id: utteranceId,
        engine,
        modelName,
        startedAtMs: Date.now(),
        chunks: new Map(),
        finalized: false,
        rawPcm: null,
        cancelled: false,
        fallbackTriggered: false,
        emitted: false,
      }
      this.utterances.set(utteranceId, u)
    }
    if (u.cancelled) return

    u.chunks.set(seq, { seq, pcm, state: 'pending', text: '', isFallback: false })
    this.pending.push({ utteranceId, seq })
    if (!this.processing) void this.processNext()
  }

  /**
   * Signal that no more chunks will be enqueued for this utterance. Pass
   * `rawPcm` when chunked transcription was used so we have a fallback path
   * if any chunk failed. Pass null from the single-shot enqueue() wrapper.
   */
  finalizeUtterance(utteranceId: string, rawPcm: Buffer | null): void {
    const u = this.utterances.get(utteranceId)
    if (!u) return
    u.finalized = true
    u.rawPcm = rawPcm
    // Chunks may already be done by now — e.g. a short utterance with one
    // chunk that finished before finalize landed. Kick an emit check.
    this.maybeEmitUtterance(utteranceId)
  }

  /**
   * Abort an in-flight utterance — e.g. audio_error, helper crash. Any
   * pending chunks are skipped at process time; the utterance emits nothing.
   */
  cancelUtterance(utteranceId: string): void {
    const u = this.utterances.get(utteranceId)
    if (!u) return
    u.cancelled = true
    // Don't delete from map yet — in-flight transcribe may still reference it.
    // maybeEmitUtterance cleans up when chunks settle.
  }

  // ─── internal: the single serial processing loop ────────────────────────

  private async processNext(): Promise<void> {
    // Find the next pending chunk whose utterance isn't cancelled. Skip
    // cancelled items without spawning whisper.
    let work: PendingWork | undefined
    while ((work = this.pending.shift())) {
      const u = this.utterances.get(work.utteranceId)
      if (!u || u.cancelled) continue
      const c = u.chunks.get(work.seq)
      if (!c || c.state !== 'pending') continue
      break
    }

    if (!work) {
      this.processing = false
      return
    }

    this.processing = true
    const u = this.utterances.get(work.utteranceId)!
    const c = u.chunks.get(work.seq)!
    c.state = 'running'

    try {
      const raw = await this.transcribeByEngine(c.pcm, u.engine, u.modelName)
      // Re-fetch: between the await and here, cancelUtterance (or an earlier
      // maybeEmit) may have deleted this utterance. Mutating c.text / c.state
      // on a tracker that's been removed from the map and skipping the emit
      // is the correct move — the utterance already settled (as cancelled or
      // emitted) from the caller's perspective.
      const uNow = this.utterances.get(work.utteranceId)
      if (!uNow || uNow.cancelled) {
        void this.processNext()
        return
      }
      const cleaned = this.cleanText(raw)
      // Per-chunk hallucination guard: if a chunk produces a known phantom,
      // drop its text from the stitch rather than failing the utterance.
      c.text = (cleaned && !this.isHallucination(cleaned)) ? cleaned : ''
      c.state = 'done'
      this.maybeEmitUtterance(u.id)
    } catch (err) {
      console.error(`[TranscriptManager] chunk ${u.id}:${c.seq} failed:`, err)
      const uNow = this.utterances.get(work.utteranceId)
      if (!uNow || uNow.cancelled) {
        void this.processNext()
        return
      }
      c.state = 'failed'
      this.maybeEmitUtterance(u.id)
    } finally {
      void this.processNext()
    }
  }

  private transcribeByEngine(pcm: Buffer, engine: Engine, modelName: string): Promise<string> {
    return engine === 'local' ? this.transcribeLocal(pcm, modelName)
      : engine === 'cloud'    ? this.transcribeCloud(pcm)
      : this.transcribeVoxlit(pcm)
  }

  /**
   * Called after every chunk settles. Emits 'segment' once per utterance,
   * after finalize AND after all chunks (including any fallback) have run.
   */
  private maybeEmitUtterance(utteranceId: string): void {
    const u = this.utterances.get(utteranceId)
    if (!u) return
    // First guard: a concurrent run may have already emitted. The tracker
    // deletion below clears the map, but a parallel call entered before the
    // delete would otherwise race to emit a second time.
    if (u.emitted) return
    if (u.cancelled) {
      // Wait for all in-flight chunks to leave 'running' before deleting,
      // so a late transcribe callback doesn't resurrect a deleted utterance.
      const anyRunning = Array.from(u.chunks.values()).some(c => c.state === 'running')
      if (!anyRunning) this.utterances.delete(utteranceId)
      return
    }
    if (!u.finalized) return

    const chunks = Array.from(u.chunks.values())
    const anyUnsettled = chunks.some(c => c.state === 'pending' || c.state === 'running')
    if (anyUnsettled) return

    const nonFallbackChunks = chunks.filter(c => !c.isFallback)
    const failedChunks = nonFallbackChunks.filter(c => c.state === 'failed')
    const fallbackChunk = chunks.find(c => c.isFallback)

    // Fallback path: if any non-fallback chunk failed AND we have a raw
    // shadow AND we haven't already tried AND re-running would actually be a
    // different input (the raw buffer isn't byte-identical to what failed),
    // re-transcribe the whole utterance as a single shot.
    //
    // Content-based gate instead of a chunk-count threshold: a 5-second
    // single-chunk failure and a 30-second multi-chunk failure are the same
    // transient whisper problem. Skip fallback only when the failed chunk IS
    // the raw buffer (pass-through utterances), because re-running produces
    // the same failure.
    const shouldFallback =
      failedChunks.length > 0
      && u.rawPcm
      && !u.fallbackTriggered
      && failedChunks.some(c => !c.pcm.equals(u.rawPcm!))
    if (shouldFallback) {
      u.fallbackTriggered = true
      const seq = Math.max(...chunks.map(c => c.seq)) + 1
      u.chunks.set(seq, {
        seq, pcm: u.rawPcm!, state: 'pending', text: '', isFallback: true,
      })
      this.pending.push({ utteranceId: u.id, seq })
      if (!this.processing) void this.processNext()
      return
    }

    // If we have a fallback chunk, its text IS the transcript. Otherwise
    // stitch all successful non-fallback chunks in seq order.
    let finalText = ''
    if (fallbackChunk && fallbackChunk.state === 'done' && fallbackChunk.text) {
      finalText = fallbackChunk.text
    } else {
      const ordered = chunks
        .filter(c => !c.isFallback && c.state === 'done' && c.text)
        .sort((a, b) => a.seq - b.seq)
        .map(c => c.text)
      finalText = stitch(ordered)
    }

    // Flip the guard BEFORE the delete + emit pair. A concurrent run that
    // entered maybeEmitUtterance before the delete still sees u.emitted=true
    // via the shared tracker ref and bails at the top.
    u.emitted = true
    this.utterances.delete(utteranceId)

    if (!finalText || this.isHallucination(finalText)) {
      this.emit('empty')
      return
    }

    const durationMs = Date.now() - u.startedAtMs
    const model =
      u.engine === 'voxlit' ? 'voxlit-cloud' :
      u.engine === 'cloud'  ? 'whisper-1'    :
      u.modelName
    const entry = this.sessionStore.addEntry({
      rawText: finalText, durationMs, engine: u.engine, model,
    })
    const segment: TranscriptSegment = {
      text: finalText,
      sessionId: entry.sessionId,
      entryId: entry.id,
      durationMs,
      engine: u.engine,
    }
    this.emit('segment', segment)
  }

  /**
   * Post-process whisper output: strip artifacts, capitalize, clean whitespace.
   */
  private cleanText(raw: string): string {
    return raw
      // Strip whisper noise tokens like [BLANK_AUDIO], [Music], [Applause], (inaudible), etc.
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
      // Capitalize first letter
      .replace(/^./, c => c.toUpperCase())
  }

  /**
   * Whisper hallucinates common phrases when given silence or low-energy audio.
   * Only filter clearly phantom subtitle/video outputs — not valid spoken words.
   */
  private isHallucination(text: string): boolean {
    const t = text.trim().toLowerCase().replace(/[.,!?]/g, '')
    // True phantom outputs from whisper trained on subtitle data — never real dictation
    const PHANTOMS = new Set([
      'thank you for watching', 'thanks for watching',
      'please subscribe', 'like and subscribe',
      'subtitles by', 'transcribed by',
      'you you', 'the the', 'i i',
    ])
    if (PHANTOMS.has(t)) return true
    // Strip all non-alpha to catch things like "..." or "- - -"
    if (t.replace(/[^a-z]/g, '').length <= 1) return true
    return false
  }

  /**
   * Trim leading and trailing silence from float32 PCM to reduce whisper processing time.
   * Silence = RMS of a 10ms window below threshold. Keeps 100ms padding on each side.
   */
  private trimSilence(pcm: Buffer, sampleRate = 16000): Buffer {
    const THRESHOLD = 0.01       // RMS threshold
    const WINDOW = sampleRate / 100   // 10ms window in samples
    const PADDING = sampleRate / 10   // 100ms padding in samples
    const samples = pcm.length / 4    // float32 = 4 bytes

    function rms(start: number, len: number): number {
      let sum = 0
      for (let i = start; i < start + len && i < samples; i++) {
        const v = pcm.readFloatLE(i * 4)
        sum += v * v
      }
      return Math.sqrt(sum / len)
    }

    let startSample = 0
    for (let i = 0; i < samples - WINDOW; i += WINDOW) {
      if (rms(i, WINDOW) > THRESHOLD) { startSample = Math.max(0, i - PADDING); break }
    }

    let endSample = samples
    for (let i = samples - WINDOW; i > startSample; i -= WINDOW) {
      if (rms(i, WINDOW) > THRESHOLD) { endSample = Math.min(samples, i + WINDOW + PADDING); break }
    }

    return pcm.slice(startSample * 4, endSample * 4)
  }

  private async transcribeLocal(pcm: Buffer, modelName = 'ggml-base.en'): Promise<string> {
    // Wait for any in-flight warmup — two whisper-cli processes using Metal simultaneously
    // causes GGML_ASSERT([rsets->data count] == 0) crash on the second process.
    await this.warmupDone

    // Trim silence — reduces audio length sent to whisper, speeds up processing
    const trimmed = this.trimSilence(pcm)
    // If trimming left less than 0.1s of audio, nothing meaningful was said
    if (trimmed.length < 16000 * 4 * 0.1) return ''

    const wavPath = join(tmpdir(), `voxlit_${Date.now()}.wav`)

    try {
      writeFileSync(wavPath, this.pcmToWav(trimmed))

      const binaryName = process.arch === 'arm64' ? 'whisper-cli-arm64' : 'whisper-cli-x64'
      const binaryPath = app.isPackaged
        ? join(process.resourcesPath, 'binaries', binaryName)
        : join(app.getAppPath(), 'resources/binaries', binaryName)

      const modelFile = modelName + '.bin'
      const modelPath = app.isPackaged
        ? join(process.resourcesPath, 'models', modelFile)
        : join(app.getAppPath(), 'resources/models', modelFile)

      const isLarge = modelName.includes('large')
      const cpuCount = require('os').cpus().length
      // On Apple Silicon use all performance cores (up to 8); on Intel cap at 4
      const threads = String(process.arch === 'arm64' ? Math.min(8, cpuCount) : Math.min(4, cpuCount))
      const args = [
        '-m', modelPath,
        '-f', wavPath,
        '--no-prints',
        '--no-timestamps',
        '--language', 'en',
        '-t', threads,
        // --no-context: CRITICAL for push-to-talk dictation. Without this, whisper conditions
        // on previous audio context and hallucinates continuations from earlier sessions.
        '--no-context',
        // beam-size 5 on all models — meaningfully more accurate than greedy (beam=1),
        // adds ~100ms on base/small which is acceptable for dictation quality.
        '--beam-size', '5',
        // Initial prompt primes the model to expect natural spoken sentences, not subtitles.
        '--prompt', 'Dictation of spoken words.',
        // Suppress blank outputs and single-token noise from silence.
        '--suppress-blank',
        ...(!isLarge ? ['--best-of', '5'] : []),
      ]

      return await new Promise<string>((resolve, reject) => {
        execFile(
          binaryPath,
          args,
          { timeout: isLarge ? 60_000 : 30_000 },
          (err, stdout, stderr) => {
            if (err) {
              console.error('[whisper] stderr:', stderr)
              return reject(err)
            }
            // Strip timestamp prefix: [00:00:00.000 --> 00:00:03.720]
            const text = stdout
              .split('\n')
              .map(line => line.replace(/^\[[\d:.]+\s*-->\s*[\d:.]+\]\s*/, '').trim())
              .filter(line => line && !/^\[.+\]$/.test(line))
              .join(' ')
              .trim()
            resolve(text)
          }
        )
      })
    } finally {
      try { unlinkSync(wavPath) } catch (_) {}
    }
  }

  private audioRms(pcm: Buffer): number {
    const samples = pcm.length / 4
    let sum = 0
    for (let i = 0; i < samples; i++) {
      const v = pcm.readFloatLE(i * 4)
      sum += v * v
    }
    return Math.sqrt(sum / samples)
  }

  /**
   * Voxlit Server engine — proxies audio to our hosted endpoint which runs
   * Whisper + GPT-4o-mini post-processing for dictation-quality output.
   * Returns text that's already punctuated, capitalized, and filler-word-stripped.
   */
  private async transcribeVoxlit(pcm: Buffer): Promise<string> {
    // Skip if audio is silence
    if (this.audioRms(pcm) < 0.005) return ''

    const { url, token } = this.getVoxlitServer()
    if (!url || !token) throw new Error('Voxlit Server not configured')

    // Trim leading/trailing silence — eliminates "audio with brief speech +
    // long silence" pattern that causes whisper/gpt-4o-transcribe to hallucinate.
    const trimmed = this.trimSilence(pcm)
    if (trimmed.length < 16000 * 4 * 0.15) return ''   // < 150ms of speech, skip

    const wav = this.pcmToWav16(trimmed)
    const boundary = `voxlit${Date.now()}`
    const fieldPart = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n` +
      `Content-Type: audio/wav\r\n\r\n`
    )
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([fieldPart, wav, tail])

    const isHttps = url.startsWith('https://')
    const client = isHttps ? https : require('http') as typeof https

    console.log(`[Voxlit] POST ${url} body=${body.length}b`)

    return new Promise<string>((resolve, reject) => {
      const req = client.request(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
        timeout: 45_000,
      }, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const bodyText = Buffer.concat(chunks).toString('utf8')
          const status = res.statusCode ?? 0
          console.log(`[Voxlit] response ${status} ${bodyText.length}b`)

          if (status === 401) return reject(new Error('Voxlit Server: Invalid token'))
          if (status === 429) return reject(new Error('Voxlit Server: Rate limit — try again'))
          if (status === 502 || status === 503) return reject(new Error('Voxlit Server: Temporarily unavailable'))

          try {
            const json = JSON.parse(bodyText)
            if (status >= 400) return reject(new Error(`Voxlit Server: ${json.detail ?? 'HTTP ' + status}`))
            resolve((json.text ?? '').trim())
          } catch {
            reject(new Error(`Voxlit Server: HTTP ${status} — ${bodyText.slice(0, 100)}`))
          }
        })
      })
      req.on('error', (err) => {
        console.error('[Voxlit] request error:', err.message)
        reject(err)
      })
      req.on('timeout', () => {
        console.error('[Voxlit] timeout firing — destroying request')
        req.destroy()
        reject(new Error('Voxlit Server request timed out'))
      })
      req.on('socket', (sock) => {
        sock.on('connect', () => console.log('[Voxlit] socket connected'))
        sock.on('secureConnect', () => console.log('[Voxlit] TLS connected'))
      })
      req.write(body)
      req.end()
    })
  }

  private async transcribeCloud(pcm: Buffer): Promise<string> {
    // Skip cloud call entirely if audio is essentially silence
    if (this.audioRms(pcm) < 0.005) return ''
    const { openaiApiKey } = this.getCloudConfig()

    if (!openaiApiKey) throw new Error('No OpenAI API key — add it in Settings → Transcription')

    const apiKey = openaiApiKey
    const wav = this.pcmToWav16(pcm)   // int16 = half upload size vs float32
    const boundary = `voxlit${Date.now()}`
    const model = 'whisper-1'

    const fieldPart = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n${model}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\njson\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\nen\r\n` +
      `--${boundary}\r\n` +
      // Prompt primes the model with context — significantly reduces hallucinations
      // and improves punctuation/capitalization on cloud whisper-1.
      `Content-Disposition: form-data; name="prompt"\r\n\r\nDictation of spoken words.\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n` +
      `Content-Type: audio/wav\r\n\r\n`
    )
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
    const body = Buffer.concat([fieldPart, wav, tail])

    const hostname = 'api.openai.com'
    const path = '/v1/audio/transcriptions'
    const providerName = 'OpenAI'

    return new Promise<string>((resolve, reject) => {
      const req = https.request(
        {
          hostname,
          path,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
          timeout: 20_000,
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c: Buffer) => chunks.push(c))
          res.on('end', () => {
            const bodyText = Buffer.concat(chunks).toString('utf8')
            const status = res.statusCode ?? 0

            if (status === 401) return reject(new Error(`${providerName}: Invalid API key — check Settings → Transcription`))
            if (status === 429) return reject(new Error(`${providerName}: Rate limit exceeded — try again in a moment`))
            if (status >= 500) return reject(new Error(`${providerName}: Server error (${status}) — try again`))

            try {
              const json = JSON.parse(bodyText)
              if (json.error) return reject(new Error(`${providerName}: ${json.error.message}`))
              if (status >= 400) return reject(new Error(`${providerName}: HTTP ${status}`))
              resolve((json.text ?? '').trim())
            } catch {
              // Non-JSON response (e.g. HTML error page)
              reject(new Error(`${providerName}: HTTP ${status} — ${bodyText.slice(0, 120)}`))
            }
          })
        }
      )
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error(`${providerName} request timed out`)) })
      req.write(body)
      req.end()
    })
  }

  // Convert raw 16kHz mono float32 PCM to WAV (float32) — used for local whisper-cli
  private pcmToWav(pcm: Buffer): Buffer {
    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 32
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
    const blockAlign = (numChannels * bitsPerSample) / 8
    const dataSize = pcm.length

    const header = Buffer.alloc(44)
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + dataSize, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(3, 20)          // IEEE float format
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)

    return Buffer.concat([header, pcm])
  }

  // Convert float32 PCM to 16-bit int WAV — used for cloud upload.
  // Int16 is half the size of float32 with no accuracy loss (whisper was trained on int16).
  // 5s of audio: float32 = 320KB upload, int16 = 160KB — roughly halves API latency.
  private pcmToWav16(pcm: Buffer): Buffer {
    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 16
    const sampleCount = pcm.length / 4   // float32 = 4 bytes each
    const int16Data = Buffer.allocUnsafe(sampleCount * 2)

    for (let i = 0; i < sampleCount; i++) {
      // Clamp to [-1, 1] then scale to int16 range
      const f = Math.max(-1, Math.min(1, pcm.readFloatLE(i * 4)))
      int16Data.writeInt16LE(Math.round(f * 32767), i * 2)
    }

    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
    const blockAlign = (numChannels * bitsPerSample) / 8
    const dataSize = int16Data.length

    const header = Buffer.alloc(44)
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + dataSize, 4)
    header.write('WAVE', 8)
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16)
    header.writeUInt16LE(1, 20)          // PCM int format
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(byteRate, 28)
    header.writeUInt16LE(blockAlign, 32)
    header.writeUInt16LE(bitsPerSample, 34)
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)

    return Buffer.concat([header, int16Data])
  }
}
