import { describe, expect, it } from 'vitest'
import { UtteranceChunker, type UtteranceChunk, MIN_CHUNK_MS, SILENCE_MS } from './UtteranceChunker'

// 16kHz mono float32. 1 sample = 4 bytes. 1 second = 16000 samples = 64000 bytes.
const SAMPLE_RATE = 16000

function pcmSilence(durationMs: number): Buffer {
  const samples = Math.floor((SAMPLE_RATE * durationMs) / 1000)
  return Buffer.alloc(samples * 4) // zeros → RMS 0
}

function pcmSpeech(durationMs: number, amplitude = 0.2): Buffer {
  const samples = Math.floor((SAMPLE_RATE * durationMs) / 1000)
  const buf = Buffer.alloc(samples * 4)
  for (let i = 0; i < samples; i++) {
    // Alternating +/- amplitude → stable RMS = amplitude. Well above 0.01 threshold.
    const v = i % 2 === 0 ? amplitude : -amplitude
    buf.writeFloatLE(v, i * 4)
  }
  return buf
}

function collectChunks(c: UtteranceChunker): UtteranceChunk[] {
  const out: UtteranceChunk[] = []
  c.on('chunk', (ch: UtteranceChunk) => out.push(ch))
  return out
}

describe('UtteranceChunker', () => {
  it('emits exactly one final chunk for a short utterance (below MIN_CHUNK_MS)', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'local', true)
    c.pushPcm(pcmSpeech(500))
    c.end()

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.isFinal).toBe(true)
    expect(chunks[0]!.seq).toBe(0)
  })

  it('splits at silence gate once chunk exceeds MIN_CHUNK_MS', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'local', true)
    // 2s speech → already past MIN_CHUNK_MS (1.5s)
    c.pushPcm(pcmSpeech(2000))
    // 700ms silence → past SILENCE_MS (600ms), triggers gate
    c.pushPcm(pcmSilence(700))
    // 1s more speech
    c.pushPcm(pcmSpeech(1000))
    c.end()

    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[chunks.length - 1]!.isFinal).toBe(true)
    // All intermediate chunks (all but last) should be non-final
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i]!.isFinal).toBe(false)
    }
    // Sequence numbers are monotonic
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]!.seq).toBe(chunks[i - 1]!.seq + 1)
    }
  })

  it('head-guard: does NOT split when total buffered audio < MIN_CHUNK_MS', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'local', true)
    // 300ms speech + 500ms silence → buffer = 800ms, below MIN_CHUNK_MS (1500ms).
    // Even though silence run exceeds SILENCE_MS ratio, shouldCut requires
    // chunkMs >= MIN_CHUNK_MS which isn't met.
    c.pushPcm(pcmSpeech(300))
    c.pushPcm(pcmSilence(500))
    c.pushPcm(pcmSpeech(300))
    c.end()

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.isFinal).toBe(true)
  })

  it('pass-through mode: emits exactly one chunk regardless of silence gates', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    // chunkedEnabled=false → pass-through
    c.begin('u1', 'local', false)
    c.pushPcm(pcmSpeech(2500))
    c.pushPcm(pcmSilence(1000))
    c.pushPcm(pcmSpeech(2500))
    c.end()

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.isFinal).toBe(true)
  })

  it('pass-through mode: voxlit engine never chunks even when flag is on (server-side post-processing wants full context)', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'voxlit', true)
    // Long utterance with clear silence gates — would produce multiple chunks
    // in local mode. Voxlit must still collapse to one.
    c.pushPcm(pcmSpeech(3000))
    c.pushPcm(pcmSilence(800))
    c.pushPcm(pcmSpeech(3000))
    c.pushPcm(pcmSilence(800))
    c.pushPcm(pcmSpeech(3000))
    c.end()

    expect(chunks).toHaveLength(1)
    expect(chunks[0]!.isFinal).toBe(true)
  })

  it('pass-through mode: non-local engine never chunks even when flag is on', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'cloud', true)
    c.pushPcm(pcmSpeech(2000))
    c.pushPcm(pcmSilence(700))
    c.pushPcm(pcmSpeech(2000))
    c.end()

    expect(chunks).toHaveLength(1)
  })

  it('end() returns the full concatenated raw PCM', () => {
    const c = new UtteranceChunker()
    collectChunks(c)
    c.begin('u1', 'local', true)
    const pcm1 = pcmSpeech(500)
    const pcm2 = pcmSpeech(500)
    c.pushPcm(pcm1)
    c.pushPcm(pcm2)
    const raw = c.end()

    expect(raw.length).toBe(pcm1.length + pcm2.length)
  })

  it('abort() produces no chunk emissions', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'local', true)
    c.pushPcm(pcmSpeech(2000))
    c.abort()

    expect(chunks).toHaveLength(0)
  })

  it('pushPcm after end() is ignored (no crash, no emit)', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'local', true)
    c.pushPcm(pcmSpeech(500))
    c.end()
    c.pushPcm(pcmSpeech(500))

    // Only the final emit from end()
    expect(chunks).toHaveLength(1)
  })

  it('silence threshold sanity: silent-only input emits one (empty-ish) final chunk', () => {
    const c = new UtteranceChunker()
    const chunks = collectChunks(c)
    c.begin('u1', 'local', true)
    c.pushPcm(pcmSilence(SILENCE_MS + MIN_CHUNK_MS + 500))
    c.end()

    // All-silent never exceeds MIN_CHUNK_MS of *speech*, but samplesInChunk
    // counts all bytes. It will hit the gate once past MIN_CHUNK_MS. That's
    // fine — silent chunks transcribe to empty strings downstream.
    expect(chunks.length).toBeGreaterThanOrEqual(1)
    expect(chunks[chunks.length - 1]!.isFinal).toBe(true)
  })
})
