import { describe, expect, it } from 'vitest'
import { stitch } from './TranscriptStitcher'

describe('stitch', () => {
  it('joins chunks with single spaces', () => {
    expect(stitch(['hello there', 'how are you'])).toBe('Hello there how are you')
  })

  it('capitalizes the first letter of the final text', () => {
    expect(stitch(['this is fine'])).toBe('This is fine')
  })

  it('drops empty and whitespace-only chunks', () => {
    expect(stitch(['hi', '', '   ', 'there'])).toBe('Hi there')
  })

  it('returns empty string when all chunks are empty', () => {
    expect(stitch([])).toBe('')
    expect(stitch(['', '  '])).toBe('')
  })

  it('collapses interior whitespace introduced by chunk joins', () => {
    expect(stitch(['hello  ', '  world'])).toBe('Hello world')
  })

  it('preserves punctuation from per-chunk whisper output', () => {
    expect(stitch(['the meeting is at 3.', 'bring the notes.'])).toBe(
      'The meeting is at 3. bring the notes.'
    )
  })
})
