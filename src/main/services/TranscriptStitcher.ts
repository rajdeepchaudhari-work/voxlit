/**
 * Joins transcribed chunk texts into a single final utterance string.
 *
 * v2 ships with zero-overlap chunking: cuts happen inside detected silence
 * (≥600ms RMS < threshold), so no word spans the boundary. And whisper.cpp
 * runs with --no-context, so there's no decoder state to preserve across
 * chunks. That reduces stitching to: drop empties, concat with a single
 * space, collapse whitespace, capitalize the first letter.
 *
 * Kept as an isolated module so the overlap+de-dup variant has a clean home
 * if empirical testing shows we need it.
 */
export function stitch(chunkTexts: string[]): string {
  const joined = chunkTexts
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!joined) return ''
  return joined.charAt(0).toUpperCase() + joined.slice(1)
}
