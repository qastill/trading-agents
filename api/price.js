// Vercel Serverless Function — harga real-time untuk grounding analisa.
// GET /api/price?ticker=BTC  ->  { ticker, price, change24h, marketCap }
import { getMarketSnapshot } from "./_lib/market.js";

export default async function handler(req, res) {
  const ticker = req.query?.ticker;
  const snap = await getMarketSnapshot(ticker);
  if (!snap.ok) return res.status(snap.status || 500).json({ error: snap.error });
  return res.status(200).json(snap);
}
