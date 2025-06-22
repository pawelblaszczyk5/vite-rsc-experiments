import type { Check, PackageJson } from "commonality";

import { json } from "commonality";

export default {
	level: "error",
	message: `Package must have a non-empty "description" field in package.json`,
	validate: async (context) => {
		const packageJson = await json<PackageJson>(context.package.path, "package.json").get();

		if (!packageJson) {
			return false;
		}

		const fieldValue = packageJson.description;

		return typeof fieldValue === "string" && fieldValue.length > 0;
	},
} satisfies Check;
