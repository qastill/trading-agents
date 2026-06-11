# trading-agents

Meja riset multi-agen ala [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents), diimplementasikan ulang sebagai aplikasi React + Vite dengan Claude API.

Empat analis AI (Fundamental, Sentimen, Berita & Makro, Teknikal) mengumpulkan data pasar terkini, peneliti **bull** & **bear** beradu argumen, trader menyusun proposal, lalu manajer portofolio memberi **satu keputusan akhir** beserta tingkat keyakinan.

> Alat riset & edukasi — **bukan nasihat keuangan**.

## Menjalankan secara lokal

```bash
# 1. Install dependency
npm install

# 2. Siapkan API key Anthropic
cp .env.example .env
#   lalu edit .env, isi ANTHROPIC_API_KEY=sk-ant-...

# 3. Jalankan dev server
npm run dev
```

Buka http://localhost:5173.

### Kenapa butuh dev-proxy?

Komponen aslinya memanggil `api.anthropic.com` langsung dari browser — di luar
runtime artifact Claude.ai itu akan gagal karena **CORS** dan **tidak ada API
key**. Aplikasi ini memakai dev-proxy Vite (`vite.config.js`): browser memanggil
`/api/anthropic/*`, lalu proxy meneruskannya ke Anthropic dengan menyuntikkan
header `x-api-key` di sisi server — jadi API key **tidak pernah terekspos ke
browser**.

## Build produksi

```bash
npm run build    # output ke dist/
npm run preview  # serve hasil build
```

Catatan: `npm run preview` menyajikan hasil build statis dan **tidak** menjalankan
dev-proxy. Untuk produksi, sediakan backend/serverless function sendiri yang
memproksi ke Anthropic, lalu arahkan lewat env `VITE_API_URL`.
