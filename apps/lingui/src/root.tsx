import { Trans } from "@lingui/react/macro";

import { changeLanguage, getLanguage } from "#src/language.js";
import { englishMessages } from "#src/lingui/en-messages.js";
import { I18nProvider } from "#src/lingui/i18n-provider.js";
import { polishMessages } from "#src/lingui/pl-messages.js";

const App = () => (
	<>
		<h1>
			<Trans>Hello world</Trans>
		</h1>
		<h2>
			<Trans>Lorem ipsum</Trans>
		</h2>
		<form>
			<button formAction={changeLanguage.bind(null, "en-US")} type="submit">
				Change to English
			</button>
			<button formAction={changeLanguage.bind(null, "pl-PL")} type="submit">
				Change to Polish
			</button>
		</form>
	</>
);

export const Root = () => {
	const language = getLanguage();
	const messages = language === "en-US" ? englishMessages : polishMessages;

	return (
		<I18nProvider language={language} messages={messages}>
			<html lang={language}>
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
		</I18nProvider>
	);
};
