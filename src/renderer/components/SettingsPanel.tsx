import { useEffect, useRef, useState } from 'react'
import { ipc } from '../lib/ipc'
import type { VoxlitSettings, ModelDownloadProgress } from '@shared/ipc-types'

const DOWNLOADABLE_MODELS = [
  { name: 'ggml-base.en',  label: 'Base EN',  size: '142 MB' },
  { name: 'ggml-small.en', label: 'Small EN', size: '466 MB' },
]

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '2px solid #0A0A0A', gap: 16,
      background: '#FFFFFF'
    }}>
      <div>
        <div style={{ fontSize: 12, color: '#0A0A0A', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: '#666', marginTop: 3, fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function SectionHeader({ label, index }: { label: string; index: string }) {
  return (
    <div style={{
      padding: '12px 20px 10px',
      borderBottom: '2px solid #0A0A0A',
      background: '#0A0A0A',
      display: 'flex', alignItems: 'center', gap: 10
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#666', letterSpacing: '0.1em' }}>{index}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFFFFF' }}>
        {label}
      </span>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24,
        background: value ? '#665DF5' : '#FFFFFF',
        border: '2px solid #0A0A0A',
        boxShadow: value ? '3px 3px 0px #0A0A0A' : '2px 2px 0px #0A0A0A',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.1s, box-shadow 0.1s'
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: value ? 22 : 2,
        width: 16, height: 16,
        background: value ? '#FFFFFF' : '#0A0A0A',
        transition: 'left 0.1s',
      }} />
    </div>
  )
}

function Select({ value, onChange, options }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: '#FFFFFF',
        border: '2px solid #0A0A0A',
        boxShadow: '3px 3px 0px #0A0A0A',
        color: '#0A0A0A', fontSize: 11, padding: '6px 10px', cursor: 'pointer',
        outline: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700,
        letterSpacing: '0.04em',
        WebkitAppearance: 'none', appearance: 'none',
        paddingRight: 28
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Slider({ value, onChange, min = 0, max = 1, step = 0.05 }: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number
}) {
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: 120, accentColor: '#665DF5', cursor: 'pointer' }}
    />
  )
}

