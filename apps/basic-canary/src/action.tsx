"use server";

let serverCounter = 0;

export const getServerCounter = async () => serverCounter;

export const updateServerCounter = async (change: number) => {
	serverCounter += change;
};
