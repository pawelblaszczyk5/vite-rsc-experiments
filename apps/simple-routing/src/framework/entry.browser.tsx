import type { ReactNode } from "react";

import {
	createFromFetch,
	createFromReadableStream,
	createTemporaryReferenceSet,
	encodeReply,
	setServerCallback,
} from "@vitejs/plugin-rsc/browser";
import { getRscStreamFromHtml } from "@vitejs/plugin-rsc/rsc-html-stream/browser";
import {
	unstable_Activity as Activity,
	startTransition,
	StrictMode,
	use,
	useEffect,
	useState,
} from "react";
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
	type: "navigation";
	url: string;
}

interface TraverseAction {
	type: "traverse";
	url: string;
}

interface PreloadAction {
	type: "preload";
	url: string;
}

interface RevalidateAction {
	type: "revalidation";
}

interface CallServerAction {
	args: Array<unknown>;
	id: string;
	type: "callServer";
}

interface HmrAction {
	type: "hmr";
}

type RouterAction = CallServerAction | HmrAction | NavigationAction | PreloadAction | RevalidateAction | TraverseAction;

interface RouterState {
	entries: Array<{ root: ReactNode; url: string }>;
	externalUrl: string;
	internalUrl: string;
}

interface ActionQueueNode {
	discarded: boolean;
	payload: RouterAction;
	resolve: () => void;
}

interface ActionQueue {
	dispatch: (payload: RouterAction, setState: (state: Promise<RouterState> | RouterState) => void) => void;
	pending: ActionQueueNode | null;
	state: RouterState;
}

export const isThenable = <T,>(maybePromise: Promise<T> | T): maybePromise is Promise<T> =>
	maybePromise !== null
	&& typeof maybePromise === "object"
	&& "then" in maybePromise
	&& typeof maybePromise.then === "function";

const createActionQueue = (initialState: RouterState) => {
	const actionQueue: ActionQueue = {
		dispatch: (payload, setState) => {
			const previousNode = actionQueue.pending;

			if (previousNode) {
				previousNode.discarded = true;
			};

			let resolve = setState;

			if (payload.type !== 'traverse') {
				
			}

			actionQueue.pending = {
				discarded: false,
				payload,
			}

			const currentNode = actionQueue.pending;



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
	const url = globalThis.location.href;
	const initialPayload = await createFromReadableStream<RscPayload>(getRscStreamFromHtml());

	const actionQueue = createActionQueue({
		entries: [{ root: initialPayload.root, url }],
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
						dispatchRouterAction({ type: "navigation", url });
						return;
					}

					dispatchRouterAction({ type: "traverse", url });
				}),
			[],
		);

		return state.entries.map((entry) => (
			<Activity key={entry.url} mode={entry.url === state.internalUrl ? "visible" : "hidden"}>
				{entry.root}
			</Activity>
		));
	};

	setServerCallback(async (id, args) => {
		dispatchRouterAction({ args, id, type: "callServer" });
	});

	const browserRoot = (
		<StrictMode>
			<BrowserRoot />
		</StrictMode>
	);

	hydrateRoot(document, browserRoot, { ...(initialPayload.formState ? { formState: initialPayload.formState } : {}) });

	if (import.meta.hot) {
		import.meta.hot.on("rsc:update", () => {
			dispatchRouterAction({ type: "hmr" });
		});
	}
};

void main();
