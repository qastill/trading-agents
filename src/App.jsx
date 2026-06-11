import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, Newspaper, BarChart3, Scale,
  Briefcase, ShieldCheck, Play, RotateCcw, Loader2, Check, X,
  AlertTriangle, ArrowDown, Activity, Clock,
} from "lucide-react";

/* -------------------------------------------------------------- */
/*  Tema — terang, bersih, elegan.                                 */
/*  Indigo = warna sistem/proses · hijau-amber-merah = keputusan   */
/* -------------------------------------------------------------- */
const T = {
  bg: "#F5F6F9", card: "#FFFFFF", cardAlt: "#FBFBFD",
  ink: "#161A23", sub: "#5B6472", faint: "#98A0AF",
  line: "#E8EAF0", lineSoft: "#F1F2F6",
  accent: "#4B53C6", accentSoft: "#EEF0FB",
  buy: "#0E9F6E", sell: "#E0354F", hold: "#C0820A",
};
const SH = "0 1px 2px rgba(20,23,33,.04), 0 12px 32px -18px rgba(20,23,33,.22)";
const SH_SOFT = "0 1px 2px rgba(20,23,33,.04), 0 6px 18px -12px rgba(20,23,33,.14)";
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const MODEL = "claude-sonnet-4-20250514";

/* -------------------------------------------------------------- */
/*  Panggilan Claude API (ditangani runtime artifact Claude.ai)    */
/* -------------------------------------------------------------- */
// Lewat dev-proxy Vite (lihat vite.config.js): API key disuntik di sisi server,
// tidak pernah terekspos ke browser. Bisa di-override via VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL || "/api/anthropic/v1/messages";
async function callClaude({ system, user, useSearch }) {
  const body = { model: MODEL, max_tokens: 1000, system, messages: [{ role: "user", content: user }] };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const res = await fetch(API_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("API " + res.status);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  if (!text) throw new Error("Respons kosong");
  return text;
}

/* -------------------------------------------------------------- */
/*  Daftar agen                                                    */
/* -------------------------------------------------------------- */
const ANALYSTS = [
  {
    id: "fundamentals", name: "Fundamental", desc: "Valuasi & kesehatan aset", Icon: Scale,
    sys: (d) => `Kamu analis fundamental di firma trading. Per tanggal ${d}, nilai gambaran intrinsik aset. Untuk saham: valuasi, pertumbuhan, margin, neraca, laba terbaru, red flag. Untuk kripto/komoditas: suplai/tokenomics, adopsi jaringan, metrik on-chain, dan pendorong makro — bukan laporan keuangan perusahaan. Cari data terbaru di web dan sertakan angka bila ada. Akhiri satu baris: "Kecenderungan: bullish / netral / bearish". Tulis ringkas (maks ~150 kata) dalam Bahasa Indonesia, poin padat.`,
    user: (t, d) => `Analisis fundamental ${t} per ${d}.`,
  },
  {
    id: "sentiment", name: "Sentimen", desc: "Mood pasar & posisi ritel", Icon: Activity,
    sys: (d) => `Kamu analis sentimen pasar. Per tanggal ${d}, ukur mood dan posisi crowd untuk aset: sentimen ritel/sosial (X, Reddit, forum), fear/greed, dan untuk kripto, funding rate serta posisi long/short bila tersedia. Cari di web. Akhiri satu baris: "Kecenderungan: bullish / netral / bearish". Tulis ringkas (maks ~140 kata) dalam Bahasa Indonesia, poin padat.`,
    user: (t, d) => `Nilai sentimen jangka pendek ${t} per ${d}.`,
  },
  {
    id: "news", name: "Berita & Makro", desc: "Katalis & kondisi makro", Icon: Newspaper,
    sys: (d) => `Kamu analis berita & makro. Per tanggal ${d}, angkat katalis spesifik aset dan peristiwa makro dalam jendela waktu terkini yang menggerakkan harga (rilis data, kebijakan, laba, regulasi, pergerakan sektor). Cari berita terbaru di web. Tandai katalis terjadwal mendatang. Akhiri satu baris: "Kecenderungan: bullish / netral / bearish". Tulis ringkas (maks ~150 kata) dalam Bahasa Indonesia, poin padat.`,
    user: (t, d) => `Ringkas berita & makro untuk ${t} sekitar ${d}.`,
  },
  {
    id: "technical", name: "Teknikal", desc: "Tren harga & momentum", Icon: BarChart3,
    sys: (d) => `Kamu analis teknikal. Per tanggal ${d}, baca price action: tren vs moving average kunci, momentum (RSI/MACD), support/resistance penting, dan konteks volume. Cari level harga terbaru di web bila perlu; bila data minim, nalar transparan dari harga terkini yang bisa ditemukan. Akhiri satu baris: "Kecenderungan: bullish / netral / bearish". Tulis ringkas (maks ~150 kata) dalam Bahasa Indonesia, poin padat.`,
    user: (t, d) => `Beri pembacaan teknikal ${t} per ${d}.`,
  },
];

const BULL_SYS = `Kamu peneliti BULLISH dalam debat firma trading. Hanya dari laporan analis yang diberikan, bangun argumen berbasis bukti terkuat untuk POSISI BELI. Persuasif tapi jujur; akui satu risiko terbesar di baris akhir. Maks 140 kata, Bahasa Indonesia.`;
const BEAR_SYS = `Kamu peneliti BEARISH dalam debat firma trading. Hanya dari laporan analis yang diberikan, bangun argumen berbasis bukti terkuat untuk JUAL atau menjauh. Persuasif tapi jujur; akui satu penyanggah terbesar di baris akhir. Maks 140 kata, Bahasa Indonesia.`;
const REBUT_SYS = (s) => `Kamu peneliti ${s}. Kamu sudah menyampaikan argumenmu. Ini argumen lawan. Sanggah titik terlemahnya dan perkuat poin terkuatmu. Maks 100 kata, Bahasa Indonesia.`;
const TRADER_SYS = `Kamu trader. Sintesiskan laporan analis dan debat bull/bear jadi SATU proposal konkret: arah (long / flat / short — sikap riset, bukan nasihat), keyakinan (rendah/sedang/tinggi), zona entry yang disarankan, level invalidasi, dan 2–3 baris alasan. Tegas. Maks ~140 kata, Bahasa Indonesia. Ini riset, bukan nasihat keuangan.`;
const PM_SYS = `Kamu manajer portofolio & risiko — pengambil keputusan akhir. Timbang analis, debat, dan proposal trader terhadap risiko (volatilitas, likuiditas, crowding, risiko peristiwa). Jawab HANYA satu objek JSON minified, tanpa markdown, tanpa code fence, tanpa teks lain. Skema:
{"decision":"BUY"|"HOLD"|"SELL","confidence":<int 0-100>,"horizon":"<mis. swing / 1-4 minggu>","entry":"<catatan entry/pemicu singkat>","rationale":"<=40 kata Bahasa Indonesia>","risks":["<singkat>","<singkat>","<singkat>"]}
Nilai "rationale" dan "risks" wajib Bahasa Indonesia.`;

/* -------------------------------------------------------------- */
/*  Atom UI                                                        */
/* -------------------------------------------------------------- */
const STATUS = {
  idle:    { label: "Menunggu",     color: T.faint, Icon: Clock },
  running: { label: "Menganalisis", color: T.accent, Icon: Loader2 },
  done:    { label: "Selesai",      color: T.buy,   Icon: Check },
  error:   { label: "Gagal",        color: T.sell,  Icon: X },
};
function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.idle;
  const I = s.Icon;
  return (
    <span style={{
      fontFamily: MONO, fontSize: 10.5, letterSpacing: .3, color: s.color,
      background: `${s.color}12`, borderRadius: 20, padding: "3px 9px",
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      <I size={11} className={status === "running" ? "ta-spin" : ""} /> {s.label}
    </span>
  );
}
function Report({ text }) {
  if (!text) return null;
  return (
    <div style={{
      marginTop: 13, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.65, color: T.sub,
      whiteSpace: "pre-wrap", borderTop: `1px solid ${T.lineSoft}`, paddingTop: 13,
    }}>{text}</div>
  );
}
function AgentCard({ name, desc, Icon, agent, accent = T.accent }) {
  const status = agent?.status || "idle";
  const active = status === "running";
  return (
    <div className="ta-card" style={{
      background: T.card, borderRadius: 16, padding: 18,
      border: `1px solid ${active ? accent : T.line}`,
      boxShadow: active ? `0 0 0 4px ${T.accentSoft}, ${SH}` : SH_SOFT,
      transition: "border-color .3s, box-shadow .3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "grid", placeItems: "center",
            background: active ? accent : T.accentSoft, color: active ? "#fff" : accent,
            transition: "background .3s",
          }}><Icon size={17} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: 700, color: T.ink }}>{name}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: T.faint }}>{desc}</div>
          </div>
        </div>
        <StatusChip status={status} />
      </div>
      <Report text={agent?.content} />
    </div>
  );
}
function StageHead({ n, title, active }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, margin: "2px 0 16px" }}>
      <span style={{
        fontFamily: MONO, fontSize: 12, fontWeight: 600, color: active ? T.accent : T.faint,
        width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center",
        background: active ? T.accentSoft : T.lineSoft,
      }}>{n}</span>
      <h2 style={{ margin: 0, fontFamily: FONT, fontSize: 16, fontWeight: 700, color: T.ink }}>{title}</h2>
      <span style={{ flex: 1, height: 1, background: T.line }} />
    </div>
  );
}
function Flow({ active }) {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: "12px 0 18px" }}>
      <ArrowDown size={18} className={active ? "ta-bob" : ""} style={{ color: active ? T.accent : T.line, transition: "color .4s" }} />
    </div>
  );
}

