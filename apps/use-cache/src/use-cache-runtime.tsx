import {
	createClientTemporaryReferenceSet,
	createFromReadableStream,
	createTemporaryReferenceSet,
	decodeReply,
	encodeReply,
	renderToReadableStream,
} from "@hiogawa/vite-rsc/rsc";
import { AsyncLocalStorage } from "node:async_hooks";

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

interface CacheEntry {
	expiresAt: number;
	value: StreamCacher;
}

/* eslint-disable perfectionist/sort-objects -- I want this to be sorted semantically */
const CACHE_LIFE_DURATION = {
	seconds: 1_000,
	minutes: 1_000 * 60,
	default: 1_000 * 60 * 5,
	hours: 1_000 * 60 * 60,
	days: 1_000 * 60 * 60 * 24,
	weeks: 1_000 * 60 * 60 * 24 * 7,
	max: 1_000 * 60 * 60 * 24 * 30,
};
/* eslint-enable perfectionist/sort-objects -- I want this to be sorted semantically */

type CacheLife = keyof typeof CACHE_LIFE_DURATION;
type Tag = string;
type CacheKey = string;

const cachedStreams = new Map<CacheKey, Promise<CacheEntry>>();
const cachedKeysForTag = new Map<Tag, Set<CacheKey>>();
const relatedTagsForKey = new Map<CacheKey, Set<Tag>>();

const deleteExistingTags = (key: CacheKey) => {
	const tags = relatedTagsForKey.get(key);

	if (!tags) {
		throw new Error("Tags association must always exist for a cache key");
	}

	tags.forEach((tag) => {
		const keysForTag = cachedKeysForTag.get(tag);

		if (!keysForTag) {
			throw new Error("Keys association must always exist for a tag");
		}

		keysForTag.delete(key);
	});
};

interface CacheStorage {
	life?: CacheLife;
	tags: Set<Tag>;
}

const cacheStorage = new AsyncLocalStorage<CacheStorage>();

export const cacheLife = (life: CacheLife) => {
	const store = cacheStorage.getStore();

	if (!store) {
		throw new Error("cacheLife must be called within a cache context");
	}

	if (!store.life || CACHE_LIFE_DURATION[life] < CACHE_LIFE_DURATION[store.life]) {
		store.life = life;
	}
};

export const cacheTag = (...tags: Array<Tag>) => {
	const store = cacheStorage.getStore();

	if (!store) {
		throw new Error("cacheTag must be called within a cache context");
	}

	tags.forEach((tag) => store.tags.add(tag));
};

export const expireTag = (tag: Tag) => {
	const keysToExpire = cachedKeysForTag.get(tag);

	if (!keysToExpire) {
		return;
	}

	keysToExpire.forEach((key) => {
		cachedStreams.delete(key);
		deleteExistingTags(key);
	});
};

export default function cacheWrapper(functionToInstrument: CacheableFunction) {
	const instrumentedFunctionId = crypto.randomUUID();

	const instrumentedFunction = async (...arguments_: Array<any>): Promise<unknown> => {
		const clientTemporaryReferences = createClientTemporaryReferenceSet();
		const encodedArguments = await encodeReply(arguments_, { temporaryReferences: clientTemporaryReferences });
		const serializedCacheKey = await replyToCacheKey(encodedArguments);

		const scopedSerializedCacheKey = `${instrumentedFunctionId}:${serializedCacheKey}`;

		const getFreshValue = async () => {
			const temporaryReferences = createTemporaryReferenceSet();
			const decodedArguments = await decodeReply(encodedArguments, { temporaryReferences });

			const cacheContext: CacheStorage = { tags: new Set() };
			const result = await cacheStorage.run(cacheContext, async () => functionToInstrument(...decodedArguments));

			const cacheLife: CacheLife = cacheContext.life ?? "default";
			const tags = cacheContext.tags;

			relatedTagsForKey.set(scopedSerializedCacheKey, tags);

			tags.forEach((tag) => {
				const newKeys = cachedKeysForTag.get(tag) ?? new Set();

				newKeys.add(scopedSerializedCacheKey);

				cachedKeysForTag.set(tag, newKeys);
			});

			const stream = renderToReadableStream(result, { environmentName: "Cache", temporaryReferences });
			const streamCacher = new StreamCacher(stream);

			return { expiresAt: Date.now() + CACHE_LIFE_DURATION[cacheLife], value: streamCacher };
		};

		let cacheEntryPromise = cachedStreams.get(scopedSerializedCacheKey);

		if (cacheEntryPromise) {
			const cacheEntry = await cacheEntryPromise;

			if (cacheEntry.expiresAt <= Date.now()) {
				deleteExistingTags(scopedSerializedCacheKey);
				cacheEntryPromise = getFreshValue();
			}
		} else {
			cacheEntryPromise = getFreshValue();
		}

		cachedStreams.set(scopedSerializedCacheKey, cacheEntryPromise);

		const entry = await cacheEntryPromise;

		const result = createFromReadableStream(entry.value.get(), {
			environmentName: "Cache",
			replayConsoleLogs: true,
			temporaryReferences: clientTemporaryReferences,
		});

		return result;
	};

	Object.defineProperty(instrumentedFunction, "name", { configurable: true, value: functionToInstrument.name });

	return instrumentedFunction;
}
