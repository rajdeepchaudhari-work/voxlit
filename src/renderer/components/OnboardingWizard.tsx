import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ipc } from '../lib/ipc'
import { VoxlitMark } from './App'
import type { PermissionsState, SystemInfo, ModelDownloadProgress, VoxlitSettings } from '@shared/ipc-types'

// ─── Shared primitives ────────────────────────────────────────────────────────

function PrimaryButton({ onClick, children, disabled }: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '13px 0',
        background: disabled ? '#EDE8DE' : '#665DF5',
        border: '3px solid #0A0A0A',
        boxShadow: disabled ? 'none' : '4px 4px 0px #0A0A0A',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? '#999' : '#FFFFFF',
        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        transition: 'transform 0.1s, box-shadow 0.1s'
      }}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px #0A0A0A' } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = disabled ? 'none' : '4px 4px 0px #0A0A0A' }}
      onMouseDown={(e) => { if (!disabled) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '2px 2px 0px #0A0A0A' } }}
      onMouseUp={(e) => { if (!disabled) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px #0A0A0A' } }}
    >
      {children}
    </button>
  )
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '2px solid #0A0A0A',
        cursor: 'pointer',
        color: '#0A0A0A', fontSize: 10,
        fontFamily: 'var(--font-mono)', fontWeight: 700,
        padding: '7px 16px',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        transition: 'background 0.1s, color 0.1s'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#0A0A0A'; e.currentTarget.style.color = '#FFFFFF' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#0A0A0A' }}
    >
      {children}
    </button>
  )
}

function PermBadge({ status }: { status: 'granted' | 'denied' | 'not-determined' }) {
  const map = {
    granted:          { bg: '#00C853', border: '#00C853', color: '#FFFFFF', label: '✓ ACCESS GRANTED' },
    denied:           { bg: '#FF1744', border: '#FF1744', color: '#FFFFFF', label: '✕ ACCESS DENIED' },
    'not-determined': { bg: '#FFFFFF', border: '#0A0A0A', color: '#666',    label: '— NOT YET REQUESTED' },
  }
  const { bg, border, color, label } = map[status]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg, border: `2px solid ${border}`,
      boxShadow: '3px 3px 0px #0A0A0A',
      padding: '5px 12px', marginBottom: 20
    }}>
      <span style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em' }}>{label}</span>
    </div>
  )
}

// ─── Step: Welcome ────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <div style={{ border: '3px solid #0A0A0A', boxShadow: '6px 6px 0px #0A0A0A', padding: 12, background: '#FFFFFF', display: 'inline-block' }}>
        <VoxlitMark size={52} />
      </div>
      <h1 style={{
        marginTop: 24, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em',
        color: '#0A0A0A', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', lineHeight: 1
      }}>
        Welcome to<br/>Voxlit
      </h1>
      <p style={{
        marginTop: 14, fontSize: 12, color: '#666', lineHeight: 1.7,
        fontFamily: 'var(--font-mono)', maxWidth: 280
      }}>
        Your voice. Your machine. Your data.<br/>
        Press your hotkey to dictate into any app on your Mac.
      </p>
      <div style={{ marginTop: 32, width: '100%' }}>
        <PrimaryButton onClick={onNext}>Get started →</PrimaryButton>
      </div>
    </div>
  )
}

// ─── Step: Microphone ─────────────────────────────────────────────────────────

function MicrophoneStep({ perms, onRefresh, onNext, onSkip }: {
  perms: PermissionsState
  onRefresh: () => void
  onNext: () => void
  onSkip: () => void
}) {
  const status = perms.microphone

  const [polling, setPolling] = useState(false)

  async function handleGrant() {
    // Start polling BEFORE triggering the dialog — so we catch the response immediately
    setPolling(true)
    const interval = setInterval(async () => {
      const updated = await ipc.checkPermissions()
      onRefresh()
      if (updated.microphone !== 'not-determined') {
        clearInterval(interval)
        setPolling(false)
      }
    }, 800)
    setTimeout(() => { clearInterval(interval); setPolling(false) }, 30_000)
    await ipc.requestPermission('microphone')
  }

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--color-accent-muted)', border: '1px solid var(--color-border-active)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" stroke="#4F6BFF" strokeWidth="1.8"/>
          <path d="M5 10a7 7 0 0014 0" stroke="#4F6BFF" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M12 19v3M9 22h6" stroke="#4F6BFF" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 style={{ marginTop: 20, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Microphone access
      </h2>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, maxWidth: 280 }}>
        Voxlit needs your microphone to transcribe speech. Audio never leaves your Mac.
      </p>
      <div style={{ marginTop: 20 }}>
        <PermBadge status={status} />
      </div>
      {status === 'not-determined' && (
        <PrimaryButton onClick={handleGrant} disabled={polling}>
          {polling ? 'Waiting for permission…' : 'Grant microphone access'}
        </PrimaryButton>
      )}
      {status === 'denied' && (
        <>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
            Go to System Settings → Privacy & Security → Microphone and enable Voxlit.
          </p>
          <PrimaryButton onClick={() => ipc.requestPermission('microphone')}>Open System Settings</PrimaryButton>
        </>
      )}
      {status === 'granted' && (
        <PrimaryButton onClick={onNext}>Continue →</PrimaryButton>
      )}
      <div style={{ marginTop: 12 }}>
        <GhostButton onClick={onSkip}>Skip for now</GhostButton>
      </div>
    </div>
  )
}

