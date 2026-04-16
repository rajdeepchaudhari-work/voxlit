"""
Voxlit Transcription API
------------------------
Proxies audio to OpenAI Whisper and post-processes with GPT-4o-mini for
dictation-quality output. Clients (the Voxlit app) authenticate with a
shared bearer token; rate-limited per IP to prevent abuse.

Environment (/etc/voxlit-api.env):
  OPENAI_API_KEY   - OpenAI API key for Whisper + GPT-4o-mini
  SHARED_SECRET    - Bearer token the app must send
  RATE_LIMIT_RPM   - Requests per minute per IP (default 30)
"""
import os
import re
import struct
import time
import logging
import math
from collections import defaultdict, deque
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Header
from fastapi.responses import JSONResponse
import httpx
from dotenv import load_dotenv

load_dotenv('/etc/voxlit-api.env')

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
SHARED_SECRET = os.environ.get('SHARED_SECRET', '')
RATE_LIMIT_RPM = int(os.environ.get('RATE_LIMIT_RPM', '30'))

if not OPENAI_API_KEY or not SHARED_SECRET:
    raise RuntimeError('OPENAI_API_KEY and SHARED_SECRET must be set in /etc/voxlit-api.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('voxlit-api')

app = FastAPI(title='Voxlit Transcription API', version='1.0')

# ─── Per-IP rate limiting (sliding window) ────────────────────────────────────
_rate: dict[str, deque] = defaultdict(deque)

def check_rate_limit(ip: str) -> bool:
    now = time.time()
    q = _rate[ip]
    while q and q[0] < now - 60:
        q.popleft()
    if len(q) >= RATE_LIMIT_RPM:
        return False
    q.append(now)
    return True


# ─── Dictation post-processing prompt ─────────────────────────────────────────
# STRICT: only remove fillers + add punctuation. DO NOT rewrite, rephrase, or expand.
# If the model is unsure, return the input unchanged.
DICTATION_SYSTEM_PROMPT = """Clean up the given dictation transcript. Return ONLY the cleaned text, nothing else.

Rules (strict):
- Remove ONLY these exact filler words when they do not carry meaning: "um", "uh", "uhh", "erm", "hmm".
- Add punctuation and capitalization.
- Convert spoken punctuation: "period"=".", "comma"=",", "question mark"="?", "exclamation mark"="!", "new line"="\\n", "new paragraph"="\\n\\n".
- Do NOT rephrase, rewrite, summarize, translate, or add any words.
- Do NOT add greetings, sign-offs, or explanations.
- Preserve every meaningful word exactly as spoken.
- If uncertain about anything, keep the original text unchanged.
- Never output anything other than the cleaned transcript itself."""


# Regex to detect if text even needs polishing. If no filler words or spoken
# punctuation commands present, skip GPT entirely — saves tokens + latency.
FILLER_PATTERN = re.compile(
    r'\b(um+|uh+|uhh|erm|hmm|new line|new paragraph|period|comma|question mark|exclamation mark)\b',
    re.IGNORECASE
)

def needs_polish(text: str) -> bool:
    # Always polish if filler words or voice commands present
    if FILLER_PATTERN.search(text):
        return True
    # Polish if no sentence-ending punctuation and text is substantial
    if len(text) > 30 and not any(p in text for p in '.!?'):
        return True
    return False


# Known Whisper hallucinations from subtitle training data — never real dictation
WHISPER_PHANTOMS = {
    'thank you', 'thank you.', 'thanks', 'thanks.',
    'thank you for watching', 'thank you for watching.',
    'thanks for watching', 'thanks for watching.',
    'please subscribe', 'like and subscribe',
    'subtitles by the amara.org community',
    'subtitles by',
    'transcribed by', 'transcription by',
    'bye', 'bye.', 'bye bye', 'goodbye',
    'you', 'you.', '.', '!', '?',
    '[music]', '[applause]', '[laughter]', '(music)', '(applause)',
}

def analyze_int16_wav(wav_bytes: bytes) -> dict:
    """Parse 44-byte WAV header + int16 PCM body. Return duration, peak, rms."""
    if len(wav_bytes) < 45:
        return {'ok': False}
    try:
        sample_rate = struct.unpack_from('<I', wav_bytes, 24)[0]
        bits = struct.unpack_from('<H', wav_bytes, 34)[0]
        if bits != 16:
            return {'ok': False, 'reason': f'expected 16-bit, got {bits}'}
        pcm = wav_bytes[44:]
        n = len(pcm) // 2
        if n == 0:
            return {'ok': False}
        # int16 max = 32767
        peak = 0
        sumsq = 0.0
        for i in range(0, n * 2, 2):
            s = int.from_bytes(pcm[i:i+2], 'little', signed=True)
            a = abs(s)
            if a > peak:
                peak = a
            sumsq += (s / 32768.0) ** 2
        rms = math.sqrt(sumsq / n)
        return {
            'ok': True,
            'duration_s': n / sample_rate,
            'peak_norm': peak / 32768.0,
            'rms_norm': rms,
        }
    except Exception as e:
        return {'ok': False, 'reason': str(e)}


def is_whisper_phantom(text: str) -> bool:
    t = text.strip().lower()
    if t in WHISPER_PHANTOMS:
        return True
    # Strip all non-letters; if the result is empty or 1 char, it's noise
    letters_only = re.sub(r'[^a-z]', '', t)
    return len(letters_only) <= 1


@app.get('/health')
async def health():
    return {'status': 'ok'}


# ─── Voxlit Agent ────────────────────────────────────────────────────────────
# Voice-activated AI assistant. The client detects "Hey Voxlit" trigger phrases,
# transcribes the rest, and POSTs the command text here. We route it through
# GPT-4o-mini and return the result for injection into the user's focused app.

AGENT_SYSTEM_PROMPT = """You are Voxlit Agent — a voice-activated AI assistant for developers. The user dictated a command via voice. Your job is to execute their intent and return the result they want to paste into their current app.

Rules:
- Return ONLY the output the user wants. No explanations, no preamble, no "Here's your..." wrapper.
- If they say "optimize this prompt" or "improve this prompt", rewrite it to be clearer, more specific, with acceptance criteria, scope boundaries, and verification steps. Detect the intent (new feature / bug fix / refactor / research) and structure accordingly.
- If they say "write an email", return just the email body ready to send.
- If they say "explain this", return a concise explanation.
- If they say "fix this" or "debug this", analyze and return the fix or diagnosis.
- If they ask for code, return only the code with no markdown fences.
- If they ask to summarize, return a tight summary.
- Keep output concise and actionable — it gets pasted into whatever app the user is working in.
- For prompt optimization specifically:
  - Detect intent: new feature / bug fix / refactor / testing / research / documentation
  - Identify missing context: tech stack, acceptance criteria, error handling, testing expectations, scope boundaries
  - Rewrite with: clear task description, requirements, verification steps, and "do not" boundaries
- Default to developer-focused output since Voxlit targets developers.
- Match the user's language (if they speak in a non-English language, respond in that language)."""


from pydantic import BaseModel

class AgentRequest(BaseModel):
    command: str

@app.post('/v1/agent')
async def agent(
    body: AgentRequest,
    request: Request,
    authorization: str = Header(default=''),
):
    if authorization != f'Bearer {SHARED_SECRET}':
        raise HTTPException(status_code=401, detail='Unauthorized')

    ip = request.headers.get('x-forwarded-for', request.client.host).split(',')[0].strip()
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail=f'Rate limit: {RATE_LIMIT_RPM} req/min')

    command = body.command.strip()
    if not command:
        return {'text': ''}

    if len(command) > 10_000:
        raise HTTPException(status_code=413, detail='Command too long (max 10,000 chars)')

    async with httpx.AsyncClient(timeout=30) as client:
        t0 = time.time()
        resp = await client.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENAI_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o-mini',
                'messages': [
                    {'role': 'system', 'content': AGENT_SYSTEM_PROMPT},
                    {'role': 'user', 'content': command},
                ],
                'max_tokens': 2048,
                'temperature': 0.3,
            },
        )
        agent_ms = int((time.time() - t0) * 1000)

        if resp.status_code == 401:
            log.error('OpenAI auth failed for agent call')
            raise HTTPException(status_code=502, detail='Upstream auth error')
        if resp.status_code == 429:
            raise HTTPException(status_code=503, detail='Upstream rate limit')
        if resp.status_code >= 400:
            log.error('Agent GPT error %s: %s', resp.status_code, resp.text[:200])
            raise HTTPException(status_code=502, detail=f'Agent error: {resp.status_code}')

        result = resp.json().get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        log.info('agent ip=%s ms=%d cmd_len=%d result_len=%d', ip, agent_ms, len(command), len(result))
        return {'text': result, 'agent_ms': agent_ms}


