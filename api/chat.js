// Vercel Serverless Function — proxy ke DeepSeek (format OpenAI).
// Berjalan di sisi server: DEEPSEEK_API_KEY tidak pernah terekspos ke browser.
//
// Endpoint: POST /api/chat  body: { system, user }
// Respons : { text }
//
// Set env di Vercel: Project Settings → Environment Variables → DEEPSEEK_API_KEY
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "DEEPSEEK_API_KEY belum diset di environment." });
  }

  try {
    const { system, user } = req.body || {};
    if (!user) return res.status(400).json({ error: "Field 'user' wajib ada." });

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: user });

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(r.status).json({ error: `DeepSeek ${r.status}: ${detail}` });
    }

    const data = await r.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) return res.status(502).json({ error: "Respons kosong dari DeepSeek." });

    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