// ─── Step: Accessibility ──────────────────────────────────────────────────────

function AccessibilityStep({ perms, onRefresh, onNext, onSkip }: {
  perms: PermissionsState
  onRefresh: () => void
  onNext: () => void
  onSkip: () => void
}) {
  const status = perms.accessibility

  const [polling, setPolling] = useState(false)

  async function requestAccess() {
    await ipc.requestPermission('accessibility')
    // Poll while System Settings is open — detect when user toggles it on
    setPolling(true)
    const interval = setInterval(async () => {
      onRefresh()
      const updated = await ipc.checkPermissions()
      if (updated.accessibility === 'granted') {
        clearInterval(interval)
        setPolling(false)
      }
    }, 1000)
    setTimeout(() => { clearInterval(interval); setPolling(false) }, 60_000)
  }

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'var(--color-amber-muted)', border: '1px solid rgba(240,164,41,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="2.5" stroke="#F0A429" strokeWidth="1.8"/>
          <path d="M5 9h14M12 9v6m-4 4l4-4 4 4" stroke="#F0A429" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 style={{ marginTop: 20, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Accessibility access
      </h2>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, maxWidth: 280 }}>
        Needed to type transcribed text into other apps. Without it, results still appear in history.
      </p>
      <div style={{ marginTop: 20 }}>
        <PermBadge status={status} />
      </div>
      {(status === 'not-determined' || status === 'denied') && (
        <>
          {polling && (
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
              Enable Voxlit in System Settings → Privacy & Security → Accessibility, then come back.
            </p>
          )}
          <PrimaryButton onClick={requestAccess} disabled={polling}>
            {polling ? 'Waiting — toggle Voxlit in Settings…' : 'Open Accessibility Settings'}
          </PrimaryButton>
        </>
      )}
      {status === 'granted' && (
        <PrimaryButton onClick={onNext}>Continue →</PrimaryButton>
      )}
      <div style={{ marginTop: 12 }}>
        <GhostButton onClick={onSkip}>Skip for now</GhostButton>
      </div>
    </div>
  )
}

// ─── Step: Automation ─────────────────────────────────────────────────────────

function AutomationStep({ perms, onRefresh, onNext, onSkip }: {
  perms: PermissionsState
  onRefresh: () => void
  onNext: () => void
  onSkip: () => void
}) {
  const status = perms.automation
  const [polling, setPolling] = useState(false)

  async function requestAccess() {
    setPolling(true)
    // Triggers macOS's TCC prompt the first time, otherwise opens System Settings → Automation
    await ipc.requestPermission('automation')
    const interval = setInterval(async () => {
      const updated = await ipc.checkPermissions()
      onRefresh()
      if (updated.automation === 'granted') {
        clearInterval(interval)
        setPolling(false)
      }
    }, 1000)
    setTimeout(() => { clearInterval(interval); setPolling(false) }, 60_000)
  }

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'rgba(102,93,245,0.12)', border: '1px solid rgba(102,93,245,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="14" rx="2" stroke="#665DF5" strokeWidth="1.8"/>
          <path d="M7 9h2M11 9h2M15 9h2M7 13h10" stroke="#665DF5" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 style={{ marginTop: 20, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Automation access
      </h2>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.65, maxWidth: 280 }}>
        Lets Voxlit paste transcribed text into other apps via System Events. macOS will ask you once.
      </p>
      <div style={{ marginTop: 20 }}>
        <PermBadge status={status} />
      </div>
      {(status === 'not-determined' || status === 'denied') && (
        <>
          {polling && (
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12, lineHeight: 1.6 }}>
              {status === 'denied'
                ? 'Enable Voxlit under "System Events" in Privacy & Security → Automation, then come back.'
                : 'Click Allow on the macOS prompt that just appeared.'}
            </p>
          )}
          <PrimaryButton onClick={requestAccess} disabled={polling}>
            {polling
              ? 'Waiting for permission…'
              : status === 'denied' ? 'Open Automation Settings' : 'Grant automation access'}
          </PrimaryButton>
        </>
      )}
      {status === 'granted' && (
        <PrimaryButton onClick={onNext}>Continue →</PrimaryButton>
      )}
      <div style={{ marginTop: 12 }}>
        <GhostButton onClick={onSkip}>Skip for now</GhostButton>
      </div>
    </div>
  )
}

