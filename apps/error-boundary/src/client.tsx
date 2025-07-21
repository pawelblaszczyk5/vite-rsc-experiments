"use client";

import { use } from "react";

export const PromiseNumberDisplay = ({ promise }: { readonly promise: Promise<number> }) => {
	const value = use(promise);

	return <p>Awaited value is: {value}</p>;
};
