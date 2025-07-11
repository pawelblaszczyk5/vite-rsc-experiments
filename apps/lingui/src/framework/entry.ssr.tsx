import type { ReactFormState } from "react-dom/client";

import { setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { injectRscStreamToHtml } from "@vitejs/plugin-rsc/rsc-html-stream/ssr";
import { createFromReadableStream } from "@vitejs/plugin-rsc/ssr";
import { use } from "react";
import { renderToReadableStream } from "react-dom/server.edge";

import type { RscPayload } from "#src/framework/entry.rsc.js";

import { englishMessages, polishMessages } from "#src/lingui/messages.js";

export const renderHTML = async (
	rscStream: ReadableStream<Uint8Array>,
	options: { debugNojs?: boolean; formState?: ReactFormState | undefined; nonce?: string },
) => {
	const [rscStream1, rscStream2] = rscStream.tee();

	let payloadPromise: Promise<RscPayload>;

	const i18n = setupI18n();

	const SsrRoot = () => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- this will suspend so it's valid that this will be reassigned
		payloadPromise ??= createFromReadableStream<RscPayload>(rscStream1);

		const payload = use(payloadPromise);

		const messages = payload.language === "en-US" ? englishMessages : polishMessages;

		i18n.loadAndActivate({ locale: payload.language, messages });

		return <I18nProvider i18n={i18n}>{payload.root}</I18nProvider>;
	};

	const bootstrapScriptContent = await import.meta.viteRsc.loadBootstrapScriptContent("index");
	const htmlStream = await renderToReadableStream(<SsrRoot />, {
		bootstrapScriptContent: options.debugNojs ? undefined : bootstrapScriptContent,
		// @ts-expect-error -- untyped field
		formState: options.formState,
		nonce: options.nonce,
	});

	let responseStream: ReadableStream<Uint8Array> = htmlStream;

	if (!options.debugNojs) {
		responseStream = responseStream.pipeThrough(
			injectRscStreamToHtml(rscStream2, { ...(options.nonce ? { nonce: options.nonce } : {}) }),
		);
	}

	return responseStream;
};
