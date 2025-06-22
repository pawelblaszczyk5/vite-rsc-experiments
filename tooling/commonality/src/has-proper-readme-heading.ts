import type { Check, PackageJson } from "commonality";

import { json, text } from "commonality";

export default {
	level: "error",
	message: "Readme must start with a heading that matches the package name",
	validate: async (context) => {
		const packageJson = await json<PackageJson>(context.package.path, "package.json").get();

		if (!packageJson) {
			return false;
		}

		const packageName = packageJson.name;

		if (!packageName) {
			return false;
		}

		const readme = await text(context.package.path, "README.md").get();

		if (!readme) {
			return false;
		}

		return readme.indexOf(`# ${packageName}`) === 0;
	},
} satisfies Check;
