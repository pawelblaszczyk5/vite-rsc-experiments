let language: "en-US" | "pl-PL" = "en-US";

export const getLanguage = () => language;

export const changeLanguage = async (newLanguage: typeof language) => {
	"use server";

	language = newLanguage;
};
