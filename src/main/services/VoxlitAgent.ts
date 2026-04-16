import * as https from 'https'

// Whisper mangles "Voxlit" — match all known phonetic variants
const V = '(?:voxlit|voxelit|voxelet|voxlet|voxlite|voxlight|vox\\s*lit|boxlit|box\\s*lit|foxlit|fox\\s*lit|woxlit|vocklit|voclit|voclite|foxelet|boxelet|vox\\s*elite|voxe\\s*lit|vox\\s*lead|vox\\s*let|vox\\s*lid)'
const TRIGGER_PATTERNS = [
  new RegExp(`^hey\\s+${V}\\b[,.]?\\s*`, 'i'),
  new RegExp(`^${V}\\s+agent\\b[,.]?\\s*`, 'i'),
  new RegExp(`^${V}[,.]?\\s+`, 'i'),
]

// Client-side fallback prompt — used when Voxlit Cloud /v1/agent is
// unavailable and the user has an OpenAI key. Compact version of the
// full server prompt (which has richer skill instructions).
const SYSTEM_PROMPT = `You are Voxlit Agent — a voice-activated AI assistant. Execute the user's spoken command and return ONLY the paste-ready result. No preamble, no "Here's your...", no commentary. Match the user's language.

SKILLS:

COPYWRITING: "write copy/headline/tagline/CTA for..." → clarity over cleverness, benefits over features, specific over vague. No exclamation points, no buzzwords. Include headline + subheadline + body + CTA.

COLD EMAIL: "cold email/outreach/sales email..." → peer tone, not vendor. Subject: 2-4 words lowercase. Lead with prospect's world. One ask. 4-6 sentences max.

SOCIAL CONTENT: "LinkedIn post/tweet/social post..." → hook-first, platform-native tone, end with question or CTA, generous line breaks.

COPY EDITING: "edit/improve/proofread this..." → Seven Sweeps: clarity, voice, so-what, prove-it, specificity, emotion, zero-risk. Return improved text only.

POLISH: "polish/clean up this..." → tighten sentences, cut filler (that/just/really/very), strengthen verbs, fix rhythm, preserve voice.

CLARIFY: "make clearer/simplify..." → one idea per sentence, plain language, front-load key point, active voice.

DISTILL: "summarize/key points/TL;DR..." → 3-7 bullets, conclusion-first, no preamble, preserve specifics.

CODE: "write/fix/debug/regex/commit message/PR..." → code only (no fences), conventional commits, structured PR descriptions.

EMAILS: "write email/reply/decline meeting/Slack..." → Subject + body for email, casual for Slack, polite for declines.

PRODUCTIVITY: "bug report/todo list/proposal/compare..." → structured formats (steps to reproduce, numbered actions, objective+approach+timeline).

GENERAL: if no skill matches, return the most useful paste-ready output.`

export function detectAgentTrigger(text: string): { triggered: boolean; command: string } {
  for (const pattern of TRIGGER_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return { triggered: true, command: text.slice(match[0].length).trim() }
    }
  }
  return { triggered: false, command: '' }
}

export async function processAgentCommand(
  command: string,
  config: { openaiApiKey?: string; voxlitServerUrl?: string; voxlitServerToken?: string }
): Promise<string> {
  if (config.voxlitServerUrl && config.voxlitServerToken) {
    return processViaVoxlitCloud(command, config.voxlitServerUrl, config.voxlitServerToken)
  }
  if (config.openaiApiKey) {
    return processViaOpenAI(command, config.openaiApiKey)
  }
  throw new Error('Voxlit Agent requires Voxlit Cloud or an OpenAI API key. Set one in Settings → Transcription.')
}

async function processViaOpenAI(command: string, apiKey: string): Promise<string> {
  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: command },
    ],
    max_tokens: 2048,
    temperature: 0.3,
  })

  return new Promise<string>((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30_000,
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try {
          const json = JSON.parse(text)
          if (json.error) return reject(new Error(`OpenAI: ${json.error.message}`))
          resolve(json.choices?.[0]?.message?.content?.trim() ?? '')
        } catch {
          reject(new Error(`OpenAI: unexpected response — ${text.slice(0, 100)}`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Voxlit Agent: request timed out')) })
    req.write(body)
    req.end()
  })
}

async function processViaVoxlitCloud(command: string, serverUrl: string, token: string): Promise<string> {
  const agentUrl = serverUrl.replace(/\/transcribe$/, '/agent')
  const body = JSON.stringify({ command })

  const isHttps = agentUrl.startsWith('https://')
  const client = isHttps ? https : require('http') as typeof https

  return new Promise<string>((resolve, reject) => {
    const req = client.request(agentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30_000,
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        const status = res.statusCode ?? 0
        if (status >= 400) {
          // Voxlit Cloud agent endpoint not available yet — fall back to
          // returning the raw command so dictation still works.
          console.warn(`[VoxlitAgent] Cloud agent endpoint returned ${status}, passing through`)
          resolve(command)
          return
        }
        try {
          const json = JSON.parse(text)
          resolve((json.text ?? json.result ?? '').trim())
        } catch {
          resolve(command)
        }
      })
    })
    req.on('error', () => resolve(command))
    req.on('timeout', () => { req.destroy(); resolve(command) })
    req.write(body)
    req.end()
  })
}
