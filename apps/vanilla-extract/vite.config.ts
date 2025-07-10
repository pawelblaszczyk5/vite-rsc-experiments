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
	plugins: [
		// workaround?
		// https://github.com/vanilla-extract-css/vanilla-extract/blob/c907c109496635beec363418d1d341deb41c47c0/packages/vite-plugin/src/index.ts#L245
		{
			name: "fix-vanilla-extract",
			async hotUpdate(ctx) {
				if (this.environment.name === "rsc") {
					if (ctx.file.includes(".css.")) {
						const mods = ctx.modules[0]?.importedModules;
						const clientEnvironment = ctx.server.environments.client;
						for (const mod of mods ?? []) {
							if (mod.file?.endsWith(".vanilla.css")) {
								const clientMods = clientEnvironment.moduleGraph.getModulesByFile(mod.file);
								for (const clientMod of clientMods ?? []) {
									// Originally `xxx.css.ts` doesn't exist in client environment
									// since server style system directly pass `xxx.css.ts.virtual.css` to client.
									// Here we ensure it's processed on client so that vanilla-extract HMR works.
									await clientEnvironment.transformRequest(ctx.file);
									clientEnvironment.reloadModule(clientMod);
								}
							}
						}
					}
				}
			},
		},
		rsc(),
		react(),
		vanillaExtractPlugin(),
		inspect(),
	],
});
