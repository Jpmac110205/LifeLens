import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  // Use one .env for application mode, independently of Vite's build mode.
  const env = loadEnv("", process.cwd(), "");
  const mode = env.APP_MODE;
  if (mode !== "local" && mode !== "production") {
    throw new Error("Set APP_MODE to local or production in .env.");
  }
  const appUrl = mode === "local" ? env.LOCAL_APP_URL : env.PRODUCTION_APP_URL;
  if (!appUrl) throw new Error(`Missing ${mode === "local" ? "LOCAL_APP_URL" : "PRODUCTION_APP_URL"} in .env.`);
  const localUrl = new URL(env.LOCAL_APP_URL);
  const apiUrl = mode === "local" ? "/api" : new URL(appUrl).origin;

  return {
    plugins: [react()],
    // Expose only the resolved public URL, never the server environment.
    define: { "import.meta.env.VITE_API_URL": JSON.stringify(apiUrl) },
    server: {
      host: localUrl.hostname,
      port: Number(localUrl.port),
      strictPort: true,
      proxy: {
        "/api": {
          target: env.LOCAL_API_URL,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
