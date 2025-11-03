import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import viteImagemin from "vite-plugin-imagemin";
import { buildConfig } from "./server/config/index.js";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(buildConfig.CARTOGRAPHER_ENABLED
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
    // Image optimization - only runs during production builds to keep dev builds fast
    // Reduces image file sizes by 30-50% and improves Core Web Vitals (LCP, CLS)
    ...(buildConfig.IMAGE_OPTIMIZATION_ENABLED
      ? [
          viteImagemin({
            gifsicle: {
              optimizationLevel: 7,
              interlaced: false,
            },
            optipng: {
              optimizationLevel: 7,
            },
            mozjpeg: {
              quality: 80,
            },
            pngquant: {
              quality: [0.8, 0.9],
              speed: 4,
            },
            svgo: {
              plugins: [
                {
                  name: 'removeViewBox',
                  active: false,
                },
              ],
            },
            webp: {
              quality: 85,
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: 'public',
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    copyPublicDir: true,
    sourcemap: false,
    // Code splitting optimization for better LCP and FID
    // Manual chunking reduces initial bundle size and improves load performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries - loaded on every page
          'vendor': ['react', 'react-dom'],
          // UI component libraries - lazy loaded when needed
          'ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select'
          ],
          // Data fetching library - used across most features
          'query': ['@tanstack/react-query']
        }
      },
      onwarn(warning, warn) {
        // Suppress source map warnings
        if (warning.code === 'SOURCEMAP_ERROR') return;
        warn(warning);
      }
    }
  },
  esbuild: {
    logLevel: 'error',
    logOverride: {
      'unsupported-source-map-comment': 'silent'
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // HMR and WebSocket configuration - disable when HMR_ENABLED is false
    ...(buildConfig.HMR_ENABLED ? {} : { hmr: false, ws: false }),
  },
  // Disable client-side refresh in Replit environment
  ...(process.env.REPL_ID && {
    define: {
      'import.meta.hot': 'undefined',
    },
  }),
});
