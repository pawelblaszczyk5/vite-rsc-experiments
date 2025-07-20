"use client";

import { useState } from "react";

import { getServerCounter } from "#src/action.js";

export const ClientCounter = () => {
	const [count, setCount] = useState(0);

	return (
		<button
			onClick={() => {
				setCount((count) => count + 1);

				// eslint-disable-next-line no-console -- just to check source maps
				console.log("you can check this in source maps");

				// eslint-disable-next-line no-console -- just to check source maps
				void getServerCounter().then(console.log);
			}}
			type="button"
		>
			Client Counter: {count}
		</button>
	);
};
