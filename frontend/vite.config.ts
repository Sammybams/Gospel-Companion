import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("@fluentui/react-icons")) {
            return "fluentui-icons";
          } else if (id.includes("@fluentui/react")) {
            return "fluentui-react";
          } else if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },

    target: "esnext",
  },
  server: {
    proxy: {
      "/content/": "http://localhost:50505",
      "/ask": "http://localhost:50505",
      "/chat": "http://localhost:50505",
      "/config": "http://localhost:50505",
    },
  },
});
