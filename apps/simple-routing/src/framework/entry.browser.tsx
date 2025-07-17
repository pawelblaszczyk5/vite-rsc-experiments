import type { ReactNode } from "react";

import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from "@vitejs/plugin-rsc/browser";
import { getRscStreamFromHtml } from "@vitejs/plugin-rsc/rsc-html-stream/browser";
import { unstable_Activity as Activity, startTransition, StrictMode, use, useEffect, useState } from "react";
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

function listenUrlChange(onUrlChange: (type: "navigate" | "traverse") => void) {
	const onNavigation = onUrlChange.bind(null, "navigate");
	const onTraverse = onUrlChange.bind(null, "traverse");

	globalThis.addEventListener("popstate", onTraverse);

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

interface NavigationAction {
	type: "NAVIGATION";
	url: string;
}

interface TraverseAction {
	type: "TRAVERSE";
	url: string;
}

interface PreloadAction {
	type: "PRELOAD";
	url: string;
}

interface CallServerAction {
	args: Array<unknown>;
	id: string;
	reject: (value: unknown) => void;
	resolve: (value: unknown) => void;
	type: "CALL_SERVER";
}

interface HmrAction {
	type: "HMR";
}

interface PatchAction {
	root: ReactNode;
	type: "PATCH";
}

type RouterAction = CallServerAction | HmrAction | NavigationAction | PatchAction | PreloadAction | TraverseAction;

interface RouterState {
	entries: Array<{ pendingRevalidation: boolean; root: ReactNode; url: string }>;
	externalUrl: string;
	internalUrl: string;
}

interface ActionQueueNode {
	discarded: boolean;
	payload: RouterAction;
	reject: (error: unknown) => void;
	resolve: (state: RouterState) => void;
}

interface ActionQueue {
	dispatch: (payload: RouterAction, setState: (state: Promise<RouterState> | RouterState) => void) => void;
	pending: ActionQueueNode | null;
	state: RouterState;
}

const isThenable = <T,>(maybePromise: Promise<T> | T): maybePromise is Promise<T> =>
	maybePromise !== null
	&& typeof maybePromise === "object"
	&& "then" in maybePromise
	&& typeof maybePromise.then === "function";

const fetchRscPayload = async (url: string) => {
	const payload = await createFromFetch<RscPayload>(fetch(url));

	return payload;
};

const actionReducer: (state: RouterState, payload: RouterAction) => Promise<RouterState> | RouterState = async (
	state,
	payload,
) => {
	switch (payload.type) {
		case "CALL_SERVER": {
			const temporaryReferences = createTemporaryReferenceSet();

			try {
				const result = await createFromFetch<RscPayload>(
					fetch(state.internalUrl, {
						body: await encodeReply(payload.args, { temporaryReferences }),
						headers: { "x-rsc-action": payload.id },
						method: "POST",
					}),
					{ temporaryReferences },
				);

				payload.resolve(result.returnValue);

				const newEntries = state.entries
					.filter((entry) => entry.url !== state.internalUrl)
					.map((entry) => ({ ...entry, pendingRevalidation: true }));

				newEntries.push({ pendingRevalidation: false, root: result.root, url: state.internalUrl });

				return { entries: newEntries, externalUrl: state.internalUrl, internalUrl: state.internalUrl };
			} catch (error) {
				payload.reject(error);

				return state;
			}
		}
		case "HMR": {
			try {
				const result = await fetchRscPayload(state.internalUrl);

				const newEntries = state.entries.filter((entry) => entry.url !== state.internalUrl);

				newEntries.push({ pendingRevalidation: false, root: result.root, url: state.internalUrl });

				return { entries: newEntries, externalUrl: state.internalUrl, internalUrl: state.internalUrl };
			} catch {
				return state;
			}
		}
		case "NAVIGATION": {
			try {
				const result = await fetchRscPayload(payload.url);

				const newEntries = state.entries.filter((entry) => entry.url !== payload.url);

				newEntries.push({ pendingRevalidation: false, root: result.root, url: payload.url });

				return { entries: newEntries, externalUrl: payload.url, internalUrl: payload.url };
			} catch {
				return state;
			}
		}
		case "PRELOAD": {
			try {
				const result = await fetchRscPayload(payload.url);

				const newEntries = state.entries.filter((entry) => entry.url !== payload.url);

				newEntries.push({ pendingRevalidation: false, root: result.root, url: payload.url });

				return { entries: newEntries, externalUrl: state.externalUrl, internalUrl: state.internalUrl };
			} catch {
				return state;
			}
		}
		case "TRAVERSE": {
			return { entries: state.entries, externalUrl: payload.url, internalUrl: payload.url };
		}
		case "PATCH": {
			const newEntries = state.entries.filter((entry) => entry.url !== state.internalUrl);

			newEntries.push({ pendingRevalidation: false, root: payload.root, url: state.internalUrl });

			return { entries: newEntries, externalUrl: state.externalUrl, internalUrl: state.internalUrl };
		}
	}
};

const createActionQueue = (initialState: RouterState) => {
	const actionQueue: ActionQueue = {
		dispatch: (payload, setState) => {
			const previousNode = actionQueue.pending;

			if (previousNode) {
				previousNode.discarded = true;
			}

			let resolvers: Pick<ActionQueueNode, "reject" | "resolve"> = {
				reject: () => {
					// Synchronous action can't reject
				},
				resolve: setState,
			};

			if (payload.type !== "TRAVERSE") {
				const deferred = Promise.withResolvers<RouterState>();

				resolvers = { reject: deferred.reject, resolve: deferred.resolve };

				startTransition(() => {
					setState(deferred.promise);
				});
			}

			actionQueue.pending = { discarded: false, payload, reject: resolvers.reject, resolve: resolvers.resolve };

			const currentNode = actionQueue.pending;

			const handleResult = (nextState: RouterState) => {
				if (currentNode.discarded) {
					return;
				}

				actionQueue.state = nextState;
				currentNode.resolve(nextState);
			};

			const result = actionReducer(actionQueue.state, payload);

			if (isThenable(result)) {
				result.then(handleResult).catch(currentNode.reject);

				return;
			}

			handleResult(result);
		},
		pending: null,
		state: initialState,
	};

	return actionQueue;
};

let dispatch: ((payload: RouterAction) => void) | null = null;

const dispatchRouterAction = (payload: RouterAction) => {
	if (dispatch === null) {
		throw new Error("Router action dispatched before initialization");
	}

	dispatch(payload);
};

const useRouterState = (actionQueue: ActionQueue) => {
	const [state, setState] = useState<Promise<RouterState> | RouterState>(actionQueue.state);

	useEffect(() => {
		dispatch = (payload) => {
			actionQueue.dispatch(payload, setState);
		};
	}, [setState, actionQueue]);

	return isThenable(state) ? use(state) : state;
};

const main = async () => {
	const url = globalThis.location.pathname + globalThis.location.search;
	const initialPayload = await createFromReadableStream<RscPayload>(getRscStreamFromHtml());

	const actionQueue = createActionQueue({
		entries: [{ pendingRevalidation: false, root: initialPayload.root, url }],
		externalUrl: url,
		internalUrl: url,
	});

	const BrowserRoot = () => {
		const state = useRouterState(actionQueue);

		useEffect(
			() =>
				listenUrlChange(async (type) => {
					const url = globalThis.location.pathname + globalThis.location.search;

					if (type === "navigate") {
						dispatchRouterAction({ type: "NAVIGATION", url });
						return;
					}

					dispatchRouterAction({ type: "TRAVERSE", url });
				}),
			[],
		);

		const currentEntry = state.entries.find((entry) => entry.url === state.internalUrl);

		if (!currentEntry) {
			throw new Error("Entry must always exist for a given URL");
		}

		if (currentEntry.pendingRevalidation) {
			const patchPromise = fetchRscPayload(state.internalUrl).then((result) => {
				dispatchRouterAction({ root: result.root, type: "PATCH" });

				return;
			});

			currentEntry.pendingRevalidation = false;

			use(patchPromise);
		}

		return state.entries.map((entry) => (
			<Activity key={entry.url} mode={entry.url === state.internalUrl ? "visible" : "hidden"}>
				{entry.root}
			</Activity>
		));
	};

	setServerCallback(
		async (id, args) =>
			new Promise((resolve, reject) => {
				dispatchRouterAction({ args, id, reject, resolve, type: "CALL_SERVER" });
			}),
	);

	const browserRoot = (
		<StrictMode>
			<BrowserRoot />
		</StrictMode>
	);

	hydrateRoot(document, browserRoot, { ...(initialPayload.formState ? { formState: initialPayload.formState } : {}) });

	if (import.meta.hot) {
		import.meta.hot.on("rsc:update", () => {
			dispatchRouterAction({ type: "HMR" });
		});
	}
};

void main();
