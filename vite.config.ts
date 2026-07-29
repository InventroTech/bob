/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind IPv4 only — host "::" also listens on IPv6 and can leave two
    // competing Vite instances on :8080 (localhost often prefers ::1).
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Generate source maps for better Sentry error reporting
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
}));
