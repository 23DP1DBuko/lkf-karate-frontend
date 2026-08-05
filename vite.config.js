import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // Only enable PWA service worker in production builds
    ...(command === 'build' ? [VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "LKF Academy",
        short_name: "LKF Academy",
        description:
          "Karate judges and competition secretaries qualification platform",
        theme_color: "#1d4ed8",
        background_color: "#f3f4f6",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/lkf-karate-backend\.onrender\.com\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    })] : []),
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024, // only compress files > 1 kB
    }),
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("@tiptap")) return "tiptap-vendor";
            if (id.includes("@tanstack")) return "query-vendor";
            if (id.includes("@heroicons")) return "icons-vendor";
            if (id.includes("motion")) return "motion-vendor";
            if (id.includes("react-dom") || id.includes("react-router"))
              return "react-vendor";
            if (id.includes("axios")) return "axios";
            return "vendor";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
}));
