import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'
import type { VoxlitSettings } from '@shared/ipc-types'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '1px solid #1A1A26', gap: 16
    }}>
      <div>
        <div style={{ fontSize: 13, color: '#F0EEFF', fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: '#5A5578', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '20px 20px 8px',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: '#3A3458'
    }}>
      {label}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
        background: value ? '#7C3AED' : '#2E2E4A',
        position: 'relative', transition: 'background 150ms ease',
        boxShadow: value ? '0 0 12px rgba(124,58,237,0.4)' : 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: '#F0EEFF',
        transition: 'left 150ms cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
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
        background: '#1A1A26', border: '1px solid #2E2E4A', borderRadius: 6,
        color: '#F0EEFF', fontSize: 12, padding: '5px 10px', cursor: 'pointer',
        outline: 'none', fontFamily: 'inherit',
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
      style={{ width: 120, accentColor: '#7C3AED', cursor: 'pointer' }}
    />
  )
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<VoxlitSettings | null>(null)
  const [groqKeyInput, setGroqKeyInput] = useState('')
  const [openaiKeyInput, setOpenaiKeyInput] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [savingKey, setSavingKey] = useState(false)

  useEffect(() => {
    ipc.getSettings().then((s) => {
      setSettings(s)
      if (s.groqApiKey) setGroqKeyInput(s.groqApiKey)
      if (s.openaiApiKey) setOpenaiKeyInput(s.openaiApiKey)
    })
  }, [])

  async function set<K extends keyof VoxlitSettings>(key: K, value: VoxlitSettings[K]) {
    await ipc.setSetting(key, value)
    setSettings((prev) => prev ? { ...prev, [key]: value } : prev)
  }

  async function saveCloudKey() {
    setSavingKey(true)
    if (settings?.cloudProvider === 'openai') {
      await ipc.setSetting('openaiApiKey', openaiKeyInput.trim() || undefined as unknown as string)
    } else {
      await ipc.setSetting('groqApiKey', groqKeyInput.trim() || undefined as unknown as string)
    }
    setSavingKey(false)
  }

  if (!settings) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#5A5578', fontSize: 13 }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>

      <SectionHeader label="Dictation" />

      <Row label="Hotkey" hint="Global shortcut to start/stop recording">
        <kbd style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
          background: '#1A1A26', border: '1px solid #2E2E4A',
          borderRadius: 6, padding: '4px 10px', color: '#A78BFA'
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
          <Slider
            value={settings.vadSensitivity}
            onChange={(v) => set('vadSensitivity', v)}
          />
          <span style={{ fontSize: 11, color: '#5A5578', fontFamily: "'JetBrains Mono', monospace", minWidth: 28 }}>
            {Math.round(settings.vadSensitivity * 100)}%
          </span>
        </div>
      </Row>

      <Row label="Filler word filter" hint="Remove um, uh, like from output">
        <Toggle value={settings.fillerWordFilter} onChange={(v) => set('fillerWordFilter', v)} />
      </Row>

      <SectionHeader label="Transcription" />

      <Row label="Engine" hint="Local runs offline on your Mac. Cloud uses Groq (free, faster, more accurate).">
        <Select
          value={settings.transcriptionEngine}
          onChange={(v) => set('transcriptionEngine', v as VoxlitSettings['transcriptionEngine'])}
          options={[
            { value: 'local', label: 'Local (offline)' },
            { value: 'cloud', label: 'Cloud — Groq' }
          ]}
        />
      </Row>

      {settings.transcriptionEngine === 'local' && (
        <Row label="Model" hint="Larger models are more accurate but slower">
          <Select
            value={settings.localModel}
            onChange={(v) => set('localModel', v)}
            options={[
              { value: 'ggml-base.en', label: 'Base EN — fast' },
              { value: 'ggml-small.en', label: 'Small EN — balanced' },
              { value: 'ggml-medium.en', label: 'Medium EN — accurate' },
              { value: 'ggml-large-v3', label: 'Large v3 — needs 16GB RAM' }
            ]}
          />
        </Row>
      )}

      {settings.transcriptionEngine === 'cloud' && (
        <Row label="Provider" hint="Groq is free. OpenAI whisper-1 is paid ($0.006/min).">
          <Select
            value={settings.cloudProvider ?? 'groq'}
            onChange={(v) => set('cloudProvider', v as VoxlitSettings['cloudProvider'])}
            options={[
              { value: 'groq', label: 'Groq — free' },
              { value: 'openai', label: 'OpenAI whisper-1' }
            ]}
          />
        </Row>
      )}

      {settings.transcriptionEngine === 'cloud' && (
        <Row
          label={settings.cloudProvider === 'openai' ? 'OpenAI API key' : 'Groq API key'}
          hint={settings.cloudProvider === 'openai'
            ? 'platform.openai.com — paid, $0.006/min'
            : 'console.groq.com — free, no credit card needed'}
        >
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type={keyVisible ? 'text' : 'password'}
              value={settings.cloudProvider === 'openai' ? openaiKeyInput : groqKeyInput}
              onChange={(e) => settings.cloudProvider === 'openai'
                ? setOpenaiKeyInput(e.target.value)
                : setGroqKeyInput(e.target.value)
              }
              placeholder={settings.cloudProvider === 'openai' ? 'sk-…' : 'gsk_…'}
              style={{
                background: '#1A1A26', border: '1px solid #2E2E4A', borderRadius: 6,
                color: '#F0EEFF', fontSize: 12, padding: '5px 10px', width: 200,
                outline: 'none', fontFamily: "'JetBrains Mono', monospace"
              }}
            />
            <button
              onClick={() => setKeyVisible((v) => !v)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#5A5578', padding: 4 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                {keyVisible
                  ? <><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/></>
                  : <><path d="M2 2l12 12M7 3.5C7.6 3.5 8 3.5 8 3.5c4 0 7 4.5 7 4.5s-.8 1.3-2 2.5M1 8s1.5-2.5 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.5 9.5A2 2 0 016.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>
                }
              </svg>
            </button>
            <button
              onClick={saveCloudKey}
              disabled={savingKey}
              style={{
                background: '#7C3AED', border: 'none', borderRadius: 6,
                color: '#F0EEFF', fontSize: 11, padding: '5px 10px', cursor: 'pointer',
                fontWeight: 500, opacity: savingKey ? 0.5 : 1
              }}
            >
              {savingKey ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Row>
      )}

      <SectionHeader label="App" />

      <Row label="Launch at login" hint="Start Voxlit when you log in to macOS">
        <Toggle value={settings.launchAtLogin} onChange={(v) => set('launchAtLogin', v)} />
      </Row>

      <Row label="Menubar only" hint="Hide from Dock — only accessible from menu bar">
        <Toggle value={settings.menubarOnly} onChange={(v) => set('menubarOnly', v)} />
      </Row>

      <div style={{ height: 40 }} />
    </div>
  )
}
