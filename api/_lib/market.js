// Ambil harga real-time dari CoinGecko (gratis, tanpa API key).
// Dipakai oleh serverless function api/price.js dan dev middleware vite.config.js.
// File diawali "_" → tidak diperlakukan sebagai route oleh Vercel.

// Peta cepat simbol → id CoinGecko untuk aset populer (hindari 1x panggilan search).
const STATIC_IDS = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", BNB: "binancecoin",
  XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", AVAX: "avalanche-2",
  DOT: "polkadot", MATIC: "matic-network", LINK: "chainlink", LTC: "litecoin",
  TRX: "tron", SHIB: "shiba-inu", UNI: "uniswap", ATOM: "cosmos",
  XLM: "stellar", NEAR: "near", APT: "aptos", ARB: "arbitrum",
  OP: "optimism", FIL: "filecoin", ETC: "ethereum-classic", HBAR: "hedera-hashgraph",
  ICP: "internet-computer", SUI: "sui", PEPE: "pepe", TON: "the-open-network",
  BCH: "bitcoin-cash", USDT: "tether", USDC: "usd-coin",
};

const CG = "https://api.coingecko.com/api/v3";

async function resolveId(ticker) {
  if (STATIC_IDS[ticker]) return STATIC_IDS[ticker];
  const r = await fetch(`${CG}/search?query=${encodeURIComponent(ticker)}`);
  if (!r.ok) return null;
  const d = await r.json();
  const coins = d.coins || [];
  const exact = coins.find((c) => (c.symbol || "").toUpperCase() === ticker);
  return (exact || coins[0])?.id || null;
}

/**
 * @returns {Promise<{ok:true, ticker, id, price, change24h, marketCap}>|{ok:false, status, error}}
 */
export async function getMarketSnapshot(rawTicker) {
  const ticker = String(rawTicker || "").trim().toUpperCase();
  if (!ticker) return { ok: false, status: 400, error: "ticker wajib diisi" };
  try {
    const id = await resolveId(ticker);
    if (!id) return { ok: false, status: 404, error: `Tidak menemukan data harga untuk ${ticker} (mungkin bukan kripto?)` };
    const r = await fetch(
      `${CG}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
    );
    if (!r.ok) return { ok: false, status: r.status, error: `CoinGecko ${r.status}` };
    const d = await r.json();
    const row = d[id];
    if (!row || typeof row.usd !== "number")
      return { ok: false, status: 404, error: "Harga tidak tersedia" };
    return {
      ok: true,
      ticker,
      id,
      price: row.usd,
      change24h: row.usd_24h_change ?? null,
      marketCap: row.usd_market_cap ?? null,
    };
  } catch (e) {
    return { ok: false, status: 500, error: String(e?.message || e) };
  }
}
