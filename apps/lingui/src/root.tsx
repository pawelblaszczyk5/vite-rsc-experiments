import { Trans } from "@lingui/react/macro";

const App = () => (
	<>
		<h1>
			<Trans>Hello world</Trans>
		</h1>
		<h2>
			<Trans>Lorem ipsum</Trans>
		</h2>
	</>
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
