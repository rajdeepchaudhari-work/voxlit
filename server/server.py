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
import time
import logging
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

    async with httpx.AsyncClient(timeout=60) as client:
        # ── Transcription via whisper-1 ─────────────────────────────────────
        # whisper-1 transcribes literally; gpt-4o-mini-transcribe was too
        # aggressive at "interpreting" speech and changing what was said.
        # No 'prompt' field — biasing the model nudges it to invent content.
        # temperature=0 forces deterministic, lowest-hallucination output.
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
