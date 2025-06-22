"use client";

import { useState } from "react";

export const ClientCounter = () => {
	const [count, setCount] = useState(0);

	return (
		<button
			onClick={() => {
				setCount((count) => count + 1);
			}}
			type="button"
		>
			Client Counter: {count}
		</button>
	);
};
