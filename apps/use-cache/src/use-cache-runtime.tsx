import {
	createClientTemporaryReferenceSet,
	createFromReadableStream,
	createTemporaryReferenceSet,
	decodeReply,
	encodeReply,
	renderToReadableStream,
} from "@hiogawa/vite-rsc/rsc";

type CacheableFunction = (...parameters: Array<any>) => unknown;

class StreamCacher {
	#stream: ReadableStream<Uint8Array>;

	constructor(stream: ReadableStream<Uint8Array>) {
		this.#stream = stream;
	}

	get(): ReadableStream<Uint8Array> {
		const [returnStream, savedStream] = this.#stream.tee();

		this.#stream = savedStream;

		return returnStream;
	}
}

const replyToCacheKey = async (reply: FormData | string) => {
	if (typeof reply === "string") {
		return reply;
	}
	const buffer = await crypto.subtle.digest("SHA-256", await new Response(reply).arrayBuffer());

	return btoa(String.fromCodePoint(...new Uint8Array(buffer)));
};

const cachedFunctionMap = new WeakMap<CacheableFunction, unknown>();
const cachedFunctionCacheEntries = new WeakMap<CacheableFunction, Record<string, Promise<StreamCacher>>>();

export default function cacheWrapper(function_: (...arguments_: Array<any>) => Promise<unknown>) {
	const instrumentedFunction = cachedFunctionMap.has(function_);

	if (instrumentedFunction) {
		return instrumentedFunction;
	}

	const cachedFunction = async (...arguments_: Array<any>): Promise<unknown> => {
		let cacheEntries = cachedFunctionCacheEntries.get(cachedFunction);

		if (!cacheEntries) {
			cacheEntries = {};
			cachedFunctionCacheEntries.set(cachedFunction, cacheEntries);
		}

		const clientTemporaryReferences = createClientTemporaryReferenceSet();
		const encodedArguments = await encodeReply(arguments_, { temporaryReferences: clientTemporaryReferences });
		const serializedCacheKey = await replyToCacheKey(encodedArguments);

		const entryPromise = (cacheEntries[serializedCacheKey] ??= (async () => {
			const temporaryReferences = createTemporaryReferenceSet();
			const decodedArguments = await decodeReply(encodedArguments, { temporaryReferences });

			const result = await function_(...decodedArguments);

			const stream = renderToReadableStream(result, { environmentName: "Cache", temporaryReferences });

			return new StreamCacher(stream);
		})());

		const entry = await entryPromise;

		const result = createFromReadableStream(entry.get(), {
			environmentName: "Cache",
			replayConsoleLogs: true,
			temporaryReferences: clientTemporaryReferences,
		});

		return result;
	};

	cachedFunctionMap.set(function_, cachedFunction);

	return cachedFunction;
}

export const revalidateCache = (cachedFunction: CacheableFunction) => {
	cachedFunctionCacheEntries.delete(cachedFunction);
};
