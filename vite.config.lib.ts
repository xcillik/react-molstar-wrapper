import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import autoprefixer from "autoprefixer";
import preserveDirectives from "rollup-preserve-directives";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      include: ["lib"],
      tsconfigPath: "tsconfig.app.json",
      outDir: "dist/types",
    }),
  ],
  css: {
    postcss: {
      plugins: [autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./lib"),
    },
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, "lib/index.ts"),
        components: path.resolve(__dirname, "lib/index.ts"),
        hooks: path.resolve(__dirname, "lib/index.ts"),
      },
      name: "ReactMolstarWrapper",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
      // cssFileName: ""
    },
    sourcemap: true,
    minify: false,
    copyPublicDir: false,
    rollupOptions: {
      plugins: [preserveDirectives()],
      external: ["react", "react-dom", /^molstar(\/|$)/],
      output: {
        globals: {
          react: "react",
          "react-dom": "ReactDOM",
          molstar: "molstar",
          "react/jsx-runtime": "jsxRuntime",
        },
        inlineDynamicImports: false,
      },
    },
  },
});