/* -------------------------------------------------------------- */
/*  Keputusan                                                      */
/* -------------------------------------------------------------- */
const LABEL = { BUY: "BELI", HOLD: "TAHAN", SELL: "JUAL" };
function parseVerdict(raw) {
  if (!raw) return null;
  try {
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    if (s < 0 || e < 0) return null;
    const o = JSON.parse(raw.slice(s, e + 1));
    return o.decision ? o : null;
  } catch { return null; }
}
const box = () => ({ background: T.card, borderRadius: 18, padding: 24, border: `1px solid ${T.line}`, boxShadow: SH_SOFT });

function Verdict({ agent, ticker }) {
  if (!agent) return null;
  if (agent.status === "running")
    return <div style={box()}><span style={{ display: "flex", gap: 10, alignItems: "center", color: T.accent, fontFamily: FONT, fontSize: 14, fontWeight: 600 }}><Loader2 size={17} className="ta-spin" /> Manajer portofolio sedang menimbang…</span></div>;
  if (agent.status === "error")
    return <div style={box()}><span style={{ color: T.sell, fontFamily: MONO, fontSize: 13 }}>Gagal menyusun keputusan: {agent.content}</span></div>;

  const v = parseVerdict(agent.content);
  if (!v) return <div style={box()}><Report text={agent.content} /></div>;
  const color = v.decision === "BUY" ? T.buy : v.decision === "SELL" ? T.sell : T.hold;
  const conf = Math.max(0, Math.min(100, parseInt(v.confidence, 10) || 0));

  return (
    <div className="ta-rise" style={{
      ...box(), borderColor: `${color}55`,
      boxShadow: `0 0 0 4px ${color}12, ${SH}`,
      background: `linear-gradient(180deg, ${color}0C, ${T.card} 55%)`,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 18 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, color: T.faint, textTransform: "uppercase" }}>Keputusan akhir · {ticker}</div>
          <div style={{ fontFamily: FONT, fontSize: 54, fontWeight: 800, lineHeight: 1.04, color, letterSpacing: -1 }}>{LABEL[v.decision] || v.decision}</div>
        </div>
        <div style={{ minWidth: 200, flex: "1 1 200px", maxWidth: 340 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 11.5, color: T.sub, marginBottom: 7 }}>
            <span>KEYAKINAN</span><span style={{ color, fontWeight: 600 }}>{conf}%</span>
          </div>
          <div style={{ height: 9, background: T.lineSoft, borderRadius: 8, overflow: "hidden" }}>
            <div className="ta-fill" style={{ width: conf + "%", height: "100%", background: color, borderRadius: 8 }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 26, marginTop: 20 }}>
        <Stat label="Horizon" value={v.horizon} />
        <Stat label="Entry / Pemicu" value={v.entry} />
      </div>
      <p style={{ margin: "20px 0 0", fontFamily: FONT, fontSize: 15, lineHeight: 1.62, color: T.ink }}>{v.rationale}</p>
      {Array.isArray(v.risks) && v.risks.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, color: T.faint, marginBottom: 9, textTransform: "uppercase" }}>Risiko utama</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {v.risks.map((r, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT, fontSize: 13, color: T.sub, background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 22, padding: "6px 13px" }}>
                <AlertTriangle size={13} style={{ color: T.hold }} /> {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const Stat = ({ label, value }) => (
  <div>
    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, color: T.faint, textTransform: "uppercase" }}>{label}</div>
    <div style={{ fontFamily: MONO, fontSize: 14.5, color: T.ink, marginTop: 4 }}>{value || "—"}</div>
  </div>
);