@app.post('/v1/transcribe')
async def transcribe(
    request: Request,
    file: UploadFile = File(...),
    authorization: str = Header(default=''),
    raw: bool = Form(default=False),   # if True, skip GPT cleanup (for debugging)
):
    # Authentication
    if authorization != f'Bearer {SHARED_SECRET}':
        raise HTTPException(status_code=401, detail='Unauthorized')

    # Rate limit per IP (honor x-forwarded-for if behind nginx/cloudflare)
    ip = request.headers.get('x-forwarded-for', request.client.host).split(',')[0].strip()
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail=f'Rate limit: {RATE_LIMIT_RPM} req/min')

    audio_bytes = await file.read()
    if len(audio_bytes) < 1000:
        return {'text': ''}   # too short, skip
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='File too large (max 25MB)')

    # Analyze audio quality — reject silent/near-silent input before paying for Whisper
    stats = analyze_int16_wav(audio_bytes)
    if stats.get('ok'):
        log.info('audio ip=%s dur=%.2fs peak=%.3f rms=%.4f bytes=%d',
                 ip, stats['duration_s'], stats['peak_norm'], stats['rms_norm'], len(audio_bytes))
        # RMS < 0.005 = below voice threshold (room noise level).
        # Whisper will hallucinate on this, so skip it.
        if stats['rms_norm'] < 0.005:
            log.info('rejected: too quiet (rms=%.4f)', stats['rms_norm'])
            return {'text': '', 'reason': 'too_quiet', 'rms': stats['rms_norm']}
        # Peak < 0.05 = mic gain way too low, signal-to-noise will be terrible
        if stats['peak_norm'] < 0.05:
            log.info('rejected: peak too low (peak=%.3f) — increase mic gain', stats['peak_norm'])
            return {'text': '', 'reason': 'peak_too_low', 'peak': stats['peak_norm']}

    async with httpx.AsyncClient(timeout=60) as client:
        # ── Transcription via whisper-1 (cheapest OpenAI option) ────────────
        # ~$0.006/min vs gpt-4o-transcribe at $0.012/min. Combined with the
        # client-side silence trimming + audio quality gating, accuracy is
        # acceptable for most English dictation.
        t0 = time.time()
        whisper_resp = await client.post(
            'https://api.openai.com/v1/audio/transcriptions',
            headers={'Authorization': f'Bearer {OPENAI_API_KEY}'},
            files={'file': (file.filename or 'audio.wav', audio_bytes, 'audio/wav')},
            data={
                'model': 'whisper-1',
                'language': 'en',
                'response_format': 'json',
                'temperature': '0',
            },
        )
        whisper_ms = int((time.time() - t0) * 1000)

        if whisper_resp.status_code == 401:
            log.error('OpenAI auth failed — server OPENAI_API_KEY is invalid')
            raise HTTPException(status_code=502, detail='Upstream auth error')
        if whisper_resp.status_code == 429:
            raise HTTPException(status_code=503, detail='Upstream rate limit')
        if whisper_resp.status_code == 400 and 'audio_too_short' in whisper_resp.text:
            return {'text': '', 'whisper_ms': whisper_ms, 'polish_ms': 0}
        if whisper_resp.status_code >= 400:
            log.error('Whisper error %s: %s', whisper_resp.status_code, whisper_resp.text[:200])
            raise HTTPException(status_code=502, detail=f'Whisper error: {whisper_resp.status_code}')

        raw_text = whisper_resp.json().get('text', '').strip()
        if not raw_text:
            return {'text': '', 'whisper_ms': whisper_ms, 'polish_ms': 0}

        # Filter known Whisper phantom outputs — these are training-data
        # leakage from subtitles, not anything the user actually said.
        if is_whisper_phantom(raw_text):
            log.info('phantom filtered: "%s"', raw_text[:80])
            return {'text': '', 'whisper_ms': whisper_ms, 'polish_ms': 0, 'phantom': True}

        # GPT polish layer disabled — return raw Whisper output directly.
        # The polish step was rewriting names and adding hallucinated content,
        # so we trust Whisper's transcription as-is.
        log.info('ok ip=%s whisper=%dms len=%d', ip, whisper_ms, len(raw_text))
        return {'text': raw_text, 'whisper_ms': whisper_ms, 'polish_ms': 0, 'polished': False}