function CheckForUpdatesRow() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'uptodate'>('idle')
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    ipc.getAppVersion().then(setVersion)
  }, [])

  async function handleCheck() {
    setStatus('checking')
    await ipc.checkForUpdates()
    // Give the updater 4s to fire UPDATE_AVAILABLE if there's a new version
    setTimeout(() => setStatus('uptodate'), 4000)
  }

  return (
    <Row label="Updates" hint={version ? `Current version: ${version}` : 'Checking version…'}>
      <button
        onClick={handleCheck}
        disabled={status === 'checking'}
        style={{
          padding: '5px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          background: status === 'uptodate' ? '#FFFFFF' : '#0A0A0A',
          color: status === 'uptodate' ? '#666' : '#FFFFFF',
          border: '2px solid #0A0A0A',
          boxShadow: status !== 'checking' ? '2px 2px 0px #0A0A0A' : 'none',
          cursor: status === 'checking' ? 'default' : 'pointer',
          opacity: status === 'checking' ? 0.6 : 1,
          textTransform: 'uppercase',
        }}
      >
        {status === 'checking' ? 'CHECKING…' : status === 'uptodate' ? 'UP TO DATE' : 'CHECK NOW'}
      </button>
    </Row>
  )
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<VoxlitSettings | null>(null)
  const [openaiKeyInput, setOpenaiKeyInput] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [modelStatuses, setModelStatuses] = useState<Record<string, boolean>>({})
  const [downloading, setDownloading] = useState<string | null>(null)
  const [dlProgress, setDlProgress] = useState<ModelDownloadProgress | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    ipc.getSettings().then((s) => {
      setSettings(s)
      if (s.openaiApiKey) setOpenaiKeyInput(s.openaiApiKey)
    })
    Promise.all(DOWNLOADABLE_MODELS.map(m => ipc.getModelStatus(m.name))).then(results => {
      const map: Record<string, boolean> = {}
      results.forEach(r => { map[r.name] = r.exists })
      setModelStatuses(map)
    })
  }, [])

  async function set<K extends keyof VoxlitSettings>(key: K, value: VoxlitSettings[K]) {
    await ipc.setSetting(key, value)
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  async function saveCloudKey() {
    setSavingKey(true)
    await ipc.setSetting('openaiApiKey', openaiKeyInput.trim() || undefined as unknown as string)
    setSavingKey(false)
  }

  async function downloadModel(name: string) {
    // Clean up any previous download subscription before starting a new one
    unsubRef.current?.()
    unsubRef.current = null
    setDownloading(name)
    setDlProgress(null)
    unsubRef.current = ipc.onModelDownloadProgress((data) => {
      if (data.model !== name) return
      setDlProgress(data)
      if (data.done) {
        unsubRef.current?.()
        unsubRef.current = null
        setDownloading(null)
        if (!data.error) setModelStatuses(prev => ({ ...prev, [name]: true }))
      }
    })
    ipc.downloadModel(name).catch(() => {
      unsubRef.current?.()
      unsubRef.current = null
      setDownloading(null)
    })
  }

  useEffect(() => () => { unsubRef.current?.() }, [])

  if (!settings) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFDF7' }}>
        <span style={{ color: '#666', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>LOADING…</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#FFFDF7' }}>

      {/* Page header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '3px solid #0A0A0A', background: '#FFFFFF' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          Settings
        </h2>
      </div>

      <SectionHeader label="Dictation" index="01" />

      <Row label="Hotkey" hint="Global shortcut to start / stop recording">
        <kbd style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
          background: '#665DF5', border: '2px solid #0A0A0A',
          boxShadow: '3px 3px 0px #0A0A0A',
          padding: '4px 10px', color: '#FFFFFF', letterSpacing: '0.04em'
        }}>
          {settings.hotkeyPrimary}
        </kbd>
      </Row>

      <Row label="Hotkey mode" hint="Push-to-talk: hold. Toggle: press once to start, again to stop.">
        <Select
          value={settings.hotkeyMode}
          onChange={(v) => set('hotkeyMode', v as VoxlitSettings['hotkeyMode'])}
          options={[
            { value: 'push-to-talk', label: 'Push to talk' },
            { value: 'toggle', label: 'Toggle' }
          ]}
        />
      </Row>

      <Row label="VAD sensitivity" hint="How aggressively silence is detected between phrases">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Slider value={settings.vadSensitivity} onChange={(v) => set('vadSensitivity', v)} />
          <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 32 }}>
            {Math.round(settings.vadSensitivity * 100)}%
          </span>
        </div>
      </Row>

      <Row label="Filler word filter" hint="Remove um, uh, like from output">
        <Toggle value={settings.fillerWordFilter} onChange={(v) => set('fillerWordFilter', v)} />
      </Row>

      <SectionHeader label="Transcription" index="02" />

      <Row label="Engine" hint="Whisper AI Cloud is recommended — faster and more accurate. Local runs fully offline.">
        <Select
          value={settings.transcriptionEngine}
          onChange={(v) => set('transcriptionEngine', v as VoxlitSettings['transcriptionEngine'])}
          options={[
            { value: 'cloud', label: 'Whisper AI — Cloud ★' },
            { value: 'local', label: 'Local (offline)' }
          ]}
        />
      </Row>

      {settings.transcriptionEngine === 'local' && (
        <Row label="Model" hint="Larger models are more accurate but slower">
          <Select
            value={settings.localModel}
            onChange={(v) => set('localModel', v)}
            options={[
              { value: 'ggml-base.en',  label: 'Base EN — fast' },
              { value: 'ggml-small.en', label: 'Small EN — balanced' },
              { value: 'ggml-medium.en', label: 'Medium EN — accurate' },
              { value: 'ggml-large-v3', label: 'Large v3 — needs 16GB RAM' }
            ]}
          />
        </Row>
      )}

      {settings.transcriptionEngine === 'local' && (
        <div style={{ borderBottom: '2px solid #0A0A0A', background: '#FFFFFF' }}>
          <div style={{ padding: '12px 20px 4px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666' }}>
              Downloaded Models
            </span>
          </div>
          {DOWNLOADABLE_MODELS.map(({ name, label, size }) => {
            const exists = modelStatuses[name]
            const isDl = downloading === name
            const pct = isDl && dlProgress && dlProgress.totalBytes > 0
              ? Math.round(dlProgress.bytesReceived / dlProgress.totalBytes * 100) : 0

            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderTop: '1px solid rgba(10,10,10,0.1)' }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: 'var(--font-mono)' }}>{label}</span>
                  <span style={{ fontSize: 10, color: '#666', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>{size}</span>
                </div>
                {exists ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#00C853', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', border: '2px solid #00C853', padding: '2px 6px' }}>✓ READY</span>
                ) : isDl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 4, background: '#EDE8DE', border: '1.5px solid #0A0A0A' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#665DF5', transition: 'width 200ms linear' }} />
                    </div>
                    <span style={{ fontSize: 9, color: '#0A0A0A', fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 28 }}>{pct}%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => downloadModel(name)}
                    disabled={!!downloading}
                    style={{
                      background: '#0A0A0A', border: '2px solid #0A0A0A',
                      boxShadow: '2px 2px 0px #665DF5',
                      color: '#FFFFFF', fontSize: 9, fontWeight: 700,
                      padding: '4px 10px', cursor: downloading ? 'not-allowed' : 'pointer',
                      opacity: downloading ? 0.4 : 1,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      transition: 'transform 0.1s, box-shadow 0.1s'
                    }}
                    onMouseEnter={(e) => { if (!downloading) { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '3px 3px 0px #665DF5' } }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '2px 2px 0px #665DF5' }}
                  >
                    Download
                  </button>
                )}
              </div>
            )
          })}
          <div style={{ height: 8 }} />
        </div>
      )}

      {settings.transcriptionEngine === 'cloud' && (
        <Row
          label="OpenAI API key"
          hint="platform.openai.com — pay-as-you-go"
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type={keyVisible ? 'text' : 'password'}
              value={openaiKeyInput}
              onChange={(e) => setOpenaiKeyInput(e.target.value)}
              placeholder="sk-…"
              style={{
                background: '#FFFFFF', border: '2px solid #0A0A0A',
                boxShadow: '3px 3px 0px #0A0A0A',
                color: '#0A0A0A', fontSize: 11, padding: '6px 10px', width: 190,
                outline: 'none', fontFamily: 'var(--font-mono)'
              }}
              onFocus={(e) => { e.currentTarget.style.background = '#FFFDE7' }}
              onBlur={(e) => { e.currentTarget.style.background = '#FFFFFF' }}
            />
            <button
              onClick={() => setKeyVisible((v) => !v)}
              style={{ background: 'transparent', border: '2px solid #0A0A0A', cursor: 'pointer', color: '#0A0A0A', padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700 }}
            >
              {keyVisible ? 'HIDE' : 'SHOW'}
            </button>
            <button
              onClick={saveCloudKey}
              disabled={savingKey}
              style={{
                background: '#665DF5', border: '2px solid #0A0A0A',
                boxShadow: '3px 3px 0px #0A0A0A',
                color: '#FFFFFF', fontSize: 10, padding: '5px 10px', cursor: 'pointer',
                fontWeight: 700, opacity: savingKey ? 0.5 : 1,
                fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'transform 0.1s, box-shadow 0.1s'
              }}
              onMouseEnter={(e) => { if (!savingKey) { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '4px 4px 0px #0A0A0A' } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0px #0A0A0A' }}
            >
              {savingKey ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Row>
      )}

      <SectionHeader label="App" index="03" />

      <Row label="Launch at login" hint="Start Voxlit when you log in to macOS">
        <Toggle value={settings.launchAtLogin} onChange={(v) => set('launchAtLogin', v)} />
      </Row>

      <Row label="Menubar only" hint="Hide from Dock — only accessible from menu bar">
        <Toggle value={settings.menubarOnly} onChange={(v) => set('menubarOnly', v)} />
      </Row>

      <CheckForUpdatesRow />

      <div style={{ height: 48 }} />
    </div>
  )
}
