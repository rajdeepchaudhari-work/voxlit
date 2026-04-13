# Voxlit Transcription API

FastAPI server that proxies audio to OpenAI Whisper + GPT-4o-mini for
dictation-quality output. Deployed behind a Cloudflare tunnel at
`https://api.voxlit.co/v1/transcribe`.

## Architecture

1. Client (Voxlit app) POSTs int16 WAV + bearer token
2. Server forwards to Whisper (`whisper-1`) for speech-to-text
3. If the raw transcript contains fillers ("um", "uh") or spoken punctuation
   commands ("period", "new line"), it's sent to GPT-4o-mini for cleanup with
   a strict prompt (temperature 0)
4. If Whisper output is already clean, GPT is skipped entirely (saves tokens
   and latency)
5. A length-ratio guard rejects polished output that's >2x or <0.4x the raw
   length — catches GPT hallucinations and falls back to raw Whisper

## Deployment

```bash
# One-time setup on the VPS
apt-get install -y python3-venv python3-pip
mkdir /opt/voxlit-api
python3 -m venv /opt/voxlit-api/venv
/opt/voxlit-api/venv/bin/pip install fastapi uvicorn python-multipart httpx python-dotenv

# Config (root-owned, 600)
cat > /etc/voxlit-api.env <<EOF
OPENAI_API_KEY=sk-...
SHARED_SECRET=<openssl rand -hex 32>
RATE_LIMIT_RPM=30
EOF
chmod 600 /etc/voxlit-api.env

# Upload the server
scp server/server.py root@HOST:/opt/voxlit-api/

# systemd unit (see repo: server/voxlit-api.service)
systemctl enable --now voxlit-api
```

## Updating

```bash
scp server/server.py root@HOST:/opt/voxlit-api/server.py
ssh root@HOST 'systemctl restart voxlit-api'
```

## Rotating the shared secret

1. Generate new secret: `openssl rand -hex 32`
2. Update `/etc/voxlit-api.env` on server, restart service
3. Update `voxlitServerToken` default in [src/main/index.ts](../src/main/index.ts) and ship new app version

## Logs

```bash
journalctl -u voxlit-api -f
```
