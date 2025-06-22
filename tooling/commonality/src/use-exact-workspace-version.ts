import type { Check, PackageJson } from "commonality";

import { json } from "commonality";

export default {
	level: "error",
	message: "Workspace dependencies must use exact version",
	validate: async (context) => {
		const currentWorkspace = await json<PackageJson>(context.package.path, "package.json").get();

		if (!currentWorkspace) {
			return false;
		}

		const workspaceDependenciesWithoutExactVersion = Object.entries({
			...currentWorkspace.dependencies,
			...currentWorkspace.devDependencies,
		})
			.filter(([name, version]) => {
				if (!name.startsWith("@vite-rsc-experiments/")) {
					return false;
				}

				const maybeMajorVersionNumber = Number(version.at("workspace:*".length - 1));

				return Number.isNaN(maybeMajorVersionNumber);
			})
			.map(([name]) => name);

		if (workspaceDependenciesWithoutExactVersion.length > 0) {
			return {
				message: `These workspace dependencies, should use exact "workspace:" protocol versioning: ${workspaceDependenciesWithoutExactVersion.join(", ")}`,
				path: "package.json",
			};
		}

		return true;
	},
} satisfies Check;