// ─── Step: Engine ─────────────────────────────────────────────────────────────

function EngineStep({ onNext, onLocalSetup, onApiKey }: { onNext: () => void; onLocalSetup: () => void; onApiKey: () => void }) {
  const [engine, setEngine] = useState<'voxlit' | 'cloud' | 'local'>('voxlit')

  function chooseEngine(e: 'voxlit' | 'cloud' | 'local') {
    setEngine(e)
  }

  async function handleContinue() {
    await ipc.setSetting('transcriptionEngine', engine)
    if (engine === 'local') onLocalSetup()
    else if (engine === 'cloud') onApiKey()
    else onNext()   // voxlit — no setup required, jump to hotkey step
  }

  const options = [
    {
      value: 'voxlit' as const,
      title: 'Voxlit Server',
      badge: 'Recommended',
      sub: 'Fastest, most accurate. No setup.\nWhisper + AI cleanup for dictation-grade output.\nNo API key needed.',
    },
    {
      value: 'local' as const,
      title: 'Local (Offline)',
      badge: null,
      sub: 'Runs 100% on your Mac.\nNo internet required.\nNeeds ~500MB model download.',
    },
    {
      value: 'cloud' as const,
      title: 'OpenAI Whisper — BYOK',
      badge: null,
      sub: 'Bring your own OpenAI API key.\nDirect to Whisper, no post-processing.',
    },
  ]

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Choose transcription engine
      </h2>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        You can change this anytime in Settings.
      </p>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        {options.map(({ value, title, badge, sub }) => {
          const active = engine === value
          return (
            <button
              key={value}
              onClick={() => chooseEngine(value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                background: active ? 'var(--color-accent-muted)' : 'var(--color-surface-2)',
                border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                textAlign: 'left', transition: 'all 150ms ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--color-accent-text)' : 'var(--color-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {title}
                </span>
                {badge && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                    background: '#22D3EE', color: '#0A0A0F',
                    border: '1.5px solid #0A0A0A', borderRadius: 4, padding: '2px 7px',
                    boxShadow: '2px 2px 0px #0A0A0A'
                  }}>
                    {badge}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 5, fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.7, fontFamily: 'var(--font-sans)', whiteSpace: 'pre-line' }}>
                {sub}
              </div>
            </button>
          )
        })}
      </div>
      <div style={{ marginTop: 20, width: '100%' }}>
        <PrimaryButton onClick={handleContinue}>
          {engine === 'voxlit' ? 'Continue →' : engine === 'local' ? 'Continue — Download Model →' : 'Continue — Enter API Key →'}
        </PrimaryButton>
      </div>
    </div>
  )
}

// ─── Step: API Key ────────────────────────────────────────────────────────────

const OPENAI_KEY_STEPS = [
  'Go to platform.openai.com and sign in.',
  'Click your profile → "API keys" in the left sidebar.',
  'Click "Create new secret key", give it a name.',
  'Copy the key — it starts with sk-',
  'Paste it below.',
]

function ApiKeyStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ipc.getSettings().then((s) => { if (s.openaiApiKey) setApiKey(s.openaiApiKey) })
  }, [])

  async function handleContinue() {
    const key = apiKey.trim()
    if (key) {
      setSaving(true)
      await ipc.setSetting('openaiApiKey', key)
      setSaving(false)
    }
    onNext()
  }

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        OpenAI API key
      </h2>
      <p style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
        Your key is stored encrypted and never leaves your Mac.
      </p>

      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-…"
        autoFocus
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 8,
          background: 'var(--color-surface-2)',
          border: '1.5px solid var(--color-border)',
          color: 'var(--color-text-primary)', fontSize: 13,
          fontFamily: 'var(--font-mono)', outline: 'none',
          transition: 'border-color 150ms ease', boxSizing: 'border-box'
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      />

      <button
        onClick={() => setShowHelp((v) => !v)}
        style={{
          marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 12, color: 'var(--color-accent-text)', fontFamily: 'var(--font-sans)',
          display: 'flex', alignItems: 'center', gap: 4, padding: 0
        }}
      >
        <span style={{ transform: showHelp ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 150ms ease', fontSize: 10 }}>▶</span>
        {showHelp ? 'Hide instructions' : 'How do I get my API key?'}
      </button>

      {showHelp && (
        <div style={{
          marginTop: 10, width: '100%', textAlign: 'left',
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: '12px 14px'
        }}>
          {OPENAI_KEY_STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < OPENAI_KEY_STEPS.length - 1 ? 8 : 0 }}>
              <span style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%',
                background: 'var(--color-accent)', color: '#fff',
                fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, width: '100%' }}>
        <PrimaryButton onClick={handleContinue} disabled={saving}>
          {apiKey.trim() ? 'Save & Continue →' : 'Continue →'}
        </PrimaryButton>
      </div>
      <div style={{ marginTop: 10 }}>
        <GhostButton onClick={onSkip}>Skip for now</GhostButton>
      </div>
    </div>
  )
}

// ─── Step: Local Setup (system check + model download) ────────────────────────

const MODEL_OPTIONS = [
  { name: 'ggml-base.en',  label: 'Base EN',  size: '142 MB', desc: 'Fast, lower accuracy' },
  { name: 'ggml-small.en', label: 'Small EN', size: '466 MB', desc: 'Balanced — recommended' },
]

