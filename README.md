# Ollama Mobile

A native mobile client for [Ollama](https://ollama.com) — iOS & Android via React Native / Expo.

Connect to **Ollama Cloud** or any self-hosted Ollama instance. Stream responses in real time, manage multiple servers, switch models on the fly.

## Features

- ✅ Chat with any Ollama model (cloud or self-hosted)
- ✅ Token-by-token streaming responses
- ✅ Multiple server endpoints (Ollama Cloud, LAN, VPS, Tailscale)
- ✅ Model browser with selection
- ✅ Conversation history (persisted locally via SQLite)
- ✅ System prompt support per conversation
- ✅ Dark theme
- 🔄 Model pulling with progress (coming)
- 🔄 Syntax highlighting for code blocks (coming)
- 🔄 Multimodal input (coming)

## Get Started

```bash
# Clone
git clone https://github.com/spacialglaciercom-lab/ollama-mobile.git
cd ollama-mobile

# Install
npm install --legacy-peer-deps

# Start dev
npx expo start

# Run on device
npx expo run:ios
# or
npx expo run:android
```

## Ollama Cloud Setup

1. Create an account at [ollama.com](https://ollama.com)
2. Generate an API key at [ollama.com/settings/keys](https://ollama.com/settings/keys)
3. Open the app → Settings → The default "Ollama Cloud" server is pre-configured
4. Enter your API key and tap Ping to verify

## Self-Hosted Setup

1. Run Ollama on your server: `OLLAMA_HOST=0.0.0.0 ollama serve`
2. Settings → + Server → Enter your server URL (e.g., `http://192.168.1.100:11434`)
3. For remote access, use [Tailscale](https://tailscale.com), [ngrok](https://ngrok.com), or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 52 |
| Language | TypeScript |
| Navigation | Expo Router |
| API | ollama-js |
| State | Zustand + MMKV |
| Storage | expo-sqlite |
| Styling | NativeWind (Tailwind) |
| Build | EAS Build |

## Architecture

```
App (Expo Router)
├── Chat UI ←→ useOllamaStream → Ollama API (cloud/self-hosted)
├── Model Browser ←→ useModelStore → /api/tags
├── Settings ←→ useServerStore → Server configs (MMKV)
└── SQLite ←→ Conversations + Messages persistence
```

## License

MIT