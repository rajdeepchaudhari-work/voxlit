import { useState, useEffect, useRef } from 'react'

const SENTENCES = [
  'Send the proposal to the team by end of day Friday.',
  'Note to self: review the whisper.cpp changelog before the next release.',
  'Schedule a call with Priya at three PM tomorrow.',
  'The privacy model is architecture-level, not policy-level — that\'s the key differentiator.',
  'Open a pull request for the new feature branch and request review from the core contributors.',
]

const CHAR_DELAY = 45
const PAUSE_AFTER = 1800
const PAUSE_BETWEEN = 600

interface TerminalState {
  displayText: string
  cursorVisible: boolean
  lineIndex: number
}

export function useTerminalAnim(): TerminalState {
  const [displayText, setDisplayText] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)
  const [lineIndex, setLineIndex] = useState(0)
  const charIndexRef = useRef(0)
  const phaseRef = useRef<'typing' | 'pause' | 'clearing'>('typing')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const tick = () => {
      const currentSentence = SENTENCES[lineIndex]

      if (phaseRef.current === 'typing') {
        if (charIndexRef.current <= currentSentence.length) {
          setDisplayText(currentSentence.slice(0, charIndexRef.current))
          charIndexRef.current++
          timerRef.current = setTimeout(tick, CHAR_DELAY)
        } else {
          phaseRef.current = 'pause'
          setCursorVisible(true)
          timerRef.current = setTimeout(tick, PAUSE_AFTER)
        }
      } else if (phaseRef.current === 'pause') {
        phaseRef.current = 'clearing'
        setCursorVisible(false)
        timerRef.current = setTimeout(tick, PAUSE_BETWEEN)
      } else {
        // Advance to next sentence
        charIndexRef.current = 0
        phaseRef.current = 'typing'
        setLineIndex(prev => (prev + 1) % SENTENCES.length)
        setDisplayText('')
        setCursorVisible(true)
        timerRef.current = setTimeout(tick, CHAR_DELAY)
      }
    }

    timerRef.current = setTimeout(tick, 800)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [lineIndex])

  return { displayText, cursorVisible, lineIndex }
}
