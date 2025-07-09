// @ts-expect-error - untyped module
import stylexPlugin from "@stylexjs/postcss-plugin";
import react from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";
import inspect from "vite-plugin-inspect";

const typedStylexPlugin = stylexPlugin as (options: {
	babelConfig?: unknown;
	cwd?: string;
	exclude?: Array<string>;
	include?: Array<string>;
	useCSSLayers?: boolean;
}) => never;

const babelConfig = {
	plugins: [
		["@babel/plugin-syntax-jsx", {}],
		["@stylexjs/babel-plugin", { treeshakeCompensation: true, unstable_moduleResolution: { type: "commonJS" } }],
	],
	presets: ["@babel/preset-typescript"],
};

export default defineConfig({
	css: {
		postcss: {
			plugins: [
				typedStylexPlugin({
					babelConfig: { babelrc: false, ...babelConfig },
					include: ["./src/**/*.{js,jsx,ts,tsx}"],
					useCSSLayers: true,
				}),
			],
		},
	},
	environments: {
		client: { build: { rollupOptions: { input: { index: "./src/framework/entry.browser.tsx" } } } },
		rsc: { build: { rollupOptions: { input: { index: "./src/framework/entry.rsc.tsx" } } } },
		ssr: { build: { rollupOptions: { input: { index: "./src/framework/entry.ssr.tsx" } } } },
	},
	plugins: [rsc(), react({ babel: babelConfig }), inspect()],
});
