import { setTimeout } from "node:timers/promises";
import { Suspense } from "react";

import { getServerCounter, updateServerCounter } from "#src/action.js";
import reactLogo from "#src/assets/react.svg";
import { ErrorBoundary, PromiseNumberDisplay } from "#src/client.js";

import "#src/index.css";

import viteLogo from "/vite.svg";

const getSuccessfulPromiseWithRandomNumber = async (delay = 1_000) => {
	await setTimeout(delay);

	return Math.round(Math.random() * 1_000);
};

const getFailingPromise = async (delay = 1_000) => {
	await setTimeout(delay);

	throw new Error("Fail oops");
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
			<form action={updateServerCounter.bind(null, 1)}>
				<button type="submit">Server Counter: {getServerCounter()}</button>
			</form>
		</div>
		<div className="card">
			<Suspense fallback={<p>Loading...</p>}>
				<PromiseNumberDisplay promise={getSuccessfulPromiseWithRandomNumber()} />
			</Suspense>
			<ErrorBoundary fallback={<p>Oops 💣</p>}>
				<Suspense fallback={<p>Loading...</p>}>
					<PromiseNumberDisplay promise={getFailingPromise()} />
				</Suspense>
			</ErrorBoundary>
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
