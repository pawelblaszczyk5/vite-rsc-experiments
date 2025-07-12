import type { ReactFormState } from "react-dom/client";

import {
	createTemporaryReferenceSet,
	decodeAction,
	decodeFormState,
	decodeReply,
	loadServerAction,
	renderToReadableStream,
} from "@vitejs/plugin-rsc/rsc";

import { Root } from "#src/root.js";

export interface RscPayload {
	formState?: ReactFormState | undefined;
	returnValue?: unknown;
	root: React.ReactNode;
}

export default async function handler(request: Request): Promise<Response> {
	const isAction = request.method === "POST";

	let returnValue: unknown;
	let formState: ReactFormState | undefined;
	let temporaryReferences: unknown;

	const url = new URL(request.url);


	if (isAction) {
		const actionId = request.headers.get("x-rsc-action");

		if (actionId) {
			const contentType = request.headers.get("content-type");
			const body = contentType?.startsWith("multipart/form-data") ? await request.formData() : await request.text();

			temporaryReferences = createTemporaryReferenceSet();
			const params = await decodeReply(body, { temporaryReferences });
			const action = await loadServerAction(actionId);

			// eslint-disable-next-line prefer-spread -- check this in the future
			returnValue = await action.apply(null, params);
		} else {
			const formData = await request.formData();
			const decodedAction = await decodeAction(formData);
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- check this in the future
			const result = await decodedAction();

			formState = await decodeFormState(result, formData);
		}
	}

	const rscStream = renderToReadableStream<RscPayload>({ formState, returnValue, root: <Root /> });

	const isRscRequest =
		(!request.headers.get("accept")?.includes("text/html") && !url.searchParams.has("__html"))
		|| url.searchParams.has("__rsc");

	if (isRscRequest) {
		return new Response(rscStream, { headers: { "content-type": "text/x-component;charset=utf-8", vary: "accept" } });
	}

	const ssrEntryModule = await import.meta.viteRsc.loadModule<typeof import("./entry.ssr.js")>("ssr", "index");
	const htmlStream = await ssrEntryModule.renderHTML(rscStream, {
		debugNojs: url.searchParams.has("__nojs"),
		formState,
	});

	return new Response(htmlStream, { headers: { "Content-type": "text/html", vary: "accept" } });
}
