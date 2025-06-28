import core from "@vite-rsc-experiments/eslint-config/core";
import react from "@vite-rsc-experiments/eslint-config/react";
import node from "@vite-rsc-experiments/eslint-config/node";

export default [
	{ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
	...core,
	...react,
	...node,
	{
		files: ["vite.config.ts", "src/framework/entry.rsc.tsx", "src/use-cache-runtime.tsx"],
		rules: { "import-x/no-default-export": "off" },
	},
	{ files: ["src/**"], rules: { "@typescript-eslint/require-await": "off" } },
];
