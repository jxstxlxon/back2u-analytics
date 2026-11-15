# BACK2U GTA VI Clip Factory — isolated Render deployment

Deployed exclusively from branch `feature/back2u-clip-factory-render-v05-20261115`. The Analytics app's production branches remain unchanged.

## Build
Dockerfile is rooted at `clip-factory/Dockerfile` with the repository root as build context. The v0.5 source bundle is split into two Git-committed base64 parts; the Docker build concatenates, decodes, and extracts `app.py`, `clipfactory.py`, and `requirements.txt`. This is a deployment transport format, not encryption. Full original v0.5 source is provided separately in the conversation ZIP.

## Configuration
`BACK2U_PASSWORD` must be at least 12 characters. Username: `back2u`. The server refuses to launch without a password.

Render free service: sleeps after inactivity, has limited RAM, and ephemeral filesystem. This deployment caps uploads at 100 MB and only exposes 540p export quality. It is for proof-of-concept testing, not unattended processing or permanent clip storage.

Only licensed or self-owned recordings may be processed. Twitch metadata search is not proof of reuse rights. The app does not automatically publish.

After login, test a short video first, then the Twitch device flow. Never paste Twitch access tokens or secret client credentials into the public interface.
