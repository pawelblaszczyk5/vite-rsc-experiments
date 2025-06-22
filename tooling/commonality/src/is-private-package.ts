import type { Check, PackageJson } from "commonality";

import { json } from "commonality";

export default {
	level: "error",
	message: `Package must be private`,
	validate: async (context) => {
		const packageJson = await json<PackageJson>(context.package.path, "package.json").get();

		if (!packageJson) {
			return false;
		}

		const fieldValue = packageJson.private;

		return fieldValue === true;
	},
} satisfies Check;
