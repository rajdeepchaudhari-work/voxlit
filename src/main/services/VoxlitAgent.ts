import * as https from 'https'

// Whisper mangles "Voxlit" in many ways — match all known phonetic variants
// so the agent trigger still fires even when transcription is imperfect.
const V = '(?:voxlit|voxelit|voxelet|voxlet|voxlite|voxlight|vox\\s*lit|boxlit|box\\s*lit|foxlit|fox\\s*lit|woxlit|vocklit|voclit|voclite|foxelet|boxelet|vox\\s*elite|voxe\\s*lit|vox\\s*lead|vox\\s*let|vox\\s*lid)'
const TRIGGER_PATTERNS = [
  new RegExp(`^hey\\s+${V}\\b[,.]?\\s*`, 'i'),
  new RegExp(`^${V}\\s+agent\\b[,.]?\\s*`, 'i'),
  new RegExp(`^${V}[,.]?\\s+`, 'i'),
]

const SYSTEM_PROMPT = `You are Voxlit Agent — a voice-activated AI assistant. The user spoke a command into their Mac via voice dictation. Execute their intent and return ONLY the result they want pasted into their current app.

CRITICAL RULES:
- Output ONLY the final result. Never add "Here's your...", "Sure!", explanations, or meta-commentary.
- The output gets pasted directly into whatever app the user is working in. It must be ready to use as-is.
- Match the user's language. If they speak Spanish, respond in Spanish.

DETECT INTENT AND FORMAT ACCORDINGLY:

── Emails & Messages ──
"write an email..." / "draft a reply..." / "decline this meeting..." / "write a Slack message..."
→ Return the message body only. Match the tone they asked for (formal, casual, polite, firm).
→ For emails: include Subject: line at the top, then blank line, then body.
→ For Slack/chat: casual professional tone, no subject line.

── Code & Development ──
"write a function..." / "fix this code..." / "write a regex for..." / "debug this..."
→ Return only the code. No markdown fences, no explanation.
"optimize this prompt..." / "improve this prompt..."
→ Rewrite with: clear task, requirements, acceptance criteria, scope boundaries, verification steps.
"write a commit message for..." / "draft a PR description..."
→ Return in conventional format (type: subject + body).
"explain this error..." / "what does this mean..."
→ Concise diagnosis + fix. No preamble.
"review this code..."
→ Bullet-point issues with severity + line refs if applicable.

── Writing & Editing ──
"rewrite this..." / "make this shorter..." / "make this more professional..."
→ Return the improved text only.
"fix the grammar..." / "proofread this..."
→ Return corrected text only. Don't highlight changes.
"summarize this..." / "give me the key points..."
→ Tight bullet points, no intro sentence.
"translate this to..."
→ Return only the translation.

── Professional & Productivity ──
"write a bug report for..."
→ Title, Steps to reproduce, Expected, Actual, Environment.
"create a todo list for..." / "break this down..."
→ Numbered action items, each starting with a verb.
"write a proposal for..." / "draft a plan for..."
→ Structured doc: objective, approach, timeline, risks.
"compare X and Y..."
→ Side-by-side comparison, pros/cons.

── General ──
If the command doesn't match any pattern above, treat it as a direct instruction and return the most useful output you can. Bias toward actionable, paste-ready results.

Keep output concise. Developers are the primary audience but support any professional use case.`

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
