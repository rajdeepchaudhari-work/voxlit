import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useAppStore } from './store/useAppStore'
import App from './components/App'
import './styles/globals.css'

function Root() {
  const initIPC = useAppStore((s) => s.initIPC)

  useEffect(() => {
    const cleanup = initIPC()
    return cleanup
  }, [initIPC])

  return <App />
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <StrictMode>
    <Root />
  </StrictMode>
)