function LocalSetupStep({ onNext }: { onNext: () => void }) {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null)
  const [modelChoice, setModelChoice] = useState('ggml-small.en')
  const [modelExists, setModelExists] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<ModelDownloadProgress | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    ipc.getSystemInfo().then(setSysInfo)
    checkModel('ggml-small.en')
  }, [])

  async function checkModel(name: string) {
    const status = await ipc.getModelStatus(name)
    setModelExists(status.exists)
  }

  async function handleModelChange(name: string) {
    setModelChoice(name)
    setProgress(null)
    await checkModel(name)
  }

  async function downloadAndContinue() {
    if (modelExists) {
      await ipc.setSetting('localModel', modelChoice)
      onNext()
      return
    }

    setDownloading(true)
    unsubRef.current = ipc.onModelDownloadProgress((data) => {
      setProgress(data)
      if (data.done) {
        unsubRef.current?.()
        setDownloading(false)
        setModelExists(true)
        ipc.setSetting('localModel', modelChoice)
        onNext()
      }
      if (data.error) {
        unsubRef.current?.()
        setDownloading(false)
      }
    })
    ipc.downloadModel(modelChoice).catch(() => {
      unsubRef.current?.()
      setDownloading(false)
    })
  }

  useEffect(() => () => { unsubRef.current?.() }, [])

  const ramOk = !sysInfo || sysInfo.freeRamGb >= 1
  const diskOk = !sysInfo || sysInfo.freeDiskGb >= 1
  const pct = progress && progress.totalBytes > 0 ? Math.round(progress.bytesReceived / progress.totalBytes * 100) : 0

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="var(--color-accent-text)" strokeWidth="1.8"/>
          <path d="M8 21h8M12 17v4" stroke="var(--color-accent-text)" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        System check
      </h2>
      <p style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 20 }}>
        Local transcription runs a small AI model on your Mac.
      </p>

      {/* System info */}
      <div style={{ width: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        {sysInfo ? (
          <>
            <CheckRow label="Available RAM" value={`${sysInfo.freeRamGb.toFixed(1)} GB free`} ok={ramOk} warn={!ramOk ? 'May be slow with < 1 GB free' : undefined} />
            <CheckRow label="Free disk space" value={`${sysInfo.freeDiskGb.toFixed(1)} GB free`} ok={diskOk} warn={!diskOk ? 'Need at least 1 GB' : undefined} last />
          </>
        ) : (
          <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>Checking system…</div>
        )}
      </div>

      {/* Model picker */}
      <div style={{ width: '100%', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', textAlign: 'left', marginBottom: 8 }}>
          Choose model
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODEL_OPTIONS.map(({ name, label, size, desc }) => {
            const active = modelChoice === name
            return (
              <button
                key={name}
                onClick={() => handleModelChange(name)}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  background: active ? 'var(--color-accent-muted)' : 'var(--color-surface-2)',
                  border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  textAlign: 'left', transition: 'all 150ms ease'
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--color-accent-text)' : 'var(--color-text-primary)' }}>{label}</div>
                <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{size} · {desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Progress bar */}
      {downloading && progress && (
        <div style={{ width: '100%', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>
            <span>Downloading model…</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</span>
          </div>
          <div style={{ width: '100%', height: 4, background: 'var(--color-surface-3)', borderRadius: 2 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-accent)', borderRadius: 2, transition: 'width 200ms ease' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {(progress.bytesReceived / 1e6).toFixed(0)} / {(progress.totalBytes / 1e6).toFixed(0)} MB
          </div>
        </div>
      )}

      <div style={{ width: '100%' }}>
        <PrimaryButton onClick={downloadAndContinue} disabled={downloading || !sysInfo}>
          {modelExists ? 'Continue →' : downloading ? 'Downloading…' : 'Download & Continue'}
        </PrimaryButton>
      </div>
    </div>
  )
}

function CheckRow({ label, value, ok, warn, last }: { label: string; value: string; ok: boolean; warn?: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 14px',
      borderBottom: last ? 'none' : '1px solid var(--color-border)'
    }}>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-primary)' }}>{label}</div>
        {warn && <div style={{ fontSize: 10, color: 'var(--color-amber)', marginTop: 2 }}>{warn}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{value}</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--color-success)' : 'var(--color-amber)', boxShadow: ok ? '0 0 6px var(--color-success)' : 'none', flexShrink: 0 }} />
      </div>
    </div>
  )
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

const HOTKEY_OPTIONS = [
  { value: 'Fn',           label: 'Fn',           desc: 'Function key (default)' },
  { value: 'Option+Space', label: '⌥ Space',       desc: 'Option + Space' },
  { value: 'Ctrl+Space',   label: '⌃ Space',       desc: 'Control + Space' },
  { value: 'Cmd+Shift+D',  label: '⌘ ⇧ D',        desc: 'Command + Shift + D' },
  { value: 'Ctrl+Shift+F', label: '⌃ ⇧ F',        desc: 'Control + Shift + F' },
]

function DoneStep({ settings, onFinish }: { settings: VoxlitSettings | null; onFinish: () => void }) {
  const [hotkey, setHotkey] = useState(settings?.hotkeyPrimary ?? 'Fn')
  const [showRestartDialog, setShowRestartDialog] = useState(false)
  const [restarting, setRestarting] = useState(false)

  async function selectHotkey(value: string) {
    setHotkey(value)
    await ipc.setSetting('hotkeyPrimary', value)
  }

  async function handleLaunch() {
    await onFinish()
    setShowRestartDialog(true)
  }

  async function handleRestart() {
    setRestarting(true)
    await ipc.relaunch()
  }

  return (
    <div className="animate-onboarding-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0 }}>
      {showRestartDialog ? (
        <>
          <div style={{
            width: 52, height: 52, borderRadius: 14, marginBottom: 16,
            background: '#E8F5E9', border: '2px solid #0A0A0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ fontSize: 24 }}>🔄</span>
          </div>
          <h2 style={{
            fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em',
            color: '#0A0A0A', fontFamily: 'var(--font-mono)', textTransform: 'uppercase'
          }}>
            Restart Required
          </h2>
          <p style={{ marginTop: 10, fontSize: 12, color: '#555', lineHeight: 1.7, fontFamily: 'var(--font-mono)', maxWidth: 280, marginBottom: 24 }}>
            Voxlit needs to restart to apply your settings and connect the helper process.
          </p>
          <PrimaryButton onClick={handleRestart} disabled={restarting}>
            {restarting ? 'Restarting…' : 'Restart Voxlit →'}
          </PrimaryButton>
        </>
      ) : (
        <>
          <h2 style={{
            fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em',
            color: '#0A0A0A', fontFamily: 'var(--font-mono)', textTransform: 'uppercase'
          }}>
            Set Your Hotkey
          </h2>
          <p style={{ marginTop: 8, fontSize: 11, color: '#666', lineHeight: 1.6, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
            Hold this key to dictate into any app.<br/>You can change it anytime in Settings.
          </p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {HOTKEY_OPTIONS.map(({ value, label, desc }) => {
              const active = hotkey === value
              return (
                <button
                  key={value}
                  onClick={() => selectHotkey(value)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                    background: active ? '#665DF5' : '#FFFFFF',
                    border: `2px solid #0A0A0A`,
                    boxShadow: active ? '3px 3px 0px #0A0A0A' : '2px 2px 0px #0A0A0A',
                    transition: 'transform 0.1s, box-shadow 0.1s'
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#F5F0E8' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? '#665DF5' : '#FFFFFF' }}
                >
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: active ? '#FFFFFF' : '#0A0A0A', fontWeight: 700, letterSpacing: '0.04em' }}>
                    {desc}
                  </span>
                  <kbd style={{
                    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                    background: active ? 'rgba(255,255,255,0.2)' : '#FFEB3B',
                    border: `2px solid ${active ? 'rgba(255,255,255,0.4)' : '#0A0A0A'}`,
                    padding: '3px 10px',
                    color: active ? '#FFFFFF' : '#0A0A0A',
                    letterSpacing: '0.04em'
                  }}>
                    {label}
                  </kbd>
                </button>
              )
            })}
          </div>

          <PrimaryButton onClick={handleLaunch}>Done — Restart & Launch →</PrimaryButton>
        </>
      )}
    </div>
  )
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6,
          width: i === current ? 20 : 6,
          background: i <= current ? '#665DF5' : '#0A0A0A',
          border: '1.5px solid #0A0A0A',
          transition: 'all 0.15s linear'
        }} />
      ))}
    </div>
  )
}

// ─── Wizard root ──────────────────────────────────────────────────────────────

const STEPS = ['welcome', 'microphone', 'accessibility', 'automation', 'engine', 'apikey', 'localsetup', 'done'] as const
type Step = typeof STEPS[number]

export default function OnboardingWizard() {
  const onboardingStep = useAppStore((s) => s.onboardingStep)
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep)
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)

  const [perms, setPerms] = useState<PermissionsState>({ microphone: 'not-determined', accessibility: 'not-determined', automation: 'not-determined' })
  const [settings, setSettings] = useState<VoxlitSettings | null>(null)

  useEffect(() => {
    ipc.checkPermissions().then(setPerms)
    ipc.getSettings().then(setSettings)
  }, [])

  async function refreshPerms() {
    const p = await ipc.checkPermissions()
    setPerms(p)
  }

  const step = (onboardingStep ?? 'welcome') as Step
  const stepIndex = STEPS.indexOf(step)

  function goNext() {
    const next = STEPS[stepIndex + 1]
    if (next) setOnboardingStep(next)
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1]
    if (prev) setOnboardingStep(prev)
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFFDF7',
      WebkitAppRegion: 'drag',
      paddingTop: 44
    } as React.CSSProperties}>
      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '0 20px', zIndex: 10,
        WebkitAppRegion: 'drag',
        borderBottom: '2px solid #0A0A0A',
        background: '#FFFFFF'
      } as React.CSSProperties}>
        <ProgressDots total={STEPS.length} current={stepIndex} />
      </div>

      {/* Content card */}
      <div style={{
        width: '100%', maxWidth: 380,
        padding: '0 24px',
        WebkitAppRegion: 'no-drag'
      } as React.CSSProperties}>
        <div style={{
          background: '#FFFFFF',
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #0A0A0A',
          padding: '32px 28px 28px'
        }}>
          {step === 'welcome' && <WelcomeStep onNext={goNext} />}
          {step === 'microphone' && (
            <MicrophoneStep perms={perms} onRefresh={refreshPerms} onNext={goNext} onSkip={goNext} />
          )}
          {step === 'accessibility' && (
            <AccessibilityStep perms={perms} onRefresh={refreshPerms} onNext={goNext} onSkip={goNext} />
          )}
          {step === 'automation' && (
            <AutomationStep perms={perms} onRefresh={refreshPerms} onNext={goNext} onSkip={goNext} />
          )}
          {step === 'engine' && <EngineStep onNext={() => setOnboardingStep('done')} onApiKey={() => setOnboardingStep('apikey')} onLocalSetup={() => setOnboardingStep('localsetup')} />}
          {step === 'apikey' && <ApiKeyStep onNext={() => setOnboardingStep('done')} onSkip={() => setOnboardingStep('done')} />}
          {step === 'localsetup' && <LocalSetupStep onNext={() => setOnboardingStep('done')} />}
          {step === 'done' && <DoneStep settings={settings} onFinish={completeOnboarding} />}
        </div>

        {/* Back link */}
        {stepIndex > 0 && step !== 'done' && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <GhostButton onClick={goBack}>← Back</GhostButton>
          </div>
        )}
      </div>
    </div>
  )
}
