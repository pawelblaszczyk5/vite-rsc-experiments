import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from "@vitejs/plugin-rsc/browser";
import { getRscStreamFromHtml } from "@vitejs/plugin-rsc/rsc-html-stream/browser";
import { startTransition, StrictMode, useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";

import type { RscPayload } from "#src/framework/entry.rsc.js";

const handleLinkClick = (event: MouseEvent) => {
	const link = (event.target as Element).closest("a");

	if (
		link
		&& link instanceof HTMLAnchorElement
		&& link.href
		&& (!link.target || link.target === "_self")
		&& link.origin === location.origin
		&& !link.hasAttribute("download")
		&& event.button === 0
		&& !event.metaKey
		&& !event.ctrlKey
		&& !event.altKey
		&& !event.shiftKey
		&& !event.defaultPrevented
	) {
		event.preventDefault();
		history.pushState(null, "", link.href);
	}
};

function listenNavigation(onNavigation: () => void) {
	globalThis.addEventListener("popstate", onNavigation);

	// eslint-disable-next-line @typescript-eslint/unbound-method -- this is explicitly bound later
	const oldPushState = globalThis.history.pushState;

	globalThis.history.pushState = function (...arguments_) {
		// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- this is for compatibility
		const result = oldPushState.apply(this, arguments_);

		onNavigation();
		return result;
	};

	// eslint-disable-next-line @typescript-eslint/unbound-method -- this is explicitly bound later
	const oldReplaceState = globalThis.history.replaceState;

	globalThis.history.replaceState = function (...arguments_) {
		// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- this is for compatibility
		const result = oldReplaceState.apply(this, arguments_);

		onNavigation();
		return result;
	};

	document.addEventListener("click", handleLinkClick);

	return () => {
		document.removeEventListener("click", handleLinkClick);
		globalThis.removeEventListener("popstate", onNavigation);
		globalThis.history.pushState = oldPushState;
		globalThis.history.replaceState = oldReplaceState;
	};
}

const main = async () => {
	let setPayload: (value: RscPayload) => void;

	const initialPayload = await createFromReadableStream<RscPayload>(getRscStreamFromHtml());

	const fetchRscPayload = async () => {
		const payload = await createFromFetch<RscPayload>(fetch(globalThis.location.href));

		setPayload(payload);
	};

	// eslint-disable-next-line @typescript-eslint/promise-function-async -- that's fine there
	const BrowserRoot = () => {
		const [payload, setPayload_] = useState(initialPayload);

		useEffect(() => {
			setPayload = (value) => {
				startTransition(() => {
					setPayload_(value);
				});
			};
		}, []);

		useEffect(() => listenNavigation(async () => fetchRscPayload()), []);

		return payload.root;
	};

	setServerCallback(async (id, arguments_) => {
		const url = new URL(globalThis.location.href);
		const temporaryReferences = createTemporaryReferenceSet();
		const payload = await createFromFetch<RscPayload>(
			fetch(url, {
				body: await encodeReply(arguments_, { temporaryReferences }),
				headers: { "x-rsc-action": id },
				method: "POST",
			}),
			{ temporaryReferences },
		);

		setPayload(payload);
		return payload.returnValue;
	});

	const browserRoot = (
		<StrictMode>
			<BrowserRoot />
		</StrictMode>
	);

	hydrateRoot(document, browserRoot, { ...(initialPayload.formState ? { formState: initialPayload.formState } : {}) });

	if (import.meta.hot) {
		import.meta.hot.on("rsc:update", () => {
			void fetchRscPayload();
		});
	}
};

void main();
