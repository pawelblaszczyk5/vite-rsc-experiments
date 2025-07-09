"use client";

import type { ReactNode } from "react";

import * as stylex from "@stylexjs/stylex";
import { startTransition, useState } from "react";

import { getAdditionalContent } from "#src/action.js";
import { theme } from "#src/theme.stylex.js";

const styles = stylex.create({
	button: { backgroundColor: theme.tertiaryColor, borderStyle: "none", color: theme.primaryColor },
});

export const ClientCounter = () => {
	const [additionalContent, setAdditionalContent] = useState<null | ReactNode>(null);

	return (
		<div>
			<button
				onClick={() => {
					startTransition(async () => {
						const content = await getAdditionalContent();

						setAdditionalContent(content);
					});
				}}
				type="button"
				{...stylex.props(styles.button)}
			>
				Load more content
			</button>
			{additionalContent}
		</div>
	);
};
