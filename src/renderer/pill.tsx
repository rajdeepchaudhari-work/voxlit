import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useAppStore } from './store/useAppStore'
import StatusPill from './components/StatusPill'
import './styles/pill.css'

function PillApp() {
  const initIPC = useAppStore((s) => s.initIPC)

  useEffect(() => {
    const cleanup = initIPC()
    return cleanup
  }, [initIPC])

  return <StatusPill />
}

const root = createRoot(document.getElementById('pill-root')!)
root.render(
  <StrictMode>
    <PillApp />
  </StrictMode>
)
