import {
	createClientTemporaryReferenceSet,
	createFromReadableStream,
	createTemporaryReferenceSet,
	decodeReply,
	encodeReply,
	renderToReadableStream,
} from "@hiogawa/vite-rsc/rsc";

type CacheableFunction = (...parameters: Array<any>) => Promise<unknown>;

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

const getOrInsertComputed = <K, V>(map: Map<K, V>, key: K, getComputed: (key: K) => V) => {
	if (!map.has(key)) {
		map.set(key, getComputed(key));
	}

	return map.get(key) as V;
};

// NOTE: this is temporal solution - I don't want this revalidate by function anyway
const instrumentedFunctionIdMap = new WeakMap<CacheableFunction, string>();
const cachedStreams = new Map<string, Promise<StreamCacher>>();

export default function cacheWrapper(functionToInstrument: CacheableFunction) {
	const instrumentedFunctionId = crypto.randomUUID();

	const instrumentedFunction = async (...arguments_: Array<any>): Promise<unknown> => {
		const clientTemporaryReferences = createClientTemporaryReferenceSet();
		const encodedArguments = await encodeReply(arguments_, { temporaryReferences: clientTemporaryReferences });
		const serializedCacheKey = await replyToCacheKey(encodedArguments);

		const scopedSerializedCacheKey = `${instrumentedFunctionId}:${serializedCacheKey}`;

		const entryPromise = getOrInsertComputed(cachedStreams, scopedSerializedCacheKey, async () => {
			const temporaryReferences = createTemporaryReferenceSet();
			const decodedArguments = await decodeReply(encodedArguments, { temporaryReferences });

			const result = await functionToInstrument(...decodedArguments);

			const stream = renderToReadableStream(result, { environmentName: "Cache", temporaryReferences });
			const streamCacher = new StreamCacher(stream);

			return streamCacher;
		});

		const entry = await entryPromise;

		const result = createFromReadableStream(entry.get(), {
			environmentName: "Cache",
			replayConsoleLogs: true,
			temporaryReferences: clientTemporaryReferences,
		});

		return result;
	};

	instrumentedFunctionIdMap.set(instrumentedFunction, instrumentedFunctionId);

	return instrumentedFunction;
}

export const revalidateCache = (cachedFunction: CacheableFunction) => {
	const instrumentedFunctionId = instrumentedFunctionIdMap.get(cachedFunction);

	if (!instrumentedFunctionId) {
		throw new Error("Trying to revalidate function that's not instrumented properly");
	}

	cachedStreams
		.keys()
		.filter((key) => key.startsWith(instrumentedFunctionId))
		.forEach((key) => cachedStreams.delete(key));
};
