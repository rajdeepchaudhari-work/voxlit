import { EventEmitter } from 'events'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFile } from 'child_process'
import * as https from 'https'
import { app } from 'electron'
import type { TranscriptSegment } from '@shared/ipc-types'
import type { SessionStore } from './SessionStore'

/**
 * TranscriptManager receives VAD-gated PCM buffers, converts them to WAV,
 * invokes whisper-cli (local) or OpenAI API (cloud), and emits transcript segments.
 *
 * Events emitted:
 *   'segment' (segment: TranscriptSegment)
 */
interface QueueItem { pcm: Buffer; engine: 'local' | 'cloud'; modelName: string }

export class TranscriptManager extends EventEmitter {
  private queue: QueueItem[] = []
  private processing = false
  // Resolves when any in-flight warmup finishes — real transcription waits on this
  private warmupDone: Promise<void> = Promise.resolve()

  constructor(
    private readonly sessionStore: SessionStore,
    private readonly getCloudConfig: () => { openaiApiKey?: string },
    private readonly getDefaultModel: () => string = () => 'ggml-small.en'
  ) {
    super()
    this.warmup()
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
        execFile(binaryPath, ['-m', modelPath, '-f', wavPath, '--no-prints', '-t', threads], { timeout: 30_000 }, () => {
          try { unlinkSync(wavPath) } catch (_) {}
          console.log('[TranscriptManager] Whisper warmed up')
          resolve()
        })
      })
    } catch (_) {}
  }

  enqueue(pcmBuffer: Buffer, engine: 'local' | 'cloud' = 'local', modelName = 'ggml-base.en') {
    this.queue.push({ pcm: pcmBuffer, engine, modelName })
    if (!this.processing) this.processNext()
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const { pcm, engine, modelName } = this.queue.shift()!
    const startMs = Date.now()

    try {
      const text =
        engine === 'local'
          ? await this.transcribeLocal(pcm, modelName)
          : await this.transcribeCloud(pcm)

      if (text.trim() && !this.isHallucination(text)) {
        const durationMs = Date.now() - startMs
        const entry = this.sessionStore.addEntry({ rawText: text, durationMs, engine })
        const segment: TranscriptSegment = {
          text,
          sessionId: entry.sessionId,
          entryId: entry.id,
          durationMs,
          engine
        }
        this.emit('segment', segment)
      } else {
        this.emit('empty')
      }
    } catch (err) {
      console.error('Transcription error:', err)
      this.emit('empty')  // hide pill even on error
    } finally {
      this.processNext()
    }
  }

  /**
   * Whisper hallucinates common phrases when given silence or low-energy audio.
   * Filter out known phantom outputs before emitting a segment.
   */
  private isHallucination(text: string): boolean {
    const t = text.trim().toLowerCase().replace(/[.,!?]/g, '')
    const PHANTOMS = new Set([
      'thank you', 'thanks', 'bye', 'goodbye', 'bye bye',
      'you', 'the', 'a', 'um', 'uh', 'hmm', 'hm',
      'thank you for watching', 'thanks for watching',
      'please subscribe', 'like and subscribe',
      'subtitles by', 'transcribed by',
      'you you', 'the the',
      'okay', 'ok', 'yes', 'no',
    ])
    if (PHANTOMS.has(t)) return true
    // Single character or empty after stripping punctuation
    if (t.length <= 1) return true
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
        '--no-timestamps',  // skip timestamp generation — saves ~15% processing time
        '--language', 'en',
        '-t', threads,
        ...(isLarge
          ? ['--beam-size', '5']   // large model benefits from beam search
          : ['--beam-size', '1', '--best-of', '1']), // greedy, no candidates — fastest path
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

  private async transcribeCloud(pcm: Buffer): Promise<string> {
    // Skip cloud call entirely if audio is essentially silence
    if (this.audioRms(pcm) < 0.005) return ''
    const { openaiApiKey } = this.getCloudConfig()

    if (!openaiApiKey) throw new Error('No OpenAI API key — add it in Settings → Transcription')

    const apiKey = openaiApiKey
    const wav = this.pcmToWav(pcm)
    const boundary = `voxlit${Date.now()}`
    const model = 'whisper-1'

    const fieldPart = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\n${model}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\njson\r\n` +
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
            try {
              const json = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              if (json.error) return reject(new Error(`${providerName}: ${json.error.message}`))
              resolve((json.text ?? '').trim())
            } catch (e) {
              reject(e)
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

  // Convert raw 16kHz mono float32 PCM to WAV format
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
    header.writeUInt32LE(16, 16)         // PCM chunk size
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
}
