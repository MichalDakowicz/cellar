import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import { assertRendererModule } from "./src/rendererBoundary.mts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname, ".."), "EXPO_PUBLIC_");
  return {
    plugins: [
      {
        name: "cellar-renderer-boundary",
        generateBundle() {
          const modules = [...this.getModuleIds()];
          modules.forEach(assertRendererModule);
          this.emitFile({
            type: "asset",
            fileName: "module-graph.json",
            source: JSON.stringify(
              modules.map((id) =>
                id
                  .replaceAll("\\", "/")
                  .replace(
                    resolve(import.meta.dirname, "..").replaceAll("\\", "/") +
                      "/",
                    "",
                  ),
              ),
              null,
              2,
            ),
          });
        },
      },
    ],
    base: "/",
    resolve: { alias: { "@": resolve(import.meta.dirname, "../src") } },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_URL ?? "",
      ),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      ),
    },
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    build: {
      outDir: "renderer-dist",
      sourcemap: true,
      rollupOptions: { input: "index.html" },
    },
  };
});
