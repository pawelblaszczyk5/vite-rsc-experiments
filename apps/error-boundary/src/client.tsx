"use client";

import type { ReactNode } from "react";

import { Component, use } from "react";

export const PromiseNumberDisplay = ({ promise }: { readonly promise: Promise<number> }) => {
	const value = use(promise);

	return <p>Awaited value is: {value}</p>;
};

export class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }> {
	override state = { hasError: false };

	static getDerivedStateFromError = () => ({ hasError: true });

	// eslint-disable-next-line @typescript-eslint/promise-function-async -- that's painful
	override render() {
		if (this.state.hasError) {
			return this.props.fallback;
		}

		return this.props.children;
	}
}
