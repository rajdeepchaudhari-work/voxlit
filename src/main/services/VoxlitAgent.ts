import * as https from 'https'

// Whisper mangles "Voxlit" in many ways — match all known phonetic variants
// so the agent trigger still fires even when transcription is imperfect.
const V = '(?:voxlit|voxelit|voxelet|voxlet|voxlite|voxlight|vox\\s*lit|boxlit|box\\s*lit|foxlit|fox\\s*lit|woxlit|vocklit|voclit|voclite|foxelet|boxelet|vox\\s*elite|voxe\\s*lit|vox\\s*lead|vox\\s*let|vox\\s*lid)'
const TRIGGER_PATTERNS = [
  new RegExp(`^hey\\s+${V}\\b[,.]?\\s*`, 'i'),
  new RegExp(`^${V}\\s+agent\\b[,.]?\\s*`, 'i'),
  new RegExp(`^${V}[,.]?\\s+`, 'i'),
]

const SYSTEM_PROMPT = `You are Voxlit Agent — a voice-activated AI assistant for developers. The user dictated a command via voice. Your job is to execute their intent and return the result they want to paste into their current app.

Rules:
- Return ONLY the output the user wants. No explanations, no "Here's your..." preamble.
- If they say "optimize this prompt" or "improve this prompt", rewrite it to be clearer, more specific, add acceptance criteria and scope boundaries.
- If they say "write an email", return just the email body.
- If they say "explain this", return a concise explanation.
- If they say "fix this" or "debug this", analyze and return the fix or diagnosis.
- If they ask for code, return only the code.
- Keep output concise. The result gets pasted into whatever app they're in.
- For prompt optimization: detect intent (feature/bugfix/refactor), identify missing context (tech stack, acceptance criteria, scope), add structure.
- Default to developer-focused output since Voxlit targets developers.`

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
