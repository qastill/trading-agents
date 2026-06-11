import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Ambil ANTHROPIC_API_KEY dari .env (tanpa prefix VITE_ → tetap di server, tak
  // pernah dikirim ke browser).
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.ANTHROPIC_API_KEY || "";

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Browser memanggil /api/anthropic/* → diteruskan ke api.anthropic.com
        // dengan header autentikasi disuntik di sisi server.
        "/api/anthropic": {
          target: "https://api.anthropic.com",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/anthropic/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (apiKey) proxyReq.setHeader("x-api-key", apiKey);
              proxyReq.setHeader("anthropic-version", "2023-06-01");
            });
          },
        },
      },
    },
  };
});