function DebateCol({ side, sub, Icon, color, agent }) {
  const status = agent?.status || "idle";
  const active = status === "running";
  return (
    <div className="ta-card" style={{
      background: T.card, borderRadius: 16, padding: 18,
      border: `1px solid ${active ? color : status === "done" ? `${color}55` : T.line}`,
      boxShadow: active ? `0 0 0 4px ${color}14, ${SH}` : SH_SOFT, transition: "border-color .3s, box-shadow .3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", background: `${color}14`, color }}><Icon size={17} /></div>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14.5, color }}>{side}</div>
            <div style={{ fontFamily: FONT, fontSize: 12, color: T.faint }}>{sub}</div>
          </div>
        </div>
        <StatusChip status={status} />
      </div>
      <Report text={agent?.content} />
    </div>
  );
}

/* -------------------------------------------------------------- */
/*  Form bits                                                      */
/* -------------------------------------------------------------- */
const Field = ({ label, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
    <span style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: T.sub }}>{label}</span>
    {children}
  </label>
);
const inputStyle = (w) => ({ width: w, background: T.card, border: `1px solid ${T.line}`, borderRadius: 10, color: T.ink, fontFamily: MONO, fontSize: 14, padding: "11px 13px", outline: "none", boxShadow: SH_SOFT });

