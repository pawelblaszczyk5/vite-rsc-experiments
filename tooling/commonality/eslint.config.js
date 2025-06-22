import core from "@vite-rsc-experiments/eslint-config/core";

export default [
	{ languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } } },
	...core,
	{ files: ["src/*.ts"], rules: { "import-x/no-default-export": "off" } },
];
