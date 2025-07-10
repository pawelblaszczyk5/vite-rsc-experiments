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
		// eslint-disable-next-line no-secrets/no-secrets -- that's link with commit hash to specific place which probably breaks the plugin and why this fix is needed
		// https://github.com/vanilla-extract-css/vanilla-extract/blob/c907c109496635beec363418d1d341deb41c47c0/packages/vite-plugin/src/index.ts#L245
		{
			async hotUpdate(context) {
				if (this.environment.name !== "rsc" || !context.file.includes(".css.")) {
					return;
				}

				const mods = context.modules[0]?.importedModules;
				const clientEnvironment = context.server.environments.client;

				if (!mods) {
					return;
				}

				for (const mod of mods) {
					if (!mod.file?.endsWith(".vanilla.css")) {
						return;
					}

					const clientMods = clientEnvironment.moduleGraph.getModulesByFile(mod.file);

					for (const clientModule of clientMods ?? []) {
						// Originally `xxx.css.ts` doesn't exist in client environment since server style system directly pass `xxx.css.ts.virtual.css` to client. Here we ensure it's processed on client so that vanilla-extract HMR works.
						await clientEnvironment.transformRequest(context.file);
						await clientEnvironment.reloadModule(clientModule);
					}
				}
			},
			name: "fix-vanilla-extract",
		},
		rsc(),
		react(),
		vanillaExtractPlugin(),
		inspect(),
	],
});
