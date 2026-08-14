import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Pre-compress every static asset to both gzip (.gz) and brotli (.br) in a
// single pass. Two separate viteCompression() instances share a module-level
// mtimeCache, so the second instance (brotli) skips every file after gzip
// marks them as fresh — producing zero .br files. Doing both here avoids that.
function precompressAssets() {
  const EXT_RE = /\.(js|mjs|cjs|json|css|html)$/i;
  let outDir = "";
  return {
    name: "vite:precompress-assets",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const files = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          const st = statSync(p);
          if (st.isDirectory()) walk(p);
          else if (EXT_RE.test(name)) files.push(p);
        }
      };
      walk(outDir);
      for (const file of files) {
        const buf = readFileSync(file);
        if (buf.length < 1024) continue; // same threshold as before
        writeFileSync(file + ".gz", gzipSync(buf));
        writeFileSync(file + ".br", brotliCompressSync(buf));
      }
      console.log(
        `[precompress] gzip + brotli written for ${files.filter(
          (f) => statSync(f).size >= 1024
        ).length} assets`
      );
    },
  };
}

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
    // NOTE: no manualChunks here. A manualChunks catch-all that names every
    // node_modules package causes Rolldown to hoist ALL named vendor chunks
    // (including lazy-only libs like tiptap, motion, pdfjs, jszip) into the
    // static imports of every chunk — so the landing page downloads the
    // rich-text editor and PDF parser it never uses. Rolldown's automatic
    // code-splitting keeps lazy route dependencies properly lazy.
    precompressAssets(),
  ],
  build: {},
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
}));
