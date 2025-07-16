import n from "eslint-plugin-n";

import tseslint from "typescript-eslint";

export default tseslint.config(n.configs["flat/recommended"], {
	name: "n overrides",
	rules: {
		"n/no-missing-import": "off",
		"n/no-unpublished-import": "off",
		"n/no-path-concat": "error",
		"n/no-process-env": "error",
		"n/no-unsupported-features/es-builtins": ["error", { ignores: [] }],
		"n/no-unsupported-features/node-builtins": [
			"error",
			{ ignores: ["ReadableStreamDefaultController", "ReadableStream", "URL.createObjectURL", "navigator"] },
		],
		"n/prefer-global/buffer": "error",
		"n/prefer-promises/dns": "error",
		"n/prefer-promises/fs": "error",
	},
	settings: { node: { version: "24.3.0" } },
});
