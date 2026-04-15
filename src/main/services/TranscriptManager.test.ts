import { describe, expect, it, vi, beforeEach } from 'vitest'

// TranscriptManager reaches into `electron.app` inside transcribeLocal for
// resourcesPath / isPackaged. The test never runs that path (we stub
// transcribeByEngine), but the module-level import still needs to resolve.
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => '/tmp',
    dock: null,
  },
}))

import { TranscriptManager } from './TranscriptManager'

// Minimal SessionStore stub — addEntry is the only method TranscriptManager
// touches during emit.
function makeSessionStoreStub() {
  return {
    addEntry: vi.fn(() => ({ id: 'e1', sessionId: 's1' })),
  } as unknown as ConstructorParameters<typeof TranscriptManager>[0]
}

function makeTM(result: string, delayMs = 0) {
  const tm = new TranscriptManager(
    makeSessionStoreStub(),
    () => ({ openaiApiKey: '' }),
    () => 'ggml-base.en',
    () => ({ url: '', token: '' }),
  )
  // Stub the engine dispatch so we control timing + outcome.
  ;(tm as unknown as { transcribeByEngine: (p: Buffer, e: string, m: string) => Promise<string> }).transcribeByEngine =
    (_pcm: Buffer) => new Promise<string>((resolve) => {
      if (delayMs === 0) setImmediate(() => resolve(result))
      else setTimeout(() => resolve(result), delayMs)
    })
  return tm
}

function pcm(bytes = 1024): Buffer {
  return Buffer.alloc(bytes)
}

// Let microtasks + setImmediate queue fully drain. The tests rely on
// transcribeByEngine resolving asynchronously, so we need to yield control
// before asserting.
function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(() => setImmediate(resolve)))
}

describe('TranscriptManager — reentrancy + race safety (B3)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('does NOT emit "segment" when utterance is cancelled mid-transcribe', async () => {
    const tm = makeTM('hello')
    const segments: unknown[] = []
    const empties: unknown[] = []
    tm.on('segment', (s) => segments.push(s))
    tm.on('empty', () => empties.push(null))

    tm.enqueueChunk('u1', 0, pcm(), 'local', 'ggml-base.en', true)
    tm.finalizeUtterance('u1', null)
    // Cancel before the setImmediate resolves transcribeByEngine.
    tm.cancelUtterance('u1')

    await flush()
    await flush()

    expect(segments).toHaveLength(0)
    // cancelUtterance path cleans up without emitting — no 'empty' either.
    expect(empties).toHaveLength(0)
  })

  it('emits exactly one "segment" when back-to-back chunks both complete', async () => {
    const tm = makeTM('hello')
    const segments: unknown[] = []
    tm.on('segment', (s) => segments.push(s))

    // Two chunks that both resolve near-simultaneously after setImmediate.
    tm.enqueueChunk('u2', 0, pcm(), 'local', 'ggml-base.en', false)
    tm.enqueueChunk('u2', 1, pcm(), 'local', 'ggml-base.en', true)
    tm.finalizeUtterance('u2', null)

    await flush()
    await flush()
    await flush()

    expect(segments).toHaveLength(1)
  })
})
