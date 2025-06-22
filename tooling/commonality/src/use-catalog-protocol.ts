import type { Check, PackageJson } from "commonality";

import { json } from "commonality";

export default {
	level: "error",
	message: 'Dependencies shared across workspaces must use "catalog:" protocol',
	validate: async (context) => {
		const currentWorkspace = await json<PackageJson>(context.package.path, "package.json").get();

		if (!currentWorkspace) {
			return false;
		}

		const currentWorkspaceDependencies = Object.entries({
			...currentWorkspace.dependencies,
			...currentWorkspace.devDependencies,
		})
			.filter(([name, version]) => !version.startsWith("catalog:") && !name.startsWith("@vite-rsc-experiments/"))
			.map(([name]) => name);

		const otherWorkspaces = await Promise.all(
			context.allPackages
				.filter((workspace) => workspace.path !== context.package.path)
				.map(async (workspace) => json<PackageJson>(workspace.path, "package.json").get()),
		);

		const otherWorkspacesDependencies = new Set(
			otherWorkspaces
				.filter((workspace) => workspace !== undefined)
				.flatMap((workspace) => Object.keys({ ...workspace.dependencies, ...workspace.devDependencies })),
		);

		const reusedDependenciesAcrossWorkspaces = currentWorkspaceDependencies.filter((dependency) =>
			otherWorkspacesDependencies.has(dependency),
		);

		if (reusedDependenciesAcrossWorkspaces.length > 0) {
			return {
				message: `These dependencies are reused across workspaces, they should use "catalog:" protocol: ${reusedDependenciesAcrossWorkspaces.join(", ")}`,
				path: "package.json",
			};
		}

		return true;
	},
} satisfies Check;
