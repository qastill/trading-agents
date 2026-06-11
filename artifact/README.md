# Versi Claude Artifact (spot-only)

`TradingAgents.jsx` adalah versi **artifact Claude.ai** dari app ini — versi
paling simpel dan **real-time penuh** (harga + berita lewat web search bawaan
runtime artifact). Tidak butuh API key, serverless, proxy, atau feed harga.

## Cara pakai

1. Buka **claude.ai**, mulai chat baru.
2. Minta Claude membuat artifact React, mis.:
   > "Buatkan artifact React dari kode ini" — lalu tempel seluruh isi
   > `TradingAgents.jsx`.
3. Claude akan merender artifact-nya. Isi ticker (mis. `BTC`) → **Mulai analisis**.

Panggilan `fetch("https://api.anthropic.com/v1/messages", …)` + tool
`web_search` ditangani otomatis oleh runtime artifact Claude.ai — itulah kenapa
harga & berita langsung real-time tanpa setup apa pun.

## Perbedaan dengan versi deploy (root repo)

| | Artifact (folder ini) | Deploy Vercel (root repo) |
|---|---|---|
| Setup | Nol | Backend + API key |
| Real-time | Harga **dan** berita (web search) | Harga saja (CoinGecko) |
| Model | Claude (`claude-sonnet-4-...`) | DeepSeek |
| URL publik sendiri | ❌ (hanya di claude.ai) | ✅ |
| Biaya hosting | Tidak ada | Vercel + DeepSeek |

Keduanya sudah disetel **fokus spot** (tanpa leverage / short).
