# trading-agents

Meja riset multi-agen ala [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents), diimplementasikan ulang sebagai aplikasi React + Vite yang ditenagai **DeepSeek API**.

Empat analis AI (Fundamental, Sentimen, Berita & Makro, Teknikal) menilai sebuah aset, peneliti **bull** & **bear** beradu argumen, trader menyusun proposal, lalu manajer portofolio memberi **satu keputusan akhir** beserta tingkat keyakinan.

> Alat riset & edukasi — **bukan nasihat keuangan**.
>
> ⚠️ **Harga acuan diambil real-time** dari CoinGecko dan disuntik ke prompt,
> jadi level harga tidak lagi menebak dari ingatan model. Namun DeepSeek belum
> mendukung **web search**, jadi konteks berita/makro tetap dari pengetahuan
> model (bisa usang). Selalu verifikasi sebelum bertindak.

## Arsitektur

Browser tidak pernah memegang API key. Semua panggilan model lewat backend:

- **Lokal** (`npm run dev`): middleware `/api/chat` di `vite.config.js`.
- **Produksi** (Vercel): serverless function `api/chat.js`.

Keduanya membaca `DEEPSEEK_API_KEY` dari environment dan memproksi ke
`https://api.deepseek.com/chat/completions`.

## Menjalankan secara lokal

```bash
# 1. Install dependency
npm install

# 2. Siapkan API key DeepSeek
cp .env.example .env
#   lalu edit .env, isi DEEPSEEK_API_KEY=sk-...
#   Ambil key di: https://platform.deepseek.com/api_keys (akun perlu saldo)

# 3. Jalankan dev server
npm run dev
```

Buka http://localhost:5173.

## Deploy ke Vercel

1. Import repo ke Vercel (otomatis terdeteksi sebagai Vite).
2. **Project Settings → Environment Variables** → tambah `DEEPSEEK_API_KEY`
   dengan key kamu (scope: Production, Preview, Development).
3. Deploy. Serverless function `api/chat.js` akan menangani `/api/chat`.

> Penting: tanpa env `DEEPSEEK_API_KEY` di Vercel, `/api/chat` akan balas
> error 500 — bukan analisa. Pastikan env sudah diset lalu **redeploy**.

## Build produksi (lokal)

```bash
npm run build    # output ke dist/
npm run preview  # serve hasil build statis (tanpa /api/chat — pakai `vercel dev` bila perlu)
```
