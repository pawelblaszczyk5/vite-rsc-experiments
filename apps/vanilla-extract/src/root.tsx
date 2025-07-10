import { container } from "#src/styles.css.js";
import { ClientCounter } from "./client.js";

const App = () => <h1 className={container}>Test-server</h1>;

export const Root = () => (
	<html lang="en">
		<head>
			<meta charSet="utf8" />
			<link href="/vite.svg" rel="icon" type="image/svg+xml" />
			<meta content="width=device-width, initial-scale=1.0" name="viewport" />
			<title>Vite + RSC</title>
			{import.meta.viteRsc.loadCss()}
		</head>
		<body>
			<App />
			<ClientCounter />
		</body>
	</html>
);