/* -------------------------------------------------------------- */
/*  Komponen utama                                                 */
/* -------------------------------------------------------------- */
export default function TradingAgentsApp() {
  const [ticker, setTicker] = useState("BTC");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [depth, setDepth] = useState("quick");
  const [enabled, setEnabled] = useState({ fundamentals: true, sentiment: true, news: true, technical: true });
  const [running, setRunning] = useState(false);
  const [agents, setAgents] = useState({});
  const [stage, setStage] = useState(0);
  const [err, setErr] = useState("");
  const resultsRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => { link.remove(); style.remove(); };
  }, []);

  const setAgent = (id, p) => setAgents((s) => ({ ...s, [id]: { ...(s[id] || {}), ...p } }));
  async function runAgent(id, fn) {
    setAgent(id, { status: "running", content: "" });
    try { const c = await fn(); setAgent(id, { status: "done", content: c }); return c; }
    catch (e) { setAgent(id, { status: "error", content: String(e.message || e) }); return ""; }
  }
  const safe = async (p) => { try { return await p; } catch { return ""; } };

  async function run() {
    if (!ticker.trim() || running) return;
    const tk = ticker.trim().toUpperCase();
    setRunning(true); setErr(""); setAgents({}); setStage(1);

    const desk = ANALYSTS.filter((a) => enabled[a.id]);
    if (!desk.length) { setErr("Pilih minimal satu analis."); setRunning(false); setStage(0); return; }
    const reports = await Promise.all(desk.map((a) => runAgent(a.id, () => callClaude({ system: a.sys(date), user: a.user(tk, date), useSearch: true }))));
    const good = desk.map((a, i) => ({ name: a.name, text: reports[i] })).filter((r) => r.text);
    if (!good.length) { setErr("Semua analis gagal — periksa koneksi lalu coba lagi."); setRunning(false); return; }
    const ctx = good.map((r) => `## Analis ${r.name}\n${r.text}`).join("\n\n");

    setStage(2);
    const [bull1, bear1] = await Promise.all([
      runAgent("bull", () => callClaude({ system: BULL_SYS, user: `Laporan analis untuk ${tk}:\n\n${ctx}\n\nSusun argumen BULL terkuat.` })),
      runAgent("bear", () => callClaude({ system: BEAR_SYS, user: `Laporan analis untuk ${tk}:\n\n${ctx}\n\nSusun argumen BEAR terkuat.` })),
    ]);
    let bullText = bull1, bearText = bear1;
    if (depth === "deep" && bull1 && bear1) {
      const [b2, r2] = await Promise.all([
        safe(callClaude({ system: REBUT_SYS("BULLISH"), user: `Argumenmu:\n${bull1}\n\nArgumen lawan (bear):\n${bear1}\n\nSanggah dan perkuat.` })),
        safe(callClaude({ system: REBUT_SYS("BEARISH"), user: `Argumenmu:\n${bear1}\n\nArgumen lawan (bull):\n${bull1}\n\nSanggah dan perkuat.` })),
      ]);
      if (b2) { bullText = `${bull1}\n\n— Sanggahan —\n${b2}`; setAgent("bull", { status: "done", content: bullText }); }
      if (r2) { bearText = `${bear1}\n\n— Sanggahan —\n${r2}`; setAgent("bear", { status: "done", content: bearText }); }
    }
    const debate = `### Argumen bull\n${bullText || "(kosong)"}\n\n### Argumen bear\n${bearText || "(kosong)"}`;

    setStage(3);
    const trade = await runAgent("trader", () => callClaude({ system: TRADER_SYS, user: `Aset: ${tk} · Tanggal: ${date}\n\nLaporan analis:\n${ctx}\n\nDebat riset:\n${debate}\n\nBerikan proposal posisimu.` }));

    setStage(4);
    await runAgent("portfolio", () => callClaude({ system: PM_SYS, user: `Aset: ${tk} · Tanggal: ${date}\n\nLaporan analis:\n${ctx}\n\nDebat:\n${debate}\n\nProposal trader:\n${trade || "(kosong)"}\n\nKeluarkan JSON keputusan.` }));

    setRunning(false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
  }
  const reset = () => { setAgents({}); setStage(0); setErr(""); };

  const desk = ANALYSTS.filter((a) => enabled[a.id]);
  const hasRun = Object.keys(agents).length > 0;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: FONT }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 20px 90px" }}>

        {/* header */}
        <header style={{ padding: "28px 0 6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: T.accent, display: "grid", placeItems: "center", color: "#fff", boxShadow: `0 10px 26px -8px ${T.accent}99` }}>
              <Briefcase size={19} />
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>TradingAgents</div>
              <div style={{ fontSize: 12.5, color: T.faint }}>Meja riset multi-agen</div>
            </div>
          </div>
          <a href="https://github.com/TauricResearch/TradingAgents" target="_blank" rel="noreferrer"
            style={{ fontFamily: MONO, fontSize: 11, color: T.sub, textDecoration: "none", background: T.card, border: `1px solid ${T.line}`, padding: "8px 12px", borderRadius: 9, boxShadow: SH_SOFT }}>
            ↗ TauricResearch/TradingAgents
          </a>
        </header>

        {/* hero */}
        <h1 style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, lineHeight: 1.25, margin: "22px 0 10px", maxWidth: 720, letterSpacing: -0.5 }}>
          Satu tim analis menilai sebuah aset,
          {" "}<span style={{ color: T.buy }}>bull</span> melawan <span style={{ color: T.sell }}>bear</span>,
          lalu menyimpulkan <span style={{ color: T.accent }}>satu keputusan</span>.
        </h1>
        <p style={{ fontSize: 15, color: T.sub, margin: "0 0 26px", maxWidth: 640, lineHeight: 1.6 }}>
          Empat analis AI mengumpulkan data pasar terkini, peneliti bull &amp; bear beradu argumen, lalu manajer portofolio memberi keputusan akhir beserta tingkat keyakinannya.
        </p>

        {/* panel input */}
        <div style={box()}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
            <Field label="Aset / ticker">
              <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="BTC, NVDA, ETH…" className="ta-input" style={inputStyle(130)} onKeyDown={(e) => e.key === "Enter" && run()} />
            </Field>
            <Field label="Tanggal analisis">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ta-input" style={inputStyle(160)} />
            </Field>
            <Field label="Kedalaman debat">
              <div style={{ display: "flex", background: T.lineSoft, borderRadius: 10, padding: 3, gap: 3 }}>
                {[["quick", "Cepat"], ["deep", "Mendalam"]].map(([k, l]) => (
                  <button key={k} onClick={() => setDepth(k)} style={{
                    fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: "8px 15px", cursor: "pointer", border: "none", borderRadius: 8,
                    background: depth === k ? T.card : "transparent", color: depth === k ? T.accent : T.sub,
                    boxShadow: depth === k ? SH_SOFT : "none",
                  }}>{l}</button>
                ))}
              </div>
            </Field>
            <div style={{ flex: 1 }} />
            {hasRun && !running && (
              <button onClick={reset} className="ta-btn" style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: 13.5, padding: "11px 16px", borderRadius: 10, background: T.card, color: T.sub, border: `1px solid ${T.line}`, boxShadow: SH_SOFT }}>
                <RotateCcw size={15} /> Bersihkan
              </button>
            )}
            <button onClick={run} disabled={running} className="ta-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 8, cursor: running ? "default" : "pointer",
              fontFamily: FONT, fontWeight: 700, fontSize: 14.5, padding: "12px 22px", borderRadius: 10, border: "none",
              background: running ? "#C9CCDE" : T.accent, color: "#fff", boxShadow: running ? "none" : `0 10px 24px -10px ${T.accent}`,
            }}>
              {running ? <Loader2 size={16} className="ta-spin" /> : <Play size={16} />}
              {running ? "Menganalisis…" : "Mulai analisis"}
            </button>
          </div>

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: T.sub }}>Pilih analis</span>
            {ANALYSTS.map((a) => {
              const on = enabled[a.id];
              return (
                <button key={a.id} onClick={() => setEnabled((p) => ({ ...p, [a.id]: !p[a.id] }))} style={{
                  display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", borderRadius: 10,
                  fontFamily: FONT, fontSize: 13.5, fontWeight: 500, padding: "8px 13px",
                  border: `1px solid ${on ? T.accent : T.line}`, background: on ? T.accentSoft : T.card, color: on ? T.ink : T.faint,
                }}>
                  <a.Icon size={14} style={{ color: on ? T.accent : T.faint }} /> {a.name}
                </button>
              );
            })}
          </div>
          {err && <div style={{ marginTop: 14, color: T.sell, fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>{err}</div>}
        </div>

        {/* pipeline */}
        {hasRun && (
          <div ref={resultsRef} style={{ marginTop: 38 }}>
            <StageHead n="01" title="Tim Analis" active={stage >= 1} />
            <div className="ta-grid">
              {desk.map((a) => <AgentCard key={a.id} name={a.name} desc={a.desc} Icon={a.Icon} agent={agents[a.id]} />)}
            </div>

            <Flow active={stage >= 2} />
            <StageHead n="02" title="Debat Riset" active={stage >= 2} />
            <div className="ta-debate">
              <DebateCol side="Bull" sub="Argumen beli" Icon={TrendingUp} color={T.buy} agent={agents.bull} />
              <div style={{ display: "grid", placeItems: "center" }}>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: T.faint, background: T.card, border: `1px solid ${T.line}`, borderRadius: 20, width: 38, height: 38, display: "grid", placeItems: "center", boxShadow: SH_SOFT }}>VS</span>
              </div>
              <DebateCol side="Bear" sub="Argumen jual" Icon={TrendingDown} color={T.sell} agent={agents.bear} />
            </div>

            <Flow active={stage >= 3} />
            <StageHead n="03" title="Trader" active={stage >= 3} />
            <AgentCard name="Trader" desc="Menyusun proposal posisi" Icon={Briefcase} agent={agents.trader} />

            <Flow active={stage >= 4} />
            <StageHead n="04" title="Keputusan Akhir" active={stage >= 4} />
            <Verdict agent={agents.portfolio} ticker={ticker.trim().toUpperCase()} />
          </div>
        )}

        {/* disclaimer */}
        <footer style={{ marginTop: 44, paddingTop: 20, borderTop: `1px solid ${T.line}`, display: "flex", gap: 11, alignItems: "flex-start" }}>
          <ShieldCheck size={16} style={{ color: T.faint, flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: T.faint }}>
            Alat riset &amp; edukasi — <b style={{ color: T.sub }}>bukan nasihat keuangan</b> atau ajakan trading. Agen menalar dari data web yang bisa keliru atau tidak lengkap; hasilnya probabilistik dan tidak deterministik. Verifikasi setiap angka sebelum bertindak dan atur risiko Anda sendiri. Arsitektur mengikuti <span style={{ color: T.sub }}>TauricResearch/TradingAgents</span>, diimplementasikan ulang di Claude API.
          </p>
        </footer>
      </div>
    </div>
  );
}

const CSS = `
  .ta-spin { animation: ta-spin 1s linear infinite; }
  @keyframes ta-spin { to { transform: rotate(360deg); } }
  .ta-bob { animation: ta-bob 1.4s ease-in-out infinite; }
  @keyframes ta-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
  .ta-rise { animation: ta-rise .5s cubic-bezier(.2,.7,.2,1); }
  @keyframes ta-rise { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  .ta-card { animation: ta-rise .4s ease both; }
  .ta-fill { transition: width .9s cubic-bezier(.2,.7,.2,1); }
  .ta-input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 4px ${T.accentSoft} !important; }
  .ta-btn:focus-visible, .ta-input:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; }
  .ta-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:13px; }
  .ta-debate { display:grid; grid-template-columns:1fr 56px 1fr; gap:11px; align-items:stretch; }
  @media (max-width:840px){ .ta-grid{grid-template-columns:repeat(2,1fr)} }
  @media (max-width:600px){
    .ta-grid{grid-template-columns:1fr}
    .ta-debate{grid-template-columns:1fr}
    .ta-debate>div:nth-child(2){padding:2px 0}
  }
  @media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }
  ::selection { background:${T.accent}33; }
`;
