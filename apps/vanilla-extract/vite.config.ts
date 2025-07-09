import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";
import inspect from "vite-plugin-inspect";

export default defineConfig({
	environments: {
		client: { build: { rollupOptions: { input: { index: "./src/framework/entry.browser.tsx" } } } },
		rsc: { build: { rollupOptions: { input: { index: "./src/framework/entry.rsc.tsx" } } } },
		ssr: { build: { rollupOptions: { input: { index: "./src/framework/entry.ssr.tsx" } } } },
	},
	plugins: [rsc(), react(), vanillaExtractPlugin(), inspect()],
});
