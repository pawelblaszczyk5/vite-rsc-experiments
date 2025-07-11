import type { ReactNode } from "react";

import reactLogo from "#src/assets/react.svg";
import { cacheLife, cacheTag, expireTag } from "#src/use-cache-runtime.js";

import "#src/index.css";

import viteLogo from "/vite.svg";

const getRandomNumber = async (min: number, max: number) => {
	"use cache";

	cacheTag("random-number");
	cacheTag(`random-number-${min.toString()}-${max.toString()}`);

	cacheLife("minutes");

	return Math.floor(Math.random() * (max - min + 1)) + min;
};

const CachedTime = async ({ children }: Readonly<{ children: ReactNode }>) => {
	"use cache";

	const isCachedByTag = Math.random() > 0.15;

	if (isCachedByTag) {
		cacheTag("time");
	} else {
		cacheLife("minutes");
	}

	return (
		<div>
			<p>
				Cached time: {new Date().toISOString()} <i>({isCachedByTag ? "by tag" : "by ttl"})</i>
			</p>
			<p>Current time: {children}</p>
		</div>
	);
};

const App = async () => (
	<div id="root">
		<div>
			<a href="https://vite.dev" target="_blank">
				<img alt="Vite logo" className="logo" src={viteLogo} />
			</a>
			<a href="https://react.dev/reference/rsc/server-components" target="_blank">
				<img alt="React logo" className="logo react" src={reactLogo} />
			</a>
		</div>
		<h1>Vite + RSC</h1>
		<div className="card">
			<form
				action={async () => {
					"use server";

					expireTag("random-number-1-5");
				}}
			>
				<button type="submit">Cached random number between 1 and 5: {getRandomNumber(1, 5)}</button>
			</form>
		</div>
		<div className="card">
			<form
				action={async () => {
					"use server";

					expireTag("random-number-6-10");
				}}
			>
				<button type="submit">Cached random number between 6 and 10: {getRandomNumber(6, 10)}</button>
			</form>
		</div>
		<div className="card">
			<form
				action={async () => {
					"use server";

					expireTag("random-number");
				}}
			>
				<button type="submit">Expire both random numbers</button>
			</form>{" "}
		</div>
		<div className="card">
			<form
				action={async () => {
					"use server";

					expireTag("time");
				}}
			>
				<CachedTime>
					<span>{new Date().toISOString()}</span>
				</CachedTime>
				<button type="submit">Refresh cached time by key</button>
			</form>
		</div>
		<ul className="read-the-docs">
			<li>
				Edit <code>src/client.tsx</code> to test client HMR.
			</li>
			<li>
				Edit <code>src/root.tsx</code> to test server HMR.
			</li>
			<li>
				Visit{" "}
				<a href="/?__rsc" target="_blank">
					<code>/?__rsc</code>
				</a>{" "}
				to view RSC stream payload.
			</li>
			<li>
				Visit{" "}
				<a href="/?__nojs" target="_blank">
					<code>/?__nojs</code>
				</a>{" "}
				to test server action without js enabled.
			</li>
		</ul>
	</div>
);

export const Root = () => (
	<html lang="en">
		<head>
			<meta charSet="utf8" />
			<link href="/vite.svg" rel="icon" type="image/svg+xml" />
			<meta content="width=device-width, initial-scale=1.0" name="viewport" />
			<title>Vite + RSC</title>
		</head>
		<body>
			<App />
		</body>
	</html>
);
