import type { Plugin } from "vite";

import { transformHoistInlineDirective } from "@hiogawa/transforms";
import rsc from "@hiogawa/vite-rsc/plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, parseAstAsync } from "vite";
import inspect from "vite-plugin-inspect";

const vitePluginUseCache = (): Array<Plugin> => [
	{
		name: "use-cache",
		transform: async (code) => {
			if (!code.includes("use cache")) {
				return;
			}
			const ast = await parseAstAsync(code);
			const result = transformHoistInlineDirective(code, ast, {
				directive: "use cache",
				noExport: true,
				rejectNonAsyncFunction: true,
				runtime: (value) => `__vite_rsc_cache(${value})`,
			});

			if (!result.output.hasChanged()) {
				return;
			}
			result.output.prepend(`import __vite_rsc_cache from "#src/use-cache-runtime";`);
			return { code: result.output.toString(), map: result.output.generateMap({ hires: "boundary" }) };
		},
	},
];

export default defineConfig({
	environments: {
		client: { build: { rollupOptions: { input: { index: "./src/framework/entry.browser.tsx" } } } },
		rsc: { build: { rollupOptions: { input: { index: "./src/framework/entry.rsc.tsx" } } } },
		ssr: { build: { rollupOptions: { input: { index: "./src/framework/entry.ssr.tsx" } } } },
	},
	plugins: [rsc(), react(), inspect(), vitePluginUseCache()],
});
