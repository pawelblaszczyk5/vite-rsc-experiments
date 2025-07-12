"use client";

import type { Messages } from "@lingui/core";
import type { ReactNode } from "react";

import { setupI18n } from "@lingui/core";
import { I18nProvider as LinguiI18nProvider } from "@lingui/react";
import { useState } from "react";

export const I18nProvider = ({
	children,
	language,
	messages,
}: Readonly<{ children: ReactNode; language: "en-US" | "pl-PL"; messages: Messages }>) => {
	const [i18n, setI18n] = useState(() => {
		const i18n = setupI18n();

		i18n.loadAndActivate({ locale: language, messages });

		return i18n;
	});

	const [previousLanguage, setPreviousLanguage] = useState(language);
	const [previousMessages, setPreviousMessages] = useState(messages);

	if (previousLanguage !== language || previousMessages !== messages) {
		setPreviousLanguage(language);
		setPreviousMessages(messages);

		const i18n = setupI18n();

		i18n.loadAndActivate({ locale: language, messages });

		setI18n(i18n);
	}

	return <LinguiI18nProvider i18n={i18n}>{children}</LinguiI18nProvider>;
};
