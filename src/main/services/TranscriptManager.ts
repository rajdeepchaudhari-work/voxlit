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
    private readonly getCloudConfig: () => { provider: string; groqApiKey?: string; openaiApiKey?: string },
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

      if (text.trim()) {
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

  private async transcribeLocal(pcm: Buffer, modelName = 'ggml-base.en'): Promise<string> {
    // Wait for any in-flight warmup — two whisper-cli processes using Metal simultaneously
    // causes GGML_ASSERT([rsets->data count] == 0) crash on the second process.
    await this.warmupDone

    const wavPath = join(tmpdir(), `voxlit_${Date.now()}.wav`)

    try {
      writeFileSync(wavPath, this.pcmToWav(pcm))

      const binaryName = process.arch === 'arm64' ? 'whisper-cli-arm64' : 'whisper-cli-x64'
      const binaryPath = app.isPackaged
        ? join(process.resourcesPath, 'binaries', binaryName)
        : join(app.getAppPath(), 'resources/binaries', binaryName)

      const modelFile = modelName + '.bin'
      const modelPath = app.isPackaged
        ? join(process.resourcesPath, 'models', modelFile)
        : join(app.getAppPath(), 'resources/models', modelFile)

      const isLarge = modelName.includes('large')
      const threads = String(Math.min(8, require('os').cpus().length))
      const args = [
        '-m', modelPath,
        '-f', wavPath,
        '--no-prints',
        '--language', 'en',
        '-t', threads,
        ...(isLarge
          ? ['--beam-size', '5']   // large model benefits from beam search
          : ['--beam-size', '1']), // small/base: greedy is faster with negligible accuracy loss
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

  private async transcribeCloud(pcm: Buffer): Promise<string> {
    const { provider, groqApiKey, openaiApiKey } = this.getCloudConfig()

    const isOpenAI = provider === 'openai'
    const apiKey = isOpenAI ? openaiApiKey : groqApiKey
    if (!apiKey) throw new Error(
      isOpenAI
        ? 'No OpenAI API key — add it in Settings → Transcription'
        : 'No Groq API key — add it in Settings → Transcription'
    )

    const wav = this.pcmToWav(pcm)
    const boundary = `voxlit${Date.now()}`
    const model = isOpenAI ? 'whisper-1' : 'whisper-large-v3-turbo'

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

    const hostname = isOpenAI ? 'api.openai.com' : 'api.groq.com'
    const path = isOpenAI ? '/v1/audio/transcriptions' : '/openai/v1/audio/transcriptions'
    const providerName = isOpenAI ? 'OpenAI' : 'Groq'

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
