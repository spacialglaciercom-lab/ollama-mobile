# Ollama

A native mobile client for [Ollama](https://ollama.com) — iOS & Android via React Native / Expo.

Connect to **Ollama Cloud** or any self-hosted Ollama instance. Stream responses in real time, manage multiple servers, switch models on the fly.

## Features

- ✅ Chat with any Ollama model (cloud or self-hosted)
- ✅ Token-by-token streaming responses
- ✅ Multiple server endpoints (Ollama Cloud, LAN, VPS, Tailscale)
- ✅ Model browser with selection (bottom sheet)
- ✅ Conversation history (persisted locally via SQLite)
- ✅ System prompt support per conversation
- ✅ iOS-native dark theme (green accent, Dynamic Island feel)
- ✅ Sheet-based navigation (model picker, settings)
- ✅ Context chips (server status, system prompt toggle)
- ✅ Auto-title from first message
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
3. Open the app → Connect screen → Enter URL `https://ollama.com` and your API key
4. Tap Connect → Start Chatting

## Self-Hosted Setup

1. Run Ollama on your server: `OLLAMA_HOST=0.0.0.0 ollama serve`
2. Settings sheet → + Add Server → Enter URL (e.g., `http://192.168.1.100:11434`)
3. For remote access, use [Tailscale](https://tailscale.com), [ngrok](https://ngrok.com), or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React Native + Expo SDK 52 |
| Language | TypeScript |
| Navigation | Expo Router (single-screen + sheets) |
| API | ollama-js |
| State | Zustand + MMKV |
| Storage | expo-sqlite |
| Build | EAS Build |

## UI Design

iOS-native dark theme inspired by Apple HIG:
- Background: `#000000`
- Surface: `#1c1c1e`
- Accent: `#30d158` (green)
- Blue: `#0a84ff`
- User bubbles: `#1a3a5c`
- Sheet-based navigation (no tab bar)
- Model pill in navbar
- Context chips below input
- ··· popover for actions

## License

MIT