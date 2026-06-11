import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { getMarketSnapshot } from "./api/_lib/market.js";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Ambil DEEPSEEK_API_KEY dari .env (tanpa prefix VITE_ → tetap di server, tak
  // pernah dikirim ke browser).
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.DEEPSEEK_API_KEY || "";

  // Plugin dev: menyajikan /api/chat secara lokal supaya `npm run dev` berfungsi
  // tanpa perlu `vercel dev`. Di produksi, request ditangani oleh api/chat.js.
  const devApi = {
    name: "dev-api-chat",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "Method not allowed" }));
        }
        res.setHeader("Content-Type", "application/json");
        if (!apiKey) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: "DEEPSEEK_API_KEY belum diset di .env" }));
        }
        try {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const { system, user } = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          if (!user) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Field 'user' wajib ada." }));
          }
          const messages = [];
          if (system) messages.push({ role: "system", content: system });
          messages.push({ role: "user", content: user });

          const r = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "deepseek-chat", messages, max_tokens: 1000, temperature: 0.7 }),
          });
          if (!r.ok) {
            res.statusCode = r.status;
            return res.end(JSON.stringify({ error: `DeepSeek ${r.status}: ${await r.text()}` }));
          }
          const data = await r.json();
          const text = (data.choices?.[0]?.message?.content || "").trim();
          res.statusCode = text ? 200 : 502;
          return res.end(JSON.stringify(text ? { text } : { error: "Respons kosong dari DeepSeek." }));
        } catch (e) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: String(e?.message || e) }));
        }
      });

      // Harga real-time lokal: GET /api/price?ticker=BTC
      server.middlewares.use("/api/price", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        const ticker = new URL(req.url, "http://localhost").searchParams.get("ticker");
        const snap = await getMarketSnapshot(ticker);
        res.statusCode = snap.ok ? 200 : (snap.status || 500);
        return res.end(JSON.stringify(snap.ok ? snap : { error: snap.error }));
      });
    },
  };

  return { plugins: [react(), devApi] };
});
