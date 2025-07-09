import * as stylex from "@stylexjs/stylex";

import { ClientCounter } from "#src/client.js";
import { theme } from "#src/theme.stylex.js";

import "#src/index.css";

const styles = stylex.create({ heading: { color: theme.secondaryColor } });

const App = () => (
	<div>
		<h1 {...stylex.props(styles.heading)}>Hello world</h1>
		<ClientCounter />
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
